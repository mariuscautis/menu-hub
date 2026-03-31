import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/services/email-edge'
import emailTranslations from '@/lib/email-translations'

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

async function notifyClientSubscription(action, restaurant, plansString, currentPeriodEnd) {
  if (!restaurant?.email) return

  const lang = restaurant.email_language || 'en'
  const t = emailTranslations[lang] || emailTranslations.en
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'

  const PLAN_LABELS_LOCAL = { orders: 'Orders', bookings: 'Bookings', team: 'Team' }
  const plans = (plansString || '').split(',').filter(Boolean)
  const planDisplay = plans.length > 0
    ? plans.map(p => PLAN_LABELS_LOCAL[p] || p).join(', ')
    : '—'

  const periodEndFmt = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(
        { en: 'en-GB', ro: 'ro-RO', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' }[lang] || 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }
      )
    : null

  const name = restaurant.name || restaurant.email

  const css = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; background: #f4f4f8; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background-color: #6262bd; color: white; padding: 30px; text-align: center; }
    .header h2 { margin: 0; font-size: 22px; }
    .content { padding: 28px 30px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .info-label { color: #888; }
    .info-value { font-weight: 600; color: #333; }
    .button { display: block; width: fit-content; margin: 24px auto; padding: 13px 30px; background: #6262bd; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
    .help { text-align: center; font-size: 13px; color: #888; margin-top: 16px; }
    .help a { color: #6262bd; text-decoration: none; }
    .footer { background: #f9f9fb; padding: 16px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  `

  let subject, title, greeting, intro, extraRows = '', extraContent = ''

  if (action === 'created') {
    subject = t.subCreatedSubject
    title = t.subCreatedTitle
    greeting = (t.subCreatedGreeting || '').replace('{restaurantName}', name)
    intro = t.subCreatedIntro
    extraRows = `
      <div class="info-row"><span class="info-label">${t.subPlanLabel}</span><span class="info-value">${planDisplay}</span></div>
      ${periodEndFmt ? `<div class="info-row"><span class="info-label">${t.subNextBillingLabel}</span><span class="info-value">${periodEndFmt}</span></div>` : ''}
    `
  } else if (action === 'updated') {
    subject = t.subUpdatedSubject
    title = t.subUpdatedTitle
    greeting = (t.subUpdatedGreeting || '').replace('{restaurantName}', name)
    intro = t.subUpdatedIntro
    extraRows = `
      <div class="info-row"><span class="info-label">${t.subPlanLabel}</span><span class="info-value">${planDisplay}</span></div>
      ${periodEndFmt ? `<div class="info-row"><span class="info-label">${t.subNextBillingLabel}</span><span class="info-value">${periodEndFmt}</span></div>` : ''}
    `
  } else if (action === 'canceled') {
    subject = t.subCanceledSubject
    title = t.subCanceledTitle
    greeting = (t.subCanceledGreeting || '').replace('{restaurantName}', name)
    intro = t.subCanceledIntro
    extraRows = periodEndFmt
      ? `<div class="info-row"><span class="info-label">${t.subCanceledAccessUntil}</span><span class="info-value">${periodEndFmt}</span></div>`
      : ''
    extraContent = `
      <p style="font-size:13px;color:#888;margin-top:16px;">${t.subCanceledHelp}</p>
      <a href="${appUrl}/dashboard/settings/billing" class="button">${t.subCanceledResubscribeCta}</a>
    `
  } else if (action === 'past_due') {
    subject = t.subPaymentFailedSubject
    title = t.subPaymentFailedTitle
    greeting = (t.subPaymentFailedGreeting || '').replace('{restaurantName}', name)
    intro = t.subPaymentFailedIntro
    extraContent = `<a href="${appUrl}/dashboard/settings/billing" class="button">${t.subPaymentFailedCta}</a>`
  } else {
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><style>${css}</style></head>
      <body>
        <div class="container">
          <div class="header"><h2>${title}</h2></div>
          <div class="content">
            <p>${greeting}</p>
            <p>${intro}</p>
            ${extraRows ? `<div style="margin:20px 0">${extraRows}</div>` : ''}
            ${action === 'created' || action === 'updated'
              ? `<a href="${appUrl}/dashboard" class="button">${t.subCta}</a>`
              : extraContent}
            <p class="help"><a href="mailto:support@venoapp.com">support@venoapp.com</a></p>
          </div>
          <div class="footer">${t.subFooter}</div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: restaurant.email,
    subject,
    htmlContent,
  }).catch(err => console.error(`Client billing email (${action}) failed:`, err))
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
      // Checkout session completed — set modules immediately from session metadata
      // (more reliable than waiting for customer.subscription.created)
      case 'checkout.session.completed': {
        const session = event.data.object
        const restaurantId = session.metadata?.restaurant_id
        const plansString  = session.metadata?.plans
        if (!restaurantId || !plansString) break
        const modules = plansToModules(plansString)
        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_plans: plansString,
            enabled_modules:    modules,
          })
          .eq('id', restaurantId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        if (!restaurantId) break
        await updateSubscription(supabaseAdmin, restaurantId, sub)
        const { data: r } = await supabaseAdmin.from('restaurants').select('name, email, email_language').eq('id', restaurantId).single()
        const action = event.type === 'customer.subscription.created' ? 'created' : 'updated'
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : sub.items?.data?.[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null
        await Promise.all([
          notifyAdminSubscription(action, r?.name, r?.email, sub.metadata?.plans, sub.status),
          notifyClientSubscription(action, r, sub.metadata?.plans, periodEnd),
        ])
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const restaurantId = sub.metadata?.restaurant_id
        if (!restaurantId) break
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : sub.items?.data?.[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null
        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_status: 'canceled',
            subscription_plans:  '',
            enabled_modules:     { ordering: false, analytics: false, reservations: false, rota: false },
            current_period_end:  periodEnd,
          })
          .eq('id', restaurantId)
        const { data: r } = await supabaseAdmin.from('restaurants').select('name, email, email_language').eq('id', restaurantId).single()
        await Promise.all([
          notifyAdminSubscription('canceled', r?.name, r?.email, sub.metadata?.plans, 'canceled'),
          notifyClientSubscription('canceled', r, sub.metadata?.plans, periodEnd),
        ])
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const sub = await fetchSubscription(invoice.subscription)
          const restaurantId = sub.metadata?.restaurant_id
          if (!restaurantId) break
          // Only clear payment_failed_at and refresh billing dates.
          // subscription_plans / enabled_modules are set by customer.subscription.created/updated
          // to avoid overwriting with stale Stripe metadata.
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : sub.items?.data?.[0]?.current_period_end
              ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
              : null
          await supabaseAdmin
            .from('restaurants')
            .update({
              payment_failed_at:   null,
              subscription_status: sub.status,
              current_period_end:  periodEnd,
            })
            .eq('id', restaurantId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          const sub = await fetchSubscription(invoice.subscription)
          const restaurantId = sub.metadata?.restaurant_id
          if (!restaurantId) break
          const now = new Date().toISOString()
          await supabaseAdmin
            .from('restaurants')
            .update({ subscription_status: 'past_due', payment_failed_at: now })
            .eq('id', restaurantId)
          const { data: r } = await supabaseAdmin.from('restaurants').select('name, email, email_language').eq('id', restaurantId).single()
          await Promise.all([
            notifyAdminSubscription('past_due', r?.name, r?.email, sub.metadata?.plans, 'past_due'),
            notifyClientSubscription('past_due', r, sub.metadata?.plans, null),
          ])
        }
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object
        // Only handle terminal payments (identified by table_id in metadata)
        if (!pi.metadata?.table_id) break
        await supabaseAdmin
          .from('terminal_payments')
          .update({ status: 'succeeded', completed_at: new Date().toISOString() })
          .eq('payment_intent_id', pi.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        if (!pi.metadata?.table_id) break
        const declineCode = pi.last_payment_error?.decline_code
          || pi.last_payment_error?.code
          || 'card_declined'
        await supabaseAdmin
          .from('terminal_payments')
          .update({ status: 'failed', decline_code: declineCode })
          .eq('payment_intent_id', pi.id)
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
