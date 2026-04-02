'use client'

import { useState, useRef, useEffect } from 'react'
import { useGuide } from '@/lib/GuideContext'

/**
 * InfoTooltip — shows a contextual help popover when guide mode is on.
 *
 * Usage:
 *   import InfoTooltip from '@/components/InfoTooltip'
 *
 *   <h2 className="flex items-center gap-2">
 *     Z-Report
 *     <InfoTooltip text={t('zreport_desc')} />
 *   </h2>
 *
 * The tooltip is invisible when guide mode is off, so it can be placed
 * anywhere without affecting the layout for experienced users.
 */
export default function InfoTooltip({ text, position = 'right' }) {
  const { guideMode } = useGuide()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!guideMode) return null

  const positionClasses = {
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  }

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full bg-[#6262bd] text-white flex items-center justify-center text-[10px] font-bold leading-none flex-shrink-0 hover:bg-[#4f4faa] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6262bd] focus:ring-offset-1"
        aria-label="More information"
      >
        i
      </button>

      {open && (
        <span
          className={`absolute z-50 w-64 p-3 rounded-xl shadow-lg text-sm font-normal leading-relaxed normal-case tracking-normal
            bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-200
            ${positionClasses[position] ?? positionClasses.right}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
