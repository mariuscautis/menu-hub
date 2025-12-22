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
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Get product sales summary with profitability data
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('product_sales_summary')
      .select('menu_item_id, quantity_sold, revenue, cost, profit')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    if (salesError) {
      console.error('Error fetching product sales:', salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    if (!salesData || salesData.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Aggregate by menu item
    const productStats = {}
    salesData.forEach(item => {
      const itemId = item.menu_item_id
      if (!productStats[itemId]) {
        productStats[itemId] = {
          menu_item_id: itemId,
          total_quantity_sold: 0,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0
        }
      }
      productStats[itemId].total_quantity_sold += parseInt(item.quantity_sold || 0)
      productStats[itemId].total_revenue += parseFloat(item.revenue || 0)
      productStats[itemId].total_cost += parseFloat(item.cost || 0)
      productStats[itemId].total_profit += parseFloat(item.profit || 0)
    })

    // Get menu item names
    const menuItemIds = Object.keys(productStats)
    const { data: menuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name')
      .in('id', menuItemIds)

    if (menuError) {
      console.error('Error fetching menu items:', menuError)
      return NextResponse.json({ error: menuError.message }, { status: 500 })
    }

    // Combine data
    const result = menuItemIds.map(itemId => {
      const stats = productStats[itemId]
      const menuItem = menuItems.find(m => m.id === itemId)

      return {
        menu_item_id: itemId,
        menu_item_name: menuItem?.name || 'Unknown',
        quantity_sold: stats.total_quantity_sold,
        revenue: parseFloat(stats.total_revenue.toFixed(2)),
        cost: parseFloat(stats.total_cost.toFixed(2)),
        profit: parseFloat(stats.total_profit.toFixed(2)),
        profit_margin: stats.total_revenue > 0
          ? parseFloat(((stats.total_profit / stats.total_revenue) * 100).toFixed(2))
          : 0
      }
    })

    // Sort by profit and limit
    const sorted = result
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit)

    return NextResponse.json({ success: true, data: sorted })
  } catch (error) {
    console.error('Error in product profitability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
