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

const stripePost = (path, body) =>
  fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  }).then(r => r.json())

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { restaurantId } = await request.json()
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
    }

    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', restaurantId)
      .single()

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let accountId = restaurant.stripe_connect_account_id

    // Create a new Express connected account if one doesn't exist yet
    if (!accountId) {
      const account = await stripePost('accounts', {
        type: 'express',
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
        'business_profile[name]': restaurant.name,
        'metadata[restaurant_id]': restaurantId,
      })

      if (account.error) {
        console.error('Stripe account create error:', account.error)
        return NextResponse.json({ error: 'Failed to create Stripe account', detail: account.error?.message || JSON.stringify(account.error) }, { status: 500 })
      }

      accountId = account.id

      await supabaseAdmin
        .from('restaurants')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', restaurantId)
    }

    // Create an account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const accountLink = await stripePost('account_links', {
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings/payments?refresh=1`,
      return_url:  `${baseUrl}/dashboard/settings/payments?connected=1`,
      type: 'account_onboarding',
    })

    if (accountLink.error) {
      console.error('Stripe account link error:', accountLink.error)
      return NextResponse.json({ error: 'Failed to create onboarding link', detail: accountLink.error?.message || JSON.stringify(accountLink.error) }, { status: 500 })
    }

    return NextResponse.json({ url: accountLink.url })

  } catch (err) {
    console.error('stripe-connect/onboard error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message || String(err) }, { status: 500 })
  }
}
