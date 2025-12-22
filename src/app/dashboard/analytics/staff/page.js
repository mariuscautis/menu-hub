'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DateRangeSelector from '@/components/analytics/DateRangeSelector'
import Link from 'next/link'

export default function StaffAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const [staffData, setStaffData] = useState([])
  const [summary, setSummary] = useState(null)
  const [sortBy, setSortBy] = useState('revenue') // revenue, orders, avgOrder

  useEffect(() => {
    fetchRestaurant()
  }, [])

  useEffect(() => {
    if (restaurant) {
      fetchStaffAnalytics()
    }
  }, [restaurant, dateRange])

  const fetchRestaurant = async () => {
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
      // Check if staff
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

  const fetchStaffAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        restaurantId: restaurant.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })

      const response = await fetch(`/api/analytics/staff-performance?${params}`)
      const data = await response.json()

      if (data.success) {
        setStaffData(data.data || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching staff analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange)
  }

  const getSortedData = () => {
    const sorted = [...staffData]
    switch (sortBy) {
      case 'revenue':
        return sorted.sort((a, b) => b.total_revenue - a.total_revenue)
      case 'orders':
        return sorted.sort((a, b) => b.total_orders - a.total_orders)
      case 'avgOrder':
        return sorted.sort((a, b) => b.avg_order_value - a.avg_order_value)
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
            <h1 className="text-2xl font-bold text-slate-800">Staff Analytics</h1>
            <p className="text-slate-500">Performance metrics for staff at {restaurant.name}</p>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector onRangeChange={handleDateRangeChange} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading staff analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                  <p className="text-slate-500 text-sm font-medium mb-1">Overall Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    £{summary.total_revenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                  <p className="text-slate-500 text-sm font-medium mb-1">Total Staff</p>
                  <p className="text-3xl font-bold text-[#6262bd]">{summary.total_staff}</p>
                </div>
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                  <p className="text-slate-500 text-sm font-medium mb-1">Avg Revenue/Staff</p>
                  <p className="text-3xl font-bold text-slate-700">
                    £{summary.avg_revenue_per_staff.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                  <p className="text-slate-500 text-sm font-medium mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-slate-700">{summary.total_orders}</p>
                </div>
              </div>

              {/* Bar vs Kitchen Ratio */}
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Product Type Distribution</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍸</span>
                        <span className="text-sm font-medium text-slate-700">Bar Products</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {summary.bar_ratio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all duration-500"
                        style={{ width: `${summary.bar_ratio}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {summary.bar_items_count} items sold
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍳</span>
                        <span className="text-sm font-medium text-slate-700">Kitchen Products</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {summary.kitchen_ratio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${summary.kitchen_ratio}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {summary.kitchen_items_count} items sold
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sort Controls */}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'revenue', label: 'Revenue' },
                  { value: 'orders', label: 'Orders' },
                  { value: 'avgOrder', label: 'Avg Order' }
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

          {/* Staff Performance Cards */}
          <div className="grid gap-6">
            {sortedData.length === 0 ? (
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
                <p className="text-slate-500">No data available for the selected date range</p>
              </div>
            ) : (
              sortedData.map((staff) => (
                <div
                  key={staff.staff_id || staff.staff_name}
                  className={`bg-white border-2 rounded-2xl p-6 ${
                    staff.performance === 'high'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        staff.performance === 'high' ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <span className={`text-xl font-bold ${
                          staff.performance === 'high' ? 'text-green-700' : 'text-slate-600'
                        }`}>
                          #{staff.rank}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">
                          {staff.staff_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">{staff.staff_email}</span>
                          {staff.department && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              staff.department === 'bar'
                                ? 'bg-orange-100 text-orange-700'
                                : staff.department === 'kitchen'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-[#6262bd]/10 text-[#6262bd]'
                            }`}>
                              {staff.department === 'bar' ? '🍸 Bar' :
                               staff.department === 'kitchen' ? '🍳 Kitchen' :
                               '🌐 Universal'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-[#6262bd]">
                        £{staff.total_revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 font-medium mb-1">Orders Processed</p>
                      <p className="text-lg font-bold text-slate-700">{staff.total_orders}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 font-medium mb-1">Avg Order Value</p>
                      <p className="text-lg font-bold text-slate-700">
                        £{staff.avg_order_value.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">Tips Collected</p>
                      <p className="text-lg font-bold text-green-700">
                        £{staff.total_tips.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">Total Items Sold</p>
                      <p className="text-lg font-bold text-blue-700">{staff.total_items_sold}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">👋 Waiter Response</p>
                      <p className="text-lg font-bold text-orange-700">
                        {staff.waiter_calls_handled > 0
                          ? `${staff.avg_waiter_response_minutes.toFixed(1)} min`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {staff.waiter_calls_handled > 0
                          ? `${staff.waiter_calls_handled} call${staff.waiter_calls_handled !== 1 ? 's' : ''} handled`
                          : 'No calls'}
                      </p>
                    </div>

                    {/* Bar vs Kitchen for this staff */}
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">🍸 Bar Items</p>
                      <p className="text-lg font-bold text-orange-700">
                        {staff.bar_items_sold} ({staff.bar_ratio.toFixed(0)}%)
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">🍳 Kitchen Items</p>
                      <p className="text-lg font-bold text-green-700">
                        {staff.kitchen_items_sold} ({staff.kitchen_ratio.toFixed(0)}%)
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                      <p className="text-xs text-slate-500 font-medium mb-1">Performance</p>
                      <p className="text-sm text-slate-700">
                        {staff.performance === 'high'
                          ? '⭐ High Performer - Above average revenue'
                          : '📊 Standard Performance'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
