'use client'

import { useState } from 'react'
import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

const PLANS = [
  {
    id: 'orders',
    name: 'Orders',
    price: 28.99,
    badge: 'Most popular',
    badgeColor: 'bg-[#6262bd] text-white',
    color: 'border-[#6262bd]',
    accentBg: 'bg-[#6262bd]/5',
    accentText: 'text-[#6262bd]',
    iconBg: 'bg-[#6262bd]/10',
    iconColor: 'text-[#6262bd]',
    desc: 'Digital menus, table ordering, takeaway, and full sales analytics.',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-4.5-6.72-5.44-8.03-5.44-1.3 0-8.03.94-8.03 5.44v1h16.06v-1z"/>
      </svg>
    ),
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
    name: 'Bookings',
    price: 11.99,
    badge: null,
    color: 'border-slate-200 dark:border-slate-700',
    accentBg: 'bg-emerald-50 dark:bg-emerald-900/10',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600',
    desc: 'Online reservations, customer verification, deposits, and table management.',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
      </svg>
    ),
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
      desc: 'Usage-based billing · pay only for what you use',
      unlocks: ['Customer profiles & ratings', 'Peer reviews across venues', 'Block / deposit per customer'],
    },
  },
  {
    id: 'team',
    name: 'Team',
    price: 14.99,
    badge: null,
    color: 'border-slate-200 dark:border-slate-700',
    accentBg: 'bg-amber-50 dark:bg-amber-900/10',
    accentText: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
    desc: 'Staff management, rota scheduling, clock-in, and shift templates.',
    icon: (
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
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

function CheckIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
    </svg>
  )
}

