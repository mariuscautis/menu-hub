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

    // Get product sales summary
    const { data: productData, error: productError } = await supabaseAdmin
      .from('product_sales_summary')
      .select(`
        menu_item_id,
        quantity_sold,
        revenue,
        cost,
        profit
      `)
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    if (productError) {
      console.error('Error fetching product data:', productError)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    if (!productData || productData.length === 0) {
      console.log('No product data found')
      return NextResponse.json({ success: true, data: [] })
    }

    // Get menu items with department info
    const menuItemIds = [...new Set(productData.map(item => item.menu_item_id))]
    const { data: menuItems, error: menuItemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, department')
      .in('id', menuItemIds)

    if (menuItemsError) {
      console.error('Error fetching menu items:', menuItemsError)
      return NextResponse.json({ error: menuItemsError.message }, { status: 500 })
    }

    // Create menu item lookup
    const menuItemLookup = menuItems.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    // Aggregate by department
    const departmentStats = {}

    productData.forEach(item => {
      const menuItem = menuItemLookup[item.menu_item_id]
      if (!menuItem) return

      const department = menuItem.department || 'Unknown'

      if (!departmentStats[department]) {
        departmentStats[department] = {
          department: department,
          quantity_sold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        }
      }

      departmentStats[department].quantity_sold += parseInt(item.quantity_sold || 0)
      departmentStats[department].revenue += parseFloat(item.revenue || 0)
      departmentStats[department].cost += parseFloat(item.cost || 0)
      departmentStats[department].profit += parseFloat(item.profit || 0)
    })

    const result = Object.values(departmentStats).map(dept => ({
      ...dept,
      profit_margin_percent: dept.revenue > 0 ? (dept.profit / dept.revenue * 100).toFixed(2) : 0
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in department breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
