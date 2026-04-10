'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n/LanguageContext'

/**
 * PageTabs – two modes:
 *  - "dropdown" – when any tab has an `icon`, renders a compact dropdown nav
 *  - "pills"    – plain segmented pill bar (no icons)
 */
export default function PageTabs({ tabs }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('pageTabs')
  const hasTiles = tabs.some(tab => tab.icon)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const getLabel = (tab) => tab.labelKey ? t(tab.labelKey) : tab.label
  const activeTab = tabs.find(tab => pathname === tab.href) || tabs[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (hasTiles) {
    return (
      <div ref={ref} className="relative mb-6">
        {/* Trigger button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 w-full sm:w-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6262bd] dark:hover:border-[#6262bd] rounded-xl px-4 py-2.5 transition-colors"
        >
          {activeTab?.icon && (
            <span className="text-[#6262bd] flex-shrink-0">{activeTab.icon}</span>
          )}
          <span className="flex-1 text-left text-sm font-semibold text-slate-800 dark:text-slate-200">
            {getLabel(activeTab)}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden w-64">
            {tabs.map(tab => {
              const active = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    active
                      ? 'bg-[#6262bd]/10 dark:bg-[#6262bd]/20 text-[#6262bd]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.icon && (
                    <span className={`flex-shrink-0 ${active ? 'text-[#6262bd]' : 'text-slate-400'}`}>
                      {tab.icon}
                    </span>
                  )}
                  <span className="text-sm font-medium">{getLabel(tab)}</span>
                  {active && (
                    <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </Link>
              )
            })}
          </div>
        )}
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
