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

    // Use helper function to get top products
    const { data, error } = await supabaseAdmin
      .rpc('get_top_products', {
        p_restaurant_id: restaurantId,
        p_start_date: start,
        p_end_date: end,
        p_limit: limit
      })

    if (error) {
      console.error('Error fetching top products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch department for the products
    if (data && data.length > 0) {
      const menuItemIds = data.map(item => item.menu_item_id)
      const { data: menuItems, error: menuError } = await supabaseAdmin
        .from('menu_items')
        .select('id, department')
        .in('id', menuItemIds)

      if (!menuError && menuItems) {
        // Create a lookup map for departments
        const departmentMap = menuItems.reduce((acc, item) => {
          acc[item.id] = item.department || 'kitchen'
          return acc
        }, {})

        // Add department to the top products data
        const enrichedData = data.map(product => ({
          ...product,
          department: departmentMap[product.menu_item_id] || 'kitchen'
        }))

        return NextResponse.json({ success: true, data: enrichedData })
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in top products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
