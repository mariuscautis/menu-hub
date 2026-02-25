'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function AboutPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-6">
              About Us
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Making Hospitality Simple, One Venue at a Time
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              We believe running a venue should be about creating memorable experiences for your guests, not wrestling with technology or drowning in operational costs.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Our Story
              </h2>

              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  Veno App was born from a simple observation: venue owners spend countless hours on tasks that technology should handle effortlessly. We saw passionate restaurateurs, cafe owners, and hospitality professionals struggling with outdated systems, juggling multiple platforms, and watching their margins shrink under mounting operational costs.
                </p>
                <p>
                  We knew there had to be a better way. So we set out to build a platform that brings everything together — menus, orders, analytics, and customer engagement — all in one place, designed specifically for the unique challenges of the hospitality industry.
                </p>
                <p>
                  Today, Veno App helps venues of all sizes streamline their operations, reduce costs, and focus on what truly matters: delivering exceptional experiences to their guests.
                </p>
              </div>
            </div>

            {/* Story Illustration */}
            <div className="relative">
              <svg viewBox="0 0 500 400" className="w-full h-auto">
                <defs>
                  <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Building/venue */}
                <g transform="translate(100, 50)">
                  <rect x="0" y="100" width="300" height="200" rx="12" fill="white" filter="url(#shadow1)" />
                  <rect x="0" y="100" width="300" height="50" rx="12" fill="#6262bd" />
                  <rect x="0" y="138" width="300" height="12" fill="#6262bd" />
                  <text x="150" y="132" fontSize="18" fill="white" textAnchor="middle" fontWeight="bold">Your Venue</text>

                  {/* Windows */}
                  <rect x="30" y="170" width="60" height="50" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
                  <rect x="120" y="170" width="60" height="50" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
                  <rect x="210" y="170" width="60" height="50" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />

                  {/* Door */}
                  <rect x="115" y="240" width="70" height="60" rx="4" fill="#6262bd" />
                  <circle cx="170" cy="275" r="5" fill="white" />
                </g>

                {/* Floating icons showing features */}
                <g transform="translate(30, 80)">
                  <circle cx="30" cy="30" r="30" fill="#6262bd" opacity="0.1" />
                  <text x="30" y="38" fontSize="24" textAnchor="middle">📱</text>
                </g>

                <g transform="translate(400, 120)">
                  <circle cx="30" cy="30" r="30" fill="#6262bd" opacity="0.1" />
                  <text x="30" y="38" fontSize="24" textAnchor="middle">📊</text>
                </g>

                <g transform="translate(420, 280)">
                  <circle cx="30" cy="30" r="30" fill="#6262bd" opacity="0.1" />
                  <text x="30" y="38" fontSize="24" textAnchor="middle">💰</text>
                </g>

                <g transform="translate(10, 260)">
                  <circle cx="30" cy="30" r="30" fill="#6262bd" opacity="0.1" />
                  <text x="30" y="38" fontSize="24" textAnchor="middle">⭐</text>
                </g>

                {/* Connection lines */}
                <line x1="90" y1="110" x2="130" y2="150" stroke="#6262bd" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                <line x1="430" y1="150" x2="400" y2="180" stroke="#6262bd" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                <line x1="450" y1="280" x2="400" y2="260" stroke="#6262bd" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                <line x1="70" y1="290" x2="130" y2="270" stroke="#6262bd" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Our Mission
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              To empower venue owners with technology that simplifies operations, reduces costs, and helps them deliver exceptional customer experiences — so they can focus on their passion, not paperwork.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Simplify Operations',
                description: 'Replace complex, disconnected systems with one intuitive platform that handles everything from digital menus to analytics.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Cut Costs',
                description: 'Eliminate printing expenses, reduce staffing overhead, and increase efficiency — all while improving your bottom line.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Delight Customers',
                description: 'Provide seamless, modern experiences that today\'s customers expect — from instant QR menus to effortless table ordering.',
              },
            ].map((item, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700 text-center">
                <div className="w-14 h-14 rounded-xl bg-[#6262bd]/10 flex items-center justify-center text-[#6262bd] mx-auto mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              What We Stand For
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Our values guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Simplicity First',
                description: 'Technology should make life easier, not harder. We design every feature with simplicity at its core, ensuring anyone can use Veno App without a learning curve.',
              },
              {
                title: 'Customer Obsessed',
                description: 'Your success is our success. We listen to venue owners, understand their challenges, and build solutions that genuinely make a difference in their daily operations.',
              },
              {
                title: 'Continuous Innovation',
                description: 'The hospitality industry is always evolving, and so are we. We continuously improve our platform to stay ahead of trends and deliver cutting-edge solutions.',
              },
              {
                title: 'Transparent Partnership',
                description: 'No hidden fees, no surprise charges, no locked contracts. We believe in honest, straightforward relationships with our customers built on trust and mutual respect.',
              },
            ].map((value, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#6262bd] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{value.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Stats Illustration */}
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '50%', label: 'Average cost reduction' },
                  { value: '2x', label: 'Faster table turnover' },
                  { value: '24/7', label: 'Platform availability' },
                  { value: '100%', label: 'Customer satisfaction focus' },
                ].map((stat, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-3xl lg:text-4xl font-bold text-[#6262bd] mb-2">{stat.value}</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Why Venues Choose Veno App
              </h2>

              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  We understand that every venue is unique. Whether you're running a cozy cafe, a bustling restaurant, or a multi-location chain, Veno App adapts to your needs — not the other way around.
                </p>
                <p>
                  Our platform is built by people who truly understand the hospitality industry. We've worked alongside venue owners, listened to their frustrations, and designed solutions that address real problems.
                </p>
                <p>
                  With Veno App, you're not just getting software — you're gaining a partner committed to helping your business thrive.
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/contact"
                  className="bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center"
                >
                  Get in Touch
                </Link>
                <Link
                  href="/auth/register"
                  className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#6262bd] to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Venue?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Join thousands of venue owners who have simplified their operations and boosted their business with Veno App.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Contact Our Team
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
