'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function DashboardPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl"></div>
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

              <div className="inline-block px-4 py-1.5 bg-emerald-500/10 rounded-full text-emerald-600 text-sm font-semibold mb-4">
                Staff Dashboard
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Command Central for Your Team
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                A powerful, intuitive dashboard that gives your kitchen, bar, and floor staff everything they need. Real-time orders, instant updates, and complete visibility.
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

            {/* Hero Illustration - Dashboard mockup */}
            <div className="relative">
              <svg viewBox="0 0 500 380" className="w-full h-auto">
                <defs>
                  <filter id="shadow3" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Monitor */}
                <rect x="30" y="20" width="440" height="290" rx="12" fill="#1e293b" filter="url(#shadow3)" />
                <rect x="40" y="30" width="420" height="260" rx="8" fill="#f8fafc" />

                {/* Header */}
                <rect x="40" y="30" width="420" height="45" rx="8" fill="#6262bd" />
                <rect x="40" y="65" width="420" height="10" fill="#6262bd" />
                <circle cx="70" cy="52" r="12" fill="white" opacity="0.2" />
                <text x="95" y="57" fontSize="14" fill="white" fontWeight="bold">Veno App Dashboard</text>
                <rect x="370" y="42" width="80" height="22" rx="6" fill="white" opacity="0.2" />
                <text x="410" y="57" fontSize="10" fill="white" textAnchor="middle">Table 5</text>

                {/* Order cards */}
                <g transform="translate(50, 90)">
                  {/* Ready order */}
                  <rect x="0" y="0" width="125" height="90" rx="8" fill="white" stroke="#22c55e" strokeWidth="2" />
                  <rect x="8" y="8" width="50" height="16" rx="4" fill="#22c55e" />
                  <text x="33" y="20" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">READY</text>
                  <text x="8" y="38" fontSize="10" fill="#1e293b" fontWeight="bold">Table 3</text>
                  <text x="8" y="52" fontSize="8" fill="#64748b">🍔 Burger x2</text>
                  <text x="8" y="64" fontSize="8" fill="#64748b">🍟 Fries x2</text>
                  <rect x="8" y="72" width="109" height="12" rx="3" fill="#dcfce7" />
                  <text x="62" y="81" fontSize="8" fill="#16a34a" textAnchor="middle">Ready to serve</text>
                </g>

                <g transform="translate(185, 90)">
                  {/* Cooking order */}
                  <rect x="0" y="0" width="125" height="90" rx="8" fill="white" stroke="#f59e0b" strokeWidth="2" />
                  <rect x="8" y="8" width="60" height="16" rx="4" fill="#f59e0b" />
                  <text x="38" y="20" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">COOKING</text>
                  <text x="8" y="38" fontSize="10" fill="#1e293b" fontWeight="bold">Table 7</text>
                  <text x="8" y="52" fontSize="8" fill="#64748b">🍝 Pasta x1</text>
                  <text x="8" y="64" fontSize="8" fill="#64748b">🥗 Salad x1</text>
                  <rect x="8" y="72" width="109" height="12" rx="3" fill="#fef3c7" />
                  <text x="62" y="81" fontSize="8" fill="#d97706" textAnchor="middle">In progress...</text>
                </g>

                <g transform="translate(320, 90)">
                  {/* New order */}
                  <rect x="0" y="0" width="125" height="90" rx="8" fill="white" stroke="#6262bd" strokeWidth="2" />
                  <rect x="8" y="8" width="40" height="16" rx="4" fill="#6262bd" />
                  <text x="28" y="20" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">NEW</text>
                  <text x="8" y="38" fontSize="10" fill="#1e293b" fontWeight="bold">Table 12</text>
                  <text x="8" y="52" fontSize="8" fill="#64748b">🍕 Pizza x1</text>
                  <text x="8" y="64" fontSize="8" fill="#64748b">🍺 Beer x2</text>
                  <rect x="8" y="72" width="109" height="12" rx="3" fill="#ede9fe" />
                  <text x="62" y="81" fontSize="8" fill="#6262bd" textAnchor="middle">Accept order</text>

                  {/* Pulse */}
                  <circle cx="115" cy="8" r="8" fill="#ef4444">
                    <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Stats bar */}
                <g transform="translate(50, 195)">
                  <rect x="0" y="0" width="98" height="50" rx="6" fill="#f0fdf4" />
                  <text x="49" y="22" fontSize="16" fill="#16a34a" textAnchor="middle" fontWeight="bold">12</text>
                  <text x="49" y="38" fontSize="9" fill="#64748b" textAnchor="middle">Completed</text>

                  <rect x="108" y="0" width="98" height="50" rx="6" fill="#fef3c7" />
                  <text x="157" y="22" fontSize="16" fill="#d97706" textAnchor="middle" fontWeight="bold">5</text>
                  <text x="157" y="38" fontSize="9" fill="#64748b" textAnchor="middle">In Progress</text>

                  <rect x="216" y="0" width="98" height="50" rx="6" fill="#ede9fe" />
                  <text x="265" y="22" fontSize="16" fill="#6262bd" textAnchor="middle" fontWeight="bold">3</text>
                  <text x="265" y="38" fontSize="9" fill="#64748b" textAnchor="middle">New Orders</text>

                  <rect x="324" y="0" width="86" height="50" rx="6" fill="#f8fafc" />
                  <text x="367" y="22" fontSize="16" fill="#1e293b" textAnchor="middle" fontWeight="bold">$847</text>
                  <text x="367" y="38" fontSize="9" fill="#64748b" textAnchor="middle">Today</text>
                </g>

                {/* Filter tabs */}
                <g transform="translate(50, 255)">
                  <rect x="0" y="0" width="60" height="24" rx="6" fill="#6262bd" />
                  <text x="30" y="16" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">All</text>
                  <rect x="68" y="0" width="70" height="24" rx="6" fill="#f1f5f9" />
                  <text x="103" y="16" fontSize="9" fill="#64748b" textAnchor="middle">Kitchen</text>
                  <rect x="146" y="0" width="50" height="24" rx="6" fill="#f1f5f9" />
                  <text x="171" y="16" fontSize="9" fill="#64748b" textAnchor="middle">Bar</text>
                </g>

                {/* Monitor stand */}
                <rect x="200" y="310" width="100" height="15" rx="3" fill="#cbd5e1" />
                <rect x="180" y="325" width="140" height="10" rx="5" fill="#94a3b8" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Station Views Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Different Views for Different Roles
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Kitchen sees food orders. Bar sees drinks. Managers see everything. Everyone stays focused.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Kitchen View */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="bg-orange-500 p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🍳</span>
                  <h3 className="text-xl font-bold text-white">Kitchen Display</h3>
                </div>
              </div>
              <div className="p-6">
                <svg viewBox="0 0 200 150" className="w-full h-auto mb-4">
                  <rect x="5" y="5" width="190" height="140" rx="8" fill="#fff7ed" />
                  <rect x="12" y="12" width="85" height="60" rx="6" fill="white" stroke="#f97316" strokeWidth="2" />
                  <text x="54" y="35" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Table 5</text>
                  <text x="20" y="50" fontSize="7" fill="#64748b">🍔 Burger x2</text>
                  <text x="20" y="62" fontSize="7" fill="#64748b">🥩 Steak x1</text>

                  <rect x="103" y="12" width="85" height="60" rx="6" fill="white" stroke="#eab308" strokeWidth="2" />
                  <text x="145" y="35" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Table 8</text>
                  <text x="111" y="50" fontSize="7" fill="#64748b">🍝 Pasta x2</text>
                  <text x="111" y="62" fontSize="7" fill="#64748b">🍕 Pizza x1</text>

                  <rect x="12" y="78" width="85" height="60" rx="6" fill="white" stroke="#6262bd" strokeWidth="2" />
                  <text x="54" y="101" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Table 3</text>
                  <text x="20" y="116" fontSize="7" fill="#64748b">🥗 Salad x3</text>
                  <text x="20" y="128" fontSize="7" fill="#64748b">🍲 Soup x2</text>
                </svg>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Only food orders displayed</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Priority sorting by time</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>One-tap status updates</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bar View */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="bg-purple-500 p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🍸</span>
                  <h3 className="text-xl font-bold text-white">Bar Display</h3>
                </div>
              </div>
              <div className="p-6">
                <svg viewBox="0 0 200 150" className="w-full h-auto mb-4">
                  <rect x="5" y="5" width="190" height="140" rx="8" fill="#faf5ff" />
                  <rect x="12" y="12" width="85" height="60" rx="6" fill="white" stroke="#a855f7" strokeWidth="2" />
                  <text x="54" y="35" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Table 12</text>
                  <text x="20" y="50" fontSize="7" fill="#64748b">🍺 Beer x3</text>
                  <text x="20" y="62" fontSize="7" fill="#64748b">🍷 Wine x2</text>

                  <rect x="103" y="12" width="85" height="60" rx="6" fill="white" stroke="#6262bd" strokeWidth="2" />
                  <text x="145" y="35" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Table 4</text>
                  <text x="111" y="50" fontSize="7" fill="#64748b">🍹 Cocktail x2</text>
                  <text x="111" y="62" fontSize="7" fill="#64748b">☕ Coffee x1</text>

                  <rect x="12" y="78" width="176" height="60" rx="6" fill="#f3e8ff" />
                  <text x="100" y="110" fontSize="9" fill="#7c3aed" textAnchor="middle">All drinks orders in one place</text>
                </svg>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Only drink orders displayed</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Quick drink preparation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Table number always visible</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Manager View */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="bg-slate-700 p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-xl font-bold text-white">Manager View</h3>
                </div>
              </div>
              <div className="p-6">
                <svg viewBox="0 0 200 150" className="w-full h-auto mb-4">
                  <rect x="5" y="5" width="190" height="140" rx="8" fill="#f8fafc" />

                  {/* Stats */}
                  <rect x="12" y="12" width="55" height="35" rx="4" fill="#dcfce7" />
                  <text x="39" y="28" fontSize="12" fill="#16a34a" textAnchor="middle" fontWeight="bold">$2.4k</text>
                  <text x="39" y="40" fontSize="7" fill="#64748b" textAnchor="middle">Today</text>

                  <rect x="73" y="12" width="55" height="35" rx="4" fill="#fef3c7" />
                  <text x="100" y="28" fontSize="12" fill="#d97706" textAnchor="middle" fontWeight="bold">47</text>
                  <text x="100" y="40" fontSize="7" fill="#64748b" textAnchor="middle">Orders</text>

                  <rect x="134" y="12" width="55" height="35" rx="4" fill="#dbeafe" />
                  <text x="161" y="28" fontSize="12" fill="#2563eb" textAnchor="middle" fontWeight="bold">8</text>
                  <text x="161" y="40" fontSize="7" fill="#64748b" textAnchor="middle">Active</text>

                  {/* Mini chart */}
                  <rect x="12" y="55" width="176" height="50" rx="4" fill="white" stroke="#e2e8f0" />
                  <polyline points="22,90 45,80 68,85 91,70 114,75 137,60 160,65 178,55" fill="none" stroke="#6262bd" strokeWidth="2" />

                  {/* Recent orders */}
                  <rect x="12" y="112" width="176" height="28" rx="4" fill="white" stroke="#e2e8f0" />
                  <text x="20" y="128" fontSize="8" fill="#64748b">Latest: Table 12 - $45.00</text>
                </svg>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Full overview of all orders</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Real-time sales tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Staff performance monitoring</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Features Your Team Will Love
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🔊', title: 'Audio Alerts', description: 'Never miss a new order with customizable sound notifications' },
              { icon: '📱', title: 'Works Offline', description: 'Keep taking orders even when internet is spotty' },
              { icon: '🎨', title: 'Color Coded', description: 'Instantly see order status with intuitive color coding' },
              { icon: '⏱️', title: 'Time Tracking', description: 'See how long each order has been waiting' },
              { icon: '👆', title: 'Touch Friendly', description: 'Big buttons designed for fast, accurate taps' },
              { icon: '🔒', title: 'Role Based', description: 'Staff only see what they need to see' },
              { icon: '📋', title: 'Order History', description: 'Look up any past order instantly' },
              { icon: '🌙', title: 'Dark Mode', description: 'Easy on the eyes during evening service' },
            ].map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700 text-center">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Operations?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Give your team the tools they need to deliver exceptional service.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/analytics"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore Analytics →
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
