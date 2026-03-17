'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function BrandedAppPage() {
  return (
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl"></div>
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

              <div className="inline-block px-4 py-1.5 bg-indigo-500/10 rounded-full text-indigo-600 text-sm font-semibold mb-4">
                White-Label PWA
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Your Restaurant, Your App
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Give your customers a branded app experience with your own logo and name. They install it on their phone and it feels like your very own custom-built restaurant app — powered by Veno App behind the scenes.
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
            <div className="relative flex justify-center">
              <svg viewBox="0 0 380 480" className="w-full max-w-sm h-auto drop-shadow-xl">
                <defs>
                  <filter id="shadow1">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6262bd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <clipPath id="screenClip">
                    <rect x="58" y="22" width="224" height="428" rx="20" />
                  </clipPath>
                </defs>

                {/* Phone shell */}
                <rect x="46" y="8" width="248" height="456" rx="30" fill="#1e293b" filter="url(#shadow1)" />
                {/* Screen background */}
                <rect x="58" y="22" width="224" height="428" rx="20" fill="#f8fafc" />
                {/* Notch */}
                <rect x="138" y="22" width="64" height="16" rx="8" fill="#1e293b" />

                {/* All screen content clipped inside */}
                <g clipPath="url(#screenClip)">
                  {/* Header bar */}
                  <rect x="58" y="38" width="224" height="58" fill="url(#brandGradient)" />
                  <circle cx="92" cy="67" r="18" fill="white" opacity="0.2" />
                  <text x="92" y="74" fontSize="20" textAnchor="middle">🍽️</text>
                  <text x="180" y="60" fontSize="12" fill="white" fontWeight="bold" textAnchor="middle">Your Restaurant</text>
                  <text x="180" y="76" fontSize="9" fill="white" opacity="0.75" textAnchor="middle">Fine Dining</text>

                  {/* Category pills */}
                  <rect x="68" y="106" width="56" height="24" rx="8" fill="#6262bd" opacity="0.15" />
                  <text x="96" y="122" fontSize="9" fill="#6262bd" textAnchor="middle" fontWeight="bold">Starters</text>
                  <rect x="132" y="106" width="52" height="24" rx="8" fill="#e2e8f0" />
                  <text x="158" y="122" fontSize="9" fill="#64748b" textAnchor="middle">Mains</text>
                  <rect x="192" y="106" width="60" height="24" rx="8" fill="#e2e8f0" />
                  <text x="222" y="122" fontSize="9" fill="#64748b" textAnchor="middle">Desserts</text>

                  {/* Menu item 1 */}
                  <rect x="68" y="140" width="204" height="60" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="76" y="148" width="44" height="44" rx="8" fill="#fef3c7" />
                  <text x="98" y="176" fontSize="22" textAnchor="middle">🥗</text>
                  <text x="130" y="162" fontSize="10" fill="#1e293b" fontWeight="bold">Garden Salad</text>
                  <text x="130" y="176" fontSize="8" fill="#64748b">Fresh seasonal greens</text>
                  <text x="130" y="190" fontSize="10" fill="#6262bd" fontWeight="bold">£8.99</text>

                  {/* Menu item 2 */}
                  <rect x="68" y="210" width="204" height="60" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="76" y="218" width="44" height="44" rx="8" fill="#fee2e2" />
                  <text x="98" y="246" fontSize="22" textAnchor="middle">🍝</text>
                  <text x="130" y="232" fontSize="10" fill="#1e293b" fontWeight="bold">Pasta Primavera</text>
                  <text x="130" y="246" fontSize="8" fill="#64748b">Handmade pasta</text>
                  <text x="130" y="260" fontSize="10" fill="#6262bd" fontWeight="bold">£16.99</text>

                  {/* Menu item 3 */}
                  <rect x="68" y="280" width="204" height="60" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="76" y="288" width="44" height="44" rx="8" fill="#e0f2fe" />
                  <text x="98" y="316" fontSize="22" textAnchor="middle">🐟</text>
                  <text x="130" y="302" fontSize="10" fill="#1e293b" fontWeight="bold">Sea Bass</text>
                  <text x="130" y="316" fontSize="8" fill="#64748b">Grilled with lemon butter</text>
                  <text x="130" y="330" fontSize="10" fill="#6262bd" fontWeight="bold">£22.50</text>

                  {/* Bottom nav bar */}
                  <rect x="58" y="390" width="224" height="60" fill="white" />
                  <line x1="58" y1="390" x2="282" y2="390" stroke="#e2e8f0" strokeWidth="1" />
                  {/* Nav icons */}
                  <rect x="82" y="404" width="28" height="3" rx="1.5" fill="#6262bd" />
                  <rect x="82" y="410" width="20" height="3" rx="1.5" fill="#6262bd" opacity="0.4" />
                  <circle cx="170" cy="410" r="14" fill="#6262bd" />
                  <text x="170" y="415" fontSize="12" textAnchor="middle">🛒</text>
                  <rect x="218" y="404" width="28" height="3" rx="1.5" fill="#94a3b8" />
                  <rect x="226" y="410" width="20" height="3" rx="1.5" fill="#94a3b8" />
                  {/* Home indicator */}
                  <rect x="145" y="440" width="50" height="4" rx="2" fill="#cbd5e1" />
                </g>

                {/* Install badge — floating bottom-right, inside viewBox */}
                <rect x="238" y="380" width="126" height="72" rx="12" fill="white" filter="url(#shadow1)" />
                <text x="301" y="400" fontSize="9" fill="#1e293b" textAnchor="middle" fontWeight="bold">Add to Home Screen</text>
                <rect x="248" y="408" width="106" height="18" rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx="262" cy="417" r="6" fill="#6262bd" opacity="0.25" />
                <text x="262" y="421" fontSize="8" textAnchor="middle">🍽️</text>
                <text x="308" y="420" fontSize="8" fill="#64748b" textAnchor="middle">Your Restaurant</text>
                <rect x="264" y="432" width="74" height="14" rx="5" fill="#6262bd" />
                <text x="301" y="442" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Install</text>

                {/* PWA badge — floating top-right, inside viewBox */}
                <rect x="248" y="30" width="116" height="38" rx="10" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                <text x="306" y="47" fontSize="9" fill="#16a34a" textAnchor="middle" fontWeight="bold">PWA Technology</text>
                <text x="306" y="60" fontSize="8" fill="#16a34a" textAnchor="middle">Works Offline</text>
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
              The Power of Your Own App
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              All the benefits of a custom app without the development costs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                ),
                title: 'Your Branding, Everywhere',
                description: 'Your logo, your name. Customers see YOUR restaurant brand when they open the app, not ours.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Installable on Any Device',
                description: 'Customers can add your app to their home screen on iOS, Android, or desktop. It looks and feels native.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                ),
                title: 'Works Offline',
                description: 'Customers can browse your menu even without an internet connection. Orders sync when back online.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'No App Store Needed',
                description: 'Skip the app store approval process. Your app is instantly available via your website or QR code.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'Instant Updates',
                description: 'Change your branding, menu, or settings and customers see the changes immediately. No app update required.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Zero Development Cost',
                description: 'Custom apps cost tens of thousands to build. Get the same experience included in your Veno App subscription.',
              },
            ].map((benefit, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-6">
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
              How Your Branded App Works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Set up your branded app experience in minutes
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {
                  step: '1',
                  title: 'Upload Your Branding',
                  description: 'Add your logo and enter your restaurant name in the admin dashboard.',
                },
                {
                  step: '2',
                  title: 'Configure Your App',
                  description: 'Set up your menu, business hours, and customize the app experience to match your brand.',
                },
                {
                  step: '3',
                  title: 'Share With Customers',
                  description: 'Share your install page link or QR code. Customers can add your app to their home screen instantly.',
                },
                {
                  step: '4',
                  title: 'They See Your Brand',
                  description: 'When customers open the app, they see YOUR logo and YOUR restaurant name. It feels like their own personal connection to your venue.',
                },
              ].map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
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
              <svg viewBox="0 0 400 436" className="w-full h-auto">
                <defs>
                  <clipPath id="phoneClip2">
                    <rect x="136" y="246" width="128" height="160" rx="10" />
                  </clipPath>
                </defs>

                {/* Admin dashboard card */}
                <rect x="20" y="16" width="360" height="190" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                {/* Title bar */}
                <rect x="20" y="16" width="360" height="44" rx="12" fill="#6262bd" />
                <rect x="20" y="44" width="360" height="16" fill="#6262bd" />
                {/* Window dots */}
                <circle cx="42" cy="38" r="5" fill="white" opacity="0.4" />
                <circle cx="58" cy="38" r="5" fill="white" opacity="0.4" />
                <circle cx="74" cy="38" r="5" fill="white" opacity="0.4" />
                <text x="200" y="43" fontSize="11" fill="white" textAnchor="middle" fontWeight="bold">Branding Settings — Admin Dashboard</text>

                {/* Logo upload area */}
                <rect x="36" y="72" width="80" height="80" rx="8" fill="#f8fafc" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="76" cy="106" r="22" fill="#6262bd" opacity="0.12" />
                <text x="76" y="99" fontSize="9" fill="#6262bd" textAnchor="middle" fontWeight="bold">LOGO</text>
                <text x="76" y="112" fontSize="20" textAnchor="middle">🍽️</text>
                <text x="76" y="128" fontSize="8" fill="#94a3b8" textAnchor="middle">Click to upload</text>
                <text x="76" y="163" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Restaurant Logo</text>

                {/* Name field */}
                <text x="138" y="83" fontSize="9" fill="#64748b" fontWeight="bold">Restaurant Name</text>
                <rect x="138" y="90" width="220" height="28" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                <text x="150" y="109" fontSize="10" fill="#94a3b8">Your Restaurant Name</text>

                {/* Tagline field */}
                <text x="138" y="132" fontSize="9" fill="#64748b" fontWeight="bold">Tagline (optional)</text>
                <rect x="138" y="140" width="220" height="28" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                <text x="150" y="159" fontSize="10" fill="#94a3b8">Fine Dining Since 1990</text>

                {/* Save button */}
                <rect x="272" y="176" width="86" height="22" rx="6" fill="#6262bd" />
                <text x="315" y="191" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">Save Changes</text>

                {/* Arrow */}
                <line x1="200" y1="212" x2="200" y2="234" stroke="#6262bd" strokeWidth="2" />
                <polygon points="192,230 200,244 208,230" fill="#6262bd" />

                {/* Resulting phone shell */}
                <rect x="130" y="242" width="140" height="168" rx="16" fill="#1e293b" />

                {/* Phone screen — clipped */}
                <rect x="136" y="246" width="128" height="160" rx="10" fill="#f8fafc" />
                <g clipPath="url(#phoneClip2)">
                  {/* Branded header */}
                  <rect x="136" y="246" width="128" height="44" fill="#6262bd" />
                  <circle cx="158" cy="268" r="12" fill="white" opacity="0.2" />
                  <text x="158" y="273" fontSize="13" textAnchor="middle">🍽️</text>
                  <text x="210" y="264" fontSize="9" fill="white" fontWeight="bold" textAnchor="middle">Your Restaurant</text>
                  <text x="210" y="277" fontSize="7" fill="white" opacity="0.8" textAnchor="middle">Fine Dining</text>
                  {/* Menu rows */}
                  <rect x="142" y="296" width="116" height="22" rx="4" fill="#e2e8f0" />
                  <rect x="142" y="323" width="116" height="22" rx="4" fill="#e2e8f0" />
                  <rect x="142" y="350" width="116" height="22" rx="5" fill="#6262bd" />
                  <text x="200" y="365" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">View Menu</text>
                  {/* Home indicator */}
                  <rect x="172" y="393" width="56" height="4" rx="2" fill="#cbd5e1" />
                </g>

                {/* Platform labels below phone */}
                <text x="200" y="422" fontSize="9" fill="#94a3b8" textAnchor="middle">iOS · Android · Desktop · Works offline</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Compare Your Options
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              See why a branded PWA is the smart choice
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Custom Native App */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Custom Native App</h3>
                <p className="text-3xl font-bold text-slate-400 mt-2">$30,000+</p>
                <p className="text-sm text-slate-500">One-time development</p>
              </div>
              <ul className="space-y-3">
                {[
                  { text: 'Months of development', negative: true },
                  { text: 'App store approval delays', negative: true },
                  { text: 'Separate iOS & Android apps', negative: true },
                  { text: 'Expensive to update', negative: true },
                  { text: 'Requires app download', negative: true },
                  { text: 'Ongoing maintenance costs', negative: true },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${item.negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {item.negative ? '✕' : '✓'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Generic Web App */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🌐</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Generic Web App</h3>
                <p className="text-3xl font-bold text-slate-400 mt-2">Varies</p>
                <p className="text-sm text-slate-500">Standard website</p>
              </div>
              <ul className="space-y-3">
                {[
                  { text: 'No installation option', negative: true },
                  { text: 'Generic branding', negative: true },
                  { text: 'Requires internet always', negative: true },
                  { text: 'No home screen presence', negative: true },
                  { text: 'Quick to set up', negative: false },
                  { text: 'Works in browser', negative: false },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${item.negative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {item.negative ? '✕' : '✓'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Veno App Branded PWA */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                RECOMMENDED
              </div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold">Veno App Branded PWA</h3>
                <p className="text-3xl font-bold mt-2">Included</p>
                <p className="text-sm text-white/70">In your subscription</p>
              </div>
              <ul className="space-y-3">
                {[
                  { text: 'Ready in minutes', negative: false },
                  { text: 'Your branding everywhere', negative: false },
                  { text: 'Works offline', negative: false },
                  { text: 'Install on home screen', negative: false },
                  { text: 'Instant updates', negative: false },
                  { text: 'All devices supported', negative: false },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <span className="text-white/90 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Give Your Customers Your Own App
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start your free trial and set up your branded restaurant app today. No coding required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/services/qr-menu"
              className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Explore QR Menus →
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">
            No credit card required. 2 weeks free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
  )
}
