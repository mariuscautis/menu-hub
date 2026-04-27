'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

const PLANS = [
  {
    id: 'orders',
    tag: '01',
    name: 'Orders',
    price: 28.99,
    badge: 'Most popular',
    accent: '#6262bd',
    desc: 'Digital menus, table ordering, takeaway, and full sales analytics.',
    features: [
      'QR code table ordering',
      'Takeaway & delivery orders',
      'Menu & category management',
      'Stock & inventory tracking',
      'Sales reports & analytics',
      'Revenue & peak-hours charts',
      'Multi-department support',
      'Staff order permissions',
    ],
  },
  {
    id: 'bookings',
    tag: '02',
    name: 'Bookings',
    price: 11.99,
    badge: null,
    accent: '#10b981',
    desc: 'Online reservations, customer verification, deposits, and table management.',
    features: [
      'Public branded booking page',
      'Reservations dashboard',
      'Confirmation & cancellation emails',
      'No-show auto-cancellation',
      'Floor plan & table assignment',
      'Advance booking window control',
      'Blocked dates & shift-based hours',
      'Reservation fee collection (Stripe)',
    ],
    addon: {
      label: 'SMS Verification Add-on',
      desc: 'Usage-based · pay only for what you use',
      unlocks: ['Customer profiles & ratings', 'Peer reviews across venues', 'Block / deposit per customer'],
    },
  },
  {
    id: 'team',
    tag: '03',
    name: 'Team',
    price: 14.99,
    badge: null,
    accent: '#f59e0b',
    desc: 'Staff management, rota scheduling, clock-in, and shift templates.',
    features: [
      'Staff directory & profiles',
      'Rota scheduling calendar',
      'Clock in / clock out',
      'Time-off requests & approvals',
      'Staff availability management',
      'Shift templates',
      'Role-based permissions',
      'Staff performance tracking',
    ],
  },
]

const INCLUDED = [
  { label: '14-day free trial', note: 'No credit card required' },
  { label: 'Cancel anytime', note: 'Month-to-month, no contracts' },
  { label: 'Monthly billing', note: 'No annual lock-in' },
  { label: 'Multilingual', note: 'EN, ES, FR, IT, RO' },
  { label: 'Stripe payments', note: 'Secure deposit & fee collection' },
  { label: 'Email automation', note: 'Confirmations sent automatically' },
]

const FAQS = [
  { q: 'Can I start with one module and add more later?', a: 'Yes. Activate any module independently at any time. The 15% bundle discount applies automatically when you have two or more active.' },
  { q: 'What does the SMS Verification add-on cost?', a: 'Usage-based billing — you only pay for verifications sent. No fixed monthly fee. Rate shown in your billing settings.' },
  { q: 'Do prices include VAT?', a: 'Yes, all prices shown are inclusive of VAT. No surprises at checkout.' },
  { q: 'What happens when my free trial ends?', a: 'You\'ll be asked to add a payment method. If you do nothing, access pauses. No charge is made during the 14-day trial.' },
  { q: 'Can I cancel mid-month?', a: 'Yes. Cancellation takes effect at the end of your current billing period. Full access retained until then.' },
  { q: 'Is there a long-term contract?', a: 'No contracts. Month-to-month billing. Leave at any time without penalty.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 py-6 text-left group"
      >
        <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors leading-relaxed">{q}</span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 mt-0.5 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40' : 'max-h-0'}`}>
        <p className="text-sm text-zinc-500 leading-relaxed pb-6">{a}</p>
      </div>
    </div>
  )
}

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(20px)', transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

