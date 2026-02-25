'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function QRMenuPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
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

              <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-4">
                Digital Menu
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                QR Code Menus That Customers Love
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Replace paper menus with beautiful, always-up-to-date digital menus. Customers simply scan a QR code and browse your entire menu on their smartphone.
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
                  <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Phone */}
                <g transform="translate(150, 20)">
                  <rect x="0" y="0" width="200" height="360" rx="24" fill="#1e293b" filter="url(#shadow1)" />
                  <rect x="8" y="12" width="184" height="336" rx="16" fill="#f8fafc" />

                  {/* Header */}
                  <rect x="16" y="24" width="168" height="40" rx="8" fill="#6262bd" />
                  <text x="100" y="50" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">Your Restaurant</text>

                  {/* Menu items */}
                  <g transform="translate(16, 80)">
                    {/* Item 1 */}
                    <rect x="0" y="0" width="168" height="70" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <rect x="8" y="8" width="54" height="54" rx="6" fill="#fef3c7" />
                    <text x="35" y="42" fontSize="24" textAnchor="middle">🍔</text>
                    <text x="70" y="28" fontSize="12" fill="#1e293b" fontWeight="bold">Classic Burger</text>
                    <text x="70" y="44" fontSize="10" fill="#64748b">Beef patty, lettuce, tomato</text>
                    <text x="70" y="58" fontSize="12" fill="#6262bd" fontWeight="bold">$12.99</text>

                    {/* Item 2 */}
                    <rect x="0" y="78" width="168" height="70" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <rect x="8" y="86" width="54" height="54" rx="6" fill="#dcfce7" />
                    <text x="35" y="120" fontSize="24" textAnchor="middle">🥗</text>
                    <text x="70" y="106" fontSize="12" fill="#1e293b" fontWeight="bold">Fresh Salad</text>
                    <text x="70" y="122" fontSize="10" fill="#64748b">Mixed greens, vinaigrette</text>
                    <text x="70" y="136" fontSize="12" fill="#6262bd" fontWeight="bold">$9.99</text>

                    {/* Item 3 */}
                    <rect x="0" y="156" width="168" height="70" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <rect x="8" y="164" width="54" height="54" rx="6" fill="#fee2e2" />
                    <text x="35" y="198" fontSize="24" textAnchor="middle">🍕</text>
                    <text x="70" y="184" fontSize="12" fill="#1e293b" fontWeight="bold">Margherita Pizza</text>
                    <text x="70" y="200" fontSize="10" fill="#64748b">Fresh mozzarella, basil</text>
                    <text x="70" y="214" fontSize="12" fill="#6262bd" fontWeight="bold">$14.99</text>
                  </g>

                  {/* Bottom nav */}
                  <rect x="16" y="316" width="168" height="24" rx="12" fill="#f1f5f9" />
                </g>

                {/* QR Code floating */}
                <g transform="translate(30, 120)">
                  <rect x="0" y="0" width="100" height="100" rx="12" fill="white" filter="url(#shadow1)" />
                  <rect x="10" y="10" width="80" height="80" rx="8" fill="#6262bd" opacity="0.1" />
                  <g fill="#6262bd">
                    <rect x="18" y="18" width="18" height="18" rx="3" />
                    <rect x="42" y="18" width="18" height="18" rx="3" />
                    <rect x="66" y="18" width="18" height="18" rx="3" />
                    <rect x="18" y="42" width="18" height="18" rx="3" />
                    <rect x="42" y="42" width="18" height="18" rx="3" />
                    <rect x="66" y="42" width="18" height="18" rx="3" />
                    <rect x="18" y="66" width="18" height="18" rx="3" />
                    <rect x="42" y="66" width="18" height="18" rx="3" />
                    <rect x="66" y="66" width="18" height="18" rx="3" />
                  </g>
                  <text x="50" y="115" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="medium">Scan Me</text>
                </g>

                {/* Scan effect */}
                <g transform="translate(80, 170)">
                  <line x1="0" y1="0" x2="70" y2="50" stroke="#6262bd" strokeWidth="2" strokeDasharray="5,5">
                    <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
                  </line>
                </g>

                {/* Update badge */}
                <g transform="translate(370, 80)">
                  <rect x="0" y="0" width="100" height="60" rx="10" fill="white" filter="url(#shadow1)" />
                  <circle cx="25" cy="30" r="15" fill="#10b981" opacity="0.2" />
                  <text x="25" y="35" fontSize="14" textAnchor="middle">✓</text>
                  <text x="65" y="26" fontSize="9" fill="#1e293b" fontWeight="bold" textAnchor="middle">Updated</text>
                  <text x="65" y="40" fontSize="8" fill="#64748b" textAnchor="middle">Just now</text>
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
              Why Digital Menus Are the Future
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Join thousands of restaurants that have switched to contactless menus
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'No App Download Required',
                description: 'Customers scan the QR code and instantly see your menu in their browser. No app stores, no downloads, no friction.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'Update Instantly',
                description: 'Change prices, add specials, or mark items as sold out. Updates appear immediately for all customers.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                ),
                title: 'Multiple Languages',
                description: 'Serve international guests with menus in their preferred language. Switch languages with one tap.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Beautiful Photos',
                description: 'Show off your dishes with high-quality images. Customers can see exactly what they are ordering.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Allergen Information',
                description: 'Display allergens and dietary information clearly. Help customers make safe, informed choices.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Save on Printing',
                description: 'No more reprinting menus every time prices change. Save money and help the environment.',
              },
            ].map((benefit, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="w-14 h-14 rounded-xl bg-[#6262bd]/10 flex items-center justify-center text-[#6262bd] mb-6">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Getting your digital menu up and running is simple
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {
                  step: '1',
                  title: 'Add Your Menu Items',
                  description: 'Upload your menu items with photos, descriptions, prices, and dietary information through our easy dashboard.',
                },
                {
                  step: '2',
                  title: 'Customize Your Design',
                  description: 'Choose colors, fonts, and layouts that match your brand. Make your digital menu uniquely yours.',
                },
                {
                  step: '3',
                  title: 'Generate QR Codes',
                  description: 'We create unique QR codes for each table. Print them on table tents, stickers, or any surface.',
                },
                {
                  step: '4',
                  title: 'Customers Scan & Browse',
                  description: 'Guests scan the code and instantly access your full menu. No waiting for a server to bring menus.',
                },
              ].map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#6262bd] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Process Illustration */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8">
              <svg viewBox="0 0 400 400" className="w-full h-auto">
                {/* Dashboard mockup */}
                <rect x="20" y="20" width="360" height="250" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <rect x="20" y="20" width="360" height="40" rx="12" fill="#6262bd" />
                <rect x="20" y="48" width="360" height="12" fill="#6262bd" />
                <text x="200" y="46" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">Menu Dashboard</text>

                {/* Menu list */}
                <rect x="35" y="75" width="150" height="35" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
                <rect x="45" y="83" width="20" height="20" rx="4" fill="#fef3c7" />
                <rect x="75" y="85" width="80" height="8" rx="2" fill="#cbd5e1" />
                <rect x="75" y="97" width="50" height="6" rx="2" fill="#e2e8f0" />

                <rect x="35" y="118" width="150" height="35" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
                <rect x="45" y="126" width="20" height="20" rx="4" fill="#dcfce7" />
                <rect x="75" y="128" width="70" height="8" rx="2" fill="#cbd5e1" />
                <rect x="75" y="140" width="60" height="6" rx="2" fill="#e2e8f0" />

                <rect x="35" y="161" width="150" height="35" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
                <rect x="45" y="169" width="20" height="20" rx="4" fill="#fee2e2" />
                <rect x="75" y="171" width="90" height="8" rx="2" fill="#cbd5e1" />
                <rect x="75" y="183" width="55" height="6" rx="2" fill="#e2e8f0" />

                {/* Add button */}
                <rect x="35" y="210" width="150" height="40" rx="8" fill="#6262bd" />
                <text x="110" y="235" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">+ Add Item</text>

                {/* QR Preview */}
                <rect x="215" y="75" width="150" height="175" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
                <text x="290" y="95" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">QR CODE PREVIEW</text>
                <rect x="235" y="110" width="110" height="110" rx="8" fill="#6262bd" opacity="0.1" />
                <g fill="#6262bd" transform="translate(250, 125)">
                  <rect x="0" y="0" width="20" height="20" rx="3" />
                  <rect x="30" y="0" width="20" height="20" rx="3" />
                  <rect x="60" y="0" width="20" height="20" rx="3" />
                  <rect x="0" y="30" width="20" height="20" rx="3" />
                  <rect x="30" y="30" width="20" height="20" rx="3" />
                  <rect x="60" y="30" width="20" height="20" rx="3" />
                  <rect x="0" y="60" width="20" height="20" rx="3" />
                  <rect x="30" y="60" width="20" height="20" rx="3" />
                  <rect x="60" y="60" width="20" height="20" rx="3" />
                </g>
                <rect x="235" y="230" width="110" height="12" rx="4" fill="#6262bd" />
                <text x="290" y="240" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Download QR</text>

                {/* Arrow to phone */}
                <path d="M290 280 L290 320 L230 350" fill="none" stroke="#6262bd" strokeWidth="2" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
                </path>

                {/* Small phone */}
                <g transform="translate(170, 310)">
                  <rect x="0" y="0" width="50" height="80" rx="8" fill="#1e293b" />
                  <rect x="4" y="8" width="42" height="64" rx="4" fill="#f8fafc" />
                  <rect x="8" y="14" width="34" height="10" rx="2" fill="#6262bd" />
                  <rect x="8" y="28" width="34" height="16" rx="2" fill="#e2e8f0" />
                  <rect x="8" y="48" width="34" height="16" rx="2" fill="#e2e8f0" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#6262bd] to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Go Digital?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start your free trial today and see how easy it is to create beautiful digital menus.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/table-ordering"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore Table Ordering →
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
