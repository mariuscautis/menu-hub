'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function DateRangeSelector({ onRangeChange }) {
  const t = useTranslations('analytics')
  const [selectedRange, setSelectedRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const quickRanges = [
    { value: 'today', label: t('today') },
    { value: '7d', label: t('last7Days') },
    { value: '30d', label: t('last30Days') },
    { value: '90d', label: t('last90Days') },
    { value: 'custom', label: t('customRange') }
  ]

  const handleQuickRangeChange = (range) => {
    setSelectedRange(range)
    setShowCustom(range === 'custom')

    if (range !== 'custom') {
      const today = new Date()
      const endDate = today.toISOString().split('T')[0]
      let startDate

      switch (range) {
        case 'today':
          startDate = endDate
          break
        case '7d':
          startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]
          break
        case '30d':
          startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
          break
        case '90d':
          startDate = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0]
          break
        default:
          startDate = endDate
      }

      onRangeChange({ startDate, endDate })
    }
  }

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      onRangeChange({ startDate: customStart, endDate: customEnd })
    }
  }

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('dateRange')}</h3>

      <div className="flex flex-wrap gap-2 mb-4">
        {quickRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleQuickRangeChange(range.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedRange === range.value
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('startDate')}</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('endDate')}</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <button
            onClick={handleCustomRangeApply}
            disabled={!customStart || !customEnd}
            className="w-full px-4 py-2 bg-[#6262bd] text-white rounded-lg font-medium hover:bg-[#5252a3] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {t('applyCustomRange')}
          </button>
        </div>
      )}
    </div>
  )
}
