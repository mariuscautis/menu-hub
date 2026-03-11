'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRestaurant } from '@/lib/RestaurantContext'

const PLANS = [
  {
    key: 'orders',
    name: 'Orders',
    price: 28.99,
    description: 'Digital ordering, menus & analytics.',
    features: [
      'QR table ordering',
      'Takeaway orders',
      'Menu & categories management',
      'Stock & inventory tracking',
      'Sales reports & analytics',
      'Revenue & peak-hours charts',
    ],
    badge: 'Most popular',
    badgeColor: 'bg-[#6262bd] text-white',
  },
  {
    key: 'bookings',
    name: 'Bookings',
    price: 11.99,
    description: 'Online reservations & booking management.',
    features: [
      'Public booking page',
      'Reservations dashboard',
      'Confirmation & cancellation emails',
      'No-show auto-cancellation',
      'Floor plan & table assignment',
    ],
    badge: null,
  },
  {
    key: 'team',
    name: 'Team',
    price: 14.99,
    description: 'Staff management, rota & scheduling.',
    features: [
      'Staff directory',
      'Rota scheduling calendar',
      'Clock in / clock out',
      'Time-off requests',
      'Staff availability management',
      'Shift templates',
    ],
    badge: null,
  },
]

const BUNDLE_DISCOUNT = 0.15

function calcTotal(selectedKeys) {
  const base = selectedKeys.reduce((sum, key) => {
    const plan = PLANS.find(p => p.key === key)
    return sum + (plan?.price || 0)
  }, 0)
  const discount = selectedKeys.length >= 2 ? BUNDLE_DISCOUNT : 0
  const totalRaw = base * (1 - discount)
  return {
    base:    parseFloat(base.toFixed(2)),
    discount,
    total:   parseFloat(totalRaw.toFixed(2)),
    saving:  parseFloat((base - totalRaw).toFixed(2)),
  }
}

const STATUS_CONFIG = {
  trialing: { label: 'Free Trial',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  active:   { label: 'Active',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  past_due: { label: 'Past Due',    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  canceled: { label: 'Canceled',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  unpaid:   { label: 'Unpaid',      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BillingPage() {
  const restaurantCtx = useRestaurant()
  const searchParams  = useSearchParams()

  const restaurant         = restaurantCtx?.restaurant
  const subscriptionStatus = restaurant?.subscription_status || 'trialing'
  const subscriptionPlans  = (restaurant?.subscription_plans || '').split(',').filter(Boolean)
  const trialEndsAt        = restaurant?.trial_ends_at
  const currentPeriodEnd   = restaurant?.current_period_end

  const [selected, setSelected]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage]             = useState(null)

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setMessage({ type: 'success', text: 'Subscription activated! Your modules are now unlocked.' })
    } else if (searchParams.get('canceled') === '1') {
      setMessage({ type: 'info', text: 'Checkout cancelled. No charge was made.' })
    }
  }, [searchParams])

  const togglePlan = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const { base, total, saving } = calcTotal(selected)
  const isAlreadySubscribed = (key) => subscriptionPlans.includes(key)

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
      } else if (data.added) {
        // Modules added to existing subscription — refresh to show updated state
        setMessage({ type: 'success', text: 'Modules added successfully! Your subscription has been updated.' })
        setSelected([])
        setLoading(false)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start checkout.' })
        setLoading(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
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
        setMessage({ type: 'error', text: data.error || 'Failed to open billing portal.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setPortalLoading(false)
    }
  }

  const statusConfig = STATUS_CONFIG[subscriptionStatus] || STATUS_CONFIG.trialing

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Billing & Subscription</h1>
        <p className="text-slate-500 dark:text-slate-400">Choose the modules your business needs.</p>
      </div>

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
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Current Subscription</h2>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.className}`}>
                {statusConfig.label}
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
                <span className="text-sm text-slate-500 dark:text-slate-400">No active modules yet</span>
              )}
            </div>
            {subscriptionStatus === 'trialing' && trialEndsAt && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Free trial ends <strong>{formatDate(trialEndsAt)}</strong></p>
            )}
            {subscriptionStatus === 'active' && currentPeriodEnd && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Next billing date: <strong>{formatDate(currentPeriodEnd)}</strong></p>
            )}
            {subscriptionStatus === 'past_due' && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Payment failed — update your payment method to restore access.</p>
            )}
            {subscriptionStatus === 'canceled' && currentPeriodEnd && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Access until <strong>{formatDate(currentPeriodEnd)}</strong> — resubscribe below.</p>
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
              {portalLoading ? 'Opening…' : 'Manage Billing'}
            </button>
          )}
        </div>
      </div>

      {/* Plan selector */}
      <div className="mb-4 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {subscriptionStatus === 'active' ? 'Add or change modules' : 'Select your modules'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subscriptionStatus === 'active'
              ? 'Select modules to add. To remove a module or cancel, use the Manage Billing button above.'
              : 'Pick one or more — 15% bundle discount applies when you choose 2 or more.'}
          </p>
        </div>
        {selected.length >= 2 && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
            15% bundle discount applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {PLANS.map(plan => {
          const isSelected = selected.includes(plan.key)
          const isActive   = isAlreadySubscribed(plan.key)

          return (
            <button
              key={plan.key}
              onClick={() => !isActive && togglePlan(plan.key)}
              disabled={isActive}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all flex flex-col ${
                isActive
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/10 dark:border-green-700 cursor-default opacity-80'
                  : isSelected
                    ? 'border-[#6262bd] bg-[#6262bd]/5 dark:bg-[#6262bd]/10 shadow-md shadow-[#6262bd]/10'
                    : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {plan.badge && !isActive && (
                <span className={`absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full bg-green-500 text-white">
                  Active
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.description}</p>
                </div>
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isActive   ? 'bg-green-500 border-green-500' :
                  isSelected ? 'bg-[#6262bd] border-[#6262bd]' :
                               'border-slate-300 dark:border-slate-600'
                }`}>
                  {(isActive || isSelected) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-slate-800 dark:text-white">£{plan.price}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/month</span>
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
            </button>
          )
        })}
      </div>

      {/* Checkout summary */}
      {selected.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border-2 border-[#6262bd]/30 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {selected.map(k => PLANS.find(p => p.key === k)?.name).join(' + ')}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {selected.length >= 2 && (
                  <span className="text-slate-400 dark:text-slate-500 line-through text-sm">£{base}/mo</span>
                )}
                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                  £{total}<span className="text-sm font-normal text-slate-500">/month</span>
                </span>
                {selected.length >= 2 && (
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                    Save £{saving}/mo
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
                  Redirecting…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  Secure checkout
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-5">
        All modules include a 14-day free trial. Cancel anytime. Prices exclude VAT. Payments processed securely by Stripe.
      </p>
    </div>
  )
}
