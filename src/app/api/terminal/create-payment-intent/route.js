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

const stripePost = (path, body, stripeAccountId) =>
  fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(stripeAccountId ? { 'Stripe-Account': stripeAccountId } : {}),
    },
    body: new URLSearchParams(body).toString(),
  }).then(r => r.json())

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { restaurantId, amount, currency, orderIds, tableId } = await request.json()

    if (!restaurantId || !amount || !currency || !tableId) {
      return NextResponse.json({ error: 'restaurantId, amount, currency, tableId required' }, { status: 400 })
    }

    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_connect_account_id || !restaurant?.stripe_connect_onboarded) {
      return NextResponse.json({ error: 'Stripe Connect not set up for this venue' }, { status: 400 })
    }

    const amountInCents = Math.round(amount * 100)
    const cur = currency.toLowerCase()

    const pi = await stripePost('payment_intents', {
      amount: amountInCents,
      currency: cur,
      'payment_method_types[0]': 'card_present',
      capture_method: 'automatic',
      'metadata[restaurant_id]': restaurantId,
      'metadata[table_id]': tableId,
      'metadata[order_ids]': JSON.stringify(orderIds || []),
    }, restaurant.stripe_connect_account_id)

    if (pi.error) {
      console.error('terminal/create-payment-intent Stripe error:', pi.error)
      return NextResponse.json({ error: pi.error.message || 'Failed to create payment intent' }, { status: 500 })
    }

    await supabaseAdmin.from('terminal_payments').insert({
      payment_intent_id: pi.id,
      restaurant_id: restaurantId,
      table_id: tableId,
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      order_ids: orderIds || [],
    })

    return NextResponse.json({ paymentIntentId: pi.id })

  } catch (err) {
    console.error('terminal/create-payment-intent error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
