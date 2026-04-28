'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const PRESET_OPTIONS = [
  { label: '30 sec', value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '2 min', value: 120_000 },
  { label: '3 min', value: 180_000 },
  { label: '5 min', value: 300_000 },
  { label: '10 min', value: 600_000 },
  { label: 'Off', value: 'disabled' },
]

// Lerp colour between green→amber→red based on progress (1=full=green, 0=empty=red)
function ringColor(progress) {
  if (progress > 0.5) {
    // green (#22c55e) → amber (#f59e0b)
    const t = (1 - progress) / 0.5  // 0 at p=1, 1 at p=0.5
    const r = Math.round(34 + (245 - 34) * t)
    const g = Math.round(197 + (158 - 197) * t)
    const b = Math.round(94 + (11 - 94) * t)
    return `rgb(${r},${g},${b})`
  } else {
    // amber (#f59e0b) → red (#ef4444)
    const t = (0.5 - progress) / 0.5 // 0 at p=0.5, 1 at p=0
    const r = Math.round(245 + (239 - 245) * t)
    const g = Math.round(158 + (68 - 158) * t)
    const b = Math.round(11 + (68 - 11) * t)
    return `rgb(${r},${g},${b})`
  }
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return ''
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  return `${seconds}s`
}

export default function InactivityRing({ progress, timeRemaining, setting, onSettingChange, sidebarOpen }) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef(null)

  const isDisabled = setting === 'disabled'

  // SVG ring dimensions
  const size = 36
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - (isDisabled ? 1 : progress))
  const color = isDisabled ? '#94a3b8' : ringColor(progress)

  // Clock hands — based on progress (progress=1 means hand at 12, drains clockwise)
  const angle = (1 - (isDisabled ? 1 : progress)) * 360 // degrees from 12 o'clock
  const angleRad = ((angle - 90) * Math.PI) / 180
  const cx = size / 2
  const cy = size / 2
  const handLength = radius * 0.55
  const hx = cx + handLength * Math.cos(angleRad)
  const hy = cy + handLength * Math.sin(angleRad)

  const currentPreset = PRESET_OPTIONS.find(o => o.value === setting)
  const currentLabel = currentPreset ? currentPreset.label : setting === 'disabled' ? 'Off' : 'Custom'

  return (
    <div className="relative flex items-center justify-center">
      {/* The ring button */}
      <button
        onClick={() => setPopoverOpen(v => !v)}
        title={isDisabled ? 'Auto sign-out: off' : `Auto sign-out in ${formatTime(timeRemaining)}`}
        className="relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6262bd] transition-transform hover:scale-110 active:scale-95"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-zinc-700 dark:text-zinc-300"
          />
          {/* Progress arc */}
          {!isDisabled && (
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.5s ease' }}
            />
          )}
        </svg>

        {/* Clock face overlay (not rotated) */}
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {/* Centre dot */}
          <circle cx={cx} cy={cy} r={1.5} fill={isDisabled ? '#94a3b8' : color} style={{ transition: 'fill 0.5s ease' }} />
          {/* Clock hand */}
          <line
            x1={cx} y1={cy}
            x2={hx} y2={hy}
            stroke={isDisabled ? '#94a3b8' : color}
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ transition: 'all 0.25s linear, stroke 0.5s ease' }}
          />
          {/* 12 o'clock tick */}
          <line x1={cx} y1={strokeWidth / 2 + 1} x2={cx} y2={strokeWidth / 2 + 4} stroke="#cbd5e1" strokeWidth={1} className="dark:stroke-slate-600" />
        </svg>
      </button>

      {/* Time label next to ring when sidebar is open */}
      {sidebarOpen && !isDisabled && timeRemaining !== null && (
        <span
          className="ml-1.5 text-xs font-medium tabular-nums"
          style={{ color, transition: 'color 0.5s ease', minWidth: '2.5rem' }}
        >
          {formatTime(timeRemaining)}
        </span>
      )}

      {/* Full-screen modal — portalled to document.body to escape sidebar clipping */}
      {popoverOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm"
            onClick={() => setPopoverOpen(false)}
          />

          {/* Modal card — centred on screen */}
          <div className="fixed inset-0 z-[9991] flex items-center justify-center p-6 pointer-events-none">
            <div
              ref={popoverRef}
              className="pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800">
                <div>
                  <h2 className="text-base font-bold text-zinc-800 dark:text-white">Auto sign-out timer</h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-0.5">
                    Resets on any tap or interaction
                  </p>
                </div>
                <button
                  onClick={() => setPopoverOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              {/* Options */}
              <div className="p-4 space-y-1">
                {PRESET_OPTIONS.map(opt => {
                  const isSelected = setting === opt.value
                  const isOff = opt.value === 'disabled'
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        onSettingChange(opt.value)
                        setPopoverOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-sm text-sm font-medium transition-colors ${
                        isSelected
                          ? isOff
                            ? 'bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 dark:text-zinc-300'
                            : 'bg-[#6262bd]/10 dark:bg-[#6262bd]/20 text-[#6262bd]'
                          : 'text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-base">{opt.label}</span>
                      {isSelected && (
                        <svg className={`w-5 h-5 ${isOff ? 'text-zinc-400 dark:text-zinc-500' : 'text-[#6262bd]'}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Footer note */}
              <div className="px-6 pb-6">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 text-center leading-relaxed">
                  Staff will be taken back to the PIN screen after this period of inactivity.
                </p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
