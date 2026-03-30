'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from '@/lib/i18n/LanguageContext'

/**
 * PageTabs – two modes:
 *  - "tiles"  – when any tab has an `icon`, renders prominent card tiles (grid)
 *  - "pills"  – plain segmented pill bar (original style, no icons)
 *
 * Tabs should use `labelKey` (looked up in the 'pageTabs' namespace) or a
 * fallback `label` string for backwards compatibility.
 */
export default function PageTabs({ tabs }) {
  const pathname = usePathname()
  const t = useTranslations('pageTabs')
  const hasTiles = tabs.some(tab => tab.icon)

  const getLabel = (tab) => tab.labelKey ? t(tab.labelKey) : tab.label

  if (hasTiles) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-8">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all ${
                active
                  ? 'bg-[#6262bd] border-[#6262bd] text-white shadow-lg shadow-[#6262bd]/20'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-md'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'
              }`}>
                <span className={active ? 'text-white' : 'text-[#6262bd]'}>
                  {tab.icon}
                </span>
              </div>
              <span className={`text-sm font-semibold leading-tight ${
                active ? 'text-white' : 'text-slate-800 dark:text-slate-200 group-hover:text-[#6262bd] transition-colors'
              }`}>
                {getLabel(tab)}
              </span>
              {tab.description && (
                <span className={`text-xs leading-tight ${
                  active ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.description}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    )
  }

  // Pills fallback
  return (
    <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === tab.href
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {getLabel(tab)}
        </Link>
      ))}
    </div>
  )
}
