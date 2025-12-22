'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DateRangeSelector from '@/components/analytics/DateRangeSelector'
import Link from 'next/link'
export default function TableAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [tableData, setTableData] = useState([])
  const [summary, setSummary] = useState(null)
  const [sortBy, setSortBy] = useState('revenue') // revenue, occupancy, turnover, tips
  useEffect(() => {
    fetchRestaurant()
  }, [])
  useEffect(() => {
    if (restaurant) {
      fetchTableAnalytics()
    }
  }, [restaurant, dateRange])
  const fetchRestaurant = async () => {
    // Check for staff session first (PIN-based login)
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        setRestaurant(staffSession.restaurant)
        return
      } catch (err) {
        console.error('Error parsing staff session:', err)
      }
    }
    // Fall back to Supabase auth (for owners)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Check if owner
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (ownedRestaurant) {
      setRestaurant(ownedRestaurant)
    } else {
      // Check if staff (Supabase authenticated staff)
      const { data: staffRecords } = await supabase
        .from('staff')
        .select('*, restaurants(*)')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .eq('status', 'active')
      const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null
      if (staffRecord && staffRecord.restaurants) {
        setRestaurant(staffRecord.restaurants)
      }
    }
  }
  const fetchTableAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        restaurantId: restaurant.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      const response = await fetch(`/api/analytics/table-performance?${params}`)
      const data = await response.json()
      if (data.success) {
        setTableData(data.data || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching table analytics:', error)
    } finally {
      setLoading(false)
    }
  }
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange)
  }
  const getSortedData = () => {
    const sorted = [...tableData]
    switch (sortBy) {
      case 'revenue':
        return sorted.sort((a, b) => b.total_revenue - a.total_revenue)
      case 'occupancy':
        return sorted.sort((a, b) => b.occupancy_rate - a.occupancy_rate)
      case 'turnover':
        return sorted.sort((a, b) => b.turnover_rate - a.turnover_rate)
      case 'tips':
        return sorted.sort((a, b) => b.total_tips - a.total_tips)
      default:
        return sorted
    }
  }
  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }
  const sortedData = getSortedData()
  return (

    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analytics">
            <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Table Analytics</h1>
            <p className="text-slate-500">Performance metrics for each table at {restaurant.name}</p>
          </div>
        </div>
      </div>
      {/* Date Range Selector */}
      <DateRangeSelector onRangeChange={handleDateRangeChange} />
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading table analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Tables</p>
                <p className="text-3xl font-bold text-[#6262bd]">{summary.total_tables}</p>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  £{summary.total_revenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                <p className="text-slate-500 text-sm font-medium mb-1">Avg Revenue/Table</p>
                <p className="text-3xl font-bold text-slate-700">
                  £{summary.avg_revenue_per_table.toFixed(2)}
                </p>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                <p className="text-slate-500 text-sm font-medium mb-1">Date Range</p>
                <p className="text-3xl font-bold text-slate-700">{summary.date_range_days} days</p>
              </div>
            </div>
          )}
          {/* Sort Controls */}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'revenue', label: 'Revenue' },
                  { value: 'occupancy', label: 'Occupancy' },
                  { value: 'turnover', label: 'Turnover' },
                  { value: 'tips', label: 'Tips' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? 'bg-[#6262bd] text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Table Performance Cards */}
          <div className="grid gap-6">
            {sortedData.length === 0 ? (
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
                <p className="text-slate-500">No data available for the selected date range</p>
              </div>
            ) : (
              sortedData.map((table) => (
                <div
                  key={table.table_id}
                  className={`bg-white border-2 rounded-2xl p-6 ${
                    table.performance === 'high'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        table.performance === 'high' ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <span className={`text-xl font-bold ${
                          table.performance === 'high' ? 'text-green-700' : 'text-slate-600'
                        }`}>
                          #{table.rank}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">
                          Table {table.table_number}
                        </h3>
                        <span className={`text-sm font-medium ${
                          table.performance === 'high' ? 'text-green-600' : 'text-slate-500'
                        }`}>
                          {table.performance === 'high' ? '⭐ High Performer' : '📊 Standard'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-[#6262bd]">
                        £{table.total_revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {/* Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Metrics */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 font-medium mb-1">Avg Revenue/Order</p>
                      <p className="text-lg font-bold text-slate-700">
                        £{table.avg_revenue_per_order.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mb-1">Avg Spend/Person</p>
                      <p className="text-lg font-bold text-slate-700">
                        £{table.avg_spend_per_person.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Est. 2 guests/order</p>
                      <p className="text-xs text-slate-500 font-medium mb-1">Revenue/Hour</p>
                      <p className="text-lg font-bold text-slate-700">
                        £{table.revenue_per_hour.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mb-1">Total Orders</p>
                      <p className="text-lg font-bold text-slate-700">{table.total_orders}</p>
                    </div>
                    {/* Operational Metrics */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">Avg Seating Time</p>
                      <p className="text-lg font-bold text-blue-700">
                        {table.avg_duration_minutes} min
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-purple-600 font-medium mb-1">Turnover Rate</p>
                      <p className="text-lg font-bold text-purple-700">
                        {table.turnover_rate.toFixed(1)} /day
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-xs text-amber-600 font-medium mb-1">Occupancy Rate</p>
                      <p className="text-lg font-bold text-amber-700">
                        {table.occupancy_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">Tips Collected</p>
                      <p className="text-lg font-bold text-green-700">
                        £{table.total_tips.toFixed(2)}
                      </p>
                      {table.tip_percentage > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {table.tip_percentage.toFixed(1)}% avg
                        </p>
                      )}
                    </div>
                    <div className="bg-cyan-50 rounded-xl p-4">
                      <p className="text-xs text-cyan-600 font-medium mb-1">Avg Cleanup Time</p>
                      <p className="text-lg font-bold text-cyan-700">
                        {table.avg_cleanup_time_minutes > 0 ? `${table.avg_cleanup_time_minutes} min` : 'N/A'}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">
                        {table.avg_cleanup_time_minutes > 0 ? 'Post-payment to ready' : 'No data yet'}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">Waiter Response Time</p>
                      <p className="text-lg font-bold text-orange-700">
                        {table.total_waiter_calls > 0 ? `${table.avg_waiter_response_minutes.toFixed(1)} min` : 'N/A'}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {table.total_waiter_calls > 0
                          ? `${table.total_waiter_calls} call${table.total_waiter_calls !== 1 ? 's' : ''}`
                          : 'No calls yet'}
                      </p>
                    </div>
                    {/* Upsell Metrics */}
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-600 font-medium mb-1">Total Items Sold</p>
                      <p className="text-lg font-bold text-indigo-700">{table.total_items_sold}</p>
                      <p className="text-xs text-indigo-600 font-medium mb-1">Avg Items/Order</p>
                      <p className="text-lg font-bold text-indigo-700">
                        {table.avg_items_per_order.toFixed(1)}
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        {table.avg_items_per_order >= 3 ? '✓ Good upselling' : 'Upsell opportunity'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                      <p className="text-xs text-slate-500 font-medium mb-1">Performance Insights</p>
                      <p className="text-sm text-slate-700">
                        {table.occupancy_rate > 50 && table.avg_items_per_order >= 3
                          ? '🌟 Excellent performance! High occupancy and good upselling.'
                          : table.occupancy_rate > 50
                          ? '📈 Good occupancy. Focus on increasing items per order.'
                          : table.avg_items_per_order >= 3
                          ? '💡 Good upselling. Work on increasing table turnover.'
                          : '🎯 Opportunity to improve occupancy and upselling.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Performance Comparison */}
          {sortedData.length > 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">Performance Comparison</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">High Performers</span>
                    <span className="text-green-600 font-medium">
                      {sortedData.filter(t => t.performance === 'high').length} tables
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {sortedData
                      .filter(t => t.performance === 'high')
                      .map(t => (
                        <div
                          key={t.table_id}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium"
                        >
                          Table {t.table_number}
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Standard Performers</span>
                    <span className="text-slate-600 font-medium">
                      {sortedData.filter(t => t.performance === 'low').length} tables
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

  )
}
