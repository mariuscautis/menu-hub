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

    // Fetch paid order IDs in range
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('paid', true)
      .gte('created_at', `${start}T00:00:00.000Z`)
      .lte('created_at', `${end}T23:59:59.999Z`)

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const orderIds = orders.map(o => o.id)

    // Fetch order items — price_at_time is tax-inclusive (what customer paid)
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('menu_item_id, quantity, price_at_time')
      .in('order_id', orderIds)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const menuItemIds = [...new Set(orderItems.map(i => i.menu_item_id).filter(Boolean))]
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, department')
      .in('id', menuItemIds)

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 })
    }

    const menuItemLookup = (menuItems || []).reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    // Ingredient cost from product_sales_summary — cost is correct, only revenue was inflated
    const { data: costData } = await supabaseAdmin
      .from('product_sales_summary')
      .select('menu_item_id, cost')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    const costByItem = (costData || []).reduce((acc, row) => {
      acc[row.menu_item_id] = (acc[row.menu_item_id] || 0) + parseFloat(row.cost || 0)
      return acc
    }, {})

    // Aggregate by department using tax-inclusive price_at_time × quantity
    const departmentStats = {}

    orderItems.forEach(item => {
      const menuItem = menuItemLookup[item.menu_item_id]
      if (!menuItem) return
      const department = menuItem.department || 'Unknown'
      const revenue = parseFloat(item.price_at_time || 0) * parseInt(item.quantity || 0)
      if (!departmentStats[department]) {
        departmentStats[department] = { department, quantity_sold: 0, revenue: 0, cost: 0 }
      }
      departmentStats[department].quantity_sold += parseInt(item.quantity || 0)
      departmentStats[department].revenue += revenue
    })

    Object.entries(costByItem).forEach(([menuItemId, cost]) => {
      const menuItem = menuItemLookup[menuItemId]
      if (!menuItem) return
      const department = menuItem.department || 'Unknown'
      if (departmentStats[department]) departmentStats[department].cost += cost
    })

    const result = Object.values(departmentStats).map(dept => {
      const profit = dept.revenue - dept.cost
      return {
        ...dept,
        revenue:               parseFloat(dept.revenue.toFixed(2)),
        cost:                  parseFloat(dept.cost.toFixed(2)),
        profit:                parseFloat(profit.toFixed(2)),
        profit_margin_percent: dept.revenue > 0 ? parseFloat((profit / dept.revenue * 100).toFixed(2)) : 0,
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in department breakdown:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
