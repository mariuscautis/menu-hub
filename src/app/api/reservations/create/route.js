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

/**
 * POST /api/reservations/create
 * Direct booking (no OTP) — only allowed when venue has sms_billing_enabled = false.
 * Email is required (used for confirmation). Phone is optional.
 */
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const {
      restaurantId,
      customerName,
      customerEmail,
      customerPhone,
      partySize,
      reservationDate,
      reservationTime,
      specialRequests,
      locale,
    } = await request.json()

    if (!restaurantId || !customerName || !customerEmail || !reservationDate || !reservationTime) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the venue has SMS billing disabled (guard against bypassing OTP)
    const { data: venue } = await supabaseAdmin
      .from('restaurants')
      .select('id, sms_billing_enabled, enabled_modules')
      .eq('id', restaurantId)
      .single()

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 })
    }

    if (venue.sms_billing_enabled) {
      return NextResponse.json({ success: false, error: 'Phone verification is required for this venue' }, { status: 403 })
    }

    if (!venue.enabled_modules?.reservations) {
      return NextResponse.json({ success: false, error: 'Reservations not enabled' }, { status: 403 })
    }

    // Upsert customer by email (no phone required)
    const normalizedPhone = customerPhone?.replace(/\s+/g, '').replace(/-/g, '') || null

    // Try to find existing customer by email or phone
    let customerId = null
    if (normalizedPhone) {
      const { data: existing } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .single()
      if (existing) customerId = existing.id
    }

    if (!customerId && customerEmail) {
      const { data: existing } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .single()
      if (existing) customerId = existing.id
    }

    if (!customerId) {
      // Create new customer — use email as identifier since no phone verification
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({
          phone: normalizedPhone || `email:${customerEmail}`, // fallback key
          name: customerName,
          email: customerEmail,
        })
        .select('id')
        .single()
      customerId = newCustomer?.id
    }

    // Insert reservation
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customerId || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: normalizedPhone || null,
        party_size: partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        special_requests: specialRequests || null,
        status: 'pending',
        locale: locale || 'en',
      })
      .select()
      .single()

    if (reservationError) {
      console.error('Reservation insert error:', reservationError)
      return NextResponse.json({ success: false, error: 'Failed to create reservation' }, { status: 500 })
    }

    if (customerId) {
      await supabaseAdmin.rpc('recalculate_customer_stats', { p_customer_id: customerId })
    }

    return NextResponse.json({ success: true, reservationId: reservation.id })
  } catch (error) {
    console.error('create reservation error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
