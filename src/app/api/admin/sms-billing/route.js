export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/services/email-edge'
import { getEmailTranslations } from '@/lib/email-translations'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return admin ? user : null
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

function formatMonth(yearMonth, lang = 'en') {
  const [year, month] = yearMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const localeMap = { en: 'en-GB', ro: 'ro-RO', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' }
  return date.toLocaleDateString(localeMap[lang] || 'en-GB', { month: 'long', year: 'numeric' })
}

function formatDate(iso, lang) {
  if (!iso) return null
  const localeMap = { en: 'en-GB', ro: 'ro-RO', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' }
  return new Date(iso).toLocaleDateString(localeMap[lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function sendSmsBillingEmail({ restaurant, smsCount, ratePence, amountPence, billingMonth }) {
  if (!restaurant.email) return
  const lang = restaurant.email_language || 'en'
  const tr = getEmailTranslations(lang)

  const monthLabel = formatMonth(billingMonth, lang)
  const renewalLabel = formatDate(restaurant.current_period_end, lang)
  const amountFormatted = `£${(amountPence / 100).toFixed(2)}`
  const rateFormatted = `${ratePence}p`

  const collectionNote = renewalLabel
    ? tr.smsBillingCollectionNote.replace('{renewalDate}', renewalLabel)
    : tr.smsBillingCollectionNoteNoDate

  const subject = tr.smsBillingSubject.replace('{month}', monthLabel)
  const title = tr.smsBillingTitle.replace('{month}', monthLabel)
  const greeting = tr.smsBillingGreeting.replace('{restaurantName}', restaurant.name)
  const intro = tr.smsBillingIntro.replace('{month}', monthLabel)

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; background: #f4f4f8; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background-color: #6262bd; color: white; padding: 30px; text-align: center; }
        .header h2 { margin: 0; font-size: 22px; }
        .content { padding: 28px 30px; }
        .info-box { background: #f8f8ff; border: 2px solid #e8e8f8; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 15px; }
        .info-table tr td { padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-table tr:last-child td { border-bottom: none; font-weight: bold; }
        .info-label { color: #666; width: 60%; }
        .info-value { font-weight: 600; color: #333; text-align: right; white-space: nowrap; }
        .total-value { color: #6262bd; font-size: 18px; }
        .note-box { background: #f0f9ff; border: 2px solid #bae0fd; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #1e40af; }
        .help-box { background: #f9fafb; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #555; }
        .help-box a { color: #6262bd; text-decoration: none; }
        .footer { background: #f9f9fb; padding: 16px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📱 ${title}</h2>
        </div>
        <div class="content">
          <p>${greeting}</p>
          <p>${intro}</p>
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">${tr.smsBillingSmsCount}</td>
                <td class="info-value">${smsCount}</td>
              </tr>
              <tr>
                <td class="info-label">${tr.smsBillingRatePence}</td>
                <td class="info-value">${rateFormatted}</td>
              </tr>
              <tr>
                <td class="info-label">${tr.smsBillingTotal}</td>
                <td class="info-value total-value">${amountFormatted}</td>
              </tr>
            </table>
          </div>
          <div class="note-box">📅 ${collectionNote}</div>
          <div class="help-box">
            <strong>${tr.smsBillingQuestion}</strong><br>
            ${tr.smsBillingContact}
          </div>
        </div>
        <div class="footer">${tr.smsBillingFooter}</div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: restaurant.email, subject, htmlContent, fromName: 'Veno App' }).catch(err =>
    console.error(`SMS billing email failed for ${restaurant.name}:`, err)
  )
}

/**
 * POST /api/admin/sms-billing
 * Body: { billingMonth: '2026-02' }  — defaults to previous month if omitted
 *
 * For each opted-in restaurant with SMS usage in the given month:
 * - Creates a Stripe invoice item on their customer (added to next invoice)
 * - Sends a notification email to the venue manager in their language
 * - Records the result in sms_billing_runs
 */
export async function POST(request) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getSupabaseAdmin()
  const body = await request.json().catch(() => ({}))

  // Default to previous month
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const billingMonth = body.billingMonth ||
    `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

  // Guard: check if billing already ran for this month
  if (!body.force) {
    const { data: existingRun } = await supabaseAdmin
      .from('sms_billing_runs')
      .select('ran_at')
      .eq('billing_month', billingMonth)
      .order('ran_at', { ascending: false })
      .limit(1)
      .single()

    if (existingRun) {
      return NextResponse.json({
        error: 'already_billed',
        message: `SMS charges for ${billingMonth} were already applied on ${new Date(existingRun.ran_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        ran_at: existingRun.ran_at
      }, { status: 409 })
    }
  }

  // Fetch usage grouped by restaurant for the given month
  const { data: usageRows, error: usageError } = await supabaseAdmin
    .from('sms_usage_log')
    .select('restaurant_id')
    .eq('billing_month', billingMonth)

  if (usageError) {
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }

  if (!usageRows?.length) {
    return NextResponse.json({ billingMonth, results: [], message: 'No SMS usage found for this month.' })
  }

  // Count per restaurant
  const countMap = {}
  usageRows.forEach(r => { countMap[r.restaurant_id] = (countMap[r.restaurant_id] || 0) + 1 })

  const restaurantIds = Object.keys(countMap)

  // Fetch restaurant details (only opted-in, with stripe_customer_id)
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, email, email_language, stripe_customer_id, current_period_end, sms_billing_enabled, sms_billing_rate_pence')
    .in('id', restaurantIds)
    .eq('sms_billing_enabled', true)
    .not('stripe_customer_id', 'is', null)

  const results = []

  for (const restaurant of (restaurants || [])) {
    const smsCount = countMap[restaurant.id] || 0
    const ratePence = restaurant.sms_billing_rate_pence ?? 20
    const amountPence = smsCount * ratePence

    if (amountPence === 0) continue

    try {
      const invoiceItem = await stripePost('invoiceitems', {
        customer: restaurant.stripe_customer_id,
        amount: String(amountPence),
        currency: 'gbp',
        description: `SMS verification charges — ${smsCount} SMS × ${ratePence}p (${billingMonth})`,
      })

      if (invoiceItem.error) {
        results.push({ restaurant_id: restaurant.id, name: restaurant.name, sms_count: smsCount, amount_pence: amountPence, error: invoiceItem.error.message })
      } else {
        results.push({ restaurant_id: restaurant.id, name: restaurant.name, sms_count: smsCount, amount_pence: amountPence, stripe_invoice_item_id: invoiceItem.id })
        // Send notification email to venue manager
        await sendSmsBillingEmail({ restaurant, smsCount, ratePence, amountPence, billingMonth })
      }
    } catch (err) {
      results.push({ restaurant_id: restaurant.id, name: restaurant.name, sms_count: smsCount, amount_pence: amountPence, error: err.message })
    }
  }

  // Record the billing run
  await supabaseAdmin
    .from('sms_billing_runs')
    .insert({ billing_month: billingMonth, run_by: user.id, results })

  return NextResponse.json({ billingMonth, results })
}

/**
 * GET /api/admin/sms-billing?month=2026-02
 * Returns SMS usage summary for a given month (preview before running)
 */
export async function GET(request) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)

  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = searchParams.get('month') ||
    `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

  const { data: usageRows } = await supabaseAdmin
    .from('sms_usage_log')
    .select('restaurant_id')
    .eq('billing_month', month)

  const countMap = {}
  ;(usageRows || []).forEach(r => { countMap[r.restaurant_id] = (countMap[r.restaurant_id] || 0) + 1 })

  const restaurantIds = Object.keys(countMap)
  if (!restaurantIds.length) return NextResponse.json({ month, venues: [] })

  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, stripe_customer_id, sms_billing_enabled, sms_billing_rate_pence')
    .in('id', restaurantIds)

  const venues = (restaurants || []).map(r => ({
    id: r.id,
    name: r.name,
    sms_count: countMap[r.id] || 0,
    rate_pence: r.sms_billing_rate_pence ?? 20,
    amount_pence: (countMap[r.id] || 0) * (r.sms_billing_rate_pence ?? 20),
    billing_enabled: r.sms_billing_enabled,
    has_stripe: !!r.stripe_customer_id,
  })).sort((a, b) => b.sms_count - a.sms_count)

  // Also fetch last billing run for this month
  const { data: lastRun } = await supabaseAdmin
    .from('sms_billing_runs')
    .select('ran_at, results')
    .eq('billing_month', month)
    .order('ran_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ month, venues, lastRun: lastRun || null })
}
