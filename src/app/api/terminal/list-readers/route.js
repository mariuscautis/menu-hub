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

    if (!restaurant?.stripe_connect_account_id || !restaurant?.stripe_connect_onboarded) {
      return NextResponse.json({ readers: [] })
    }

    const res = await fetch('https://api.stripe.com/v1/terminal/readers?limit=100', {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Account': restaurant.stripe_connect_account_id,
      },
    })
    const data = await res.json()

    if (data.error) {
      console.error('terminal/list-readers Stripe error:', data.error)
      return NextResponse.json({ readers: [] })
    }

    const readers = (data.data || []).map(r => ({
      id: r.id,
      label: r.label || r.id,
      status: r.status,
      device_type: r.device_type,
    }))

    return NextResponse.json({ readers })

  } catch (err) {
    console.error('terminal/list-readers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
