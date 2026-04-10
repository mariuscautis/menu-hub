'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import InfoTooltip from '@/components/InfoTooltip';
import { useModuleGuard } from '@/hooks/useModuleGuard';

const reportKeys = [
  {
    titleKey: 'zReportTitle',
    descKey: 'zReportDesc',
    href: '/dashboard/reports/z-report',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-[#6262bd]',
    bg: 'bg-[#6262bd]/10',
  },
  {
    titleKey: 'xReportTitle',
    descKey: 'xReportDesc',
    href: '/dashboard/reports/x-report',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
  },
  {
    titleKey: 'weeklySummaryTitle',
    descKey: 'weeklyDesc',
    href: '/dashboard/reports/weekly',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
  {
    titleKey: 'monthlySummaryTitle',
    descKey: 'monthlyDesc',
    href: '/dashboard/reports/monthly',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/30',
  },
  {
    titleKey: 'taxReportTitle',
    descKey: 'taxDesc',
    href: '/dashboard/reports/tax',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    titleKey: 'salesBalanceTitle',
    descKey: 'salesBalanceDesc',
    href: '/dashboard/reports/sales-balance',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    titleKey: 'stockMovementTitle',
    descKey: 'stockMovementDesc',
    href: '/dashboard/reports/stock-movement',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-900/30',
  },
]

export default function ReportsPage() {
  useModuleGuard('reports')
  const t = useTranslations('reports');
  const tg = useTranslations('guide');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-center gap-2">
            {t('title')}
            <InfoTooltip text={tg('reports_desc')} />
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reportKeys.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
            >
              <div className={`${report.bg} p-4 rounded-2xl ${report.color} group-hover:scale-110 transition-transform`}>
                {report.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#6262bd] transition-colors mb-1">
                  {t(report.titleKey)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {t(report.descKey)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
