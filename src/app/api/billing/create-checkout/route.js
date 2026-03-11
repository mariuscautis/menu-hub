import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const PRICE_IDS = {
    orders:   process.env.STRIPE_PRICE_ORDERS_MONTHLY,
    bookings: process.env.STRIPE_PRICE_BOOKINGS_MONTHLY,
    team:     process.env.STRIPE_PRICE_TEAM_MONTHLY,
  }

  // Helper: Stripe REST fetch
  const stripePost = (path, body) =>
    fetch(`https://api.stripe.com/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    }).then(r => r.json())

  const stripeGet = (path) =>
    fetch(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    }).then(r => r.json())

  try {
    const { restaurantId, plans } = await request.json()

    if (!restaurantId || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ error: 'Missing restaurantId or plans' }, { status: 400 })
    }

    const invalidPlans = plans.filter(p => !PRICE_IDS[p])
    if (invalidPlans.length > 0) {
      return NextResponse.json({ error: `Unknown plan(s): ${invalidPlans.join(', ')}` }, { status: 400 })
    }

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, email, stripe_customer_id, subscription_id, subscription_plans, subscription_status')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // ── Case 1: Active subscription exists — add/remove items directly ───────
    if (restaurant.subscription_status === 'active' && restaurant.subscription_id) {
      const sub = await stripeGet(`subscriptions/${restaurant.subscription_id}`)

      if (sub.object === 'subscription') {
        const existingItems  = sub.items.data  // [{ id, price: { id } }]
        const existingPlans  = (restaurant.subscription_plans || '').split(',').filter(Boolean)

        const toAdd    = plans.filter(p => !existingPlans.includes(p))
        const toRemove = existingPlans.filter(p => !plans.includes(p))

        if (toAdd.length === 0 && toRemove.length === 0) {
          return NextResponse.json({ error: 'No changes to apply.' }, { status: 400 })
        }

        // Add new items
        for (const plan of toAdd) {
          await stripePost('subscription_items', {
            subscription: restaurant.subscription_id,
            price: PRICE_IDS[plan],
            quantity: '1',
          })
        }

        // Remove deleted items
        for (const plan of toRemove) {
          const item = existingItems.find(i => i.price.id === PRICE_IDS[plan])
          if (item) {
            await fetch(`https://api.stripe.com/v1/subscription_items/${item.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ proration_behavior: 'create_prorations' }).toString(),
            })
          }
        }

        // Update subscription metadata
        const newPlansString = plans.sort().join(',')
        await stripePost(`subscriptions/${restaurant.subscription_id}`, {
          'metadata[plans]': newPlansString,
          'metadata[restaurant_id]': restaurantId,
        })

        // Update Supabase immediately (webhook will also confirm)
        const newModules = {
          ordering:     newPlansString.includes('orders'),
          analytics:    newPlansString.includes('orders'),
          reservations: newPlansString.includes('bookings'),
          rota:         newPlansString.includes('team'),
        }
        await supabaseAdmin
          .from('restaurants')
          .update({ subscription_plans: newPlansString, enabled_modules: newModules })
          .eq('id', restaurantId)

        return NextResponse.json({ updated: true, plans: newPlansString })
      }
    }

    // ── Case 2: No active subscription — create Stripe Checkout session ──────
    let customerId = restaurant.stripe_customer_id
    if (!customerId) {
      const customer = await stripePost('customers', {
        email: restaurant.email,
        name:  restaurant.name,
        'metadata[restaurant_id]': restaurantId,
      })
      customerId = customer.id
      await supabaseAdmin
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('id', restaurantId)
    }

    const plansString = plans.sort().join(',')

    // Build URLSearchParams for checkout session (nested arrays need index notation)
    const params = new URLSearchParams({
      customer: customerId,
      mode: 'subscription',
      'payment_method_types[0]': 'card',
      success_url: `${appUrl}/dashboard/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/dashboard/settings/billing?canceled=1`,
      'metadata[restaurant_id]': restaurantId,
      'metadata[plans]': plansString,
      'subscription_data[metadata][restaurant_id]': restaurantId,
      'subscription_data[metadata][plans]': plansString,
      allow_promotion_codes: 'true',
    })
    plans.forEach((plan, i) => {
      params.set(`line_items[${i}][price]`, PRICE_IDS[plan])
      params.set(`line_items[${i}][quantity]`, '1')
    })

    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }).then(r => r.json())

    if (session.error) {
      return NextResponse.json({ error: session.error.message }, { status: 400 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
