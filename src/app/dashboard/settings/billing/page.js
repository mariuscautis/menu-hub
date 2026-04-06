'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations, useLanguage } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'

const PLAN_DEFS = [
  {
    key: 'orders',
    nameKey: 'planOrdersName',
    price: 28.99,
    descKey: 'planOrdersDesc',
    featuresKeys: ['featQrOrdering', 'featTakeaway', 'featMenuMgmt', 'featStock', 'featReports', 'featCharts'],
    badgeKey: 'badgeMostPopular',
    badgeColor: 'bg-[#6262bd] text-white',
  },
  {
    key: 'bookings',
    nameKey: 'planBookingsName',
    price: 11.99,
    descKey: 'planBookingsDesc',
    featuresKeys: ['featBookingPage', 'featReservations', 'featConfEmails', 'featNoShow', 'featFloorPlan'],
    badgeKey: null,
  },
  {
    key: 'team',
    nameKey: 'planTeamName',
    price: 14.99,
    descKey: 'planTeamDesc',
    featuresKeys: ['featStaffDir', 'featRota', 'featClockIn', 'featTimeOff', 'featAvailability', 'featShiftTemplates'],
    badgeKey: null,
  },
]

const BUNDLE_DISCOUNT = 0.15

function calcTotal(selectedKeys) {
  const base = selectedKeys.reduce((sum, key) => {
    const plan = PLAN_DEFS.find(p => p.key === key)
    return sum + (plan?.price || 0)
  }, 0)
  const discount = selectedKeys.length >= 2 ? BUNDLE_DISCOUNT : 0
  const totalRaw = base * (1 - discount)
  return {
    base:   parseFloat(base.toFixed(2)),
    total:  parseFloat(totalRaw.toFixed(2)),
    saving: parseFloat((base - totalRaw).toFixed(2)),
  }
}

