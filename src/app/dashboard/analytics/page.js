'use client'

import Link from 'next/link'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useModuleGuard } from '@/hooks/useModuleGuard'

export default function AnalyticsHubPage() {
  useModuleGuard('analytics')
  const t = useTranslations('analytics')

  const sections = [
    {
      titleKey: 'overviewTitle',
      descKey: 'overviewDesc',
      href: '/dashboard/analytics/overview',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-[#6262bd]',
      bg: 'bg-[#6262bd]/10',
    },
    {
      titleKey: 'tablesTitle',
      descKey: 'tablesDesc',
      href: '/dashboard/analytics/tables',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
        </svg>
      ),
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      titleKey: 'staffTitle',
      descKey: 'staffDesc',
      href: '/dashboard/analytics/staff',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      titleKey: 'lossesTitle',
      descKey: 'lossesDesc',
      href: '/dashboard/analytics/losses',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      titleKey: 'laborTitle',
      descKey: 'laborDesc',
      href: '/dashboard/analytics/labor',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-teal-500',
      bg: 'bg-teal-50 dark:bg-teal-900/30',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('hubSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
            >
              <div className={`${section.bg} p-4 rounded-2xl ${section.color} group-hover:scale-110 transition-transform`}>
                {section.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#6262bd] transition-colors mb-1">
                  {t(section.titleKey)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {t(section.descKey)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
