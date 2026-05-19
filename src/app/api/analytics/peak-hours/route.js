export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 })
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Fetch paid orders directly — orders.total is tax-inclusive
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('paid', true)
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', `${end}T23:59:59.999Z`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Initialise all 24 hour buckets
    const hourlyStats = {}
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { hour: i, total_orders: 0, total_revenue: 0, days_with_activity: new Set() }
    }

    // Track distinct days that had any orders (for averaging)
    const activeDays = new Set()

    ;(orders || []).forEach(order => {
      const date = new Date(order.created_at)
      const hour = date.getUTCHours()
      const dayKey = date.toISOString().split('T')[0]

      hourlyStats[hour].total_orders += 1
      hourlyStats[hour].total_revenue += parseFloat(order.total || 0)
      hourlyStats[hour].days_with_activity.add(dayKey)
      activeDays.add(dayKey)
    })

    const totalDays = activeDays.size || 1

    const result = Object.values(hourlyStats).map(stat => {
      const daysCount = stat.days_with_activity.size || 1
      return {
        hour:          stat.hour,
        hour_label:    `${String(stat.hour).padStart(2, '0')}:00`,
        total_orders:  stat.total_orders,
        total_revenue: parseFloat(stat.total_revenue.toFixed(2)),
        avg_orders:    parseFloat((stat.total_orders / totalDays).toFixed(2)),
        avg_revenue:   parseFloat((stat.total_revenue / totalDays).toFixed(2)),
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in peak hours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
