'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function TableOrderingPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl"></div>
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

              <div className="inline-block px-4 py-1.5 bg-blue-500/10 rounded-full text-blue-600 text-sm font-semibold mb-4">
                Table Ordering
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Let Customers Order Directly From Their Table
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                No more waiting for service. Customers scan, browse, and place orders instantly. Orders go straight to your kitchen, reducing wait times and errors.
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

            {/* Hero Illustration */}
            <div className="relative">
              <svg viewBox="0 0 500 400" className="w-full h-auto">
                <defs>
                  <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Restaurant table */}
                <ellipse cx="250" cy="280" rx="180" ry="70" fill="#f1f5f9" />
                <ellipse cx="250" cy="265" rx="180" ry="70" fill="#e2e8f0" />

                {/* Plate 1 */}
                <circle cx="150" cy="245" r="40" fill="white" stroke="#cbd5e1" strokeWidth="2" />
                <circle cx="150" cy="245" r="30" fill="#fef3c7" />
                <text x="150" y="252" fontSize="20" textAnchor="middle">🍝</text>

                {/* Plate 2 */}
                <circle cx="350" cy="245" r="40" fill="white" stroke="#cbd5e1" strokeWidth="2" />
                <circle cx="350" cy="245" r="30" fill="#dcfce7" />
                <text x="350" y="252" fontSize="20" textAnchor="middle">🥗</text>

                {/* Glass */}
                <rect x="240" y="220" width="20" height="35" rx="2" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />

                {/* QR code stand */}
                <rect x="235" y="180" width="30" height="45" rx="4" fill="#1e293b" />
                <rect x="238" y="185" width="24" height="28" rx="2" fill="white" />
                <g fill="#6262bd" transform="translate(241, 188)">
                  <rect x="0" y="0" width="6" height="6" rx="1" />
                  <rect x="9" y="0" width="6" height="6" rx="1" />
                  <rect x="0" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                  <rect x="0" y="18" width="6" height="6" rx="1" />
                  <rect x="9" y="18" width="6" height="6" rx="1" />
                </g>

                {/* Customer phone ordering */}
                <g transform="translate(60, 30)">
                  <rect x="0" y="0" width="90" height="160" rx="12" fill="#1e293b" filter="url(#shadow2)" />
                  <rect x="5" y="12" width="80" height="136" rx="8" fill="#f8fafc" />

                  {/* Order screen */}
                  <rect x="10" y="20" width="70" height="20" rx="4" fill="#6262bd" />
                  <text x="45" y="34" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Your Order</text>

                  {/* Order items */}
                  <rect x="10" y="46" width="70" height="25" rx="4" fill="#f1f5f9" />
                  <text x="15" y="58" fontSize="7" fill="#1e293b">🍝 Pasta</text>
                  <text x="70" y="58" fontSize="7" fill="#6262bd" textAnchor="end">$14</text>
                  <text x="15" y="68" fontSize="6" fill="#64748b">x1</text>

                  <rect x="10" y="76" width="70" height="25" rx="4" fill="#f1f5f9" />
                  <text x="15" y="88" fontSize="7" fill="#1e293b">🥗 Salad</text>
                  <text x="70" y="88" fontSize="7" fill="#6262bd" textAnchor="end">$10</text>
                  <text x="15" y="98" fontSize="6" fill="#64748b">x1</text>

                  {/* Total */}
                  <line x1="10" y1="108" x2="80" y2="108" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="15" y="120" fontSize="8" fill="#1e293b" fontWeight="bold">Total:</text>
                  <text x="70" y="120" fontSize="8" fill="#6262bd" textAnchor="end" fontWeight="bold">$24</text>

                  {/* Submit button */}
                  <rect x="10" y="128" width="70" height="18" rx="4" fill="#10b981" />
                  <text x="45" y="140" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Place Order</text>
                </g>

                {/* Order flow arrow */}
                <g>
                  <path d="M160 110 Q250 60 340 110" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8,4">
                    <animate attributeName="stroke-dashoffset" values="0;-24" dur="1s" repeatCount="indefinite" />
                  </path>
                  <circle cx="250" cy="70" r="6" fill="#10b981">
                    <animate attributeName="cy" values="80;60;80" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Kitchen display */}
                <g transform="translate(320, 30)">
                  <rect x="0" y="0" width="130" height="100" rx="8" fill="white" filter="url(#shadow2)" />
                  <rect x="0" y="0" width="130" height="25" rx="8" fill="#f59e0b" />
                  <rect x="0" y="15" width="130" height="10" fill="#f59e0b" />
                  <text x="65" y="17" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">🍳 Kitchen</text>

                  {/* New order notification */}
                  <rect x="8" y="35" width="114" height="55" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" />
                  <text x="65" y="52" fontSize="9" fill="#16a34a" textAnchor="middle" fontWeight="bold">NEW ORDER!</text>
                  <text x="20" y="68" fontSize="8" fill="#1e293b">Table 5</text>
                  <text x="20" y="80" fontSize="7" fill="#64748b">🍝 Pasta, 🥗 Salad</text>

                  {/* Notification pulse */}
                  <circle cx="115" cy="12" r="8" fill="#ef4444">
                    <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <text x="115" y="16" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">1</text>
                </g>

                {/* Speed badge */}
                <g transform="translate(20, 320)">
                  <rect x="0" y="0" width="120" height="50" rx="10" fill="white" filter="url(#shadow2)" />
                  <text x="60" y="22" fontSize="10" fill="#1e293b" textAnchor="middle" fontWeight="bold">Average Order Time</text>
                  <text x="60" y="40" fontSize="14" fill="#10b981" textAnchor="middle" fontWeight="bold">30 seconds</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Better for Customers, Better for You
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Table ordering transforms the dining experience for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Customer Benefits */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">For Your Customers</h3>
              <ul className="space-y-4">
                {[
                  'Order whenever they are ready - no waiting',
                  'Browse the full menu with photos at their pace',
                  'Easily add items or order more drinks',
                  'See exactly what they ordered and the total',
                  'Special requests noted clearly',
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-600 dark:text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business Benefits */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">For Your Business</h3>
              <ul className="space-y-4">
                {[
                  'Reduce order errors by up to 90%',
                  'Faster table turnover = more revenue',
                  'Staff can focus on service, not taking orders',
                  'Orders go directly to the right station',
                  'Real-time order tracking and management',
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-600 dark:text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Order Flow Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              From Table to Kitchen in Seconds
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              See how orders flow seamlessly through your restaurant
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8">
            <svg viewBox="0 0 900 250" className="w-full h-auto">
              {/* Step 1: Scan */}
              <g transform="translate(0, 50)">
                <rect x="20" y="0" width="160" height="150" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="30" r="25" fill="#6262bd" opacity="0.1" />
                <text x="100" y="38" fontSize="24" textAnchor="middle">📱</text>
                <text x="100" y="75" fontSize="14" fill="#1e293b" textAnchor="middle" fontWeight="bold">1. Scan QR</text>
                <text x="100" y="95" fontSize="11" fill="#64748b" textAnchor="middle">Customer scans</text>
                <text x="100" y="110" fontSize="11" fill="#64748b" textAnchor="middle">the table QR code</text>
                <rect x="50" y="125" width="100" height="20" rx="4" fill="#6262bd" opacity="0.1" />
                <text x="100" y="139" fontSize="10" fill="#6262bd" textAnchor="middle" fontWeight="bold">Instant</text>
              </g>

              {/* Arrow 1 */}
              <path d="M190 125 L240 125" fill="none" stroke="#6262bd" strokeWidth="3" markerEnd="url(#arrowhead)">
                <animate attributeName="stroke-dasharray" values="0,50;50,0" dur="1s" repeatCount="indefinite" />
              </path>

              {/* Step 2: Browse */}
              <g transform="translate(230, 50)">
                <rect x="20" y="0" width="160" height="150" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="30" r="25" fill="#f59e0b" opacity="0.1" />
                <text x="100" y="38" fontSize="24" textAnchor="middle">📋</text>
                <text x="100" y="75" fontSize="14" fill="#1e293b" textAnchor="middle" fontWeight="bold">2. Browse Menu</text>
                <text x="100" y="95" fontSize="11" fill="#64748b" textAnchor="middle">View items, photos,</text>
                <text x="100" y="110" fontSize="11" fill="#64748b" textAnchor="middle">prices & descriptions</text>
                <rect x="50" y="125" width="100" height="20" rx="4" fill="#f59e0b" opacity="0.1" />
                <text x="100" y="139" fontSize="10" fill="#f59e0b" textAnchor="middle" fontWeight="bold">Self-paced</text>
              </g>

              {/* Arrow 2 */}
              <path d="M420 125 L470 125" fill="none" stroke="#6262bd" strokeWidth="3">
                <animate attributeName="stroke-dasharray" values="0,50;50,0" dur="1s" repeatCount="indefinite" />
              </path>

              {/* Step 3: Order */}
              <g transform="translate(460, 50)">
                <rect x="20" y="0" width="160" height="150" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="30" r="25" fill="#10b981" opacity="0.1" />
                <text x="100" y="38" fontSize="24" textAnchor="middle">✅</text>
                <text x="100" y="75" fontSize="14" fill="#1e293b" textAnchor="middle" fontWeight="bold">3. Place Order</text>
                <text x="100" y="95" fontSize="11" fill="#64748b" textAnchor="middle">Select items and</text>
                <text x="100" y="110" fontSize="11" fill="#64748b" textAnchor="middle">confirm the order</text>
                <rect x="50" y="125" width="100" height="20" rx="4" fill="#10b981" opacity="0.1" />
                <text x="100" y="139" fontSize="10" fill="#10b981" textAnchor="middle" fontWeight="bold">One tap</text>
              </g>

              {/* Arrow 3 */}
              <path d="M650 125 L700 125" fill="none" stroke="#6262bd" strokeWidth="3">
                <animate attributeName="stroke-dasharray" values="0,50;50,0" dur="1s" repeatCount="indefinite" />
              </path>

              {/* Step 4: Kitchen */}
              <g transform="translate(690, 50)">
                <rect x="20" y="0" width="160" height="150" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="30" r="25" fill="#ef4444" opacity="0.1" />
                <text x="100" y="38" fontSize="24" textAnchor="middle">🍳</text>
                <text x="100" y="75" fontSize="14" fill="#1e293b" textAnchor="middle" fontWeight="bold">4. Kitchen Gets It</text>
                <text x="100" y="95" fontSize="11" fill="#64748b" textAnchor="middle">Order appears on</text>
                <text x="100" y="110" fontSize="11" fill="#64748b" textAnchor="middle">kitchen display</text>
                <rect x="50" y="125" width="100" height="20" rx="4" fill="#ef4444" opacity="0.1" />
                <text x="100" y="139" fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">Instant</text>
              </g>

              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6262bd" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Powerful Features
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🔔', title: 'Real-time Notifications', description: 'Kitchen and bar get instant alerts when orders come in' },
              { icon: '📍', title: 'Station Routing', description: 'Food orders go to kitchen, drinks to bar automatically' },
              { icon: '📝', title: 'Special Requests', description: 'Customers can add notes for allergies or preferences' },
              { icon: '➕', title: 'Easy Re-ordering', description: 'Customers can add more items anytime during their visit' },
              { icon: '📊', title: 'Order Tracking', description: 'See order status from placed to served' },
              { icon: '💳', title: 'Bill Splitting', description: 'Customers can split bills or pay separately' },
            ].map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow border border-slate-100 dark:border-slate-700">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Speed Up Your Service?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start accepting table orders today and watch your efficiency soar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/dashboard"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore Staff Dashboard →
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
