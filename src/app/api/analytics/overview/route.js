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
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Query paid orders directly so revenue = orders.total (tax-inclusive price
    // the customer actually paid). The daily_sales_summary view adds tax on top
    // of item prices, inflating revenue figures.
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total')
      .eq('restaurant_id', restaurantId)
      .eq('paid', true)
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', `${end}T23:59:59.999Z`)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_revenue: 0,
          total_orders: 0,
          total_items_sold: 0,
          average_order_value: 0,
          total_cost: 0,
          total_profit: 0,
          profit_margin_percent: 0
        }
      })
    }

    const orderIds = orders.map(o => o.id)
    const total_revenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
    const total_orders = orders.length

    // Count total items sold from order_items
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('quantity')
      .in('order_id', orderIds)

    const total_items_sold = itemsError
      ? 0
      : (itemsData || []).reduce((sum, i) => sum + parseInt(i.quantity || 0), 0)

    // Pull ingredient cost from daily_sales_summary — this is stock-cost-based
    // and not affected by the tax calculation issue
    const { data: summaryData } = await supabaseAdmin
      .from('daily_sales_summary')
      .select('total_cost')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    const total_cost = (summaryData || []).reduce((sum, d) => sum + parseFloat(d.total_cost || 0), 0)
    const total_profit = total_revenue - total_cost

    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0
    const profit_margin_percent = total_revenue > 0 ? (total_profit / total_revenue * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        total_revenue:         parseFloat(total_revenue.toFixed(2)),
        total_orders,
        total_items_sold,
        average_order_value:   parseFloat(average_order_value.toFixed(2)),
        total_cost:            parseFloat(total_cost.toFixed(2)),
        total_profit:          parseFloat(total_profit.toFixed(2)),
        profit_margin_percent: parseFloat(profit_margin_percent.toFixed(2))
      }
    })
  } catch (error) {
    console.error('Error in analytics overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
