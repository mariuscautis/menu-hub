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
    body: new URLSearchParams(body || {}).toString(),
  }).then(r => r.json())

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { restaurantId, readerId, paymentIntentId } = await request.json()

    if (!restaurantId || !readerId || !paymentIntentId) {
      return NextResponse.json({ error: 'restaurantId, readerId, paymentIntentId required' }, { status: 400 })
    }

    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_connect_account_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_connect_account_id) {
      return NextResponse.json({ error: 'Stripe Connect not set up for this venue' }, { status: 400 })
    }

    const accountId = restaurant.stripe_connect_account_id

    // Cancel reader action — non-fatal if reader already finished
    try {
      await stripePost(`terminal/readers/${readerId}/cancel_action`, {}, accountId)
    } catch (e) {
      console.error('terminal/cancel-action reader cancel (non-fatal):', e)
    }

    // Cancel the PaymentIntent — non-fatal if already succeeded/cancelled
    try {
      await stripePost(`payment_intents/${paymentIntentId}/cancel`, {}, accountId)
    } catch (e) {
      console.error('terminal/cancel-action intent cancel (non-fatal):', e)
    }

    // Always update DB regardless of Stripe call results
    await supabaseAdmin
      .from('terminal_payments')
      .update({ status: 'cancelled' })
      .eq('payment_intent_id', paymentIntentId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('terminal/cancel-action error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
