'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import RevenueChart from '@/components/analytics/RevenueChart'
import PeakHoursChart from '@/components/analytics/PeakHoursChart'
import CategoryPieChart from '@/components/analytics/CategoryPieChart'
import TopProductsTable from '@/components/analytics/TopProductsTable'
import ProductProfitabilityChart from '@/components/analytics/ProductProfitabilityChart'
import DateRangeSelector from '@/components/analytics/DateRangeSelector'
import ExportButton from '@/components/analytics/ExportButton'

export default function AnalyticsPage() {
  const t = useTranslations('analytics')
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [groupBy, setGroupBy] = useState('day')

  // Analytics state
  const [overview, setOverview] = useState(null)
  const [salesTrends, setSalesTrends] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [departmentBreakdown, setDepartmentBreakdown] = useState([])
  const [productProfitability, setProductProfitability] = useState([])

  // Fetch restaurant on mount
  useEffect(() => {
    fetchRestaurant()
  }, [])

  // Fetch analytics when restaurant, dateRange, or groupBy changes
  useEffect(() => {
    if (restaurant?.id) {
      fetchAllAnalytics()
    }
  }, [restaurant?.id, dateRange.startDate, dateRange.endDate, groupBy])

  const fetchRestaurant = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No user logged in')
      setLoading(false)
      return
    }

    try {
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
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllAnalytics = async () => {
    if (!restaurant?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        restaurantId: restaurant.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })

      // Overview
      const overviewRes = await fetch(`/api/analytics/overview?${params}`)
      const overviewData = await overviewRes.json()
      if (overviewData.success) setOverview(overviewData.data)

      // Sales Trends
      const trendsParams = new URLSearchParams(params)
      trendsParams.set('groupBy', groupBy)
      const trendsRes = await fetch(`/api/analytics/sales-trends?${trendsParams}`)
      const trendsData = await trendsRes.json()
      if (trendsData.success) setSalesTrends(trendsData.data)

      // Peak Hours
      const peakRes = await fetch(`/api/analytics/peak-hours?${params}`)
      const peakData = await peakRes.json()
      if (peakData.success) setPeakHours(peakData.data)

      // Top Products (fixed: include restaurant + date filters)
      const topParams = new URLSearchParams({
        restaurantId: restaurant.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: '10'
      })
      const topRes = await fetch(`/api/analytics/top-products?${topParams}`)
      const topData = await topRes.json()
      if (topData.success) {
        setTopProducts(
          (topData.data || []).sort((a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0))
        )
      }

      // Department Breakdown
      const departmentRes = await fetch(`/api/analytics/department-breakdown?${params}`)
      const departmentData = await departmentRes.json()
      if (departmentData.success) setDepartmentBreakdown(departmentData.data)

      // Product Profitability
      const profitParams = new URLSearchParams(params)
      const profitRes = await fetch(`/api/analytics/product-profitability?${profitParams}`)
      const profitData = await profitRes.json()
      if (profitData.success) setProductProfitability(profitData.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newRange) => setDateRange(newRange)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-600">{t('noRestaurant')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500">{t('subtitle').replace('{restaurantName}', restaurant.name)}</p>
        </div>
        <ExportButton
          overview={overview}
          salesTrends={salesTrends}
          topProducts={topProducts}
          dateRange={dateRange}
        />
      </div>

      {/* Date Range & Group By Controls */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <DateRangeSelector onRangeChange={handleDateRangeChange} />
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('groupByLabel')}</h3>
          <div className="flex flex-col gap-2">
            {['day', 'week', 'month'].map((option) => (
              <button
                key={option}
                onClick={() => setGroupBy(option)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  groupBy === option
                    ? 'bg-[#6262bd] text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(option)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('totalRevenue')}</p>
            <p className="text-3xl font-bold text-[#6262bd]">
              ${parseFloat(overview.total_revenue || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('totalOrders')}</p>
            <p className="text-3xl font-bold text-slate-700">{overview.total_orders || 0}</p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('avgOrderValue')}</p>
            <p className="text-3xl font-bold text-slate-700">
              ${parseFloat(overview.average_order_value || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('totalProfit')}</p>
            <p className="text-3xl font-bold text-green-600">
              ${parseFloat(overview.total_profit || 0).toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('margin').replace('{percent}', parseFloat(overview.profit_margin_percent || 0).toFixed(1))}
            </p>
          </div>
        </div>
      )}

      {/* Revenue Trends Chart */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">{t('revenueProfitTrends')}</h2>
        <RevenueChart data={salesTrends} groupBy={groupBy} />
      </div>

      {/* Peak Hours & Category Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-700 mb-4">{t('peakHoursAnalysis')}</h2>
          <PeakHoursChart data={peakHours} />
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-4">{t('revenueByDepartment')}</h2>
          <CategoryPieChart data={departmentBreakdown} />
        </div>
      </div>

      {/* Product Profitability Chart */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">{t('productProfitabilityAnalysis')}</h2>
        <p className="text-sm text-slate-500 mb-4">
          {t('productProfitabilityDesc')}
        </p>
        <ProductProfitabilityChart data={productProfitability} />
      </div>

      {/* Top Products Table */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">{t('topSellingProducts')}</h2>
        <TopProductsTable data={topProducts} />
      </div>
    </div>
  )
}
