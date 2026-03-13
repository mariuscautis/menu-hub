export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function hashOtp(otp) {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + process.env.OTP_SECRET)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const {
      phone,
      otp,
      // Booking details — passed together so we can insert in one verified step
      restaurantId,
      customerName,
      customerEmail,
      partySize,
      reservationDate,
      reservationTime,
      specialRequests,
      locale
    } = await request.json()

    if (!phone || !otp) {
      return NextResponse.json({ success: false, error: 'Phone and code required' }, { status: 400 })
    }

    const normalised = phone.replace(/\s+/g, '').replace(/-/g, '')
    const otpHash = await hashOtp(otp)

    // Find a valid, unused OTP
    const now = new Date().toISOString()
    const { data: otpRows, error: otpError } = await supabaseAdmin
      .from('sms_otps')
      .select('id, otp_hash, expires_at, used')
      .eq('phone', normalised)
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)

    if (otpError) {
      console.error('OTP fetch error:', otpError)
      return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
    }

    if (!otpRows || otpRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Code expired or not found. Please request a new one.' }, { status: 400 })
    }

    const otpRow = otpRows[0]

    if (otpRow.otp_hash !== otpHash) {
      return NextResponse.json({ success: false, error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('sms_otps')
      .update({ used: true })
      .eq('id', otpRow.id)

    // Upsert customer profile by phone
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(
        { phone: normalised, name: customerName, email: customerEmail || null },
        { onConflict: 'phone', ignoreDuplicates: false }
      )
      .select('id, avg_rating, total_bookings')
      .single()

    if (customerError) {
      console.error('Customer upsert error:', customerError)
      return NextResponse.json({ success: false, error: 'Failed to create customer profile' }, { status: 500 })
    }

    // Check for venue restrictions (block or deposit required)
    if (restaurantId) {
      const { data: restriction } = await supabaseAdmin
        .from('customer_venue_restrictions')
        .select('type, fee_amount, fee_currency')
        .eq('customer_id', customer.id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (restriction) {
        if (restriction.type === 'fee_required') {
          // Customer verified — return fee requirement without inserting the booking yet
          return NextResponse.json({
            success: true,
            requiresFee: true,
            feeAmount: restriction.fee_amount,
            feeCurrency: restriction.fee_currency || 'GBP',
            customer: {
              id: customer.id,
              avgRating: customer.avg_rating,
              totalBookings: customer.total_bookings
            }
          })
        }

        if (restriction.type === 'blocked') {
          // Generic message — don't reveal the reason
          return NextResponse.json({
            success: false,
            error: 'We are unable to complete this booking. Please contact the venue directly.'
          }, { status: 403 })
        }
      }
    }

    // No restriction — insert the reservation now that phone is verified
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customer.id,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: normalised,
        party_size: partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        special_requests: specialRequests || null,
        status: 'pending',
        locale: locale || 'en'
      })
      .select()
      .single()

    if (reservationError) {
      console.error('Reservation insert error:', reservationError)
      return NextResponse.json({ success: false, error: reservationError.message || 'Failed to create reservation' }, { status: 500 })
    }

    // Update customer total_bookings count
    await supabaseAdmin.rpc('recalculate_customer_stats', { p_customer_id: customer.id })

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      customer: {
        id: customer.id,
        avgRating: customer.avg_rating,
        totalBookings: customer.total_bookings
      }
    })

  } catch (error) {
    console.error('verify-otp error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
