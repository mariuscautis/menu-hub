export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

/**
 * POST /api/admin/sms-billing
 * Body: { billingMonth: '2026-02' }  — defaults to previous month if omitted
 *
 * For each opted-in restaurant with SMS usage in the given month:
 * - Creates a Stripe invoice item on their customer (added to next invoice)
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
    .select('id, name, stripe_customer_id, sms_billing_enabled, sms_billing_rate_pence')
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
