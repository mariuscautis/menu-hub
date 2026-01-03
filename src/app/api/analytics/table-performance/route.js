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

    // Get all tables for the restaurant
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('id, table_number, last_cleanup_duration_minutes')
      .eq('restaurant_id', restaurantId)
      .order('table_number')

    if (tablesError) {
      console.error('Error fetching tables:', tablesError)
      return NextResponse.json({ error: tablesError.message }, { status: 500 })
    }

    // Get all completed, paid orders for the date range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
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

    // Calculate total days in range for occupancy rate
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const daysInRange = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1

    // Assume restaurant is open 12 hours per day (adjust as needed)
    const hoursOpenPerDay = 12
    const totalAvailableTime = daysInRange * hoursOpenPerDay * 60 // in minutes

    // Aggregate by table
    const tableStats = tables.map(table => {
      const tableOrders = orders.filter(o => o.table_id === table.id)
      const totalOrders = tableOrders.length
      const totalRevenue = tableOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

      // Calculate total items sold (for upsell metrics)
      const totalItems = tableOrders.reduce((sum, o) =>
        sum + (o.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0
      )

      // Calculate average items per order
      const avgItemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0

      // Estimate duration and occupancy
      // Average meal duration is typically 45-90 minutes
      const avgDurationMinutes = 60 // Default estimate
      const totalOccupiedTime = totalOrders * avgDurationMinutes
      const occupancyRate = totalAvailableTime > 0 ? (totalOccupiedTime / (totalAvailableTime / tables.length)) * 100 : 0

      // Calculate turnover (how many services per day)
      const turnoverRate = daysInRange > 0 ? totalOrders / daysInRange : 0

      // Average spend per order
      const avgRevenuePerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Estimate average spend per person (assuming 2 people per table on average)
      const estimatedGuests = totalOrders * 2
      const avgSpendPerPerson = estimatedGuests > 0 ? totalRevenue / estimatedGuests : 0

      // Calculate revenue per hour
      const revenuePerHour = totalOccupiedTime > 0 ? (totalRevenue / totalOccupiedTime * 60) : 0

      // Tips data (if tracked in payment data)
      const totalTips = tableOrders.reduce((sum, o) => sum + parseFloat(o.tip_amount || 0), 0)
      const avgTipPerOrder = totalOrders > 0 ? totalTips / totalOrders : 0

      // Cleanup time data (from table record)
      const avgCleanupTime = table.last_cleanup_duration_minutes || 0

      // Waiter call metrics
      const tableWaiterCalls = (waiterCalls || []).filter(call => call.table_id === table.id)
      const totalWaiterCalls = tableWaiterCalls.length

      // Calculate average waiting time (from created_at to completed_at)
      let avgWaiterResponseTime = 0
      if (totalWaiterCalls > 0) {
        const totalResponseTime = tableWaiterCalls.reduce((sum, call) => {
          if (call.completed_at && call.created_at) {
            const createdTime = new Date(call.created_at).getTime()
            const completedTime = new Date(call.completed_at).getTime()
            const responseTimeMinutes = (completedTime - createdTime) / (1000 * 60)
            return sum + responseTimeMinutes
          }
          return sum
        }, 0)
        avgWaiterResponseTime = totalResponseTime / totalWaiterCalls
      }

      return {
        table_id: table.id,
        table_number: table.table_number,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_items_sold: totalItems,
        avg_items_per_order: avgItemsPerOrder,
        avg_revenue_per_order: avgRevenuePerOrder,
        avg_spend_per_person: avgSpendPerPerson,
        avg_duration_minutes: avgDurationMinutes,
        turnover_rate: turnoverRate,
        occupancy_rate: Math.min(occupancyRate, 100), // Cap at 100%
        revenue_per_hour: revenuePerHour,
        total_tips: totalTips,
        avg_tip_per_order: avgTipPerOrder,
        tip_percentage: avgRevenuePerOrder > 0 ? (avgTipPerOrder / avgRevenuePerOrder * 100) : 0,
        avg_cleanup_time_minutes: avgCleanupTime,
        total_waiter_calls: totalWaiterCalls,
        avg_waiter_response_minutes: avgWaiterResponseTime
      }
    })

    // Sort by total revenue to identify high/low performers
    const sortedStats = tableStats.sort((a, b) => b.total_revenue - a.total_revenue)

    // Calculate overall metrics
    const totalRevenue = sortedStats.reduce((sum, t) => sum + t.total_revenue, 0)
    const avgRevenuePerTable = tables.length > 0 ? totalRevenue / tables.length : 0

    // Tag high and low performers
    const enrichedStats = sortedStats.map((stat, index) => ({
      ...stat,
      performance: stat.total_revenue >= avgRevenuePerTable ? 'high' : 'low',
      rank: index + 1
    }))

    return NextResponse.json({
      success: true,
      data: enrichedStats,
      summary: {
        total_tables: tables.length,
        total_revenue: totalRevenue,
        avg_revenue_per_table: avgRevenuePerTable,
        date_range_days: daysInRange
      }
    })
  } catch (error) {
    console.error('Error in table performance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
