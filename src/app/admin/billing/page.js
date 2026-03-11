'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const PLANS = [
  { key: 'orders',   name: 'Orders',   price: 39 },
  { key: 'bookings', name: 'Bookings', price: 19 },
  { key: 'team',     name: 'Team',     price: 29 },
]

const STATUS_COLORS = {
  trialing: 'bg-blue-100 text-blue-700',
  active:   'bg-green-100 text-green-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  unpaid:   'bg-red-100 text-red-700',
}

export default function AdminBilling() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('subscription_plans, subscription_status')

    if (error || !data) {
      const { data: fallback } = await supabase
        .from('restaurants')
        .select('subscription_status')

      const byStatus = {}
      ;(fallback || []).forEach(r => {
        const s = r.subscription_status || 'trialing'
        byStatus[s] = (byStatus[s] || 0) + 1
      })
      setStats({ total: (fallback || []).length, byStatus, byPlan: { orders: 0, bookings: 0, team: 0 }, activeRevenue: 0 })
      setLoading(false)
      return
    }

    const byStatus = {}
    const byPlan   = { orders: 0, bookings: 0, team: 0 }
    let activeRevenue = 0

    data.forEach(r => {
      const status = r.subscription_status || 'trialing'
      byStatus[status] = (byStatus[status] || 0) + 1

      const plans = (r.subscription_plans || '').split(',').filter(Boolean)
      plans.forEach(p => { if (p in byPlan) byPlan[p]++ })

      if (status === 'active') {
        const base     = plans.reduce((sum, p) => sum + (PLANS.find(pl => pl.key === p)?.price || 0), 0)
        const discount = plans.length >= 2 ? 0.15 : 0
        activeRevenue += Math.round(base * (1 - discount))
      }
    })

    setStats({ total: data.length, byStatus, byPlan, activeRevenue })
    setLoading(false)
  }

  if (loading || !stats) return <div className="text-slate-500">Loading billing stats...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Billing & Plans</h1>
        <p className="text-slate-500">
          Subscription overview across all restaurants. Manage products in the{' '}
          <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-[#6262bd] hover:underline">
            Stripe Dashboard
          </a>.
        </p>
      </div>

      {/* MRR */}
      <div className="bg-[#6262bd] text-white rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">Estimated Monthly Revenue</p>
          <p className="text-4xl font-bold">£{stats.activeRevenue.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">from {stats.byStatus.active || 0} active subscribers</p>
        </div>
        <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>
      </div>

      {/* Status breakdown */}
      <h2 className="text-base font-bold text-slate-700 mb-3">Subscription Status</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {['trialing', 'active', 'past_due', 'canceled', 'unpaid'].map(status => (
          <div key={status} className="bg-white border-2 border-slate-100 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800 mb-1">{stats.byStatus[status] || 0}</div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Module adoption */}
      <h2 className="text-base font-bold text-slate-700 mb-3">Module Adoption</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map(plan => {
          const count = stats.byPlan[plan.key] || 0
          const pct   = stats.total ? Math.round((count / stats.total) * 100) : 0
          return (
            <div key={plan.key} className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-800">{plan.name}</h3>
                <span className="text-2xl font-bold text-[#6262bd]">{count}</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">£{plan.price}/mo per subscriber</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                <div className="bg-[#6262bd] h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-500">{pct}% of all restaurants</p>
            </div>
          )
        })}
      </div>

      {/* Env checklist */}
      <h2 className="text-base font-bold text-slate-700 mb-3">Stripe Configuration</h2>
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <p className="text-sm text-slate-500 mb-4">
          Server-side variables cannot be verified here — check your <code className="bg-slate-100 px-1 rounded">.env.local</code> directly.
        </p>
        <ul className="space-y-3">
          {[
            { key: 'STRIPE_SECRET_KEY',                  label: 'Stripe Secret Key',             pub: false },
            { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key',         pub: true  },
            { key: 'STRIPE_WEBHOOK_SECRET',              label: 'Webhook Signing Secret',          pub: false },
            { key: 'STRIPE_PRICE_ORDERS_MONTHLY',        label: 'Orders Plan Price ID',            pub: false },
            { key: 'STRIPE_PRICE_BOOKINGS_MONTHLY',      label: 'Bookings Plan Price ID',          pub: false },
            { key: 'STRIPE_PRICE_TEAM_MONTHLY',          label: 'Team Plan Price ID',              pub: false },
            { key: 'NEXT_PUBLIC_APP_URL',                label: 'App Public URL (for redirects)',  pub: true  },
          ].map(({ key, label, pub }) => {
            const present = pub ? !!process.env[key] : null
            return (
              <li key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <code className="text-xs text-slate-400">{key}</code>
                </div>
                {present === true  && <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Set</span>}
                {present === false && <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>Missing</span>}
                {present === null   && <span className="text-slate-400 text-xs">Check .env.local</span>}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">Stripe Setup — 3 products to create</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Create <strong>Orders</strong> product — £39/mo → copy <code className="bg-blue-100 px-1 rounded">STRIPE_PRICE_ORDERS_MONTHLY</code></li>
          <li>Create <strong>Bookings</strong> product — £19/mo → copy <code className="bg-blue-100 px-1 rounded">STRIPE_PRICE_BOOKINGS_MONTHLY</code></li>
          <li>Create <strong>Team</strong> product — £29/mo → copy <code className="bg-blue-100 px-1 rounded">STRIPE_PRICE_TEAM_MONTHLY</code></li>
          <li>Add webhook endpoint → <code className="bg-blue-100 px-1 rounded">/api/billing/webhook</code> → copy signing secret</li>
          <li>Enable the <strong>Customer Portal</strong> in Stripe → Settings → Billing → Customer portal</li>
        </ol>
        <p className="text-xs text-blue-600 mt-3">
          Bundle discounts (15% off when 2+ modules selected) are calculated in the checkout UI — no Stripe coupons needed.
        </p>
      </div>
    </div>
  )
}