export default function PricingPage() {
  const seo = useSeoSettings('pricing', {
    title: 'Pricing — Veno App',
    description: 'Simple, transparent pricing for restaurants of every size.',
  })
  const [selected, setSelected] = useState([])

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const subtotal = selected.reduce((s, id) => s + (PLANS.find(p => p.id === id)?.price || 0), 0)
  const discount = selected.length >= 2 ? 0.15 : 0
  const total = subtotal * (1 - discount)

  return (
    <>
      {seo.title && <title>{seo.title}</title>}
      {seo.description && <meta name="description" content={seo.description} />}
      {seo.title && <meta property="og:title" content={seo.title} />}
      {seo.description && <meta property="og:description" content={seo.description} />}
      <meta property="og:type" content="website" />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta name="twitter:card" content={seo.ogImage ? 'summary_large_image' : 'summary'} />
      {seo.title && <meta name="twitter:title" content={seo.title} />}
      {seo.description && <meta name="twitter:description" content={seo.description} />}
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}

      <ServicePageLayout>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-800">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#6262bd 1px,transparent 1px),linear-gradient(90deg,#6262bd 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-15 blur-[100px]" style={{ backgroundColor: '#6262bd' }} />
          <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-24 md:py-32">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-6">Pricing</p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-white max-w-2xl">
              Pay for what<br />
              <span style={{ color: '#6262bd' }}>you actually use.</span>
            </h1>
            <p className="mt-8 text-lg text-zinc-400 leading-relaxed max-w-lg">
              Pick the modules your venue needs. No hidden fees. Combine two or more for 15% off your total.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400">14-day free trial · No credit card required</span>
            </div>
          </div>
        </section>

        {/* ── Plans ────────────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-zinc-800">
              {PLANS.map((plan, i) => {
                const isSelected = selected.includes(plan.id)
                return (
                  <FadeIn key={plan.id} delay={i * 100} className="bg-zinc-950 p-8 md:p-10 flex flex-col gap-8 relative">
                    {plan.badge && (
                      <div className="absolute top-8 right-8 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border" style={{ borderColor: plan.accent, color: plan.accent }}>
                        {plan.badge}
                      </div>
                    )}
                    {/* Header */}
                    <div>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="font-mono text-[10px] text-zinc-700">{plan.tag}</span>
                        <h2 className="text-2xl font-bold tracking-tight text-white">{plan.name}</h2>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed">{plan.desc}</p>
                    </div>

                    {/* Price */}
                    <div className="border-t border-zinc-800 pt-6">
                      <span className="text-5xl font-bold text-white tracking-tight">£{plan.price.toFixed(2)}</span>
                      <span className="text-zinc-600 text-sm ml-2">/month</span>
                    </div>

                    {/* Select */}
                    <button
                      onClick={() => toggle(plan.id)}
                      className={`w-full py-3.5 rounded-none text-sm font-semibold transition-all duration-200 active:scale-[0.98] border ${
                        isSelected
                          ? 'text-white border-transparent'
                          : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white bg-transparent'
                      }`}
                      style={isSelected ? { backgroundColor: plan.accent, borderColor: plan.accent } : {}}
                    >
                      {isSelected ? 'Selected — remove' : 'Add to plan'}
                    </button>

                    {/* Features */}
                    <ul className="space-y-3 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-sm text-zinc-400">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0" style={{ color: plan.accent }}>
                            <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* SMS add-on */}
                    {plan.addon && (
                      <div className="border border-zinc-800 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-300 mb-1">{plan.addon.label}</p>
                        <p className="text-xs text-zinc-600 mb-3">{plan.addon.desc}</p>
                        <ul className="space-y-1.5">
                          {plan.addon.unlocks.map(u => (
                            <li key={u} className="flex items-center gap-2 text-xs text-zinc-500">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l3 3 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {u}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </FadeIn>
                )
              })}
            </div>

            {/* Bundle summary */}
            {selected.length > 0 && (
              <div className="mt-12 max-w-lg mx-auto border border-zinc-800 rounded-xl p-8 bg-zinc-900/40">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-6">Your plan</p>
                <div className="space-y-3 mb-6">
                  {selected.map(id => {
                    const p = PLANS.find(p => p.id === id)
                    return (
                      <div key={id} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{p.name} module</span>
                        <span className="text-white font-medium">£{p.price.toFixed(2)}/mo</span>
                      </div>
                    )
                  })}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm pt-3 border-t border-zinc-800">
                      <span className="text-emerald-400">Bundle discount (15%)</span>
                      <span className="text-emerald-400">−£{(subtotal * discount).toFixed(2)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-zinc-800">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-bold text-xl text-white">£{total.toFixed(2)}/mo</span>
                  </div>
                </div>
                {selected.length === 1 && (
                  <p className="text-xs text-zinc-600 mb-5 font-mono">Add another module to unlock 15% off.</p>
                )}
                <Link
                  href="/auth/register"
                  className="block w-full text-center py-4 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: '#6262bd' }}
                >
                  Start 14-day free trial
                </Link>
                <p className="text-center text-[11px] text-zinc-700 font-mono mt-3">No credit card required</p>
              </div>
            )}
            {selected.length === 0 && (
              <p className="text-center text-sm text-zinc-700 font-mono mt-10">Select a module above to see your total.</p>
            )}
          </div>
        </section>

        {/* ── Bundle examples ──────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800">
              {[
                { modules: 'Bookings only', price: '£11.99', saving: null },
                { modules: 'Bookings + Team', price: '£22.07', saving: 'Save £3.91/mo' },
                { modules: 'All 3 modules', price: '£47.57', saving: 'Save £8.40/mo' },
              ].map(({ modules, price, saving }) => (
                <div key={modules} className="bg-zinc-950 px-8 py-8">
                  <p className="text-xs font-mono text-zinc-600 mb-2">{modules}</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{price}<span className="text-sm font-normal text-zinc-600">/mo</span></p>
                  {saving ? (
                    <p className="mt-2 text-xs font-mono text-emerald-500">{saving}</p>
                  ) : (
                    <p className="mt-2 text-xs font-mono text-zinc-700">single module</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Included in every plan ───────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Standard</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Included in every plan.</h2>
                <p className="mt-4 text-sm text-zinc-500 leading-relaxed">No upsells for the basics.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800">
                {INCLUDED.map(({ label, note }, i) => (
                  <FadeIn key={label} delay={i * 60} className="bg-zinc-950 px-6 py-6">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-zinc-600 mt-1 font-mono">{note}</p>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Questions</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Common questions.</h2>
              </div>
              <div className="border-b border-zinc-800">
                {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section>
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
            <div className="relative overflow-hidden rounded-2xl px-8 md:px-16 py-16 md:py-24" style={{ backgroundColor: '#0f0e1a' }}>
              <div className="absolute inset-0 opacity-30 blur-[80px]" style={{ background: 'radial-gradient(ellipse at 30% 50%, #6262bd, transparent 70%)' }} />
              <div className="absolute inset-0 rounded-2xl border border-[#6262bd]/20 pointer-events-none" />
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
                <div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                    Start in<br /><span style={{ color: '#6262bd' }}>11 minutes.</span>
                  </h2>
                  <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">Two weeks free to try everything. No card, no commitment.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97] whitespace-nowrap" style={{ backgroundColor: '#6262bd' }}>
                    Start free trial
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <Link href="/contact" className="inline-flex items-center justify-center px-8 py-4 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all whitespace-nowrap">
                    Talk to us first
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </ServicePageLayout>
    </>
  )
}
