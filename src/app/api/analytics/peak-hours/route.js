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

    // Get hourly data for the date range
    const { data, error } = await supabaseAdmin
      .from('hourly_sales_summary')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date', start)
      .lte('date', end)

    if (error) {
      console.error('Error fetching peak hours:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate by hour across all days
    const hourlyStats = {}
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = {
        hour: i,
        total_orders: 0,
        total_revenue: 0,
        days_count: 0
      }
    }

    data.forEach(record => {
      const hour = record.hour
      hourlyStats[hour].total_orders += parseInt(record.total_orders || 0)
      hourlyStats[hour].total_revenue += parseFloat(record.total_revenue || 0)
      hourlyStats[hour].days_count++
    })

    // Calculate averages
    const result = Object.values(hourlyStats).map(stat => ({
      hour: stat.hour,
      hour_label: `${String(stat.hour).padStart(2, '0')}:00`,
      avg_orders: stat.days_count > 0 ? (stat.total_orders / stat.days_count).toFixed(2) : 0,
      avg_revenue: stat.days_count > 0 ? (stat.total_revenue / stat.days_count).toFixed(2) : 0,
      total_orders: stat.total_orders,
      total_revenue: stat.total_revenue
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error in peak hours:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
