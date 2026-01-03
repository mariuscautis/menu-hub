export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization of Supabase client to avoid build-time errors
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department') // 'all', 'bar', 'kitchen'
    const reason = searchParams.get('reason') // filter by specific reason
    const staffEmail = searchParams.get('staffEmail') // filter by staff member

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Build query using admin client
    let query = supabaseAdmin
      .from('stock_losses')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')
      .order('created_at', { ascending: false })

    // Apply filters
    if (department && department !== 'all') {
      query = query.eq('department', department)
    }

    if (reason && reason !== 'all') {
      query = query.eq('reason', reason)
    }

    if (staffEmail && staffEmail !== 'all') {
      query = query.eq('staff_email', staffEmail)
    }

    const { data: losses, error: lossesError } = await query

    if (lossesError) {
      console.error('Error fetching losses:', lossesError)
      return NextResponse.json({ error: lossesError.message }, { status: 500 })
    }

    // Calculate costs for each loss
    const lossesWithCost = await Promise.all(losses.map(async (loss) => {
      let restaurantCost = 0
      let sellingCost = 0

      if (loss.menu_item_id) {
        // Get menu item with its price and ingredients
        const { data: menuItem } = await supabaseAdmin
          .from('menu_items')
          .select('price, calculated_price, dynamic_pricing_enabled')
          .eq('id', loss.menu_item_id)
          .single()

        // Get menu item ingredients
        const { data: ingredients } = await supabaseAdmin
          .from('menu_item_ingredients')
          .select('quantity_needed, stock_product_id, stock_products(cost_per_base_unit)')
          .eq('menu_item_id', loss.menu_item_id)

        if (ingredients && ingredients.length > 0) {
          // Calculate restaurant cost (ingredient costs) per single menu item
          const costPerItem = ingredients.reduce((sum, ing) => {
            const costPerUnit = ing.stock_products?.cost_per_base_unit || 0
            return sum + (ing.quantity_needed * costPerUnit)
          }, 0)

          // Total restaurant cost = cost per item * quantity lost
          restaurantCost = costPerItem * loss.quantity
        }

        // Calculate selling cost (lost revenue)
        if (menuItem) {
          // Use calculated_price if dynamic pricing is enabled, otherwise use regular price
          const itemSellingPrice = (menuItem.dynamic_pricing_enabled && menuItem.calculated_price)
            ? menuItem.calculated_price
            : (menuItem.price || 0)
          sellingCost = itemSellingPrice * loss.quantity
        }
      }

      return {
        ...loss,
        restaurant_cost: restaurantCost,
        selling_cost: sellingCost
      }
    }))

    // Calculate summary statistics
    const totalItems = lossesWithCost.reduce((sum, loss) => sum + loss.quantity, 0)
    const totalRestaurantCost = lossesWithCost.reduce((sum, loss) => sum + loss.restaurant_cost, 0)
    const totalSellingCost = lossesWithCost.reduce((sum, loss) => sum + loss.selling_cost, 0)

    // Group by reason
    const byReason = lossesWithCost.reduce((acc, loss) => {
      if (!acc[loss.reason]) {
        acc[loss.reason] = { count: 0, items: 0, restaurant_cost: 0, selling_cost: 0 }
      }
      acc[loss.reason].count++
      acc[loss.reason].items += loss.quantity
      acc[loss.reason].restaurant_cost += loss.restaurant_cost
      acc[loss.reason].selling_cost += loss.selling_cost
      return acc
    }, {})

    // Group by department
    const byDepartment = lossesWithCost.reduce((acc, loss) => {
      if (!acc[loss.department]) {
        acc[loss.department] = { count: 0, items: 0, restaurant_cost: 0, selling_cost: 0 }
      }
      acc[loss.department].count++
      acc[loss.department].items += loss.quantity
      acc[loss.department].restaurant_cost += loss.restaurant_cost
      acc[loss.department].selling_cost += loss.selling_cost
      return acc
    }, {})

    // Top loss items (sorted by selling cost - lost revenue)
    const byMenuItem = lossesWithCost.reduce((acc, loss) => {
      if (!acc[loss.menu_item_name]) {
        acc[loss.menu_item_name] = {
          count: 0,
          items: 0,
          restaurant_cost: 0,
          selling_cost: 0,
          department: loss.department
        }
      }
      acc[loss.menu_item_name].count++
      acc[loss.menu_item_name].items += loss.quantity
      acc[loss.menu_item_name].restaurant_cost += loss.restaurant_cost
      acc[loss.menu_item_name].selling_cost += loss.selling_cost
      return acc
    }, {})

    const topLossItems = Object.entries(byMenuItem)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.selling_cost - a.selling_cost) // Sort by selling cost (lost revenue)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: lossesWithCost,
      summary: {
        total_loss_records: lossesWithCost.length,
        total_items_lost: totalItems,
        total_restaurant_cost: totalRestaurantCost,
        total_selling_cost: totalSellingCost,
        by_reason: byReason,
        by_department: byDepartment,
        top_loss_items: topLossItems,
        date_range: {
          start,
          end,
          days: Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1
        }
      }
    })
  } catch (error) {
    console.error('Error in losses analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
