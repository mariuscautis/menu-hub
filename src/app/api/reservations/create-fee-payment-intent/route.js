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

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { restaurantId, customerId, amount, currency } = await request.json()

    if (!restaurantId || !customerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the restaurant's connected Stripe account
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_connect_account_id, stripe_connect_onboarded, name')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_connect_account_id || !restaurant?.stripe_connect_onboarded) {
      return NextResponse.json({ error: 'Venue payment account not set up' }, { status: 400 })
    }

    const amountInCents = Math.round(amount * 100)
    const cur = (currency || 'gbp').toLowerCase()

    // Platform fee: 2% of the booking fee (optional — set to 0 to skip)
    const platformFeeAmount = Math.round(amountInCents * 0.02)

    const body = new URLSearchParams({
      amount:                    String(amountInCents),
      currency:                  cur,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[restaurant_id]': restaurantId,
      'metadata[customer_id]':   customerId,
      'application_fee_amount':  String(platformFeeAmount),
    })

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // Charge on behalf of the connected account
        'Stripe-Account': restaurant.stripe_connect_account_id,
      },
      body: body.toString(),
    })

    const paymentIntent = await res.json()

    if (paymentIntent.error) {
      console.error('PaymentIntent error:', paymentIntent.error)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    // Record as pending in our DB
    await supabaseAdmin.from('booking_fee_payments').insert({
      customer_id:           customerId,
      restaurant_id:         restaurantId,
      stripe_payment_intent: paymentIntent.id,
      amount,
      currency:              cur.toUpperCase(),
      status:                'pending',
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      stripeAccountId: restaurant.stripe_connect_account_id,
    })

  } catch (err) {
    console.error('create-fee-payment-intent error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
