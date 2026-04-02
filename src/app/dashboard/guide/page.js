'use client'

import { useTranslations } from '@/lib/i18n/LanguageContext'

const FLOWS = [
  {
    titleKey: 'flow1_title',
    steps: ['flow1_step1', 'flow1_step2', 'flow1_step3', 'flow1_step4', 'flow1_step5', 'flow1_step6'],
    color: 'text-[#6262bd]',
    bg: 'bg-[#6262bd]/10',
    border: 'border-[#6262bd]/20',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    titleKey: 'flow2_title',
    steps: ['flow2_step1', 'flow2_step2', 'flow2_step3', 'flow2_step4', 'flow2_step5', 'flow2_step6'],
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    titleKey: 'flow3_title',
    steps: ['flow3_step1', 'flow3_step2', 'flow3_step3', 'flow3_step4', 'flow3_step5', 'flow3_step6'],
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    titleKey: 'flow4_title',
    steps: ['flow4_step1', 'flow4_step2', 'flow4_step3', 'flow4_step4', 'flow4_step5', 'flow4_step6'],
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    titleKey: 'flow5_title',
    steps: ['flow5_step1', 'flow5_step2', 'flow5_step3', 'flow5_step4', 'flow5_step5', 'flow5_step6'],
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
]

function FlowCard({ flow, t }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6`}>
      {/* Card header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`${flow.bg} ${flow.color} p-2.5 rounded-xl`}>
          {flow.icon}
        </div>
        <h2 className={`text-lg font-bold ${flow.color}`}>{t(flow.titleKey)}</h2>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {flow.steps.map((stepKey, idx) => (
          <div key={stepKey}>
            <div className="flex items-start gap-3">
              {/* Step number bubble */}
              <div className={`flex-shrink-0 w-7 h-7 rounded-full ${flow.bg} ${flow.color} flex items-center justify-center text-xs font-bold border ${flow.border}`}>
                {idx + 1}
              </div>
              {/* Step text */}
              <p className="text-sm text-slate-700 dark:text-slate-300 pt-1 leading-snug">{t(stepKey)}</p>
            </div>
            {/* Arrow connector between steps */}
            {idx < flow.steps.length - 1 && (
              <div className={`ml-3.5 w-px h-4 ${flow.color} opacity-30`} style={{ borderLeft: '2px dashed currentColor' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GuidePage() {
  const t = useTranslations('guidePage')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Flowchart grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {FLOWS.map((flow) => (
            <FlowCard key={flow.titleKey} flow={flow} t={t} />
          ))}
        </div>
      </div>
    </div>
  )
}
