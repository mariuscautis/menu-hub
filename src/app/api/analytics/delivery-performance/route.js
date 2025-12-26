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

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 })
    }

    // Build base query
    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        marked_ready_at,
        delivered_at,
        total,
        table_id,
        tables (table_number)
      `)
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled')
      .not('delivered_at', 'is', null)

    // Add date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Calculate metrics
    const deliveryTimes = []
    const preparationTimes = []
    const waiterResponseTimes = []

    orders.forEach(order => {
      const createdAt = new Date(order.created_at)
      const markedReadyAt = order.marked_ready_at ? new Date(order.marked_ready_at) : null
      const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null

      if (deliveredAt) {
        // Total delivery time (order placed to delivered)
        const deliveryMinutes = (deliveredAt - createdAt) / (1000 * 60)
        deliveryTimes.push(deliveryMinutes)

        if (markedReadyAt) {
          // Preparation time (order placed to ready)
          const prepMinutes = (markedReadyAt - createdAt) / (1000 * 60)
          preparationTimes.push(prepMinutes)

          // Waiter response time (ready to delivered)
          const waiterMinutes = (deliveredAt - markedReadyAt) / (1000 * 60)
          waiterResponseTimes.push(waiterMinutes)
        }
      }
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

    const analytics = {
      totalOrders: orders.length,
      averageDeliveryTime: Math.round(avg(deliveryTimes) * 10) / 10,
      medianDeliveryTime: Math.round(median(deliveryTimes) * 10) / 10,
      averagePreparationTime: Math.round(avg(preparationTimes) * 10) / 10,
      medianPreparationTime: Math.round(median(preparationTimes) * 10) / 10,
      averageWaiterResponseTime: Math.round(avg(waiterResponseTimes) * 10) / 10,
      medianWaiterResponseTime: Math.round(median(waiterResponseTimes) * 10) / 10,
      fastestDelivery: deliveryTimes.length > 0 ? Math.round(Math.min(...deliveryTimes) * 10) / 10 : 0,
      slowestDelivery: deliveryTimes.length > 0 ? Math.round(Math.max(...deliveryTimes) * 10) / 10 : 0,
      recentOrders: orders.slice(0, 10).map(order => {
        const createdAt = new Date(order.created_at)
        const markedReadyAt = order.marked_ready_at ? new Date(order.marked_ready_at) : null
        const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null

        return {
          id: order.id,
          tableNumber: order.tables?.table_number || 'N/A',
          total: order.total,
          orderTime: order.created_at,
          deliveryMinutes: deliveredAt ? Math.round((deliveredAt - createdAt) / (1000 * 60) * 10) / 10 : null,
          preparationMinutes: markedReadyAt ? Math.round((markedReadyAt - createdAt) / (1000 * 60) * 10) / 10 : null,
          waiterResponseMinutes: (markedReadyAt && deliveredAt) ? Math.round((deliveredAt - markedReadyAt) / (1000 * 60) * 10) / 10 : null
        }
      })
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Delivery analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery analytics' }, { status: 500 })
  }
}
