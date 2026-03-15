export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { formatDateForLocale } from '@/lib/email-translations'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function sendSms(phone, body) {
  return fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: process.env.BREVO_SMS_SENDER || 'VenoApp',
      recipient: phone,
      content: body,
      type: 'transactional',
    }),
  })
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const {
      paymentIntentId,
      restaurantId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      partySize,
      reservationDate,
      reservationTime,
      specialRequests,
      locale,
      feeAmount,
      feeCurrency,
    } = await request.json()

    if (!paymentIntentId || !restaurantId || !customerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the restaurant's connected Stripe account to verify the payment
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_connect_account_id, name, slug')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_connect_account_id) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Verify the payment intent succeeded on Stripe
    const piRes = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Account': restaurant.stripe_connect_account_id,
        },
      }
    )
    const pi = await piRes.json()

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 400 })
    }

    // Check for duplicate (idempotency — in case of double submit)
    const { data: existing } = await supabaseAdmin
      .from('booking_fee_payments')
      .select('reservation_id, status')
      .eq('stripe_payment_intent', paymentIntentId)
      .single()

    if (existing?.status === 'succeeded' && existing?.reservation_id) {
      return NextResponse.json({ success: true, reservationId: existing.reservation_id, alreadyProcessed: true })
    }

    // Insert the reservation
    const { data: reservation, error: resError } = await supabaseAdmin
      .from('reservations')
      .insert({
        restaurant_id:    restaurantId,
        customer_id:      customerId,
        customer_name:    customerName,
        customer_email:   customerEmail || null,
        customer_phone:   customerPhone,
        party_size:       partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        special_requests: specialRequests || null,
        status:           'pending',
        locale:           locale || 'en',
      })
      .select()
      .single()

    if (resError) {
      console.error('Reservation insert error:', resError)
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
    }

    // Mark the payment as succeeded and link to reservation
    await supabaseAdmin
      .from('booking_fee_payments')
      .update({ status: 'succeeded', reservation_id: reservation.id })
      .eq('stripe_payment_intent', paymentIntentId)

    // Update customer stats
    await supabaseAdmin.rpc('recalculate_customer_stats', { p_customer_id: customerId })

    // Send confirmation SMS
    if (customerPhone) {
      try {
        const formattedDate = formatDateForLocale(reservationDate, locale || 'en')
        const cur = feeCurrency || 'GBP'
        const FEE_SMS = {
          en: 'Your booking at {name} on {date} at {time} is pending confirmation. A {cur} {fee} deposit has been collected and is non-refundable if you don\'t show up.',
          es: 'Tu reserva en {name} el {date} a las {time} está pendiente de confirmación. Se ha cobrado un depósito de {fee} {cur} no reembolsable si no apareces.',
          fr: 'Votre réservation chez {name} le {date} à {time} est en attente de confirmation. Un dépôt de {fee} {cur} a été encaissé et n\'est pas remboursable en cas d\'absence.',
          it: 'La tua prenotazione presso {name} il {date} alle {time} è in attesa di conferma. È stato addebitato un deposito di {fee} {cur} non rimborsabile in caso di mancata presentazione.',
          ro: 'Rezervarea ta la {name} pe {date} la ora {time} este în așteptarea confirmării. Un depozit de {fee} {cur} a fost colectat și nu este rambursabil dacă nu te prezinți.',
        }
        const resolvedLocale = locale && FEE_SMS[locale] ? locale : 'en'
        const smsTpl = FEE_SMS[resolvedLocale]
        const smsBody = smsTpl
          .replace('{name}', restaurant.name)
          .replace('{date}', formattedDate)
          .replace('{time}', reservationTime.substring(0, 5))
          .replace('{cur}', cur)
          .replace('{fee}', feeAmount)
        await sendSms(customerPhone, smsBody)
      } catch (smsErr) {
        console.error('Fee confirmation SMS error:', smsErr)
      }
    }

    // Send confirmation email if provided
    if (customerEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
        await fetch(`${baseUrl}/api/reservations/send-fee-confirmation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: reservation.id,
            feeAmount,
            feeCurrency: feeCurrency || 'GBP',
          }),
        })
      } catch (emailErr) {
        console.error('Fee confirmation email error:', emailErr)
      }
    }

    return NextResponse.json({ success: true, reservationId: reservation.id })

  } catch (err) {
    console.error('complete-with-fee error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
