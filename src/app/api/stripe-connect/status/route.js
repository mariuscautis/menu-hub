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
    const { restaurantId } = await request.json()
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
    }

    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_connect_account_id) {
      return NextResponse.json({ connected: false, onboarded: false })
    }

    // Check account status with Stripe
    const accountRes = await fetch(
      `https://api.stripe.com/v1/accounts/${restaurant.stripe_connect_account_id}`,
      { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    )
    const account = await accountRes.json()

    const onboarded = account.details_submitted && account.charges_enabled

    // Sync onboarded status to DB if it changed
    if (onboarded && !restaurant.stripe_connect_onboarded) {
      await supabaseAdmin
        .from('restaurants')
        .update({ stripe_connect_onboarded: true })
        .eq('id', restaurantId)
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      accountId: restaurant.stripe_connect_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    })

  } catch (err) {
    console.error('stripe-connect/status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