const STATUS_CONFIG = {
  trialing: { labelKey: 'statusTrialing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  active:   { labelKey: 'statusActive',   className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  past_due: { labelKey: 'statusPastDue',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  canceled: { labelKey: 'statusCanceled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  unpaid:   { labelKey: 'statusUnpaid',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BillingPage() {
  const { messages } = useLanguage()
  const t = useTranslations('billing')
  const tg = useTranslations('guide')
  const restaurantCtx = useRestaurant()
  const searchParams  = useSearchParams()

  const PLANS = PLAN_DEFS.map(p => ({
    ...p,
    name: t(p.nameKey),
    description: t(p.descKey),
    features: p.featuresKeys.map(k => t(k)),
    badge: p.badgeKey ? t(p.badgeKey) : null,
  }))

  const restaurant         = restaurantCtx?.restaurant
  const subscriptionStatus = restaurant?.subscription_status || 'trialing'
  const subscriptionPlans  = (restaurant?.subscription_plans || '').split(',').filter(Boolean)
  const trialEndsAt        = restaurant?.trial_ends_at
  const currentPeriodEnd   = restaurant?.current_period_end
  const isActive           = subscriptionStatus === 'active'

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null
  const isTrialing = subscriptionStatus === 'trialing' && trialEndsAt

  const [selected, setSelected]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage]             = useState(null)
  const [smsEnabled, setSmsEnabled]       = useState(false)
  const [smsToggling, setSmsToggling]     = useState(false)
  const [smsUsage, setSmsUsage]           = useState(null)

  // When active: pre-select current plans so the user sees their current state
  useEffect(() => {
    if (isActive && subscriptionPlans.length > 0) {
      setSelected(subscriptionPlans)
    }
  }, [restaurant?.subscription_plans, subscriptionStatus])

  useEffect(() => {
    setSmsEnabled(!!restaurant?.sms_billing_enabled)
  }, [restaurant?.sms_billing_enabled])

  useEffect(() => {
    if (!restaurant?.id || !restaurant?.sms_billing_enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/billing/sms-addon?restaurantId=${restaurant.id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        })
        const data = await res.json()
        if (!cancelled) setSmsUsage(data)
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [restaurant?.id, restaurant?.sms_billing_enabled])

  useEffect(() => {
    if (!messages || Object.keys(messages).length === 0) return
    if (searchParams.get('success') === '1') {
      setMessage({ type: 'success', text: t('msgSuccess') })
    } else if (searchParams.get('canceled') === '1') {
      setMessage({ type: 'info', text: t('msgCanceled') })
    }
  }, [searchParams, messages])

  const togglePlan = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
    setMessage(null)
  }

  // Diff between current subscription and selection
  const toAdd    = selected.filter(k => !subscriptionPlans.includes(k))
  const toRemove = subscriptionPlans.filter(k => !selected.includes(k))
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  const { base, total, saving } = calcTotal(selected)
  const { total: currentTotal } = calcTotal(subscriptionPlans)

  const toggleSmsAddon = async (newValue) => {
    if (!restaurant?.id || smsToggling) return
    setSmsToggling(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/billing/sms-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ restaurantId: restaurant.id, enabled: newValue }),
      })
      const data = await res.json()
      if (data.success) {
        setSmsEnabled(newValue)
      } else {
        setMessage({ type: 'error', text: data.error || t('msgSmsError') })
      }
    } catch {
      setMessage({ type: 'error', text: t('msgGenericError') })
    } finally {
      setSmsToggling(false)
    }
  }

  const handleUpdate = async () => {
    if (!restaurant?.id) return
    if (selected.length === 0) {
      setMessage({ type: 'error', text: t('msgAtLeastOne') })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res  = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, plans: selected }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.updated || data.added) {
        setMessage({ type: 'success', text: t('msgUpdated') })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage({ type: 'error', text: data.error || t('msgGenericError') })
        setLoading(false)
      }
    } catch {
      setMessage({ type: 'error', text: t('msgGenericError') })
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!restaurant?.id || selected.length === 0) return
    setLoading(true)
    setMessage(null)
    try {
      const res  = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, plans: selected }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || t('msgGenericError') })
        setLoading(false)
      }
    } catch {
      setMessage({ type: 'error', text: t('msgGenericError') })
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!restaurant?.id) return
    setPortalLoading(true)
    setMessage(null)
    try {
      const res  = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || t('msgGenericError') })
      }
    } catch {
      setMessage({ type: 'error', text: t('msgGenericError') })
    } finally {
      setPortalLoading(false)
    }
  }

  const statusConfig = STATUS_CONFIG[subscriptionStatus] || STATUS_CONFIG.trialing

  return (
    <OfflinePageGuard>
    <div>
      <PageTabs tabs={settingsTabs} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {t('title')}
          <InfoTooltip text={tg('billing_desc')} />
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>

      {/* Trial countdown banner */}
      {isTrialing && (
        <div className={`mb-6 rounded-2xl border-2 p-5 flex items-center gap-4 ${
          trialDaysLeft <= 3
            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            : trialDaysLeft <= 7
              ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
              : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
        }`}>
          {/* Circle countdown */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold ${
            trialDaysLeft <= 3
              ? 'bg-red-500 text-white'
              : trialDaysLeft <= 7
                ? 'bg-amber-500 text-white'
                : 'bg-blue-500 text-white'
          }`}>
            <span className="text-xl leading-none">{trialDaysLeft}</span>
            <span className="text-xs leading-none opacity-80">{t('days')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${
              trialDaysLeft <= 3 ? 'text-red-700 dark:text-red-300'
              : trialDaysLeft <= 7 ? 'text-amber-700 dark:text-amber-300'
              : 'text-blue-700 dark:text-blue-300'
            }`}>
              {trialDaysLeft === 0
                ? t('trialEndsToday')
                : t('trialDaysLeft', { n: trialDaysLeft })}
            </p>
            <p className={`text-xs mt-0.5 ${
              trialDaysLeft <= 3 ? 'text-red-500 dark:text-red-400'
              : trialDaysLeft <= 7 ? 'text-amber-500 dark:text-amber-400'
              : 'text-blue-500 dark:text-blue-400'
            }`}>
              {t('trialExpires', { date: formatDate(trialEndsAt) })}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
          message.type === 'info'    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' :
                                       'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Current status */}
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t('currentSubscription')}</h2>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.className}`}>
                {t(statusConfig.labelKey)}
              </span>
              {subscriptionPlans.map(key => {
                const plan = PLANS.find(p => p.key === key)
                return plan ? (
                  <span key={key} className="px-3 py-1 rounded-full text-sm font-medium bg-[#6262bd]/10 text-[#6262bd] dark:bg-[#6262bd]/20">
                    {plan.name}
                  </span>
                ) : null
              })}
              {subscriptionPlans.length === 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">{t('noActiveModules')}</span>
              )}
            </div>
            {subscriptionStatus === 'trialing' && !trialEndsAt && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('trialNoExpiry')}</p>
            )}
            {isActive && currentPeriodEnd && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('nextBillingDate', { date: formatDate(currentPeriodEnd) })}</p>
            )}
            {subscriptionStatus === 'past_due' && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{t('pastDueNote')}</p>
            )}
            {subscriptionStatus === 'canceled' && currentPeriodEnd && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('canceledNote', { date: formatDate(currentPeriodEnd) })}</p>
            )}
          </div>
          {restaurant?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
            >
              {portalLoading
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
              }
              {portalLoading ? t('opening') : t('manageBilling')}
            </button>
          )}
        </div>
      </div>

      {/* Plan tiles */}
      <div className="mb-4 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {isActive ? t('yourModules') : t('selectModules')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isActive ? t('modulesActiveDesc') : t('modulesTrialDesc')}
          </p>
        </div>
        {selected.length >= 2 && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            {t('bundleDiscountApplied')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {PLANS.map(plan => {
          const isSelected = selected.includes(plan.key)
          const wasActive  = subscriptionPlans.includes(plan.key)
          const isAdding   = isActive && isSelected && !wasActive
          const isRemoving = isActive && !isSelected && wasActive

          return (
            <button
              key={plan.key}
              onClick={() => togglePlan(plan.key)}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all flex flex-col ${
                isRemoving
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700 opacity-60'
                  : isAdding
                    ? 'border-[#6262bd] bg-[#6262bd]/5 dark:bg-[#6262bd]/10 shadow-md shadow-[#6262bd]/10'
                    : isSelected
                      ? 'border-[#6262bd] bg-[#6262bd]/5 dark:bg-[#6262bd]/10 shadow-md shadow-[#6262bd]/10'
                      : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Badge */}
              {isRemoving && (
                <span className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full bg-red-500 text-white">
                  {t('willBeRemoved')}
                </span>
              )}
              {isAdding && (
                <span className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full bg-[#6262bd] text-white">
                  {t('willBeAdded')}
                </span>
              )}
              {!isActive && plan.badge && isSelected === false && (
                <span className={`absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.description}</p>
                </div>
                {/* Toggle indicator */}
                <div className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                  isSelected ? 'bg-[#6262bd]' : 'bg-slate-200 dark:bg-slate-600'
                }`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isSelected ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-slate-800 dark:text-white">£{plan.price}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/{t('month')}</span>
              </div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* SMS verification add-on — only inside Bookings, only when selected */}
              {plan.key === 'bookings' && isSelected && (
                <div
                  onClick={e => e.stopPropagation()}
                  className={`mt-4 rounded-xl border-2 p-4 transition-colors ${
                    smsEnabled
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                      : 'border-slate-200 bg-white/60 dark:bg-slate-700/30 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        📱 {t('smsAddonTitle')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {t('smsAddonDesc')}{' '}
                        <a
                          href="https://venoapp.com/services/reservations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6262bd] underline"
                        >
                          {t('learnMore')}
                        </a>
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                        {t('smsBilledMonthly', { rate: restaurant?.sms_billing_rate_pence ?? 20 })}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSmsAddon(!smsEnabled)}
                      disabled={smsToggling}
                      className={`flex-shrink-0 relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                        smsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        smsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  {smsEnabled && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ {t('smsEnabled')}
                    </p>
                  )}
                  {smsEnabled && smsUsage && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        {t('smsUsageMonth', { month: smsUsage.month })}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{t('smsSent', { count: smsUsage.sms_count })}</span>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {t('smsEstimated', { amount: (smsUsage.total_pence / 100).toFixed(2) })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {t('smsRate', { rate: smsUsage.rate_pence })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Action bar */}
      {isActive ? (
        // ── Active subscriber: show diff + Update plan button ──────────────
        <div className={`bg-white dark:bg-slate-800 border-2 rounded-2xl p-6 transition-all ${
          hasChanges ? 'border-[#6262bd]/40' : 'border-slate-100 dark:border-slate-700'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {hasChanges ? (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {toAdd.length > 0 && (
                      <span className="text-green-600 dark:text-green-400 mr-3">
                        {t('adding')} {toAdd.map(k => PLANS.find(p => p.key === k)?.name).join(', ')}
                      </span>
                    )}
                    {toRemove.length > 0 && (
                      <span className="text-red-500 dark:text-red-400">
                        {t('removing')} {toRemove.map(k => PLANS.find(p => p.key === k)?.name).join(', ')}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-slate-400 dark:text-slate-500 line-through text-sm">£{currentTotal}/{t('month')}</span>
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">
                      £{total}<span className="text-sm font-normal text-slate-500">/{t('month')}</span>
                    </span>
                    {selected.length >= 2 && saving > 0 && (
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">{t('saveMo', { amount: saving })}</span>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {selected.map(k => PLANS.find(p => p.key === k)?.name).join(' + ') || t('noModulesSelected')}
                  </p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
                    £{total}<span className="text-sm font-normal text-slate-500">/{t('month')}</span>
                    {selected.length >= 2 && saving > 0 && (
                      <span className="text-green-600 text-sm font-medium ml-3">{t('saveMo', { amount: saving })}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleUpdate}
              disabled={loading || !hasChanges}
              className="px-8 py-3 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md shadow-[#6262bd]/20"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  {t('updating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  {hasChanges ? t('updatePlan') : t('noChanges')}
                </>
              )}
            </button>
          </div>
          {hasChanges && toRemove.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              {t('removedModulesNote')}
            </p>
          )}
        </div>
      ) : (
        // ── New subscriber: show checkout summary ─────────────────────────
        selected.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border-2 border-[#6262bd]/30 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {selected.map(k => PLANS.find(p => p.key === k)?.name).join(' + ')}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {selected.length >= 2 && (
                    <span className="text-slate-400 dark:text-slate-500 line-through text-sm">£{base}/{t('month')}</span>
                  )}
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    £{total}<span className="text-sm font-normal text-slate-500">/{t('month')}</span>
                  </span>
                  {selected.length >= 2 && (
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      {t('saveMo', { amount: saving })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md shadow-green-600/20"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    {t('redirecting')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    {t('secureCheckout')}
                  </>
                )}
              </button>
            </div>
          </div>
        )
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-5">
        {t('trialNote')}
      </p>
    </div>
    </OfflinePageGuard>
  )
}
