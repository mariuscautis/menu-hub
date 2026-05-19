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

    // Aggregate revenue and quantity by menu item
    const productStats = {}
    orderItems.forEach(item => {
      const id = item.menu_item_id
      if (!id) return
      if (!productStats[id]) {
        productStats[id] = { menu_item_id: id, quantity_sold: 0, revenue: 0 }
      }
      productStats[id].quantity_sold += parseInt(item.quantity || 0)
      productStats[id].revenue += parseFloat(item.price_at_time || 0) * parseInt(item.quantity || 0)
    })

    // Fetch menu item names and departments
    const menuItemIds = Object.keys(productStats)
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

    const result = Object.values(productStats)
      .map(stat => ({
        menu_item_id:   stat.menu_item_id,
        menu_item_name: menuItemLookup[stat.menu_item_id]?.name || 'Unknown',
        department:     menuItemLookup[stat.menu_item_id]?.department || 'kitchen',
        quantity_sold:  stat.quantity_sold,
        revenue:        parseFloat(stat.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, limit)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in top products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
