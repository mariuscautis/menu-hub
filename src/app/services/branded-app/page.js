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
              <Link href="/home#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
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
                Give your customers a branded app experience with your own logo, colors, and name. They install it on their phone and it feels like your very own custom-built restaurant app — powered by Veno App behind the scenes.
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
              <svg viewBox="0 0 500 450" className="w-full h-auto">
                <defs>
                  <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                  <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6262bd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Central branded phone */}
                <g transform="translate(165, 30)">
                  <rect x="0" y="0" width="170" height="320" rx="24" fill="#1e293b" filter="url(#shadow1)" />
                  <rect x="8" y="12" width="154" height="296" rx="16" fill="#f8fafc" />

                  {/* Custom branding header */}
                  <rect x="16" y="24" width="138" height="50" rx="8" fill="url(#brandGradient)" />
                  <circle cx="45" cy="49" r="16" fill="white" opacity="0.2" />
                  <text x="45" y="54" fontSize="18" textAnchor="middle">🍽️</text>
                  <text x="100" y="45" fontSize="11" fill="white" fontWeight="bold">Your Restaurant</text>
                  <text x="100" y="58" fontSize="8" fill="white" opacity="0.8">Fine Dining</text>

                  {/* Menu categories */}
                  <g transform="translate(16, 85)">
                    <rect x="0" y="0" width="42" height="30" rx="6" fill="#6262bd" opacity="0.15" />
                    <text x="21" y="20" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">Starters</text>

                    <rect x="48" y="0" width="42" height="30" rx="6" fill="#e2e8f0" />
                    <text x="69" y="20" fontSize="8" fill="#64748b" textAnchor="middle">Mains</text>

                    <rect x="96" y="0" width="42" height="30" rx="6" fill="#e2e8f0" />
                    <text x="117" y="20" fontSize="8" fill="#64748b" textAnchor="middle">Desserts</text>
                  </g>

                  {/* Menu items */}
                  <g transform="translate(16, 125)">
                    <rect x="0" y="0" width="138" height="55" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <rect x="6" y="6" width="43" height="43" rx="6" fill="#fef3c7" />
                    <text x="28" y="34" fontSize="20" textAnchor="middle">🥗</text>
                    <text x="55" y="22" fontSize="10" fill="#1e293b" fontWeight="bold">Garden Salad</text>
                    <text x="55" y="34" fontSize="8" fill="#64748b">Fresh seasonal greens</text>
                    <text x="55" y="46" fontSize="10" fill="#6262bd" fontWeight="bold">$8.99</text>

                    <rect x="0" y="62" width="138" height="55" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <rect x="6" y="68" width="43" height="43" rx="6" fill="#fee2e2" />
                    <text x="28" y="96" fontSize="20" textAnchor="middle">🍝</text>
                    <text x="55" y="84" fontSize="10" fill="#1e293b" fontWeight="bold">Pasta Primavera</text>
                    <text x="55" y="96" fontSize="8" fill="#64748b">Handmade pasta</text>
                    <text x="55" y="108" fontSize="10" fill="#6262bd" fontWeight="bold">$16.99</text>
                  </g>

                  {/* Bottom nav with brand color */}
                  <g transform="translate(16, 268)">
                    <rect x="0" y="0" width="138" height="35" rx="8" fill="#f8fafc" />
                    <g fill="#6262bd">
                      <rect x="12" y="8" width="26" height="3" rx="1.5" />
                      <rect x="12" y="14" width="18" height="3" rx="1.5" opacity="0.5" />
                    </g>
                    <circle cx="69" cy="17" r="10" fill="#6262bd" />
                    <text x="69" y="21" fontSize="10" fill="white" textAnchor="middle">🛒</text>
                    <g fill="#94a3b8">
                      <rect x="100" y="8" width="26" height="3" rx="1.5" />
                      <rect x="108" y="14" width="18" height="3" rx="1.5" />
                    </g>
                  </g>

                  {/* Home indicator */}
                  <rect x="60" y="314" width="50" height="4" rx="2" fill="#cbd5e1" />
                </g>

                {/* Install prompt */}
                <g transform="translate(350, 60)">
                  <rect x="0" y="0" width="130" height="90" rx="12" fill="white" filter="url(#shadow1)" />
                  <text x="65" y="25" fontSize="11" fill="#1e293b" textAnchor="middle" fontWeight="bold">Add to Home Screen</text>
                  <rect x="15" y="38" width="100" height="20" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                  <circle cx="30" cy="48" r="6" fill="#6262bd" opacity="0.3" />
                  <text x="30" y="51" fontSize="8" textAnchor="middle">🍽️</text>
                  <text x="72" y="51" fontSize="8" fill="#64748b">Your Restaurant</text>
                  <rect x="30" y="65" width="70" height="18" rx="4" fill="#6262bd" />
                  <text x="65" y="77" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">Install</text>
                </g>

                {/* Arrow from install to phone */}
                <path d="M350 105 Q310 130 335 180" fill="none" stroke="#6262bd" strokeWidth="2" strokeDasharray="6,4">
                  <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
                </path>

                {/* Home screen icon */}
                <g transform="translate(30, 140)">
                  <rect x="0" y="0" width="100" height="100" rx="16" fill="white" filter="url(#shadow1)" />
                  <text x="50" y="30" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">HOME SCREEN</text>

                  {/* App icons grid */}
                  <rect x="12" y="42" width="22" height="22" rx="5" fill="#e2e8f0" />
                  <rect x="39" y="42" width="22" height="22" rx="5" fill="#e2e8f0" />

                  {/* Your branded app icon */}
                  <rect x="66" y="42" width="22" height="22" rx="5" fill="url(#brandGradient)" />
                  <text x="77" y="57" fontSize="12" textAnchor="middle">🍽️</text>

                  <text x="77" y="75" fontSize="6" fill="#1e293b" textAnchor="middle">Your App</text>

                  {/* Highlight ring around branded app */}
                  <rect x="63" y="39" width="28" height="28" rx="7" fill="none" stroke="#6262bd" strokeWidth="2" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                  </rect>

                  <rect x="12" y="72" width="22" height="22" rx="5" fill="#e2e8f0" />
                  <rect x="39" y="72" width="22" height="22" rx="5" fill="#e2e8f0" />
                </g>

                {/* Connection lines showing brand sync */}
                <path d="M130 190 Q145 200 165 200" fill="none" stroke="#6262bd" strokeWidth="1.5" opacity="0.4" strokeDasharray="3">
                  <animate attributeName="stroke-dashoffset" values="0;-6" dur="2s" repeatCount="indefinite" />
                </path>

                {/* Admin dashboard hint */}
                <g transform="translate(20, 300)">
                  <rect x="0" y="0" width="120" height="80" rx="10" fill="white" filter="url(#shadow1)" />
                  <rect x="0" y="0" width="120" height="25" rx="10" fill="#6262bd" />
                  <rect x="0" y="15" width="120" height="10" fill="#6262bd" />
                  <text x="60" y="17" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">ADMIN DASHBOARD</text>

                  {/* Branding settings */}
                  <text x="10" y="40" fontSize="7" fill="#64748b">Logo:</text>
                  <rect x="40" y="32" width="30" height="12" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                  <text x="55" y="41" fontSize="6" textAnchor="middle">🍽️</text>

                  <text x="10" y="55" fontSize="7" fill="#64748b">Color:</text>
                  <rect x="40" y="47" width="12" height="12" rx="3" fill="#6262bd" />
                  <rect x="55" y="47" width="12" height="12" rx="3" fill="#8b5cf6" />
                  <rect x="70" y="47" width="12" height="12" rx="3" fill="#ec4899" />

                  <text x="10" y="70" fontSize="7" fill="#64748b">Name:</text>
                  <rect x="40" y="62" width="70" height="12" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
                  <text x="75" y="71" fontSize="6" fill="#64748b" textAnchor="middle">Your Restaurant</text>
                </g>

                {/* Sync arrow from dashboard */}
                <path d="M140 340 Q170 330 165 310" fill="none" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4">
                  <animate attributeName="stroke-dashoffset" values="0;-8" dur="1.5s" repeatCount="indefinite" />
                </path>

                {/* "PWA" badge */}
                <g transform="translate(380, 200)">
                  <rect x="0" y="0" width="80" height="35" rx="8" fill="#10b981" opacity="0.1" />
                  <text x="40" y="15" fontSize="8" fill="#10b981" textAnchor="middle" fontWeight="bold">PWA TECHNOLOGY</text>
                  <text x="40" y="27" fontSize="7" fill="#10b981" textAnchor="middle">Works Offline</text>
                </g>

                {/* Multiple device sync indicator */}
                <g transform="translate(360, 280)">
                  <rect x="0" y="0" width="100" height="70" rx="10" fill="#f8fafc" stroke="#e2e8f0" />
                  <text x="50" y="18" fontSize="8" fill="#64748b" textAnchor="middle" fontWeight="bold">WORKS ON</text>

                  {/* Device icons */}
                  <g transform="translate(15, 28)">
                    <rect x="0" y="0" width="18" height="28" rx="3" fill="#1e293b" />
                    <rect x="2" y="3" width="14" height="20" rx="2" fill="#f8fafc" />
                    <text x="9" y="22" fontSize="4" textAnchor="middle">📱</text>
                  </g>
                  <g transform="translate(40, 25)">
                    <rect x="0" y="0" width="24" height="30" rx="3" fill="#1e293b" />
                    <rect x="2" y="3" width="20" height="22" rx="2" fill="#f8fafc" />
                    <text x="12" y="22" fontSize="5" textAnchor="middle">📱</text>
                  </g>
                  <g transform="translate(70, 28)">
                    <rect x="0" y="0" width="22" height="16" rx="2" fill="#1e293b" />
                    <rect x="2" y="2" width="18" height="10" rx="1" fill="#f8fafc" />
                    <rect x="8" y="16" width="6" height="3" fill="#94a3b8" />
                    <rect x="4" y="19" width="14" height="2" rx="1" fill="#64748b" />
                  </g>
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
                description: 'Your logo, your colors, your name. Customers see YOUR brand when they open the app, not ours.',
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
                  description: 'Add your logo, choose your brand colors, and enter your restaurant name in the admin dashboard.',
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
                  description: 'When customers open the app, they see YOUR logo, YOUR colors, YOUR restaurant. It feels like their own personal connection to your venue.',
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
              <svg viewBox="0 0 400 450" className="w-full h-auto">
                {/* Admin dashboard */}
                <rect x="20" y="20" width="360" height="180" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <rect x="20" y="20" width="360" height="40" rx="12" fill="#6262bd" />
                <rect x="20" y="48" width="360" height="12" fill="#6262bd" />
                <text x="200" y="46" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">Branding Settings</text>

                {/* Logo upload */}
                <g transform="translate(40, 75)">
                  <text x="0" y="0" fontSize="10" fill="#1e293b" fontWeight="bold">Restaurant Logo</text>
                  <rect x="0" y="10" width="80" height="80" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4" />
                  <circle cx="40" cy="50" r="25" fill="#6262bd" opacity="0.2" />
                  <text x="40" y="58" fontSize="24" textAnchor="middle">🍽️</text>
                  <text x="40" y="78" fontSize="8" fill="#64748b" textAnchor="middle">Upload</text>
                </g>

                {/* Color picker */}
                <g transform="translate(150, 75)">
                  <text x="0" y="0" fontSize="10" fill="#1e293b" fontWeight="bold">Brand Color</text>
                  <rect x="0" y="10" width="35" height="35" rx="8" fill="#6262bd" stroke="#1e293b" strokeWidth="2" />
                  <rect x="45" y="10" width="35" height="35" rx="8" fill="#8b5cf6" />
                  <rect x="90" y="10" width="35" height="35" rx="8" fill="#ec4899" />
                  <rect x="135" y="10" width="35" height="35" rx="8" fill="#f59e0b" />

                  <text x="0" y="65" fontSize="10" fill="#1e293b" fontWeight="bold">Restaurant Name</text>
                  <rect x="0" y="75" width="200" height="35" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                  <text x="100" y="98" fontSize="11" fill="#64748b" textAnchor="middle">Your Restaurant Name</text>
                </g>

                {/* Arrow down */}
                <path d="M200 210 L200 250" fill="none" stroke="#6262bd" strokeWidth="2" markerEnd="url(#arrowhead)">
                  <animate attributeName="stroke-dasharray" values="0,100;40,60" dur="1s" repeatCount="indefinite" />
                </path>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6262bd" />
                  </marker>
                </defs>

                {/* Resulting phone */}
                <g transform="translate(130, 260)">
                  <rect x="0" y="0" width="140" height="180" rx="16" fill="#1e293b" />
                  <rect x="6" y="10" width="128" height="160" rx="10" fill="#f8fafc" />

                  {/* Branded header */}
                  <rect x="12" y="18" width="116" height="40" rx="6" fill="#6262bd" />
                  <circle cx="35" cy="38" r="12" fill="white" opacity="0.2" />
                  <text x="35" y="42" fontSize="14" textAnchor="middle">🍽️</text>
                  <text x="82" y="34" fontSize="9" fill="white" fontWeight="bold">Your Restaurant</text>
                  <text x="82" y="46" fontSize="7" fill="white" opacity="0.8">Fine Dining</text>

                  {/* Menu preview */}
                  <rect x="12" y="65" width="116" height="30" rx="4" fill="#e2e8f0" />
                  <rect x="12" y="100" width="116" height="30" rx="4" fill="#e2e8f0" />
                  <rect x="12" y="135" width="116" height="25" rx="4" fill="#6262bd" />
                  <text x="70" y="152" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">View Menu</text>
                </g>

                {/* Device icons showing cross-platform */}
                <g transform="translate(300, 300)">
                  <text x="40" y="0" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">AVAILABLE ON</text>

                  {/* iOS */}
                  <g transform="translate(0, 20)">
                    <rect x="0" y="0" width="24" height="40" rx="4" fill="#1e293b" />
                    <rect x="2" y="4" width="20" height="30" rx="2" fill="#f8fafc" />
                    <circle cx="12" cy="37" r="2" fill="#64748b" />
                    <text x="12" y="55" fontSize="7" fill="#64748b" textAnchor="middle">iOS</text>
                  </g>

                  {/* Android */}
                  <g transform="translate(30, 20)">
                    <rect x="0" y="0" width="24" height="40" rx="4" fill="#1e293b" />
                    <rect x="2" y="4" width="20" height="30" rx="2" fill="#f8fafc" />
                    <rect x="8" y="36" width="8" height="2" rx="1" fill="#64748b" />
                    <text x="12" y="55" fontSize="7" fill="#64748b" textAnchor="middle">Android</text>
                  </g>

                  {/* Desktop */}
                  <g transform="translate(60, 25)">
                    <rect x="0" y="0" width="30" height="22" rx="2" fill="#1e293b" />
                    <rect x="2" y="2" width="26" height="16" rx="1" fill="#f8fafc" />
                    <rect x="12" y="22" width="6" height="4" fill="#64748b" />
                    <rect x="6" y="26" width="18" height="2" rx="1" fill="#94a3b8" />
                    <text x="15" y="50" fontSize="7" fill="#64748b" textAnchor="middle">Desktop</text>
                  </g>
                </g>
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
            No credit card required. 1 month free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
  )
}
