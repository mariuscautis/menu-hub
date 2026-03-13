'use client'

import Link from 'next/link'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { analyticsTabs } from '@/components/PageTabsConfig'

const tiles = [
  {
    title: 'Menu Item Losses',
    description: 'Waste, voids and losses recorded against menu items',
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
    title: 'Stock Item Losses',
    description: 'Ingredient and stock losses from spoilage or damage',
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

export default function LossesHubPage() {
  useModuleGuard('analytics')

  return (
    <div>
      <PageTabs tabs={analyticsTabs} />
      <div className="max-w-2xl mx-auto mt-8">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Loss Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track and analyse losses across menu items and stock
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
            >
              <div className={`${tile.bg} p-4 rounded-2xl ${tile.color} group-hover:scale-110 transition-transform`}>
                {tile.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#6262bd] transition-colors mb-1">
                  {tile.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {tile.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
