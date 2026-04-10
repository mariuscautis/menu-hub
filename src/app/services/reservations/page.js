'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function ReservationsPage() {
  const seo = useSeoSettings('services_reservations', {
    title: 'Smart Reservations. Zero Missed Bookings. — Veno App',
    description: 'Manage table bookings effortlessly with Veno App\'s smart reservation system. Reduce no-shows, optimise capacity, and delight every guest.',
  })
  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    <ServicePageLayout>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link href="/#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Features</span>
              </Link>

              <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-4">
                Reservations Module
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                Smart Reservations.<br />Zero Missed Bookings.
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                A complete reservation system built for modern venues — online booking, SMS verification, deposit collection, customer insights, and full multilingual support. All in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register" className="bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center">
                  Start Free Trial
                </Link>
                <Link href="/contact" className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center">
                  Contact Sales
                </Link>
              </div>

              {/* Quick trust badges */}
              <div className="mt-8 flex flex-wrap gap-4">
                {['24/7 Online Booking', 'SMS Verification', '5 Languages', 'Stripe Payments'].map(b => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <svg className="w-4 h-4 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero illustration — clean calendar grid + reservation cards below */}
            <div className="relative">
              <svg viewBox="0 0 500 400" className="w-full h-auto drop-shadow-xl">
                <defs>
                  <filter id="card-shadow">
                    <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* Card background */}
                <rect x="20" y="10" width="460" height="380" rx="18" fill="white" filter="url(#card-shadow)" />

                {/* Header */}
                <rect x="20" y="10" width="460" height="60" rx="18" fill="#6262bd" />
                <rect x="20" y="52" width="460" height="18" fill="#6262bd" />
                <text x="250" y="46" fontSize="16" fill="white" textAnchor="middle" fontWeight="bold">March 2026</text>
                <text x="55" y="47" fontSize="18" fill="white" opacity="0.6" textAnchor="middle">‹</text>
                <text x="445" y="47" fontSize="18" fill="white" opacity="0.6" textAnchor="middle">›</text>

                {/* Day headers — evenly spaced */}
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
                  <text key={d} x={68 + i * 56} y="94" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">{d}</text>
                ))}

                {/* Divider */}
                <line x1="30" y1="100" x2="470" y2="100" stroke="#f1f5f9" strokeWidth="1" />

                {/* Week 1: 2–8 */}
                {[2,3,4,5,6,7,8].map((n, i) => {
                  const cx = 68 + i * 56
                  const cy = 122
                  const busy = n === 6 || n === 8
                  const color = n === 6 ? '#6262bd' : '#10b981'
                  return (
                    <g key={n}>
                      {busy && <circle cx={cx} cy={cy} r="15" fill={color} opacity="0.12" />}
                      <text x={cx} y={cy + 5} fontSize="13" fill={busy ? color : '#1e293b'} textAnchor="middle" fontWeight={busy ? '700' : 'normal'}>{n}</text>
                      {busy && <circle cx={cx + 12} cy={cy - 12} r="5" fill={color} />}
                      {busy && <text x={cx + 12} y={cy - 9} fontSize="7" fill="white" textAnchor="middle">{n === 6 ? '4' : '6'}</text>}
                    </g>
                  )
                })}

                {/* Week 2: 9–15 */}
                {[9,10,11,12,13,14,15].map((n, i) => {
                  const cx = 68 + i * 56
                  const cy = 162
                  const isToday = n === 9
                  const busy = n === 11 || n === 14 || n === 15
                  const color = n === 11 ? '#f59e0b' : '#ef4444'
                  return (
                    <g key={n}>
                      {isToday && <circle cx={cx} cy={cy} r="15" fill="#6262bd" />}
                      {!isToday && busy && <circle cx={cx} cy={cy} r="15" fill={color} opacity="0.12" />}
                      <text x={cx} y={cy + 5} fontSize="13" fill={isToday ? 'white' : busy ? color : '#1e293b'} textAnchor="middle" fontWeight={isToday || busy ? '700' : 'normal'}>{n}</text>
                      {busy && <circle cx={cx + 12} cy={cy - 12} r="5" fill={color} />}
                      {busy && <text x={cx + 12} y={cy - 9} fontSize="7" fill="white" textAnchor="middle">{n === 11 ? '3' : n === 14 ? '9' : '7'}</text>}
                    </g>
                  )
                })}

                {/* Week 3: 16–22 */}
                {[16,17,18,19,20,21,22].map((n, i) => {
                  const cx = 68 + i * 56
                  const cy = 202
                  const busy = n === 17 || n === 20
                  const color = n === 17 ? '#10b981' : '#6262bd'
                  return (
                    <g key={n}>
                      {busy && <circle cx={cx} cy={cy} r="15" fill={color} opacity="0.12" />}
                      <text x={cx} y={cy + 5} fontSize="13" fill={busy ? color : '#1e293b'} textAnchor="middle" fontWeight={busy ? '700' : 'normal'}>{n}</text>
                      {busy && <circle cx={cx + 12} cy={cy - 12} r="5" fill={color} />}
                      {busy && <text x={cx + 12} y={cy - 9} fontSize="7" fill="white" textAnchor="middle">{n === 17 ? '5' : '4'}</text>}
                    </g>
                  )
                })}

                {/* Divider before reservation list */}
                <line x1="30" y1="228" x2="470" y2="228" stroke="#f1f5f9" strokeWidth="1" />
                <text x="36" y="248" fontSize="10" fill="#94a3b8" fontWeight="600">TODAY · 9 MARCH</text>

                {/* Reservation card 1 */}
                <rect x="30" y="256" width="200" height="48" rx="8" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                <circle cx="54" cy="280" r="14" fill="#22c55e" opacity="0.15" />
                <text x="54" y="285" fontSize="13" textAnchor="middle">👤</text>
                <text x="76" y="274" fontSize="10" fill="#1e293b" fontWeight="bold">Johnson Family</text>
                <text x="76" y="289" fontSize="9" fill="#64748b">7:00 PM · 4 guests</text>
                <rect x="182" y="268" width="38" height="14" rx="3" fill="#22c55e" />
                <text x="201" y="278" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">✓ Done</text>

                {/* Reservation card 2 */}
                <rect x="242" y="256" width="218" height="48" rx="8" fill="#fef9c3" stroke="#fde68a" strokeWidth="1" />
                <circle cx="264" cy="280" r="14" fill="#f59e0b" opacity="0.15" />
                <text x="264" y="285" fontSize="13" textAnchor="middle">👤</text>
                <text x="286" y="274" fontSize="10" fill="#1e293b" fontWeight="bold">Sarah Mitchell</text>
                <text x="286" y="289" fontSize="9" fill="#64748b">8:30 PM · 2 guests</text>
                <rect x="414" y="268" width="36" height="14" rx="3" fill="#f59e0b" />
                <text x="432" y="278" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">Wait</text>

                {/* Legend */}
                <circle cx="36" cy="330" r="5" fill="#6262bd" />
                <text x="46" y="334" fontSize="8" fill="#64748b">Bookings</text>
                <circle cx="100" cy="330" r="5" fill="#10b981" />
                <text x="110" y="334" fontSize="8" fill="#64748b">Confirmed</text>
                <circle cx="170" cy="330" r="5" fill="#f59e0b" />
                <text x="180" y="334" fontSize="8" fill="#64748b">Pending</text>
                <circle cx="228" cy="330" r="5" fill="#ef4444" />
                <text x="238" y="334" fontSize="8" fill="#64748b">Busy</text>
              </svg>

              {/* Floating SMS badge */}
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">SMS Confirmed</p>
                  <p className="text-xs text-slate-400">Booking verified ✓</p>
                </div>
              </div>

              {/* Floating deposit badge */}
              <div className="absolute -top-2 -right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#6262bd]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">£25 Deposit Collected</p>
                  <p className="text-xs text-slate-400">via Stripe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything Your Venue Needs</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Built around real venue workflows — from the first online booking to the final table assignment</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                color: 'bg-[#6262bd]/10',
                textColor: 'text-[#6262bd]',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                  </svg>
                ),
                title: '24/7 Online Booking',
                desc: 'Customers book from any device at any time. Your branded booking page handles everything automatically.',
              },
              {
                color: 'bg-green-100',
                textColor: 'text-green-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                ),
                title: 'SMS Verification Add-on',
                desc: 'An optional paid add-on that verifies every booking with a one-time SMS code. Drastically reduces no-shows and fake bookings. Pay only for what you use — a few pence per SMS.',
                badge: 'Add-on',
              },
              {
                color: 'bg-amber-100',
                textColor: 'text-amber-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                ),
                title: 'Deposit & Reservation Fees',
                desc: 'Collect a booking fee from every customer, or target specific customers with a deposit requirement. Powered by Stripe.',
              },
              {
                color: 'bg-blue-100',
                textColor: 'text-blue-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                ),
                title: 'Shift-Based Opening Hours',
                desc: 'Set multiple trading shifts per day — perfect for venues with a lunch break or split service hours.',
              },
              {
                color: 'bg-purple-100',
                textColor: 'text-purple-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H8a2 2 0 0 0-2 2v2H4a1 1 0 0 0 0 2h2v2H4a1 1 0 0 0 0 2h2v2H4a1 1 0 0 0 0 2h2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5 13H9v-.75C9 15.58 11.24 14 14 14s5 1.58 5 3.25V18z"/>
                  </svg>
                ),
                title: 'Customer Profiles & Reviews',
                desc: 'When SMS verification is active, every booking builds a verified customer profile — visit history, private ratings, notes, and peer reviews from other venues in your category.',
                badge: 'Requires SMS',
              },
              {
                color: 'bg-rose-100',
                textColor: 'text-rose-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93C9.33 17.79 7 14.5 7 11V7.18L12 5z"/>
                  </svg>
                ),
                title: 'Block & Deposit Rules',
                desc: 'With SMS verification active, flag problematic customers by blocking them entirely or requiring a deposit — without affecting regular guests.',
                badge: 'Requires SMS',
              },
              {
                color: 'bg-teal-100',
                textColor: 'text-teal-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 5h-2V7h2v2zm0 4h-2v-2h2v2zm-4-4H9V7h2v2zm0 4H9v-2h2v2zM7 9H5V7h2v2zm0 4H5v-2h2v2zm12 4H5v-2h14v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                  </svg>
                ),
                title: 'Table Assignment',
                desc: 'Assign reservations to specific tables or enable single-area mode for studios and private dining rooms.',
              },
              {
                color: 'bg-orange-100',
                textColor: 'text-orange-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                ),
                title: 'Automated Notifications',
                desc: 'Confirmation, cancellation, and denial emails and SMS sent automatically — translated into the customer\'s language.',
              },
              {
                color: 'bg-indigo-100',
                textColor: 'text-indigo-600',
                icon: (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
                  </svg>
                ),
                title: 'Flexible Slot Modes',
                desc: 'Offer fixed time slots at set intervals, or let customers choose their own session duration from options you define.',
              },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center ${f.textColor}`}>
                    {f.icon}
                  </div>
                  {f.badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      f.badge === 'Add-on'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>{f.badge}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — booking flow */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">How a Booking Works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">From first click to seated guest — fully automated</p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#6262bd]/20 via-[#6262bd] to-[#6262bd]/20" />

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                {
                  step: '1',
                  color: 'bg-[#6262bd]',
                  title: 'Customer books online',
                  desc: 'Picks date, time, party size and enters their details on your branded booking page',
                  icon: (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                    </svg>
                  ),
                },
                {
                  step: '2',
                  color: 'bg-green-500',
                  title: 'SMS code sent',
                  desc: 'A one-time verification code goes to their phone — only real customers can confirm',
                  icon: (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                  ),
                },
                {
                  step: '3',
                  color: 'bg-amber-500',
                  title: 'Fee collected (optional)',
                  desc: 'If a reservation fee or deposit is set, Stripe takes payment before the booking is submitted',
                  icon: (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                  ),
                },
                {
                  step: '4',
                  color: 'bg-[#6262bd]',
                  title: 'You confirm or deny',
                  desc: 'Review the booking in your dashboard and approve it or decline it with one click',
                  icon: (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  ),
                },
                {
                  step: '5',
                  color: 'bg-orange-500',
                  title: 'Customer notified instantly',
                  desc: 'A confirmation or denial email is sent automatically — plus SMS if they have the add-on',
                  icon: (
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
                    </svg>
                  ),
                },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg relative z-10`}>
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mb-1">STEP {s.step}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Split feature — Customer view vs Staff view */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Two Sides, One System</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">A seamless experience for customers and your team</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Customer side */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[#6262bd]/10 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">What customers experience</h3>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-md">
                <svg viewBox="0 0 320 500" className="w-full h-auto">
                  {/* Phone outer */}
                  <rect x="40" y="10" width="240" height="480" rx="30" fill="#1e293b" />
                  {/* Screen */}
                  <rect x="50" y="22" width="220" height="456" rx="22" fill="#f8fafc" />
                  {/* Notch */}
                  <rect x="120" y="22" width="80" height="14" rx="7" fill="#1e293b" />

                  {/* Header bar — clipped inside screen */}
                  <rect x="50" y="36" width="220" height="50" fill="#6262bd" />
                  <text x="160" y="67" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">Make a Reservation</text>

                  {/* Section: Date */}
                  <text x="62" y="104" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">SELECT DATE</text>
                  {[{d:'14',day:'Mon'},{d:'15',day:'Tue'},{d:'16',day:'Wed'},{d:'17',day:'Thu'},{d:'18',day:'Fri'}].map(({d,day}, i) => {
                    const sel = d === '16'
                    return (
                      <g key={d}>
                        <rect x={62 + i * 40} y="110" width="34" height="44" rx="8" fill={sel ? '#6262bd' : '#f1f5f9'} />
                        <text x={62 + i * 40 + 17} y="126" fontSize="7" fill={sel ? 'white' : '#94a3b8'} textAnchor="middle">{day}</text>
                        <text x={62 + i * 40 + 17} y="143" fontSize="12" fill={sel ? 'white' : '#1e293b'} textAnchor="middle" fontWeight={sel ? 'bold' : 'normal'}>{d}</text>
                      </g>
                    )
                  })}

                  {/* Section: Time */}
                  <text x="62" y="172" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">SELECT TIME</text>
                  {[['6:00 PM',false],['6:30 PM',false],['7:00 PM',true],['7:30 PM',false],['8:00 PM',false],['8:30 PM',false]].map(([t, sel], i) => (
                    <g key={t}>
                      <rect x={62 + (i % 3) * 68} y={178 + Math.floor(i / 3) * 36} width="60" height="28" rx="7" fill={sel ? '#6262bd' : '#f1f5f9'} />
                      <text x={62 + (i % 3) * 68 + 30} y={178 + Math.floor(i / 3) * 36 + 18} fontSize="9" fill={sel ? 'white' : '#475569'} textAnchor="middle" fontWeight={sel ? 'bold' : 'normal'}>{t}</text>
                    </g>
                  ))}

                  {/* Section: Details */}
                  <text x="62" y="268" fontSize="8" fill="#94a3b8" fontWeight="700" letterSpacing="1">YOUR DETAILS</text>
                  <rect x="62" y="274" width="196" height="30" rx="7" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="74" y="294" fontSize="10" fill="#1e293b">Alex Thompson</text>
                  <rect x="62" y="312" width="196" height="30" rx="7" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="74" y="332" fontSize="10" fill="#1e293b">+44 7700 900123</text>

                  {/* OTP row */}
                  <rect x="62" y="352" width="196" height="26" rx="7" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                  <text x="160" y="369" fontSize="8" fill="#16a34a" textAnchor="middle" fontWeight="600">✓ SMS code verified</text>

                  {/* Book button */}
                  <rect x="62" y="390" width="196" height="38" rx="10" fill="#6262bd" />
                  <text x="160" y="414" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">Confirm Booking</text>

                  {/* Home indicator */}
                  <rect x="130" y="444" width="60" height="4" rx="2" fill="#cbd5e1" />
                </svg>
              </div>
            </div>

            {/* Staff side */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">What your team sees</h3>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-md">
                <svg viewBox="0 0 420 460" className="w-full h-auto">
                  <rect x="10" y="10" width="400" height="440" rx="14" fill="#f8fafc" />

                  {/* Top bar */}
                  <rect x="10" y="10" width="400" height="48" rx="14" fill="#6262bd" />
                  <rect x="10" y="44" width="400" height="14" fill="#6262bd" />
                  <text x="30" y="40" fontSize="13" fill="white" fontWeight="bold">Reservations</text>
                  <rect x="310" y="22" width="80" height="22" rx="8" fill="white" opacity="0.2" />
                  <text x="350" y="37" fontSize="10" fill="white" textAnchor="middle">+ New</text>

                  {/* Stats row */}
                  <rect x="20" y="72" width="86" height="54" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="63" y="96" fontSize="18" fill="#6262bd" textAnchor="middle" fontWeight="bold">12</text>
                  <text x="63" y="114" fontSize="8" fill="#94a3b8" textAnchor="middle">Today</text>

                  <rect x="116" y="72" width="86" height="54" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="159" y="96" fontSize="18" fill="#f59e0b" textAnchor="middle" fontWeight="bold">3</text>
                  <text x="159" y="114" fontSize="8" fill="#94a3b8" textAnchor="middle">Pending</text>

                  <rect x="212" y="72" width="86" height="54" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="255" y="96" fontSize="18" fill="#10b981" textAnchor="middle" fontWeight="bold">8</text>
                  <text x="255" y="114" fontSize="8" fill="#94a3b8" textAnchor="middle">Confirmed</text>

                  <rect x="308" y="72" width="86" height="54" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="351" y="96" fontSize="18" fill="#ef4444" textAnchor="middle" fontWeight="bold">1</text>
                  <text x="351" y="114" fontSize="8" fill="#94a3b8" textAnchor="middle">No-show</text>

                  {/* Reservation cards */}
                  {[
                    { name: 'Alex Thompson', time: '7:00 PM', guests: 4, table: 'T5', status: 'confirmed', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                    { name: 'Sarah Mitchell', time: '7:30 PM', guests: 2, table: '—', status: 'pending', color: '#f59e0b', bg: '#fef9c3', border: '#fde68a' },
                    { name: 'Johnson Family', time: '8:00 PM', guests: 6, table: 'T2', status: 'confirmed', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                    { name: 'Maria Gonzalez', time: '8:30 PM', guests: 2, table: '—', status: 'pending', color: '#f59e0b', bg: '#fef9c3', border: '#fde68a' },
                  ].map((r, i) => (
                    <g key={i} transform={`translate(20, ${142 + i * 72})`}>
                      <rect x="0" y="0" width="380" height="62" rx="10" fill={r.bg} stroke={r.border} strokeWidth="1" />
                      <circle cx="30" cy="31" r="18" fill={r.color} opacity="0.15" />
                      <text x="30" y="36" fontSize="16" textAnchor="middle">👤</text>
                      <text x="58" y="24" fontSize="11" fill="#1e293b" fontWeight="bold">{r.name}</text>
                      <text x="58" y="40" fontSize="9" fill="#64748b">{r.time}  ·  {r.guests} guests  ·  Table {r.table}</text>
                      <rect x="280" y="8" width="86" height="20" rx="5" fill={r.color} opacity="0.15" stroke={r.color} strokeWidth="0.5" />
                      <text x="323" y="21" fontSize="8" fill={r.color} textAnchor="middle" fontWeight="bold">{r.status.toUpperCase()}</text>
                      {r.status === 'pending' && (
                        <>
                          <rect x="248" y="36" width="54" height="18" rx="5" fill="#10b981" />
                          <text x="275" y="48" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">✓ Confirm</text>
                          <rect x="310" y="36" width="50" height="18" rx="5" fill="#ef4444" />
                          <text x="335" y="48" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">✕ Deny</text>
                        </>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer intelligence section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 text-sm font-semibold mb-4">
                Customer Intelligence
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Know Every Guest Before They Arrive
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Every verified booking builds a rich customer profile. See visit history, leave private ratings and notes after each visit, and access peer reviews from other venues in your industry — so you always know who's walking through the door.
              </p>
              <ul className="space-y-4">
                {[
                  'Visit history and booking patterns at your venue',
                  'Private star ratings and notes visible only to you',
                  'Peer ratings from other venues in your category',
                  'Instant block or deposit flag for problem guests',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-[#6262bd]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer profile card illustration */}
            <div>
              <svg viewBox="0 0 420 380" className="w-full h-auto drop-shadow-lg">
                <defs>
                  <filter id="prof-shadow">
                    <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.1" />
                  </filter>
                </defs>
                <rect x="10" y="10" width="400" height="360" rx="16" fill="white" filter="url(#prof-shadow)" />

                {/* Header */}
                <rect x="10" y="10" width="400" height="80" rx="16" fill="#6262bd" />
                <rect x="10" y="70" width="400" height="20" fill="#6262bd" />
                <circle cx="70" cy="50" r="30" fill="white" opacity="0.2" />
                <text x="70" y="58" fontSize="28" textAnchor="middle">👤</text>
                <text x="120" y="40" fontSize="15" fill="white" fontWeight="bold">Alex Thompson</text>
                <text x="120" y="58" fontSize="10" fill="white" opacity="0.8">+44 7700 900123</text>
                <text x="120" y="72" fontSize="10" fill="white" opacity="0.6">alex@email.com</text>

                {/* Stats */}
                <rect x="20" y="102" width="115" height="60" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <text x="77" y="130" fontSize="22" fill="#f59e0b" textAnchor="middle" fontWeight="bold">4.8★</text>
                <text x="77" y="148" fontSize="9" fill="#94a3b8" textAnchor="middle">Your venue</text>
                <text x="77" y="158" fontSize="8" fill="#cbd5e1" textAnchor="middle">9 visits</text>

                <rect x="150" y="102" width="115" height="60" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <text x="207" y="130" fontSize="22" fill="#a855f7" textAnchor="middle" fontWeight="bold">4.5★</text>
                <text x="207" y="148" fontSize="9" fill="#94a3b8" textAnchor="middle">Peer rating</text>
                <text x="207" y="158" fontSize="8" fill="#cbd5e1" textAnchor="middle">23 visits</text>

                <rect x="280" y="102" width="115" height="60" rx="10" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                <text x="337" y="130" fontSize="14" fill="#16a34a" textAnchor="middle" fontWeight="bold">Regular</text>
                <text x="337" y="148" fontSize="9" fill="#94a3b8" textAnchor="middle">No restrictions</text>

                {/* Reviews */}
                <text x="26" y="188" fontSize="10" fill="#64748b" fontWeight="600">YOUR REVIEWS</text>

                <rect x="20" y="196" width="375" height="58" rx="10" fill="#fffbeb" stroke="#fde68a" strokeWidth="1" />
                <g transform="translate(34, 210)">
                  {[1,2,3,4,5].map(s => (
                    <text key={s} x={(s-1)*16} y="14" fontSize="12" fill="#f59e0b">★</text>
                  ))}
                </g>
                <text x="380" y="220" fontSize="9" fill="#94a3b8" textAnchor="end">15 Feb 2026</text>
                <text x="34" y="240" fontSize="10" fill="#1e293b">"Lovely table, very polite — came with the family. Would seat again."</text>

                <rect x="20" y="264" width="375" height="50" rx="10" fill="#fffbeb" stroke="#fde68a" strokeWidth="1" />
                <g transform="translate(34, 278)">
                  {[1,2,3,4].map(s => (
                    <text key={s} x={(s-1)*16} y="14" fontSize="12" fill="#f59e0b">★</text>
                  ))}
                  <text x="64" y="14" fontSize="12" fill="#e2e8f0">★</text>
                </g>
                <text x="380" y="288" fontSize="9" fill="#94a3b8" textAnchor="end">2 Jan 2026</text>
                <text x="34" y="306" fontSize="10" fill="#1e293b">"Good guest. No issues. Arrived slightly late but called ahead."</text>

                {/* Peer reviews toggle */}
                <rect x="20" y="324" width="375" height="36" rx="10" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1" />
                <text x="34" y="347" fontSize="10" fill="#9333ea" fontWeight="600">Peer reviews (click to expand) →</text>
                <text x="390" y="347" fontSize="9" fill="#9333ea" textAnchor="end">3 reviews</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Multilingual & notifications */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Email illustration */}
            <div>
              <svg viewBox="0 0 420 340" className="w-full h-auto drop-shadow-lg">
                <defs>
                  <filter id="email-shadow">
                    <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.1" />
                  </filter>
                </defs>
                <rect x="10" y="10" width="400" height="320" rx="16" fill="white" filter="url(#email-shadow)" />
                {/* Email chrome */}
                <rect x="10" y="10" width="400" height="38" rx="16" fill="#f1f5f9" />
                <rect x="10" y="34" width="400" height="14" fill="#f1f5f9" />
                <circle cx="32" cy="29" r="6" fill="#ef4444" opacity="0.5" />
                <circle cx="50" cy="29" r="6" fill="#f59e0b" opacity="0.5" />
                <circle cx="68" cy="29" r="6" fill="#22c55e" opacity="0.5" />
                <text x="210" y="33" fontSize="10" fill="#94a3b8" textAnchor="middle">Booking Confirmed — Veno App</text>
                {/* Email body */}
                <rect x="30" y="60" width="360" height="60" rx="10" fill="#6262bd" />
                <text x="210" y="88" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">Booking Confirmed! 🎉</text>
                <text x="210" y="108" fontSize="9" fill="white" opacity="0.8" textAnchor="middle">Your reservation has been confirmed</text>

                <text x="50" y="148" fontSize="10" fill="#64748b">Hi Alex,</text>
                <text x="50" y="166" fontSize="10" fill="#64748b">Your booking at Bella Vista has been confirmed.</text>

                <rect x="30" y="182" width="360" height="70" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <text x="50" y="204" fontSize="10" fill="#94a3b8">Date</text><text x="180" y="204" fontSize="10" fill="#1e293b" fontWeight="bold">Saturday, 16 March 2026</text>
                <text x="50" y="222" fontSize="10" fill="#94a3b8">Time</text><text x="180" y="222" fontSize="10" fill="#1e293b" fontWeight="bold">7:00 PM</text>
                <text x="50" y="240" fontSize="10" fill="#94a3b8">Guests</text><text x="180" y="240" fontSize="10" fill="#1e293b" fontWeight="bold">4 people</text>

                <text x="50" y="278" fontSize="10" fill="#64748b">For questions, contact us at support@venoapp.com</text>

                {/* Language flags */}
                <g transform="translate(30, 300)">
                  {['🇬🇧','🇪🇸','🇫🇷','🇮🇹','🇷🇴'].map((flag, i) => (
                    <text key={flag} x={i * 32} y="18" fontSize="16">{flag}</text>
                  ))}
                  <text x="168" y="18" fontSize="9" fill="#94a3b8">All emails sent in the customer's language</text>
                </g>
              </svg>
            </div>

            <div>
              <div className="inline-block px-4 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 text-sm font-semibold mb-4">
                Notifications & Languages
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Speak Your Customer's Language
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Every email and SMS notification is sent in the customer's preferred language. From booking confirmation to cancellations and denial notices — nothing gets lost in translation.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Booking confirmed', sub: 'Email + SMS to customer' },
                  { title: 'Booking denied', sub: 'Email + SMS with reason' },
                  { title: 'Booking cancelled', sub: 'Email + SMS notification' },
                  { title: 'Deposit receipt', sub: 'Fee confirmation by SMS' },
                ].map(n => (
                  <div key={n.title} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{n.sub}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Supported languages: <span className="font-semibold text-slate-700 dark:text-slate-300">English · Spanish · French · Italian · Romanian</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beyond restaurants */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#6262bd] to-violet-700 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left — pitch */}
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 w-fit">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Not Just for Restaurants
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                  Any appointment-based business can use this
                </h2>
                <p className="text-white/75 text-lg mb-8 leading-relaxed">
                  Our booking system was built for venues, but it works just as well for any business that takes appointments. Online bookings, automated confirmations, deposits, and a clean calendar view — all ready to go.
                </p>
                <ul className="space-y-3 mb-10">
                  {[
                    'Customers book online 24/7 — no phone calls needed',
                    'Automatic email confirmations in the customer\'s language',
                    'Collect a deposit or booking fee at time of reservation',
                    'Block unreliable customers from future bookings',
                  ].map(point => (
                    <li key={point} className="flex items-start gap-3 text-white/85 text-sm">
                      <svg className="w-4 h-4 text-violet-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 bg-white text-[#6262bd] font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-all w-fit shadow-lg"
                >
                  Start Free Trial
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Right — business type grid */}
              <div className="bg-white/10 backdrop-blur-sm p-10 lg:p-14">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-6">Works for any appointment-based business</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '💇', label: 'Hair Salons' },
                    { icon: '✂️', label: 'Barber Shops' },
                    { icon: '💆', label: 'Massage & Wellness' },
                    { icon: '💅', label: 'Beauty & Nail Studios' },
                    { icon: '🦷', label: 'Dental Clinics' },
                    { icon: '🐾', label: 'Pet Grooming' },
                    { icon: '🔧', label: 'Tradespeople' },
                    { icon: '🏋️', label: 'Personal Trainers' },
                    { icon: '📸', label: 'Photographers' },
                    { icon: '🍽️', label: 'Restaurants' },
                    { icon: '🩺', label: 'Private Clinics' },
                    { icon: '🎨', label: 'Tattoo Studios' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3">
                      <span className="text-xl">{icon}</span>
                      <span className="text-white text-sm font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#6262bd] to-[#4444a0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Fill More Tables?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join venues already using Veno to manage reservations smarter, reduce no-shows, and build better customer relationships.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all shadow-lg">
              Start Free Trial
            </Link>
            <Link href="/contact" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
              Talk to Sales →
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-6">No credit card required · 2 weeks free trial</p>
        </div>
      </section>

    </ServicePageLayout>
    </>
  )
}
