import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)


/**
 * Plan → modules mapping:
 *   orders   → ordering + analytics
 *   bookings → reservations
 *   team     → rota
 */
function plansToModules(plansString) {
  const plans = (plansString || '').split(',').map(p => p.trim()).filter(Boolean)
  return {
    ordering:     plans.includes('orders'),
    analytics:    plans.includes('orders'),
    reservations: plans.includes('bookings'),
    rota:         plans.includes('team'),
  }
}

async function updateSubscription(restaurantId, sub, stripe) {
  const plans   = sub.metadata?.plans || ''
  const modules = plansToModules(plans)

  await supabaseAdmin
    .from('restaurants')
    .update({
      subscription_id:     sub.id,
      subscription_status: sub.status,
      subscription_plans:  plans,
      enabled_modules:     modules,
      current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq('id', restaurantId)
}

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        if (!restaurantId) break
        await updateSubscription(restaurantId, sub, stripe)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        if (!restaurantId) break
        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_status: 'canceled',
            subscription_plans:  '',
            enabled_modules:     { ordering: false, analytics: false, reservations: false, rota: false },
            current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('id', restaurantId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          const restaurantId = sub.metadata?.restaurant_id
          if (!restaurantId) break
          await updateSubscription(restaurantId, sub, stripe)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          const restaurantId = sub.metadata?.restaurant_id
          if (!restaurantId) break
          await supabaseAdmin
            .from('restaurants')
            .update({ subscription_status: 'past_due' })
            .eq('id', restaurantId)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
