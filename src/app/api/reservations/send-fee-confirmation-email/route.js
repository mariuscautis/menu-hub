export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail as sendBrevoEmail } from '@/lib/services/email-edge'
import { formatDateForLocale } from '@/lib/email-translations'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generateFeeEmail({ reservation, restaurant, feeAmount, feeCurrency, cancelUrl }) {
  const locale = reservation.locale || 'en'
  const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
  const time = reservation.reservation_time.substring(0, 5)
  const cur = feeCurrency || 'GBP'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; }
        .container { background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #6262bd; color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; }
        .content { padding: 30px; }
        .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; font-size: 15px; }
        .detail-label { font-weight: bold; color: #6262bd; }
        .fee-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .fee-box strong { color: #92400e; }
        .cancel-link { color: #dc2626; text-decoration: underline; }
        .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 13px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Booking Request Received</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${reservation.customer_name}</strong>,</p>
          <p>Your booking request at <strong>${restaurant.name}</strong> has been received and your deposit has been successfully collected.</p>

          <div class="details">
            <div class="detail-row"><span class="detail-label">Date:</span> ${formattedDate}</div>
            <div class="detail-row"><span class="detail-label">Time:</span> ${time}</div>
            <div class="detail-row"><span class="detail-label">Party size:</span> ${reservation.party_size} ${reservation.party_size === 1 ? 'guest' : 'guests'}</div>
            ${reservation.special_requests ? `<div class="detail-row"><span class="detail-label">Special requests:</span> ${reservation.special_requests}</div>` : ''}
          </div>

          <div class="fee-box">
            <strong>💳 Deposit paid: ${cur} ${Number(feeAmount).toFixed(2)}</strong>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">
              This deposit will be deducted from your bill on the day. Please note it is <strong>non-refundable</strong> if you do not show up.
            </p>
          </div>

          <p>Your booking is currently <strong>pending confirmation</strong> from the venue. You'll receive another message once confirmed.</p>

          ${reservation.restaurants?.address || restaurant.phone ? `
          <div class="details">
            <div class="detail-row"><span class="detail-label">${restaurant.name}</span></div>
            ${restaurant.address ? `<div class="detail-row">📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}" style="color:#6262bd;">${restaurant.address}</a></div>` : ''}
            ${restaurant.phone ? `<div class="detail-row"><span class="detail-label">Phone:</span> ${restaurant.phone}</div>` : ''}
          </div>
          ` : ''}

          <p>Need to cancel? <a href="${cancelUrl}" class="cancel-link">Cancel your reservation</a></p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${restaurant.name}.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { reservationId, feeAmount, feeCurrency } = await request.json()

    const { data: reservation, error } = await supabaseAdmin
      .from('reservations')
      .select('*, restaurants(name, slug, address, phone, email)')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!reservation.customer_email) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const restaurant = reservation.restaurants
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const cancelUrl = `${baseUrl}/${restaurant.slug}/reservation/cancel/${reservation.cancellation_token}`

    const html = generateFeeEmail({ reservation, restaurant, feeAmount, feeCurrency, cancelUrl })

    await sendBrevoEmail({
      to: reservation.customer_email,
      subject: `Booking deposit confirmed — ${restaurant.name}`,
      htmlContent: html,
      fromName: restaurant.name,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('send-fee-confirmation-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
