export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

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

    // Aggregate revenue by menu item using tax-inclusive price_at_time
    const revenueByItem = {}
    orderItems.forEach(item => {
      const id = item.menu_item_id
      if (!id) return
      revenueByItem[id] = (revenueByItem[id] || 0) + (parseFloat(item.price_at_time || 0) * parseInt(item.quantity || 0))
    })

    // Ingredient cost from product_sales_summary — cost is correct, only revenue was inflated
    const { data: costData } = await supabaseAdmin
      .from('product_sales_summary')
      .select('menu_item_id, quantity_sold, cost')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    const costByItem = {}
    const qtySoldByItem = {}
    ;(costData || []).forEach(row => {
      costByItem[row.menu_item_id] = (costByItem[row.menu_item_id] || 0) + parseFloat(row.cost || 0)
      qtySoldByItem[row.menu_item_id] = (qtySoldByItem[row.menu_item_id] || 0) + parseInt(row.quantity_sold || 0)
    })

    // Fetch menu item names
    const menuItemIds = [...new Set([...Object.keys(revenueByItem), ...Object.keys(costByItem)])]
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name')
      .in('id', menuItemIds)

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 })
    }

    const menuItemLookup = (menuItems || []).reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    const result = menuItemIds.map(itemId => {
      const revenue = revenueByItem[itemId] || 0
      const cost    = costByItem[itemId] || 0
      const profit  = revenue - cost
      return {
        menu_item_id:   itemId,
        menu_item_name: menuItemLookup[itemId]?.name || 'Unknown',
        quantity_sold:  qtySoldByItem[itemId] || 0,
        revenue:        parseFloat(revenue.toFixed(2)),
        cost:           parseFloat(cost.toFixed(2)),
        profit:         parseFloat(profit.toFixed(2)),
        profit_margin:  revenue > 0 ? parseFloat((profit / revenue * 100).toFixed(2)) : 0,
      }
    })

    const sorted = result
      .filter(r => r.quantity_sold > 0 || r.revenue > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit)

    return NextResponse.json({ success: true, data: sorted })
  } catch (error) {
    console.error('Error in product profitability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
