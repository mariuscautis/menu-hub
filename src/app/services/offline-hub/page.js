'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function OfflineHubPage() {
  const seo = useSeoSettings('services_offline_hub', {
    title: 'Keep Serving Even Without Internet — Veno App Offline Hub',
    description: 'Veno App keeps working even when your internet goes down. Orders and kitchen displays stay live on your local network — then sync automatically the moment you reconnect.',
  })
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
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link href="/#features" className="inline-flex items-center space-x-2 text-teal-600 hover:underline mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Features</span>
              </Link>

              <div className="inline-block px-4 py-1.5 bg-teal-500/10 rounded-full text-teal-600 text-sm font-semibold mb-4">
                Always-On Technology
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Keep Serving, Even Without Internet
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Internet outages happen at the worst times. With Veno App's Offline Hub, your restaurant keeps running smoothly — orders keep flowing and your kitchen stays updated, all without a single internet connection.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/register"
                  className="bg-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>

            {/* Hero illustration */}
            <div className="relative flex justify-center">
              <svg viewBox="0 0 380 460" className="w-full max-w-sm h-auto drop-shadow-xl">
                <defs>
                  <linearGradient id="oh-hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="oh-shadow">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Main card background */}
                <rect x="20" y="20" width="340" height="420" rx="20" fill="white" filter="url(#oh-shadow)" />
                <rect x="20" y="20" width="340" height="56" rx="20" fill="url(#oh-hero-grad)" />
                <rect x="20" y="56" width="340" height="20" fill="url(#oh-hero-grad)" />

                {/* Header text */}
                <text x="190" y="48" fontSize="13" fill="white" textAnchor="middle" fontWeight="bold">Veno App — Offline Mode</text>

                {/* Status pill */}
                <rect x="120" y="86" width="140" height="28" rx="14" fill="#f0fdf4" />
                <circle cx="140" cy="100" r="6" fill="#22c55e" />
                <text x="190" y="104" fontSize="10" fill="#16a34a" textAnchor="middle" fontWeight="bold">All systems running ✓</text>

                {/* Wifi-off icon area */}
                <circle cx="190" cy="156" r="40" fill="#f0fdf4" />
                {/* wifi arcs (faded) */}
                <path d="M168 162 Q190 140 212 162" fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" opacity="0.35"/>
                <path d="M158 172 Q190 132 222 172" fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" opacity="0.18"/>
                <circle cx="190" cy="172" r="4.5" fill="#14b8a6" />
                {/* red slash */}
                <line x1="168" y1="136" x2="212" y2="180" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                <text x="190" y="210" fontSize="10" fill="#64748b" textAnchor="middle">No internet connection</text>

                {/* Divider */}
                <line x1="40" y1="228" x2="340" y2="228" stroke="#e2e8f0" strokeWidth="1" />
                <text x="190" y="248" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold" letterSpacing="1">STILL WORKING FINE</text>

                {/* 3 live indicators */}
                {[
                  { label: 'Orders & Payments', y: 272 },
                  { label: 'Kitchen & Bar Displays', y: 310 },
                ].map(({ label, y }) => (
                  <g key={label}>
                    <rect x="40" y={y - 12} width="300" height="26" rx="8" fill="#f8fafc" />
                    <circle cx="60" cy={y + 1} r="7" fill="#dcfce7" />
                    <path d={`M57 ${y + 1} l2.5 2.5 4.5-4.5`} fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="76" y={y + 5} fontSize="10" fill="#334155">{label}</text>
                    <rect x="290" y={y - 5} width="40" height="14" rx="7" fill="#dcfce7" />
                    <text x="310" y={y + 5} fontSize="8" fill="#16a34a" textAnchor="middle" fontWeight="bold">LIVE</text>
                  </g>
                ))}

                {/* Auto-sync footer */}
                <rect x="40" y="356" width="300" height="48" rx="12" fill="url(#oh-hero-grad)" />
                <path d="M64 378 a10 10 0 1 1 8 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <polyline points="68,372 64,378 70,382" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="200" y="377" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">Auto-sync on reconnect</text>
                <rect x="90" y="383" width="220" height="5" rx="2" fill="white" opacity="0.25" />
                <rect x="90" y="383" width="148" height="5" rx="2" fill="white" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* The problem section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Internet outages cost restaurants money
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              A dropped connection during a busy service can mean lost orders, frustrated customers, and a kitchen that grinds to a halt. Most restaurant software just stops working. Veno App doesn't.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                title: 'Orders grind to a halt',
                description: 'Without internet, most POS systems freeze — leaving your staff unable to take or process any orders at all.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                title: 'Kitchen goes dark',
                description: 'Kitchen display screens that depend on the cloud go blank — your chefs lose visibility of what needs cooking.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                title: 'Staff are in the dark',
                description: 'Your team loses access to orders, tasks, and the kitchen display — everything stops until the internet is back.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 bg-teal-500/10 rounded-full text-teal-600 text-sm font-semibold mb-4">
                How It Works
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                A local hub that keeps everything talking
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                The Veno App Offline Hub is a small companion app that runs on a device in your venue — like a mini computer behind the scenes. It keeps all your devices talking to each other over your local network, completely independent of the internet.
              </p>

              <div className="space-y-6">
                {[
                  {
                    step: '1',
                    title: 'Set up once, forget about it',
                    description: 'Install the Offline Hub app on a Windows PC in your venue. It runs quietly in the background — no technical knowledge needed.',
                  },
                  {
                    step: '2',
                    title: 'Your devices connect locally',
                    description: 'Tablets, phones, and kitchen screens connect to the Hub over your venue\'s Wi-Fi — not the internet. Everything works instantly, even if your broadband drops.',
                  },
                  {
                    step: '3',
                    title: 'Back online? Everything syncs',
                    description: 'The moment your internet returns, all orders and data sync automatically to the cloud. Nothing is lost, nothing needs manual updating.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagram illustration */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
              <svg viewBox="0 0 420 300" className="w-full h-auto">
                <defs>
                  <linearGradient id="hub-g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="hub-shadow">
                    <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* ── LEFT SIDE: device nodes ── */}
                {[
                  { cx: 42, cy: 70,  label: 'Orders',  icon: '🛒' },
                  { cx: 42, cy: 150, label: 'Kitchen', icon: '👨‍🍳' },
                  { cx: 42, cy: 230, label: 'Bar',     icon: '🍺' },
                ].map(({ cx, cy, label, icon }) => (
                  <g key={label}>
                    {/* line to hub */}
                    <line x1={cx + 24} y1={cy} x2="148" y2="150" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
                    <circle cx={cx} cy={cy} r="24" fill="#f0fdf4" stroke="#14b8a6" strokeWidth="1.5" filter="url(#hub-shadow)" />
                    <text x={cx} y={cy - 4} fontSize="14" textAnchor="middle">{icon}</text>
                    <text x={cx} y={cy + 12} fontSize="7.5" fill="#0f766e" textAnchor="middle" fontWeight="bold">{label}</text>
                  </g>
                ))}

                {/* "Still working" badge under the left nodes */}
                <rect x="4" y="264" width="76" height="20" rx="10" fill="#dcfce7" />
                <text x="42" y="278" fontSize="7.5" fill="#16a34a" textAnchor="middle" fontWeight="bold">Still Working ✓</text>

                {/* ── CENTRE: Offline Hub ── */}
                <circle cx="188" cy="150" r="38" fill="url(#hub-g)" filter="url(#hub-shadow)" />
                <text x="188" y="145" fontSize="9.5" fill="white" textAnchor="middle" fontWeight="bold">Offline</text>
                <text x="188" y="159" fontSize="9.5" fill="white" textAnchor="middle" fontWeight="bold">Hub</text>

                {/* ── BROKEN CABLE between Hub and Cloud ── */}
                {/* left segment of cable */}
                <line x1="226" y1="150" x2="258" y2="150" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                {/* plug end left */}
                <rect x="254" y="144" width="8" height="12" rx="2" fill="#94a3b8" />
                {/* gap */}
                {/* plug end right */}
                <rect x="270" y="144" width="8" height="12" rx="2" fill="#cbd5e1" opacity="0.7" />
                {/* right segment */}
                <line x1="278" y1="150" x2="308" y2="150" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                {/* spark in the gap */}
                <polyline points="263,143 265,150 262,150 264,157" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

                {/* "No Internet" badge above the break */}
                <rect x="240" y="112" width="96" height="26" rx="13" fill="#fee2e2" />
                <text x="288" y="124" fontSize="8" fill="#dc2626" textAnchor="middle" fontWeight="bold">No Internet ✕</text>
                <text x="288" y="133" fontSize="7" fill="#ef4444" textAnchor="middle">Connection lost</text>
                {/* downward arrow to gap */}
                <line x1="288" y1="138" x2="266" y2="143" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />

                {/* ── RIGHT SIDE: Cloud Database (unreachable) ── */}
                {/* Cloud shape */}
                <g opacity="0.35">
                  <ellipse cx="360" cy="145" rx="42" ry="28" fill="#e2e8f0" />
                  <ellipse cx="338" cy="152" rx="20" ry="16" fill="#e2e8f0" />
                  <ellipse cx="376" cy="154" rx="18" ry="14" fill="#e2e8f0" />
                  {/* database cylinder lines */}
                  <ellipse cx="360" cy="160" rx="18" ry="5" fill="#cbd5e1" />
                  <rect x="342" y="160" width="36" height="18" fill="#cbd5e1" />
                  <ellipse cx="360" cy="178" rx="18" ry="5" fill="#94a3b8" />
                  <ellipse cx="360" cy="160" rx="18" ry="5" fill="#cbd5e1" />
                </g>
                <text x="360" y="202" fontSize="7.5" fill="#94a3b8" textAnchor="middle">Cloud Database</text>
                <text x="360" y="212" fontSize="7" fill="#cbd5e1" textAnchor="middle">(unreachable)</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* What keeps working */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              What keeps working offline
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              When the internet goes down, these core features stay fully operational.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: '🛒', title: 'Taking Orders', description: 'Staff can still take and process orders through Veno App without any interruption.' },
              { icon: '👨‍🍳', title: 'Kitchen Display', description: 'Kitchen and bar screens stay live — chefs see every order as it comes in.' },
              { icon: '💳', title: 'Order Tracking', description: 'Orders are tracked and managed locally across the whole venue. No data is lost.' },
              { icon: '🔄', title: 'Automatic Sync', description: 'The moment internet returns, everything syncs instantly to the cloud — nothing to do manually.' },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700 flex gap-4 items-start">
                <div className="text-2xl flex-shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40 rounded-xl px-5 py-4 max-w-2xl mx-auto">
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-teal-800 dark:text-teal-300 leading-relaxed">
              All of this works because your devices communicate directly with each other over your venue's <strong>local area network (LAN)</strong> — no internet required. The Offline Hub acts as the bridge that keeps them all in sync.
            </p>
          </div>
        </div>
      </section>

      {/* Setup section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block px-4 py-1.5 bg-teal-500/10 rounded-full text-teal-600 text-sm font-semibold mb-4">
              Easy Setup
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Simple to set up on Windows
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              No specialist hardware required. Install the Offline Hub app on any Windows PC in your venue and you're ready to go.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Windows PC',
                description: 'Any Windows laptop or desktop already in your office or back-of-house. Just install the app and leave it running quietly in the background.',
                tag: 'Currently supported',
                tagColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'No extra cost',
                description: 'The Offline Hub is included as part of your Veno App plan. No additional hardware fees, no hidden costs.',
                tag: 'Included free',
                tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700 text-center">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${item.tagColor}`}>
                  {item.tag}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Never lose a sale to a bad internet connection
            </h2>
            <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Set up the Offline Hub once and your restaurant keeps serving no matter what — internet or not.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="bg-white text-teal-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-50 transition-all shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-white/40 px-8 py-4 rounded-xl font-semibold text-lg text-white hover:bg-white/10 transition-all"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

    </ServicePageLayout>
    </>
  )
}