export default function PricingPage() {
  const seo = useSeoSettings('pricing', {
    title: 'Pricing — Veno App',
    description: 'Simple, transparent pricing for restaurants of every size. Choose the Veno App modules that fit your venue and scale as you grow.',
  })
  const [selected, setSelected] = useState([])

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const subtotal = selected.reduce((s, id) => {
    const p = PLANS.find(p => p.id === id)
    return s + (p?.price || 0)
  }, 0)

  const discount = selected.length >= 2 ? 0.15 : 0
  const total = subtotal * (1 - discount)

  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    {/* Open Graph */}
    {seo.title && <meta property="og:title" content={seo.title} />}
    {seo.description && <meta property="og:description" content={seo.description} />}
    <meta property="og:type" content="website" />
    {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
    {/* Twitter / X */}
    <meta name="twitter:card" content={seo.ogImage ? "summary_large_image" : "summary"} />
    {seo.title && <meta name="twitter:title" content={seo.title} />}
    {seo.description && <meta name="twitter:description" content={seo.description} />}
    {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
    <ServicePageLayout>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/#features" className="inline-flex items-center gap-2 text-[#6262bd] hover:underline mb-6 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Features
          </Link>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-5 leading-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Pick only the modules your venue needs. No hidden fees, no contracts — cancel any time. Save 15% when you combine two or more.
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-5 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">2 weeks free trial · No credit card required</span>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {PLANS.map(plan => {
              const isSelected = selected.includes(plan.id)
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected ? plan.color + ' shadow-xl scale-[1.02]' : 'border-slate-200 dark:border-slate-700 shadow-md'
                  } bg-white dark:bg-slate-800`}
                >
                  {plan.badge && (
                    <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${plan.badgeColor}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-7">
                    {/* Icon + name */}
                    <div className={`w-14 h-14 ${plan.iconBg} ${plan.iconColor} rounded-2xl flex items-center justify-center mb-4`}>
                      {plan.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{plan.desc}</p>

                    {/* Price */}
                    <div className="flex items-end gap-1 mb-6">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">£{plan.price.toFixed(2)}</span>
                      <span className="text-slate-400 mb-1">/mo</span>
                    </div>

                    {/* Select button */}
                    <button
                      onClick={() => toggle(plan.id)}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${
                        isSelected
                          ? 'bg-[#6262bd] text-white hover:bg-[#5252a3]'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Add to plan'}
                    </button>

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                          <CheckIcon className="w-4 h-4 text-[#6262bd] flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* SMS add-on callout */}
                    {plan.addon && (
                      <div className="mt-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                          </svg>
                          <span className="text-xs font-bold text-green-700 dark:text-green-400">{plan.addon.label}</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500 mb-2">{plan.addon.desc}</p>
                        <ul className="space-y-1">
                          {plan.addon.unlocks.map(u => (
                            <li key={u} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <CheckIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                              {u}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bundle calculator */}
          {selected.length > 0 && (
            <div className="mt-10 max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#6262bd] shadow-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                </svg>
                Your plan summary
              </h3>
              <div className="space-y-2 mb-4">
                {selected.map(id => {
                  const p = PLANS.find(p => p.id === id)
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{p.name} module</span>
                      <span className="font-medium text-slate-900 dark:text-white">£{p.price.toFixed(2)}/mo</span>
                    </div>
                  )
                })}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="font-semibold">Bundle discount (15%)</span>
                    <span className="font-semibold">−£{(subtotal * discount).toFixed(2)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span className="text-[#6262bd]">£{total.toFixed(2)}/mo</span>
                </div>
              </div>
              {selected.length === 1 && (
                <p className="text-xs text-slate-400 mb-4">Add another module to unlock 15% off your total.</p>
              )}
              <Link
                href="/auth/register"
                className="block w-full bg-[#6262bd] text-white text-center py-3.5 rounded-xl font-semibold hover:bg-[#5252a3] transition-all shadow-md"
              >
                Start 2-week free trial →
              </Link>
              <p className="text-xs text-center text-slate-400 mt-2">No credit card required. Cancel anytime.</p>
            </div>
          )}

          {selected.length === 0 && (
            <p className="text-center text-sm text-slate-400 mt-8">Select one or more modules above to see your total.</p>
          )}
        </div>
      </section>

      {/* Bundle savings callout */}
      <section className="py-12 bg-[#6262bd]/5 dark:bg-[#6262bd]/10 border-y border-[#6262bd]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { modules: 'Bookings only', price: '£11.99', saving: null },
              { modules: 'Bookings + Team', price: '£22.07', saving: 'Save £3.91/mo' },
              { modules: 'All 3 modules', price: '£47.57', saving: 'Save £8.40/mo' },
            ].map(({ modules, price, saving }) => (
              <div key={modules} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{modules}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
                {saving ? (
                  <div className="mt-1 text-xs font-semibold text-green-600 dark:text-green-400">{saving}</div>
                ) : (
                  <div className="mt-1 text-xs text-slate-300 dark:text-slate-600">single module</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Included in every plan */}
      <section className="py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Included in every plan</h2>
            <p className="text-slate-500 dark:text-slate-400">No upsells for the basics — everything below comes standard</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93C9.33 17.79 7 14.5 7 11V7.18L12 5z"/></svg>,
                title: '2-week free trial',
                desc: 'Try any module free for 14 days with no payment details needed.',
              },
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>,
                title: 'Cancel anytime',
                desc: 'No contracts or lock-ins. Cancel in your billing settings whenever you like.',
              },
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>,
                title: 'Monthly billing',
                desc: 'Billed month-to-month. No annual commitment required.',
              },
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
                title: 'Multilingual support',
                desc: 'Customer-facing content available in English, Spanish, French, Italian, and Romanian.',
              },
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>,
                title: 'Stripe-powered payments',
                desc: 'Secure card processing for deposits and reservation fees via Stripe Connect.',
              },
              {
                icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>,
                title: 'Automated email notifications',
                desc: 'Confirmations, cancellations, and receipts sent automatically to your customers.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="w-10 h-10 bg-[#6262bd]/10 text-[#6262bd] rounded-xl flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-5">
            {[
              {
                q: 'Can I start with one module and add more later?',
                a: 'Yes. You can activate any module independently at any time from your billing settings. The 15% bundle discount is applied automatically when you have two or more active modules.',
              },
              {
                q: 'What does the SMS Verification add-on cost?',
                a: 'The SMS add-on uses usage-based billing — you only pay for the verifications you send, with no fixed monthly fee for the add-on itself. Your usage is tallied each month and added to your next invoice. The rate applicable to your venue is shown in your billing settings.',
              },
              {
                q: 'Do prices include VAT?',
                a: 'Yes, all prices shown are inclusive of VAT. No surprises at checkout.',
              },
              {
                q: 'What happens when my free trial ends?',
                a: 'You will be asked to add a payment method to continue. If you do nothing, access is paused until billing is set up. No charge is made during the 14-day trial period.',
              },
              {
                q: 'Can I cancel mid-month?',
                a: 'Yes. Cancellation takes effect at the end of your current billing period. You retain full access until then.',
              },
              {
                q: 'Is there a long-term contract?',
                a: 'No contracts at all. Veno is billed month-to-month and you can leave at any time without penalty.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{q}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#6262bd] to-[#4444a0]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-lg text-white/80 mb-8">
            Create your account in minutes. No credit card, no commitment — just 2 weeks free to explore everything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all shadow-lg">
              Start free trial
            </Link>
            <Link href="/contact" className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
              Talk to us →
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-5">No credit card · 2 weeks free · Cancel anytime</p>
        </div>
      </section>

    </ServicePageLayout>
    </>
  )
}
