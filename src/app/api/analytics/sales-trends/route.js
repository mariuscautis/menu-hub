export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    if (groupBy === 'day') {
      // Daily sales trends
      const { data, error } = await supabaseAdmin
        .from('daily_sales_summary')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching daily sales:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else if (groupBy === 'week') {
      // Weekly aggregation
      const { data, error } = await supabaseAdmin
        .from('daily_sales_summary')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching weekly sales:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Group by week
      const weeklyData = data.reduce((acc, day) => {
        const date = new Date(day.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Get Sunday of the week
        const weekKey = weekStart.toISOString().split('T')[0]

        if (!acc[weekKey]) {
          acc[weekKey] = {
            date: weekKey,
            total_revenue: 0,
            total_orders: 0,
            total_items_sold: 0,
            total_cost: 0,
            total_profit: 0,
            days: 0
          }
        }

        acc[weekKey].total_revenue += parseFloat(day.total_revenue || 0)
        acc[weekKey].total_orders += parseInt(day.total_orders || 0)
        acc[weekKey].total_items_sold += parseInt(day.total_items_sold || 0)
        acc[weekKey].total_cost += parseFloat(day.total_cost || 0)
        acc[weekKey].total_profit += parseFloat(day.total_profit || 0)
        acc[weekKey].days++

        return acc
      }, {})

      const result = Object.values(weeklyData).map(week => ({
        ...week,
        average_order_value: week.total_orders > 0 ? week.total_revenue / week.total_orders : 0,
        profit_margin_percent: week.total_revenue > 0 ? (week.total_profit / week.total_revenue * 100) : 0
      }))

      return NextResponse.json({ success: true, data: result })
    } else if (groupBy === 'month') {
      // Monthly aggregation
      const { data, error } = await supabaseAdmin
        .from('daily_sales_summary')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching monthly sales:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Group by month
      const monthlyData = data.reduce((acc, day) => {
        const date = new Date(day.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

        if (!acc[monthKey]) {
          acc[monthKey] = {
            date: monthKey,
            total_revenue: 0,
            total_orders: 0,
            total_items_sold: 0,
            total_cost: 0,
            total_profit: 0,
            days: 0
          }
        }

        acc[monthKey].total_revenue += parseFloat(day.total_revenue || 0)
        acc[monthKey].total_orders += parseInt(day.total_orders || 0)
        acc[monthKey].total_items_sold += parseInt(day.total_items_sold || 0)
        acc[monthKey].total_cost += parseFloat(day.total_cost || 0)
        acc[monthKey].total_profit += parseFloat(day.total_profit || 0)
        acc[monthKey].days++

        return acc
      }, {})

      const result = Object.values(monthlyData).map(month => ({
        ...month,
        average_order_value: month.total_orders > 0 ? month.total_revenue / month.total_orders : 0,
        profit_margin_percent: month.total_revenue > 0 ? (month.total_profit / month.total_revenue * 100) : 0
      }))

      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json(
      { error: 'Invalid groupBy parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in sales trends:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
