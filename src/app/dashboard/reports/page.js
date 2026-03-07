'use client';

/**
 * Reports Index Page
 *
 * Central hub for all report types. Provides quick access to:
 * - Z-Report (Daily Closeout) - End of day reconciliation
 * - X-Report (Shift Report) - Current shift summary without closing
 * - Weekly Summary - Week-by-week comparison
 * - Monthly Summary - Monthly P&L overview
 * - Tax Report - Tax summary for filing
 *
 * Each report type is designed for a specific use case and time period,
 * making it easy for managers to find the right report quickly.
 */

import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function ReportsPage() {
  const t = useTranslations('reports');

  // Report cards configuration
  const reports = [
    {
      category: 'daily',
      items: [
        {
          title: 'Z-Report',
          description: t('zReportDesc') || 'End of day closeout with full reconciliation',
          href: '/dashboard/reports/z-report',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'bg-[#6262bd]',
          lightColor: 'bg-[#6262bd]/10'
        },
      ]
    },
    {
      category: 'periodic',
      items: [
        {
          title: t('weeklySummary') || 'Weekly Summary',
          description: t('weeklyDesc') || 'Week-by-week performance comparison',
          href: '/dashboard/reports/weekly',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          color: 'bg-blue-500',
          lightColor: 'bg-blue-50 dark:bg-blue-900/30'
        },
        {
          title: t('monthlySummary') || 'Monthly Summary',
          description: t('monthlyDesc') || 'Monthly P&L and performance overview',
          href: '/dashboard/reports/monthly',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          color: 'bg-purple-500',
          lightColor: 'bg-purple-50 dark:bg-purple-900/30'
        },
        {
          title: t('taxReport') || 'Tax Report',
          description: t('taxDesc') || 'Tax summary for accounting and filing',
          href: '/dashboard/reports/tax',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
          ),
          color: 'bg-amber-500',
          lightColor: 'bg-amber-50 dark:bg-amber-900/30'
        },
        {
          title: 'Sales & Tax Balance',
          description: 'Products sold, recipe ingredient costs, and tax collected vs. purchase tax paid',
          href: '/dashboard/reports/sales-balance',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          ),
          color: 'bg-emerald-500',
          lightColor: 'bg-emerald-50 dark:bg-emerald-900/30'
        },
        {
          title: 'Stock Movement',
          description: 'Track stock quantities used, purchased, and remaining across a time period',
          href: '/dashboard/reports/stock-movement',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
          color: 'bg-teal-500',
          lightColor: 'bg-teal-50 dark:bg-teal-900/30'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {t('title') || 'Reports'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('subtitle') || 'Financial and operational reports'}
        </p>
      </div>

      {/* Daily Reports Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
          {t('daily') || 'Daily Reports'}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {reports[0].items.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="group bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-[#6262bd] dark:hover:border-[#6262bd] transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className={`${report.lightColor} p-3 rounded-xl text-${report.color.replace('bg-', '')} group-hover:scale-110 transition-transform`}>
                  <div className={`${report.color.includes('[') ? 'text-[#6262bd]' : report.color.replace('bg-', 'text-')}`}>
                    {report.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-[#6262bd] transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {report.description}
                  </p>
                </div>
                <div className="text-slate-400 group-hover:text-[#6262bd] group-hover:translate-x-1 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Periodic Reports Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">
          {t('periodic') || 'Periodic Reports'}
        </h2>
        <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-4">
          {reports[1].items.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="group bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-[#6262bd] dark:hover:border-[#6262bd] transition-all hover:shadow-lg"
            >
              <div className={`${report.lightColor} p-3 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform`}>
                <div className={report.color.replace('bg-', 'text-')}>
                  {report.icon}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-[#6262bd] transition-colors">
                {report.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {report.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          {t('quickActions') || 'Quick Actions'}
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/cash-drawer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-[#6262bd] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('cashDrawer') || 'Cash Drawer'}
          </Link>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-[#6262bd] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('analyticsDashboard') || 'Analytics Dashboard'}
          </Link>
          <Link
            href="/dashboard/analytics/losses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-[#6262bd] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('lossReports') || 'Loss Reports'}
          </Link>
        </div>
      </div>
    </div>
  );
}
