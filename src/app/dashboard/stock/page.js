'use client'

import Link from 'next/link'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'

export default function StockHubPage() {
  useModuleGuard('ordering')
  const t = useTranslations('stock')
  const tg = useTranslations('guide')

  const sections = [
    {
      titleKey: 'foodStock',
      descKey: 'foodStockDesc',
      href: '/dashboard/stock/products',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'text-[#6262bd]',
      bg: 'bg-[#6262bd]/10',
    },
    {
      titleKey: 'inventory',
      descKey: 'inventoryDesc',
      href: '/dashboard/stock/inventory',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      titleKey: 'invoices',
      descKey: 'invoicesDesc',
      href: '/dashboard/stock/purchasing-invoices',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
  ]

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-2 flex items-center justify-center gap-2">
            {t('hubTitle')}
            <InfoTooltip text={tg('stock_desc')} />
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
            {t('hubSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-6 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
            >
              <div className={`${section.bg} p-4 rounded-sm ${section.color} group-hover:scale-110 transition-transform`}>
                {section.icon}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 group-hover:text-[#6262bd] transition-colors mb-1">
                  {t(section.titleKey)}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 leading-snug">
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
