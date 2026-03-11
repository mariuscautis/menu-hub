import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  try {
    const { restaurantId } = await request.json()

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
    }

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('stripe_customer_id')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
      return_url: `${appUrl}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('billing-portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
