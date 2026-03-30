'use client'

import Link from 'next/link'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function MenuHubPage() {
  const t = useTranslations('menu')

  const sections = [
    {
      titleKey: 'menuItems',
      descKey: 'menuItemsDesc',
      href: '/dashboard/menu/items',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      color: 'text-[#6262bd]',
      bg: 'bg-[#6262bd]/10',
    },
    {
      titleKey: 'categories',
      descKey: 'categoriesDesc',
      href: '/dashboard/menu/categories',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
        </svg>
      ),
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col items-center text-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-8 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-lg transition-all"
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
