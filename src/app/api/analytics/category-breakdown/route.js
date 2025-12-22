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

    // Get category sales summary
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('category_sales_summary')
      .select(`
        category_id,
        quantity_sold,
        revenue,
        cost,
        profit
      `)
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    console.log('Category data fetched:', categoryData)

    if (categoryError) {
      console.error('Error fetching category data:', categoryError)
      return NextResponse.json({ error: categoryError.message }, { status: 500 })
    }

    if (!categoryData || categoryData.length === 0) {
      console.log('No category data found')
      return NextResponse.json({ success: true, data: [] })
    }

    // Get category names
    const categoryIds = [...new Set(categoryData.map(item => item.category_id))]
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('menu_categories')
      .select('id, name')
      .in('id', categoryIds)

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    // Create category lookup
    const categoryLookup = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name
      return acc
    }, {})

    // Aggregate by category
    const aggregated = categoryData.reduce((acc, item) => {
      const categoryId = item.category_id
      const categoryName = categoryLookup[categoryId] || 'Unknown'

      if (!acc[categoryId]) {
        acc[categoryId] = {
          category_id: categoryId,
          category_name: categoryName,
          quantity_sold: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        }
      }

      acc[categoryId].quantity_sold += parseInt(item.quantity_sold || 0)
      acc[categoryId].revenue += parseFloat(item.revenue || 0)
      acc[categoryId].cost += parseFloat(item.cost || 0)
      acc[categoryId].profit += parseFloat(item.profit || 0)

      return acc
    }, {})

    const result = Object.values(aggregated).map(cat => ({
      ...cat,
      profit_margin_percent: cat.revenue > 0 ? (cat.profit / cat.revenue * 100).toFixed(2) : 0
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in category breakdown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
