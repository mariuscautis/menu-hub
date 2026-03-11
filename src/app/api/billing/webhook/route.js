import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

/**
 * Verify Stripe webhook signature using Web Crypto API (compatible with Cloudflare edge runtime).
 * Stripe signs with HMAC-SHA256. The `stripe-signature` header contains:
 *   t=<timestamp>,v1=<signature>[,v1=<signature2>...]
 */
async function verifyStripeSignature(body, sigHeader, secret) {
  const parts = Object.fromEntries(
    sigHeader.split(',').map(part => {
      const [k, ...v] = part.split('=')
      return [k, v.join('=')]
    })
  )
  const timestamp = parts.t
  const signatures = sigHeader.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3))

  if (!timestamp || signatures.length === 0) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const payload = `${timestamp}.${body}`
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

  return signatures.some(sig => sig === computed)
}

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

async function updateSubscription(supabaseAdmin, restaurantId, sub) {
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
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  const valid = await verifyStripeSignature(body, sig || '', process.env.STRIPE_WEBHOOK_SECRET)
  if (!valid) {
    console.error('Webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event
  try {
    event = JSON.parse(body)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Helper to fetch a subscription via Stripe REST API (no SDK needed)
  async function fetchSubscription(subscriptionId) {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })
    return res.json()
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        if (!restaurantId) break
        await updateSubscription(supabaseAdmin, restaurantId, sub)
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
          const sub = await fetchSubscription(invoice.subscription)
          const restaurantId = sub.metadata?.restaurant_id
          if (!restaurantId) break
          await updateSubscription(supabaseAdmin, restaurantId, sub)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const sub = await fetchSubscription(invoice.subscription)
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
