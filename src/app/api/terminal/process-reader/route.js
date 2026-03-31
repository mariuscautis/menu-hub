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

    const result = await stripePost(
      `terminal/readers/${readerId}/process_payment_intent`,
      { payment_intent: paymentIntentId },
      restaurant.stripe_connect_account_id
    )

    if (result.error) {
      console.error('terminal/process-reader Stripe error:', result.error)
      const userMessage = result.error.code === 'terminal_reader_busy'
        ? 'Reader is busy with another payment. Please wait and try again.'
        : result.error.code === 'terminal_reader_offline'
        ? 'Reader is offline. Please check the device and try again.'
        : result.error.message || 'Failed to reach the card reader.'
      return NextResponse.json({ error: userMessage }, { status: 400 })
    }

    // Update terminal_payments: set reader_id and status = 'waiting'
    await supabaseAdmin
      .from('terminal_payments')
      .update({ reader_id: readerId, status: 'waiting' })
      .eq('payment_intent_id', paymentIntentId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('terminal/process-reader error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
