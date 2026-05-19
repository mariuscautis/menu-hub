'use client'

import { usePageTour } from '@/lib/PageTourContext'

export default function GuideToggle({ collapsed = false }) {
  const { steps, startTour } = usePageTour()
  const hasSteps = steps && steps.length > 0

  if (!hasSteps) return null

  const cls = `flex items-center justify-center transition-colors flex-shrink-0
    text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800
    hover:text-zinc-700 dark:hover:text-zinc-200
    ${collapsed ? 'w-10 h-10 rounded-sm' : 'p-2 rounded-sm'}`

  return (
    <button onClick={startTour} title="Page guide" className={cls}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  )
}
