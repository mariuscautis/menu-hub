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
 * POST /api/customers/peer-ratings
 * Body: { restaurantId, customerIds }
 *
 * Returns peer ratings and visit counts across all venues in the same
 * industry category as restaurantId, for the given customerIds.
 * Uses service role to bypass RLS on customer_ratings.
 *
 * Caller must be authenticated as the restaurant owner.
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { restaurantId, customerIds } = await request.json()
    if (!restaurantId || !customerIds?.length) {
      return NextResponse.json({ ratingMap: {}, visitMap: {} })
    }

    // Verify the caller owns this restaurant OR is a platform admin
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, industry_category, owner_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (restaurant.owner_id !== user.id) {
      // Check if caller is a platform admin (impersonation case)
      const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!restaurant.industry_category) {
      return NextResponse.json({ ratingMap: {}, visitMap: {} })
    }

    // Get all venues in the same category
    const { data: peerVenues } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('industry_category', restaurant.industry_category)

    const peerIds = (peerVenues || []).map(v => v.id)
    if (!peerIds.length) {
      return NextResponse.json({ ratingMap: {}, visitMap: {} })
    }

    // Fetch ratings across all peer venues for these customers
    const { data: peerRatings } = await supabaseAdmin
      .from('customer_ratings')
      .select('customer_id, rating')
      .in('restaurant_id', peerIds)
      .in('customer_id', customerIds)

    // Fetch visit counts across all peer venues
    const { data: peerReservations } = await supabaseAdmin
      .from('reservations')
      .select('customer_id')
      .in('restaurant_id', peerIds)
      .in('customer_id', customerIds)
      .not('customer_id', 'is', null)

    // Build rating map: customerId -> [ratings]
    const ratingMap = {}
    ;(peerRatings || []).forEach(r => {
      if (!ratingMap[r.customer_id]) ratingMap[r.customer_id] = []
      ratingMap[r.customer_id].push(r.rating)
    })

    // Build visit map: customerId -> count
    const visitMap = {}
    ;(peerReservations || []).forEach(r => {
      visitMap[r.customer_id] = (visitMap[r.customer_id] || 0) + 1
    })

    // Compute averages
    const avgMap = {}
    for (const [customerId, ratings] of Object.entries(ratingMap)) {
      avgMap[customerId] = (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1)
    }

    return NextResponse.json({ avgMap, visitMap })
  } catch (err) {
    console.error('peer-ratings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/customers/peer-ratings?restaurantId=&customerId=
 * Returns last 10 peer reviews (rating + note + venue name + date) for one customer,
 * across all venues in the same industry category, excluding the caller's own venue.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const customerId = searchParams.get('customerId')
    if (!restaurantId || !customerId) {
      return NextResponse.json({ reviews: [] })
    }

    // Verify caller owns this restaurant or is admin
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, industry_category, owner_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (restaurant.owner_id !== user.id) {
      const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!restaurant.industry_category) {
      return NextResponse.json({ reviews: [] })
    }

    // Peer venue IDs (same category, excluding own)
    const { data: peerVenues } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('industry_category', restaurant.industry_category)
      .neq('id', restaurantId)

    const peerIds = (peerVenues || []).map(v => v.id)
    if (!peerIds.length) return NextResponse.json({ reviews: [] })

    const venueNameMap = {}
    ;(peerVenues || []).forEach(v => { venueNameMap[v.id] = v.name })

    // Last 10 peer reviews for this customer
    const { data: ratings } = await supabaseAdmin
      .from('customer_ratings')
      .select('restaurant_id, rating, note, created_at')
      .in('restaurant_id', peerIds)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)

    const reviews = (ratings || []).map(r => ({
      rating: r.rating,
      note: r.note || null,
      created_at: r.created_at,
      venue_name: venueNameMap[r.restaurant_id] || 'Another venue',
    }))

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error('peer-ratings GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
