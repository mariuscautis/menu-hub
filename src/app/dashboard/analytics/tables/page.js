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

export default function TableAnalyticsPage() {
  useModuleGuard('analytics')
  const t = useTranslations('tableAnalytics')
  const tg = useTranslations('guide')
  const { currencySymbol, formatCurrency } = useCurrency()
  const restaurantCtx = useRestaurant()
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
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant)
    }
  }, [restaurantCtx])
  useEffect(() => {
    if (restaurant) {
      fetchTableAnalytics()
    }
  }, [restaurant, dateRange])
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
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">{t('title')}<InfoTooltip text={tg('analytics_tables_desc')} /></h1>
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
            <p className="text-zinc-600 dark:text-zinc-400">{t('loadingTableAnalytics')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('totalTables')}</p>
                <p className="text-3xl font-bold text-[#6262bd]">{summary.total_tables}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('totalRevenue')}</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(summary.total_revenue)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('avgRevenuePerTable')}</p>
                <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(summary.avg_revenue_per_table)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{t('dateRangeLabel')}</p>
                <p className="text-3xl font-bold text-zinc-700 dark:text-zinc-300">{t('days').replace('{count}', summary.date_range_days)}</p>
              </div>
            </div>
          )}
          {/* Sort Controls */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('sortBy')}</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'revenue', label: t('sortRevenue') },
                  { value: 'occupancy', label: t('sortOccupancy') },
                  { value: 'turnover', label: t('sortTurnover') },
                  { value: 'tips', label: t('sortTips') }
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
          {/* Table Performance Cards */}
          <div className="grid gap-6">
            {sortedData.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-12 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">{t('noData')}</p>
              </div>
            ) : (
              sortedData.map((table) => (
                <div
                  key={table.table_id}
                  className={`bg-white border-2 rounded-sm p-6 ${
                    table.performance === 'high'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                        table.performance === 'high' ? 'bg-green-100' : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}>
                        <span className={`text-xl font-bold ${
                          table.performance === 'high' ? 'text-green-700' : 'text-zinc-600 dark:text-zinc-400'
                        }`}>
                          #{table.rank}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                          {t('tableNumber').replace('{number}', table.table_number)}
                        </h3>
                        <span className={`text-sm font-medium ${
                          table.performance === 'high' ? 'text-green-600' : 'text-zinc-500 dark:text-zinc-400'
                        }`}>
                          {table.performance === 'high' ? t('highPerformer') : t('standard')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('totalRevenueLabel')}</p>
                      <p className="text-2xl font-bold text-[#6262bd]">
                        {formatCurrency(table.total_revenue)}
                      </p>
                    </div>
                  </div>
                  {/* Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 table-analytics-grid">
                    {/* Revenue Metrics */}
                    <div className="bg-zinc-50 dark:bg-zinc-900 dark:!bg-slate-800 rounded-sm p-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{t('avgRevenuePerOrder')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(table.avg_revenue_per_order)}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{t('avgSpendPerPerson')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(table.avg_spend_per_person)}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{t('estGuestsPerOrder')}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{t('revenuePerHour')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(table.revenue_per_hour)}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{t('totalOrders')}</p>
                      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{table.total_orders}</p>
                    </div>
                    {/* Operational Metrics */}
                    <div className="bg-blue-50 dark:!bg-blue-950 rounded-sm p-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{t('avgSeatingTime')}</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {t('minutes').replace('{count}', table.avg_duration_minutes)}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:!bg-purple-950 rounded-sm p-4">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">{t('turnoverRate')}</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {t('perDay').replace('{rate}', table.turnover_rate.toFixed(1))}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:!bg-amber-950 rounded-sm p-4">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">{t('occupancyRate')}</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        {t('percentage').replace('{percent}', table.occupancy_rate.toFixed(1))}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:!bg-green-950 rounded-sm p-4">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{t('tipsCollected')}</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(table.total_tips)}
                      </p>
                      {table.tip_percentage > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {t('avgTipPercentage').replace('{percent}', table.tip_percentage.toFixed(1))}
                        </p>
                      )}
                    </div>
                    <div className="bg-cyan-50 dark:!bg-cyan-950 rounded-sm p-4">
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">{t('avgCleanupTime')}</p>
                      <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
                        {table.avg_cleanup_time_minutes > 0 ? t('minutes').replace('{count}', table.avg_cleanup_time_minutes) : t('notAvailable')}
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                        {table.avg_cleanup_time_minutes > 0 ? t('postPaymentToReady') : t('noDataYet')}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:!bg-orange-950 rounded-sm p-4">
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">{t('waiterResponseTime')}</p>
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                        {table.total_waiter_calls > 0 ? t('minutes').replace('{count}', table.avg_waiter_response_minutes.toFixed(1)) : t('notAvailable')}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {table.total_waiter_calls > 0
                          ? t('calls').replace('{count}', table.total_waiter_calls).replace('{plural}', table.total_waiter_calls !== 1 ? 's' : '')
                          : t('noCalls')}
                      </p>
                    </div>
                    {/* Upsell Metrics */}
                    <div className="bg-indigo-50 dark:!bg-indigo-950 rounded-sm p-4">
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t('totalItemsSold')}</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{table.total_items_sold}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t('avgItemsPerOrder')}</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                        {table.avg_items_per_order.toFixed(1)}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        {table.avg_items_per_order >= 3 ? t('goodUpselling') : t('upsellOpportunity')}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900 dark:!bg-slate-800 rounded-sm p-4 col-span-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{t('performanceInsights')}</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {table.occupancy_rate > 50 && table.avg_items_per_order >= 3
                          ? t('excellentPerformance')
                          : table.occupancy_rate > 50
                          ? t('goodOccupancy')
                          : table.avg_items_per_order >= 3
                          ? t('goodUpsellingLowOccupancy')
                          : t('improvementOpportunity')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Performance Comparison */}
          {sortedData.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-4">{t('performanceComparison')}</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">{t('highPerformers')}</span>
                    <span className="text-green-600 font-medium">
                      {t('tables').replace('{count}', sortedData.filter(table => table.performance === 'high').length)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {sortedData
                      .filter(table => table.performance === 'high')
                      .map(table => (
                        <div
                          key={table.table_id}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded-sm text-sm font-medium"
                        >
                          {t('tableNumber').replace('{number}', table.table_number)}
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-600 dark:text-zinc-400">{t('standardPerformers')}</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {t('tables').replace('{count}', sortedData.filter(table => table.performance === 'low').length)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </OfflinePageGuard>
  )
}
