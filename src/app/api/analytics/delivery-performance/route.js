export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const department = searchParams.get('department') // Optional: filter by department/category

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 })
    }

    // Query order items with delivery data using the new view
    let query = supabase
      .from('order_item_delivery_analytics')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .not('delivered_at', 'is', null)

    // Add date filters if provided
    if (startDate) {
      query = query.gte('order_time', startDate)
    }
    if (endDate) {
      query = query.lte('order_time', endDate)
    }

    // Add department filter if provided
    if (department) {
      query = query.eq('item_category', department)
    }

    const { data: items, error } = await query.order('order_time', { ascending: false })

    if (error) throw error

    // Calculate metrics from item-level data
    const deliveryTimes = []
    const preparationTimes = []
    const waiterResponseTimes = []
    const departmentStats = {}

    items.forEach(item => {
      if (item.total_delivery_minutes) {
        deliveryTimes.push(item.total_delivery_minutes)
      }
      if (item.preparation_minutes) {
        preparationTimes.push(item.preparation_minutes)
      }
      if (item.waiter_response_minutes) {
        waiterResponseTimes.push(item.waiter_response_minutes)
      }

      // Track per-department statistics
      const dept = item.item_category || 'other'
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          itemCount: 0,
          deliveryTimes: [],
          preparationTimes: [],
          waiterResponseTimes: []
        }
      }
      departmentStats[dept].itemCount += item.quantity
      if (item.total_delivery_minutes) departmentStats[dept].deliveryTimes.push(item.total_delivery_minutes)
      if (item.preparation_minutes) departmentStats[dept].preparationTimes.push(item.preparation_minutes)
      if (item.waiter_response_minutes) departmentStats[dept].waiterResponseTimes.push(item.waiter_response_minutes)
    })

    // Helper function to calculate average
    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    // Helper function to calculate median
    const median = (arr) => {
      if (arr.length === 0) return 0
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    // Calculate department-level analytics
    const departmentAnalytics = {}
    Object.keys(departmentStats).forEach(dept => {
      const stats = departmentStats[dept]
      departmentAnalytics[dept] = {
        itemCount: stats.itemCount,
        averageDeliveryTime: Math.round(avg(stats.deliveryTimes) * 10) / 10,
        averagePreparationTime: Math.round(avg(stats.preparationTimes) * 10) / 10,
        averageWaiterResponseTime: Math.round(avg(stats.waiterResponseTimes) * 10) / 10
      }
    })

    // Group items by order for "recent orders" display
    const orderMap = {}
    items.forEach(item => {
      if (!orderMap[item.order_id]) {
        orderMap[item.order_id] = {
          orderId: item.order_id,
          tableNumber: item.table_number || 'N/A',
          orderTime: item.order_time,
          items: [],
          avgDeliveryMinutes: 0,
          avgPreparationMinutes: 0,
          avgWaiterResponseMinutes: 0
        }
      }
      orderMap[item.order_id].items.push({
        name: item.item_name,
        category: item.item_category,
        quantity: item.quantity,
        deliveryMinutes: item.total_delivery_minutes,
        preparationMinutes: item.preparation_minutes,
        waiterResponseMinutes: item.waiter_response_minutes
      })
    })

    // Calculate average times per order
    const recentOrders = Object.values(orderMap).slice(0, 10).map(order => {
      const deliveries = order.items.map(i => i.deliveryMinutes).filter(Boolean)
      const preps = order.items.map(i => i.preparationMinutes).filter(Boolean)
      const waiter = order.items.map(i => i.waiterResponseMinutes).filter(Boolean)

      return {
        ...order,
        avgDeliveryMinutes: Math.round(avg(deliveries) * 10) / 10,
        avgPreparationMinutes: Math.round(avg(preps) * 10) / 10,
        avgWaiterResponseMinutes: Math.round(avg(waiter) * 10) / 10
      }
    })

    const analytics = {
      totalItems: items.length,
      averageDeliveryTime: Math.round(avg(deliveryTimes) * 10) / 10,
      medianDeliveryTime: Math.round(median(deliveryTimes) * 10) / 10,
      averagePreparationTime: Math.round(avg(preparationTimes) * 10) / 10,
      medianPreparationTime: Math.round(median(preparationTimes) * 10) / 10,
      averageWaiterResponseTime: Math.round(avg(waiterResponseTimes) * 10) / 10,
      medianWaiterResponseTime: Math.round(median(waiterResponseTimes) * 10) / 10,
      fastestDelivery: deliveryTimes.length > 0 ? Math.round(Math.min(...deliveryTimes) * 10) / 10 : 0,
      slowestDelivery: deliveryTimes.length > 0 ? Math.round(Math.max(...deliveryTimes) * 10) / 10 : 0,
      departmentAnalytics,
      recentOrders
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Delivery analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery analytics' }, { status: 500 })
  }
}
