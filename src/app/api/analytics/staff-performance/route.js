export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Get all staff members for the restaurant
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, department')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    // Get all completed, paid orders for the date range with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(department))')
      .eq('restaurant_id', restaurantId)
      .eq('paid', true)
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get completed waiter calls for the date range
    const { data: waiterCalls, error: waiterCallsError } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')

    if (waiterCallsError) {
      console.error('Error fetching waiter calls:', waiterCallsError)
      // Don't fail the whole request, just log and continue
    }

    // Calculate overall metrics
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
    const totalOrders = orders.length

    // Count bar vs kitchen products
    let barItemsCount = 0
    let kitchenItemsCount = 0

    orders.forEach(order => {
      order.order_items?.forEach(item => {
        const department = item.menu_items?.department || 'kitchen'
        const quantity = item.quantity || 0
        if (department === 'bar') {
          barItemsCount += quantity
        } else {
          kitchenItemsCount += quantity
        }
      })
    })

    const totalItems = barItemsCount + kitchenItemsCount
    const barRatio = totalItems > 0 ? (barItemsCount / totalItems * 100) : 0
    const kitchenRatio = totalItems > 0 ? (kitchenItemsCount / totalItems * 100) : 0

    // Aggregate by staff member (based on who took payment)
    const staffStats = {}

    // Initialize all staff members with zero stats
    staff.forEach(s => {
      staffStats[s.name || s.email] = {
        staff_id: s.id,
        staff_name: s.name || s.email,
        staff_email: s.email,
        department: s.department,
        total_orders: 0,
        total_revenue: 0,
        total_tips: 0,
        avg_order_value: 0,
        bar_items_sold: 0,
        kitchen_items_sold: 0,
        waiter_calls_handled: 0,
        avg_waiter_response_minutes: 0
      }
    })

    // Aggregate data for each staff member
    orders.forEach(order => {
      const staffName = order.payment_taken_by_name || 'Unknown'

      if (!staffStats[staffName]) {
        staffStats[staffName] = {
          staff_id: null,
          staff_name: staffName,
          staff_email: 'N/A',
          department: 'unknown',
          total_orders: 0,
          total_revenue: 0,
          total_tips: 0,
          avg_order_value: 0,
          bar_items_sold: 0,
          kitchen_items_sold: 0
        }
      }

      staffStats[staffName].total_orders += 1
      staffStats[staffName].total_revenue += parseFloat(order.total || 0)
      staffStats[staffName].total_tips += parseFloat(order.tip_amount || 0)

      // Count bar vs kitchen items for this staff member
      order.order_items?.forEach(item => {
        const department = item.menu_items?.department || 'kitchen'
        const quantity = item.quantity || 0
        if (department === 'bar') {
          staffStats[staffName].bar_items_sold += quantity
        } else {
          staffStats[staffName].kitchen_items_sold += quantity
        }
      })
    })

    // Aggregate waiter call data for each staff member
    if (waiterCalls && waiterCalls.length > 0) {
      waiterCalls.forEach(call => {
        const staffName = call.acknowledged_by_name
        if (staffName && staffStats[staffName]) {
          // Calculate response time
          if (call.completed_at && call.created_at) {
            const createdTime = new Date(call.created_at).getTime()
            const completedTime = new Date(call.completed_at).getTime()
            const responseTimeMinutes = (completedTime - createdTime) / (1000 * 60)

            // Track total response time and count for averaging later
            if (!staffStats[staffName]._totalResponseTime) {
              staffStats[staffName]._totalResponseTime = 0
            }
            staffStats[staffName]._totalResponseTime += responseTimeMinutes
            staffStats[staffName].waiter_calls_handled += 1
          }
        }
      })
    }

    // Calculate averages and sort by revenue
    const enrichedStats = Object.values(staffStats)
      .map(stat => ({
        ...stat,
        avg_order_value: stat.total_orders > 0 ? stat.total_revenue / stat.total_orders : 0,
        total_items_sold: stat.bar_items_sold + stat.kitchen_items_sold,
        bar_ratio: (stat.bar_items_sold + stat.kitchen_items_sold) > 0
          ? (stat.bar_items_sold / (stat.bar_items_sold + stat.kitchen_items_sold) * 100)
          : 0,
        kitchen_ratio: (stat.bar_items_sold + stat.kitchen_items_sold) > 0
          ? (stat.kitchen_items_sold / (stat.bar_items_sold + stat.kitchen_items_sold) * 100)
          : 0,
        avg_waiter_response_minutes: stat.waiter_calls_handled > 0
          ? (stat._totalResponseTime / stat.waiter_calls_handled)
          : 0,
        _totalResponseTime: undefined // Remove temp field from output
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)

    // Add ranking
    const rankedStats = enrichedStats.map((stat, index) => ({
      ...stat,
      rank: index + 1,
      performance: stat.total_revenue >= (totalRevenue / enrichedStats.length) ? 'high' : 'standard'
    }))

    return NextResponse.json({
      success: true,
      data: rankedStats,
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        total_staff: staff.length,
        avg_revenue_per_staff: staff.length > 0 ? totalRevenue / staff.length : 0,
        bar_items_count: barItemsCount,
        kitchen_items_count: kitchenItemsCount,
        bar_ratio: barRatio,
        kitchen_ratio: kitchenRatio,
        total_items: totalItems
      }
    })
  } catch (error) {
    console.error('Error in staff performance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
