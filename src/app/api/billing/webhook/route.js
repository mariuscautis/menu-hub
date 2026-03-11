import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/services/email-edge'

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

const PLAN_LABELS = { orders: 'Orders', bookings: 'Bookings', team: 'Team' }

async function notifyAdminSubscription(action, restaurantName, email, plansString, status) {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL
  if (!adminEmail) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
  const plans = (plansString || '').split(',').filter(Boolean)
  const planDisplay = plans.length > 0
    ? plans.map(p => PLAN_LABELS[p] || p).join(', ')
    : 'None'

  const actionLabels = {
    created:   { emoji: '🟢', title: 'New Subscription' },
    updated:   { emoji: '🔄', title: 'Subscription Updated' },
    canceled:  { emoji: '🔴', title: 'Subscription Cancelled' },
    past_due:  { emoji: '⚠️',  title: 'Payment Failed' },
  }
  const { emoji, title } = actionLabels[action] || { emoji: '📋', title: 'Subscription Change' }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .field { margin-bottom: 12px; }
          .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 15px; font-weight: 600; color: #333; }
          .button { display: inline-block; padding: 12px 24px; background-color: #6262bd; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0">${emoji} ${title}</h2>
          </div>
          <div class="content">
            <div class="field"><div class="label">Restaurant</div><div class="value">${restaurantName || 'Unknown'}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${email || '—'}</div></div>
            <div class="field"><div class="label">Plans</div><div class="value">${planDisplay}</div></div>
            <div class="field"><div class="label">Status</div><div class="value">${status || action}</div></div>
            <p style="text-align:center">
              <a href="${appUrl}/admin/billing" class="button">View Billing Dashboard</a>
            </p>
            <div class="footer">Veno App — automated notification</div>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: adminEmail,
    subject: `${emoji} ${title}: ${restaurantName || email}`,
    htmlContent,
  }).catch(err => console.error('Admin subscription notification failed:', err))
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
      current_period_end:  sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : sub.items?.data?.[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
          : null,
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
        const { data: r } = await supabaseAdmin.from('restaurants').select('name, email').eq('id', restaurantId).single()
        const action = event.type === 'customer.subscription.created' ? 'created' : 'updated'
        await notifyAdminSubscription(action, r?.name, r?.email, sub.metadata?.plans, sub.status)
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
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : sub.items?.data?.[0]?.current_period_end
                ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
                : null,
          })
          .eq('id', restaurantId)
        const { data: r } = await supabaseAdmin.from('restaurants').select('name, email').eq('id', restaurantId).single()
        await notifyAdminSubscription('canceled', r?.name, r?.email, sub.metadata?.plans, 'canceled')
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
          const { data: r } = await supabaseAdmin.from('restaurants').select('name, email').eq('id', restaurantId).single()
          await notifyAdminSubscription('past_due', r?.name, r?.email, sub.metadata?.plans, 'past_due')
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
