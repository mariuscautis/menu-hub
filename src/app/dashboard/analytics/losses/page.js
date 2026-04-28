'use client'

import Link from 'next/link'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import PageTabs from '@/components/PageTabs'
import { analyticsTabs } from '@/components/PageTabsConfig'

export default function LossesHubPage() {
  useModuleGuard('analytics')
  const t = useTranslations('lossesAnalytics')
  const tg = useTranslations('guide')

  const tiles = [
    {
      titleKey: 'menuItemLossesTitle',
      descKey: 'menuItemLossesDesc',
      href: '/dashboard/analytics/losses/menu',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      titleKey: 'stockItemLossesTitle',
      descKey: 'stockItemLossesDesc',
      href: '/dashboard/analytics/losses/stock',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/30',
    },
  ]

  return (
    <div>
      <PageTabs tabs={analyticsTabs} />
      <div className="max-w-2xl mx-auto mt-8">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-2 flex justify-center items-center gap-2">
            {t('lossesHubTitle')}
            <InfoTooltip text={tg('analytics_losses_desc')} />
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
            {t('lossesHubSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-8 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
            >
              <div className={`${tile.bg} p-4 rounded-sm ${tile.color} group-hover:scale-110 transition-transform`}>
                {tile.icon}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 group-hover:text-[#6262bd] transition-colors mb-1">
                  {t(tile.titleKey)}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 leading-snug">
                  {t(tile.descKey)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
