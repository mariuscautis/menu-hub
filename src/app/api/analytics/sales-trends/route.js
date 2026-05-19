export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day'

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 })
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Fetch paid orders directly — orders.total is the tax-inclusive price the customer paid.
    // daily_sales_summary inflates revenue by adding tax on top of item prices.
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('paid', true)
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', `${end}T23:59:59.999Z`)
      .order('created_at', { ascending: true })

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Fetch ingredient cost per day from daily_sales_summary (cost data is correct)
    const { data: costData } = await supabaseAdmin
      .from('daily_sales_summary')
      .select('date, total_cost')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    const costByDate = (costData || []).reduce((acc, d) => {
      acc[d.date] = parseFloat(d.total_cost || 0)
      return acc
    }, {})

    // Group orders by the requested period
    const grouped = {}

    for (const order of (orders || [])) {
      const date = new Date(order.created_at)
      let key

      if (groupBy === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      } else {
        key = date.toISOString().split('T')[0]
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, total_revenue: 0, total_orders: 0, total_cost: 0, total_profit: 0, total_items_sold: 0 }
      }
      grouped[key].total_revenue += parseFloat(order.total || 0)
      grouped[key].total_orders += 1
    }

    // Add cost data (aggregate by period key)
    for (const [date, cost] of Object.entries(costByDate)) {
      const d = new Date(date)
      let key

      if (groupBy === 'week') {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      } else {
        key = date
      }

      if (grouped[key]) {
        grouped[key].total_cost += cost
      }
    }

    const result = Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(period => {
        const profit = period.total_revenue - period.total_cost
        return {
          ...period,
          total_revenue:         parseFloat(period.total_revenue.toFixed(2)),
          total_cost:            parseFloat(period.total_cost.toFixed(2)),
          total_profit:          parseFloat(profit.toFixed(2)),
          average_order_value:   period.total_orders > 0 ? parseFloat((period.total_revenue / period.total_orders).toFixed(2)) : 0,
          profit_margin_percent: period.total_revenue > 0 ? parseFloat((profit / period.total_revenue * 100).toFixed(2)) : 0,
        }
      })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in sales trends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
