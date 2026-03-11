import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Each plan key maps to a Stripe Price ID
const PRICE_IDS = {
  orders:   process.env.STRIPE_PRICE_ORDERS_MONTHLY,
  bookings: process.env.STRIPE_PRICE_BOOKINGS_MONTHLY,
  team:     process.env.STRIPE_PRICE_TEAM_MONTHLY,
}

export async function POST(request) {
  try {
    const { restaurantId, plans } = await request.json()
    // plans is an array, e.g. ['orders'], ['bookings', 'team'], ['orders', 'bookings', 'team']

    if (!restaurantId || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ error: 'Missing restaurantId or plans' }, { status: 400 })
    }

    const invalidPlans = plans.filter(p => !PRICE_IDS[p])
    if (invalidPlans.length > 0) {
      return NextResponse.json({ error: `Unknown plan(s): ${invalidPlans.join(', ')}` }, { status: 400 })
    }

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, email, stripe_customer_id')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    let customerId = restaurant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: restaurant.email,
        name: restaurant.name,
        metadata: { restaurant_id: restaurantId },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurantId)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const lineItems = plans.map(plan => ({ price: PRICE_IDS[plan], quantity: 1 }))
    const plansString = plans.sort().join(',')

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/dashboard/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/dashboard/settings/billing?canceled=1`,
      metadata: { restaurant_id: restaurantId, plans: plansString },
      subscription_data: {
        metadata: { restaurant_id: restaurantId, plans: plansString },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
