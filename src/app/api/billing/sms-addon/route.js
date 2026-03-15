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

/**
 * POST /api/billing/sms-addon
 * Body: { restaurantId, enabled: boolean }
 *
 * Venue owners toggle SMS verification billing on/off for their own venue.
 * Super admins can override the rate via the restaurants module panel.
 */
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { restaurantId, enabled } = await request.json()
  if (!restaurantId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'restaurantId and enabled required' }, { status: 400 })
  }

  // Verify ownership (or platform admin)
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, owner_id')
    .eq('id', restaurantId)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (restaurant.owner_id !== user.id) {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('restaurants')
    .update({ sms_billing_enabled: enabled })
    .eq('id', restaurantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, sms_billing_enabled: enabled })
}

/**
 * GET /api/billing/sms-addon?restaurantId=xxx&month=2026-03
 * Returns SMS usage for the given venue and month (defaults to current month).
 * Only the venue owner or a platform admin can call this.
 */
export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin()

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurantId')
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

  // Verify ownership (or platform admin)
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, owner_id, sms_billing_rate_pence')
    .eq('id', restaurantId)
    .single()

  if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (restaurant.owner_id !== user.id) {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const month = searchParams.get('month') ||
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  const { count } = await supabaseAdmin
    .from('sms_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('billing_month', month)

  const ratePence = restaurant.sms_billing_rate_pence ?? 20
  const totalPence = (count || 0) * ratePence

  return NextResponse.json({ month, sms_count: count || 0, rate_pence: ratePence, total_pence: totalPence })
}
