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
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    console.log('Fetching analytics:', { restaurantId, start, end })

    // Query daily_sales_summary directly instead of using RPC
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('daily_sales_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    if (summaryError) {
      console.error('Error fetching sales summary:', summaryError)
      return NextResponse.json(
        { error: summaryError.message },
        { status: 500 }
      )
    }

    console.log('Raw data from database:', summaryData)

    // Aggregate the data
    if (!summaryData || summaryData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_revenue: 0,
          total_orders: 0,
          total_items_sold: 0,
          average_order_value: 0,
          total_cost: 0,
          total_profit: 0,
          profit_margin_percent: 0
        }
      })
    }

    const summary = {
      total_revenue: summaryData.reduce((sum, d) => sum + parseFloat(d.total_revenue || 0), 0),
      total_orders: summaryData.reduce((sum, d) => sum + parseInt(d.total_orders || 0), 0),
      total_items_sold: summaryData.reduce((sum, d) => sum + parseInt(d.total_items_sold || 0), 0),
      total_cost: summaryData.reduce((sum, d) => sum + parseFloat(d.total_cost || 0), 0),
      total_profit: summaryData.reduce((sum, d) => sum + parseFloat(d.total_profit || 0), 0),
      average_order_value: 0,
      profit_margin_percent: 0
    }

    summary.average_order_value = summary.total_orders > 0
      ? summary.total_revenue / summary.total_orders
      : 0

    summary.profit_margin_percent = summary.total_revenue > 0
      ? (summary.total_profit / summary.total_revenue * 100)
      : 0

    console.log('Calculated summary:', summary)

    return NextResponse.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error in analytics overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
