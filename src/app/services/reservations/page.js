'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function ReservationsPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-300/20 rounded-full blur-3xl"></div>
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

              <div className="inline-block px-4 py-1.5 bg-pink-500/10 rounded-full text-pink-600 text-sm font-semibold mb-4">
                Reservations
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Never Miss a Booking Again
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Accept reservations online 24/7. Automatic confirmations, easy management, and a beautiful calendar view for your staff. Fill more tables with less hassle.
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

            {/* Hero Illustration - Calendar */}
            <div className="relative">
              <svg viewBox="0 0 500 420" className="w-full h-auto">
                <defs>
                  <filter id="shadow5" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Calendar card */}
                <rect x="30" y="20" width="440" height="380" rx="16" fill="white" filter="url(#shadow5)" />

                {/* Calendar header */}
                <rect x="30" y="20" width="440" height="70" rx="16" fill="#6262bd" />
                <rect x="30" y="70" width="440" height="20" fill="#6262bd" />

                <text x="250" y="60" fontSize="20" fill="white" textAnchor="middle" fontWeight="bold">March 2024</text>
                <circle cx="80" cy="55" r="18" fill="white" opacity="0.2" />
                <text x="80" y="60" fontSize="14" fill="white" textAnchor="middle">◀</text>
                <circle cx="420" cy="55" r="18" fill="white" opacity="0.2" />
                <text x="420" y="60" fontSize="14" fill="white" textAnchor="middle">▶</text>

                {/* Day headers */}
                <g transform="translate(50, 110)">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <text key={day} x={i * 60} y="0" fontSize="12" fill="#94a3b8" textAnchor="middle" fontWeight="bold">{day}</text>
                  ))}
                </g>

                {/* Calendar grid */}
                <g transform="translate(50, 135)">
                  {/* Row 1 */}
                  <text x="0" y="0" fontSize="14" fill="#cbd5e1" textAnchor="middle">25</text>
                  <text x="60" y="0" fontSize="14" fill="#cbd5e1" textAnchor="middle">26</text>
                  <text x="120" y="0" fontSize="14" fill="#cbd5e1" textAnchor="middle">27</text>
                  <text x="180" y="0" fontSize="14" fill="#cbd5e1" textAnchor="middle">28</text>
                  <text x="240" y="0" fontSize="14" fill="#cbd5e1" textAnchor="middle">29</text>
                  <text x="300" y="0" fontSize="14" fill="#1e293b" textAnchor="middle">1</text>
                  <text x="360" y="0" fontSize="14" fill="#1e293b" textAnchor="middle">2</text>

                  {/* Row 2 */}
                  <text x="0" y="40" fontSize="14" fill="#1e293b" textAnchor="middle">3</text>
                  <text x="60" y="40" fontSize="14" fill="#1e293b" textAnchor="middle">4</text>
                  <text x="120" y="40" fontSize="14" fill="#1e293b" textAnchor="middle">5</text>

                  {/* Today */}
                  <circle cx="180" cy="36" r="18" fill="#6262bd" />
                  <text x="180" y="42" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">6</text>

                  <text x="240" y="40" fontSize="14" fill="#1e293b" textAnchor="middle">7</text>

                  {/* Booked day */}
                  <circle cx="300" cy="36" r="18" fill="#10b981" opacity="0.2" />
                  <text x="300" y="42" fontSize="14" fill="#10b981" textAnchor="middle" fontWeight="bold">8</text>
                  <circle cx="318" cy="24" r="6" fill="#10b981" />
                  <text x="318" y="27" fontSize="8" fill="white" textAnchor="middle">3</text>

                  <circle cx="360" cy="36" r="18" fill="#f59e0b" opacity="0.2" />
                  <text x="360" y="42" fontSize="14" fill="#f59e0b" textAnchor="middle" fontWeight="bold">9</text>
                  <circle cx="378" cy="24" r="6" fill="#f59e0b" />
                  <text x="378" y="27" fontSize="8" fill="white" textAnchor="middle">5</text>

                  {/* Row 3 */}
                  <text x="0" y="80" fontSize="14" fill="#1e293b" textAnchor="middle">10</text>
                  <text x="60" y="80" fontSize="14" fill="#1e293b" textAnchor="middle">11</text>

                  <circle cx="120" cy="76" r="18" fill="#6262bd" opacity="0.2" />
                  <text x="120" y="82" fontSize="14" fill="#6262bd" textAnchor="middle">12</text>
                  <circle cx="138" cy="64" r="6" fill="#6262bd" />
                  <text x="138" y="67" fontSize="8" fill="white" textAnchor="middle">2</text>

                  <text x="180" y="80" fontSize="14" fill="#1e293b" textAnchor="middle">13</text>

                  <circle cx="240" cy="76" r="18" fill="#10b981" opacity="0.2" />
                  <text x="240" y="82" fontSize="14" fill="#10b981" textAnchor="middle">14</text>
                  <circle cx="258" cy="64" r="6" fill="#10b981" />
                  <text x="258" y="67" fontSize="8" fill="white" textAnchor="middle">4</text>

                  <circle cx="300" cy="76" r="18" fill="#ef4444" opacity="0.2" />
                  <text x="300" y="82" fontSize="14" fill="#ef4444" textAnchor="middle" fontWeight="bold">15</text>
                  <circle cx="318" cy="64" r="6" fill="#ef4444" />
                  <text x="318" y="67" fontSize="8" fill="white" textAnchor="middle">8</text>

                  <circle cx="360" cy="76" r="18" fill="#ef4444" opacity="0.2" />
                  <text x="360" y="82" fontSize="14" fill="#ef4444" textAnchor="middle" fontWeight="bold">16</text>
                  <circle cx="378" cy="64" r="6" fill="#ef4444" />
                  <text x="378" y="67" fontSize="8" fill="white" textAnchor="middle">7</text>
                </g>

                {/* Upcoming reservations */}
                <g transform="translate(50, 265)">
                  <text x="0" y="0" fontSize="12" fill="#64748b" fontWeight="bold">Today's Reservations</text>

                  <rect x="0" y="15" width="400" height="50" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" />
                  <circle cx="30" cy="40" r="15" fill="#22c55e" opacity="0.2" />
                  <text x="30" y="45" fontSize="14" textAnchor="middle">👤</text>
                  <text x="55" y="35" fontSize="12" fill="#1e293b" fontWeight="bold">Johnson Family</text>
                  <text x="55" y="52" fontSize="10" fill="#64748b">7:00 PM • 4 guests • Table 5</text>
                  <rect x="320" y="28" width="70" height="24" rx="4" fill="#22c55e" />
                  <text x="355" y="44" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">Confirmed</text>

                  <rect x="0" y="75" width="400" height="50" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                  <circle cx="30" cy="100" r="15" fill="#f59e0b" opacity="0.2" />
                  <text x="30" y="105" fontSize="14" textAnchor="middle">👤</text>
                  <text x="55" y="95" fontSize="12" fill="#1e293b" fontWeight="bold">Sarah Mitchell</text>
                  <text x="55" y="112" fontSize="10" fill="#64748b">8:30 PM • 2 guests • Table 3</text>
                  <rect x="320" y="88" width="70" height="24" rx="4" fill="#f59e0b" />
                  <text x="355" y="104" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">Pending</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Everything You Need for Reservations
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              From online booking to table management, we have got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🌐',
                title: 'Online Booking Page',
                description: 'A beautiful booking page where customers can reserve 24/7 without calling.',
              },
              {
                icon: '📧',
                title: 'Email Confirmations',
                description: 'Automatic confirmation emails sent to customers when they book.',
              },
              {
                icon: '🚫',
                title: 'No-Show Management',
                description: 'Track no-shows, manage cancellations, and keep your tables turning efficiently.',
              },
              {
                icon: '📅',
                title: 'Calendar View',
                description: 'See all your reservations in an easy-to-read calendar layout.',
              },
              {
                icon: '🪑',
                title: 'Table Assignment',
                description: 'Assign tables to reservations and see floor availability at a glance.',
              },
              {
                icon: '⚙️',
                title: 'Custom Settings',
                description: 'Set booking windows, party size limits, and special closure dates.',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Flow */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Simple Booking Experience
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Customers book in seconds, you manage with ease
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Customer view */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <span className="w-10 h-10 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-600 mr-3">👤</span>
                What Customers See
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
                <svg viewBox="0 0 300 400" className="w-full h-auto">
                  {/* Phone frame */}
                  <rect x="50" y="10" width="200" height="380" rx="24" fill="#1e293b" />
                  <rect x="58" y="22" width="184" height="356" rx="18" fill="#f8fafc" />

                  {/* Header */}
                  <rect x="66" y="34" width="168" height="40" rx="8" fill="#6262bd" />
                  <text x="150" y="60" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">Book a Table</text>

                  {/* Form */}
                  <g transform="translate(74, 90)">
                    <text x="0" y="0" fontSize="10" fill="#64748b">Date</text>
                    <rect x="0" y="8" width="152" height="35" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="30" fontSize="11" fill="#1e293b">📅 March 15, 2024</text>

                    <text x="0" y="60" fontSize="10" fill="#64748b">Time</text>
                    <rect x="0" y="68" width="152" height="35" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="90" fontSize="11" fill="#1e293b">🕐 7:30 PM</text>

                    <text x="0" y="120" fontSize="10" fill="#64748b">Guests</text>
                    <rect x="0" y="128" width="152" height="35" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="150" fontSize="11" fill="#1e293b">👥 4 people</text>

                    <text x="0" y="180" fontSize="10" fill="#64748b">Name</text>
                    <rect x="0" y="188" width="152" height="35" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="210" fontSize="11" fill="#1e293b">John Smith</text>

                    <text x="0" y="240" fontSize="10" fill="#64748b">Phone</text>
                    <rect x="0" y="248" width="152" height="35" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="270" fontSize="11" fill="#1e293b">+44 7700 900000</text>
                  </g>

                  {/* Book button */}
                  <rect x="74" y="340" width="152" height="40" rx="8" fill="#6262bd" />
                  <text x="150" y="366" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">Book Now</text>
                </svg>
              </div>
            </div>

            {/* Staff view */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <span className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mr-3">💼</span>
                What Your Staff Sees
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700">
                <svg viewBox="0 0 400 300" className="w-full h-auto">
                  {/* Dashboard */}
                  <rect x="10" y="10" width="380" height="280" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Header */}
                  <rect x="20" y="20" width="360" height="40" rx="8" fill="#6262bd" />
                  <text x="40" y="46" fontSize="14" fill="white" fontWeight="bold">New Reservation!</text>
                  <circle cx="350" cy="40" r="12" fill="#ef4444">
                    <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                  </circle>

                  {/* Reservation details */}
                  <g transform="translate(30, 80)">
                    <rect x="0" y="0" width="340" height="180" rx="8" fill="white" stroke="#10b981" strokeWidth="2" />

                    <g transform="translate(20, 20)">
                      <circle cx="25" cy="25" r="25" fill="#6262bd" opacity="0.1" />
                      <text x="25" y="32" fontSize="24" textAnchor="middle">👤</text>

                      <text x="65" y="18" fontSize="14" fill="#1e293b" fontWeight="bold">John Smith</text>
                      <text x="65" y="36" fontSize="11" fill="#64748b">+44 7700 900000</text>
                    </g>

                    <line x1="20" y1="75" x2="320" y2="75" stroke="#e2e8f0" />

                    <g transform="translate(20, 90)">
                      <text x="0" y="0" fontSize="11" fill="#64748b">📅 Date</text>
                      <text x="80" y="0" fontSize="11" fill="#1e293b" fontWeight="bold">March 15, 2024</text>

                      <text x="0" y="25" fontSize="11" fill="#64748b">🕐 Time</text>
                      <text x="80" y="25" fontSize="11" fill="#1e293b" fontWeight="bold">7:30 PM</text>

                      <text x="0" y="50" fontSize="11" fill="#64748b">👥 Guests</text>
                      <text x="80" y="50" fontSize="11" fill="#1e293b" fontWeight="bold">4 people</text>
                    </g>

                    {/* Action buttons */}
                    <rect x="20" y="145" width="145" height="25" rx="4" fill="#10b981" />
                    <text x="92" y="162" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">✓ Confirm</text>

                    <rect x="175" y="145" width="145" height="25" rx="4" fill="#f1f5f9" stroke="#e2e8f0" />
                    <text x="247" y="162" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">Assign Table</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-pink-500 to-rose-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Fill More Tables?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start accepting online reservations and reduce no-shows today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-pink-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/inventory"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore Inventory →
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
