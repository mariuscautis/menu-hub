'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import DateRangeSelector from '@/components/analytics/DateRangeSelector'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useCurrency } from '@/lib/CurrencyContext'

import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { analyticsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import InfoTooltip from '@/components/InfoTooltip'

export default function StaffAnalyticsPage() {
  useModuleGuard('analytics')
  const t = useTranslations('staffAnalytics')
  const tg = useTranslations('guide')
  const { currencySymbol, formatCurrency } = useCurrency()
  const restaurantCtx = useRestaurant()
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
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant)
    }
  }, [restaurantCtx])

  useEffect(() => {
    if (restaurant) {
      fetchStaffAnalytics()
    }
  }, [restaurant, dateRange])

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
          <p className="text-zinc-600 dark:text-zinc-400">{t('loading')}</p>
        </div>
      </div>
    )
  }

  const sortedData = getSortedData()

  return (
    <OfflinePageGuard>
    <div className="space-y-6">
      <PageTabs tabs={analyticsTabs} />
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/analytics">
            <button className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-sm transition-colors">
              <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">{t('title')}<InfoTooltip text={tg('analytics_staff_desc')} /></h1>
            <p className="text-zinc-500 dark:text-zinc-400">{t('subtitle').replace('{restaurantName}', restaurant.name)}</p>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector onRangeChange={handleDateRangeChange} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">{t('loadingStaffAnalytics')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('overallRevenue')}</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(summary.total_revenue)}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('totalStaff')}</p>
                  <p className="text-3xl font-bold text-[#6262bd]">{summary.total_staff}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('avgRevenuePerStaff')}</p>
                  <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(summary.avg_revenue_per_staff)}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('totalOrders')}</p>
                  <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">{summary.total_orders}</p>
                </div>
              </div>

              {/* Bar vs Kitchen Ratio */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-4">{t('productTypeDistribution')}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍸</span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('barProducts')}</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {summary.bar_ratio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all duration-500"
                        style={{ width: `${summary.bar_ratio}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {t('itemsSold').replace('{count}', summary.bar_items_count)}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍳</span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('kitchenProducts')}</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {summary.kitchen_ratio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${summary.kitchen_ratio}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {t('itemsSold').replace('{count}', summary.kitchen_items_count)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sort Controls */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('sortBy')}</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'revenue', label: t('sortRevenue') },
                  { value: 'orders', label: t('sortOrders') },
                  { value: 'avgOrder', label: t('sortAvgOrder') }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? 'bg-[#6262bd] text-white'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800'
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
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-12 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">{t('noData')}</p>
              </div>
            ) : (
              sortedData.map((staff) => (
                <div
                  key={staff.staff_id || staff.staff_name}
                  className={`bg-white border-2 rounded-sm p-6 ${
                    staff.performance === 'high'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                        staff.performance === 'high' ? 'bg-green-100' : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}>
                        <span className={`text-xl font-bold ${
                          staff.performance === 'high' ? 'text-green-700' : 'text-zinc-600 dark:text-zinc-400'
                        }`}>
                          #{staff.rank}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                          {staff.staff_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[180px] sm:max-w-none">{staff.staff_email}</span>
                          {staff.department && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              staff.department === 'bar'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : staff.department === 'kitchen'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-[#6262bd]/10 text-[#6262bd]'
                            }`}>
                              {staff.department === 'bar' ? `🍸 ${t('bar')}` :
                               staff.department === 'kitchen' ? `🍳 ${t('kitchen')}` :
                               `🌐 ${t('universal')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('totalRevenue')}</p>
                      <p className="text-2xl font-bold text-[#6262bd]">
                        {formatCurrency(staff.total_revenue)}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm p-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">{t('ordersProcessed')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{staff.total_orders}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm p-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">{t('avgOrderValue')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(staff.avg_order_value)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-sm p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">{t('tipsCollected')}</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(staff.total_tips)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-sm p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">{t('totalItemsSold')}</p>
                      <p className="text-lg font-bold text-blue-700">{staff.total_items_sold}</p>
                    </div>
                    <div className="bg-orange-50 rounded-sm p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">{t('waiterResponse')}</p>
                      <p className="text-lg font-bold text-orange-700">
                        {staff.waiter_calls_handled > 0
                          ? t('minutes').replace('{count}', staff.avg_waiter_response_minutes.toFixed(1))
                          : t('notAvailable')}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {staff.waiter_calls_handled > 0
                          ? t('callsHandled').replace('{count}', staff.waiter_calls_handled).replace('{plural}', staff.waiter_calls_handled !== 1 ? 's' : '')
                          : t('noCalls')}
                      </p>
                    </div>

                    {/* Bar vs Kitchen for this staff */}
                    <div className="bg-orange-50 rounded-sm p-4">
                      <p className="text-xs text-orange-600 font-medium mb-1">{t('barItems')}</p>
                      <p className="text-lg font-bold text-orange-700">
                        {t('itemsWithPercent').replace('{count}', staff.bar_items_sold).replace('{percent}', staff.bar_ratio.toFixed(0))}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-sm p-4">
                      <p className="text-xs text-green-600 font-medium mb-1">{t('kitchenItems')}</p>
                      <p className="text-lg font-bold text-green-700">
                        {t('itemsWithPercent').replace('{count}', staff.kitchen_items_sold).replace('{percent}', staff.kitchen_ratio.toFixed(0))}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm p-4 col-span-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">{t('performance')}</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {staff.performance === 'high'
                          ? t('highPerformer')
                          : t('standardPerformance')}
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
    </OfflinePageGuard>
  )
}
