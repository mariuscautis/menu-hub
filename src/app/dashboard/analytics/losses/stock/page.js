'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import Link from 'next/link'
import PageTabs from '@/components/PageTabs'
import { analyticsTabs } from '@/components/PageTabsConfig'
import { useTranslations, useLanguage } from '@/lib/i18n/LanguageContext'

export default function StockItemLosses() {
  useModuleGuard('analytics')
  const t = useTranslations('lossesAnalytics')
  const { locale } = useLanguage()
  const { formatCurrency } = useCurrency()
  const restaurantCtx = useRestaurant()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lossesData, setLossesData] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    setRestaurant(restaurantCtx.restaurant)
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
    setLoading(false)
  }, [restaurantCtx])

  useEffect(() => {
    if (restaurant) fetchLosses()
  }, [restaurant, startDate, endDate])

  const fetchLosses = async () => {
    if (!startDate || !endDate) return
    const params = new URLSearchParams({
      restaurantId: restaurant.id,
      startDate,
      endDate,
      type: 'stock'
    })
    const response = await fetch(`/api/analytics/stock-losses?${params}`)
    if (!response.ok) return
    const result = await response.json()
    if (result.success) setLossesData(result)
  }

  if (loading) return <div className="text-slate-500">{t('loading')}</div>
  if (!restaurant) return <div className="text-red-600">{t('noRestaurant')}</div>

  return (
    <div>
      <PageTabs tabs={analyticsTabs} />
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/analytics/losses"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#6262bd] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('lossReports')}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('stockItemLossesTitle')}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('stockItemLossesTitle')}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t('stockItemLossesDesc')}</p>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">{t('filters')}</h2>
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('startDate')}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('endDate')}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
          </div>
        </div>
      </div>

      {lossesData ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">{t('stockLossRecords')}</h2>
          {lossesData.data?.length === 0 ? (
            <div className="text-center py-12 text-slate-400">{t('noStockLossRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('item')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('qtyLost')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('unitCost')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('totalCost')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('reason')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('staff')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lossesData.data.map((loss, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                        {new Date(loss.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{loss.item_name}</td>
                      <td className="py-3 px-4"><span className="font-semibold text-red-600">{loss.quantity} {loss.unit}</span></td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{formatCurrency(loss.unit_cost || 0)}</td>
                      <td className="py-3 px-4"><span className="font-semibold text-red-700 dark:text-red-500">{formatCurrency(loss.total_cost || 0)}</span></td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs rounded-full font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{loss.reason || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{loss.staff_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('stockLossComingSoon')}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t('stockLossComingSoonDesc')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
