'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function AnalyticsPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link href="/home#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Features</span>
              </Link>

              <div className="inline-block px-4 py-1.5 bg-amber-500/10 rounded-full text-amber-600 text-sm font-semibold mb-4">
                Business Analytics
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Data-Driven Decisions for Your Business
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Stop guessing, start knowing. Track sales, understand trends, identify your best sellers, and optimize every aspect of your business with powerful analytics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/register"
                  className="bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center"
                >
                  Contact Sales
                </Link>
              </div>
            </div>

            {/* Hero Illustration - Analytics Dashboard */}
            <div className="relative">
              <svg viewBox="0 0 500 400" className="w-full h-auto">
                <defs>
                  <filter id="shadow4" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Main card */}
                <rect x="20" y="20" width="460" height="360" rx="16" fill="white" filter="url(#shadow4)" />

                {/* Header */}
                <rect x="30" y="30" width="440" height="50" rx="8" fill="#f8fafc" />
                <text x="50" y="62" fontSize="16" fill="#1e293b" fontWeight="bold">Analytics Dashboard</text>
                <rect x="350" y="45" width="110" height="24" rx="6" fill="#6262bd" />
                <text x="405" y="61" fontSize="10" fill="white" textAnchor="middle">Last 7 days ▼</text>

                {/* Revenue card */}
                <rect x="30" y="95" width="140" height="80" rx="8" fill="#f0fdf4" />
                <text x="45" y="120" fontSize="11" fill="#64748b">Total Revenue</text>
                <text x="45" y="148" fontSize="24" fill="#16a34a" fontWeight="bold">$12,458</text>
                <text x="45" y="166" fontSize="10" fill="#16a34a">↑ 12% vs last week</text>

                {/* Orders card */}
                <rect x="180" y="95" width="140" height="80" rx="8" fill="#eff6ff" />
                <text x="195" y="120" fontSize="11" fill="#64748b">Total Orders</text>
                <text x="195" y="148" fontSize="24" fill="#2563eb" fontWeight="bold">347</text>
                <text x="195" y="166" fontSize="10" fill="#2563eb">↑ 8% vs last week</text>

                {/* Avg order card */}
                <rect x="330" y="95" width="140" height="80" rx="8" fill="#fef3c7" />
                <text x="345" y="120" fontSize="11" fill="#64748b">Avg Order Value</text>
                <text x="345" y="148" fontSize="24" fill="#d97706" fontWeight="bold">$35.90</text>
                <text x="345" y="166" fontSize="10" fill="#d97706">↑ 4% vs last week</text>

                {/* Chart area */}
                <rect x="30" y="190" width="280" height="170" rx="8" fill="#f8fafc" />
                <text x="45" y="215" fontSize="12" fill="#1e293b" fontWeight="bold">Revenue Trend</text>

                {/* Bar chart */}
                <g transform="translate(45, 235)">
                  <rect x="0" y="80" width="30" height="20" rx="2" fill="#6262bd" opacity="0.4" />
                  <rect x="40" y="60" width="30" height="40" rx="2" fill="#6262bd" opacity="0.5" />
                  <rect x="80" y="40" width="30" height="60" rx="2" fill="#6262bd" opacity="0.6" />
                  <rect x="120" y="50" width="30" height="50" rx="2" fill="#6262bd" opacity="0.7" />
                  <rect x="160" y="20" width="30" height="80" rx="2" fill="#6262bd" opacity="0.8" />
                  <rect x="200" y="0" width="30" height="100" rx="2" fill="#6262bd">
                    <animate attributeName="height" values="90;100;90" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="y" values="10;0;10" dur="2s" repeatCount="indefinite" />
                  </rect>

                  {/* Labels */}
                  <text x="15" y="115" fontSize="8" fill="#94a3b8" textAnchor="middle">Mon</text>
                  <text x="55" y="115" fontSize="8" fill="#94a3b8" textAnchor="middle">Tue</text>
                  <text x="95" y="115" fontSize="8" fill="#94a3b8" textAnchor="middle">Wed</text>
                  <text x="135" y="115" fontSize="8" fill="#94a3b8" textAnchor="middle">Thu</text>
                  <text x="175" y="115" fontSize="8" fill="#94a3b8" textAnchor="middle">Fri</text>
                  <text x="215" y="115" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">Sat</text>
                </g>

                {/* Top products */}
                <rect x="320" y="190" width="150" height="170" rx="8" fill="#f8fafc" />
                <text x="335" y="215" fontSize="12" fill="#1e293b" fontWeight="bold">Top Sellers</text>

                <g transform="translate(330, 230)">
                  <rect x="0" y="0" width="130" height="35" rx="4" fill="white" />
                  <text x="10" y="15" fontSize="9" fill="#1e293b" fontWeight="bold">🍔 Classic Burger</text>
                  <text x="10" y="28" fontSize="8" fill="#64748b">89 sold • $1,068</text>

                  <rect x="0" y="42" width="130" height="35" rx="4" fill="white" />
                  <text x="10" y="57" fontSize="9" fill="#1e293b" fontWeight="bold">🍕 Margherita Pizza</text>
                  <text x="10" y="70" fontSize="8" fill="#64748b">67 sold • $938</text>

                  <rect x="0" y="84" width="130" height="35" rx="4" fill="white" />
                  <text x="10" y="99" fontSize="9" fill="#1e293b" fontWeight="bold">🥗 Caesar Salad</text>
                  <text x="10" y="112" fontSize="8" fill="#64748b">54 sold • $486</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Every Metric That Matters
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              From daily sales to seasonal trends, get the insights you need to grow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Revenue Tracking',
                description: 'Track daily, weekly, and monthly revenue with easy-to-read charts and comparisons.',
                color: 'bg-green-500/10 text-green-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Sales Trends',
                description: 'See patterns over time. Know your busy days and slow periods at a glance.',
                color: 'bg-blue-500/10 text-blue-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Product Performance',
                description: 'Identify your best sellers and underperformers. Make menu decisions backed by data.',
                color: 'bg-amber-500/10 text-amber-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Peak Hours Analysis',
                description: 'Know exactly when you are busiest so you can staff appropriately and maximise efficiency.',
                color: 'bg-purple-500/10 text-purple-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Staff Performance',
                description: 'Track orders per staff member, average service times, and identify training opportunities.',
                color: 'bg-pink-500/10 text-pink-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: 'Custom Reports',
                description: 'Export data in multiple formats. Generate reports for accounting or business reviews.',
                color: 'bg-slate-500/10 text-slate-600',
              },
            ].map((metric, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
                <div className={`w-14 h-14 rounded-xl ${metric.color} flex items-center justify-center mb-6`}>
                  {metric.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{metric.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Beautiful, Actionable Dashboards
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              No spreadsheets required. Everything visualized in easy-to-understand charts.
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 shadow-2xl">
            <svg viewBox="0 0 900 400" className="w-full h-auto">
              {/* Dark theme dashboard */}
              <rect x="0" y="0" width="900" height="400" rx="12" fill="#1e293b" />

              {/* Header */}
              <rect x="20" y="20" width="860" height="50" rx="8" fill="#334155" />
              <circle cx="50" cy="45" r="15" fill="#6262bd" />
              <text x="50" y="50" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">M</text>
              <text x="80" y="50" fontSize="14" fill="white" fontWeight="bold">Analytics</text>

              {/* Date selector */}
              <rect x="720" y="32" width="150" height="28" rx="6" fill="#475569" />
              <text x="795" y="50" fontSize="11" fill="white" textAnchor="middle">Mar 1 - Mar 7, 2024</text>

              {/* Stats row */}
              <g transform="translate(20, 90)">
                <rect x="0" y="0" width="200" height="90" rx="8" fill="#334155" />
                <text x="20" y="30" fontSize="12" fill="#94a3b8">Revenue</text>
                <text x="20" y="58" fontSize="28" fill="#10b981" fontWeight="bold">$18,492</text>
                <text x="20" y="78" fontSize="11" fill="#10b981">↑ 15.2% from last week</text>

                <rect x="220" y="0" width="200" height="90" rx="8" fill="#334155" />
                <text x="240" y="30" fontSize="12" fill="#94a3b8">Orders</text>
                <text x="240" y="58" fontSize="28" fill="#3b82f6" fontWeight="bold">486</text>
                <text x="240" y="78" fontSize="11" fill="#3b82f6">↑ 8.7% from last week</text>

                <rect x="440" y="0" width="200" height="90" rx="8" fill="#334155" />
                <text x="460" y="30" fontSize="12" fill="#94a3b8">Avg Order</text>
                <text x="460" y="58" fontSize="28" fill="#f59e0b" fontWeight="bold">$38.05</text>
                <text x="460" y="78" fontSize="11" fill="#f59e0b">↑ 6.1% from last week</text>

                <rect x="660" y="0" width="200" height="90" rx="8" fill="#334155" />
                <text x="680" y="30" fontSize="12" fill="#94a3b8">Customers</text>
                <text x="680" y="58" fontSize="28" fill="#a855f7" fontWeight="bold">312</text>
                <text x="680" y="78" fontSize="11" fill="#a855f7">↑ 12.4% from last week</text>
              </g>

              {/* Line chart */}
              <g transform="translate(20, 200)">
                <rect x="0" y="0" width="540" height="180" rx="8" fill="#334155" />
                <text x="20" y="30" fontSize="14" fill="white" fontWeight="bold">Revenue Over Time</text>

                {/* Chart grid */}
                <line x1="50" y1="50" x2="520" y2="50" stroke="#475569" strokeDasharray="4" />
                <line x1="50" y1="90" x2="520" y2="90" stroke="#475569" strokeDasharray="4" />
                <line x1="50" y1="130" x2="520" y2="130" stroke="#475569" strokeDasharray="4" />

                {/* Line */}
                <polyline
                  points="50,120 120,100 190,110 260,80 330,90 400,60 470,70 520,50"
                  fill="none"
                  stroke="#6262bd"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Area under line */}
                <polygon
                  points="50,120 120,100 190,110 260,80 330,90 400,60 470,70 520,50 520,160 50,160"
                  fill="url(#areaGradient)"
                />

                {/* Data points */}
                <circle cx="520" cy="50" r="5" fill="#6262bd" />

                {/* Labels */}
                <text x="50" y="175" fontSize="10" fill="#94a3b8">Mon</text>
                <text x="120" y="175" fontSize="10" fill="#94a3b8">Tue</text>
                <text x="190" y="175" fontSize="10" fill="#94a3b8">Wed</text>
                <text x="260" y="175" fontSize="10" fill="#94a3b8">Thu</text>
                <text x="330" y="175" fontSize="10" fill="#94a3b8">Fri</text>
                <text x="400" y="175" fontSize="10" fill="#94a3b8">Sat</text>
                <text x="470" y="175" fontSize="10" fill="white" fontWeight="bold">Sun</text>
              </g>

              {/* Pie chart area */}
              <g transform="translate(580, 200)">
                <rect x="0" y="0" width="300" height="180" rx="8" fill="#334155" />
                <text x="20" y="30" fontSize="14" fill="white" fontWeight="bold">Sales by Category</text>

                {/* Pie chart */}
                <g transform="translate(80, 100)">
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#6262bd" strokeWidth="20" strokeDasharray="78.5 235.5" />
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="62.8 251.2" strokeDashoffset="-78.5" />
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="47.1 266.9" strokeDashoffset="-141.3" />
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="31.4 282.6" strokeDashoffset="-188.4" />
                </g>

                {/* Legend */}
                <g transform="translate(160, 60)">
                  <rect x="0" y="0" width="12" height="12" rx="2" fill="#6262bd" />
                  <text x="20" y="10" fontSize="10" fill="white">Food (50%)</text>

                  <rect x="0" y="22" width="12" height="12" rx="2" fill="#10b981" />
                  <text x="20" y="32" fontSize="10" fill="white">Drinks (25%)</text>

                  <rect x="0" y="44" width="12" height="12" rx="2" fill="#f59e0b" />
                  <text x="20" y="54" fontSize="10" fill="white">Desserts (15%)</text>

                  <rect x="0" y="66" width="12" height="12" rx="2" fill="#ef4444" />
                  <text x="20" y="76" fontSize="10" fill="white">Other (10%)</text>
                </g>
              </g>

              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6262bd" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6262bd" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-amber-500 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Unlock Your Data?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start making smarter decisions with real-time analytics today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-amber-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/reservations"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore Reservations →
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">
            No credit card required. 1 month free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
  )
}
