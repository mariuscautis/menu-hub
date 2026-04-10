'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function QRMenuPage() {
  const seo = useSeoSettings('services_qr_menu', {
    title: 'QR Code Menus That Customers Love — Veno App',
    description: 'Create stunning digital QR menus your customers can access instantly on any smartphone. No app download needed. Always up to date.',
  })
  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
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
              <Link href="/#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
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
            <div className="relative flex justify-center">
              <svg viewBox="0 0 420 480" className="w-full max-w-sm h-auto drop-shadow-xl">
                <defs>
                  <filter id="qr-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.15" />
                  </filter>
                  <linearGradient id="qr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6262bd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <clipPath id="qr-screen">
                    <rect x="69" y="22" width="222" height="418" rx="18" />
                  </clipPath>
                </defs>

                {/* Phone shell */}
                <rect x="56" y="8" width="248" height="456" rx="30" fill="#1e293b" filter="url(#qr-shadow)" />
                <rect x="69" y="22" width="222" height="418" rx="18" fill="#f8fafc" />
                {/* Notch */}
                <rect x="148" y="22" width="64" height="16" rx="8" fill="#1e293b" />

                {/* All screen content clipped */}
                <g clipPath="url(#qr-screen)">
                  {/* Header */}
                  <rect x="69" y="38" width="222" height="52" fill="url(#qr-grad)" />
                  <text x="180" y="58" fontSize="13" fill="white" fontWeight="bold" textAnchor="middle">Your Restaurant</text>
                  <text x="180" y="74" fontSize="9" fill="white" opacity="0.75" textAnchor="middle">Digital Menu</text>

                  {/* Category pills */}
                  <rect x="79" y="100" width="54" height="22" rx="7" fill="#6262bd" />
                  <text x="106" y="115" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Starters</text>
                  <rect x="141" y="100" width="50" height="22" rx="7" fill="#e2e8f0" />
                  <text x="166" y="115" fontSize="8" fill="#64748b" textAnchor="middle">Mains</text>
                  <rect x="199" y="100" width="54" height="22" rx="7" fill="#e2e8f0" />
                  <text x="226" y="115" fontSize="8" fill="#64748b" textAnchor="middle">Desserts</text>

                  {/* Menu item 1 */}
                  <rect x="79" y="132" width="202" height="64" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="87" y="140" width="46" height="46" rx="8" fill="#fef3c7" />
                  <text x="110" y="170" fontSize="24" textAnchor="middle">🍔</text>
                  <text x="145" y="154" fontSize="10" fill="#1e293b" fontWeight="bold">Classic Burger</text>
                  <text x="145" y="168" fontSize="8" fill="#64748b">Beef patty, lettuce, tomato</text>
                  <text x="145" y="184" fontSize="10" fill="#6262bd" fontWeight="bold">£12.99</text>
                  <rect x="248" y="166" width="26" height="22" rx="6" fill="#6262bd" />
                  <text x="261" y="181" fontSize="14" fill="white" textAnchor="middle">+</text>

                  {/* Menu item 2 */}
                  <rect x="79" y="204" width="202" height="64" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="87" y="212" width="46" height="46" rx="8" fill="#dcfce7" />
                  <text x="110" y="242" fontSize="24" textAnchor="middle">🥗</text>
                  <text x="145" y="226" fontSize="10" fill="#1e293b" fontWeight="bold">Garden Salad</text>
                  <text x="145" y="240" fontSize="8" fill="#64748b">Mixed greens, vinaigrette</text>
                  <text x="145" y="256" fontSize="10" fill="#6262bd" fontWeight="bold">£9.99</text>
                  <rect x="248" y="238" width="26" height="22" rx="6" fill="#e2e8f0" />
                  <text x="261" y="253" fontSize="14" fill="#94a3b8" textAnchor="middle">+</text>

                  {/* Menu item 3 */}
                  <rect x="79" y="276" width="202" height="64" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="87" y="284" width="46" height="46" rx="8" fill="#fee2e2" />
                  <text x="110" y="314" fontSize="24" textAnchor="middle">🍕</text>
                  <text x="145" y="298" fontSize="10" fill="#1e293b" fontWeight="bold">Margherita Pizza</text>
                  <text x="145" y="312" fontSize="8" fill="#64748b">Fresh mozzarella, basil</text>
                  <text x="145" y="328" fontSize="10" fill="#6262bd" fontWeight="bold">£14.99</text>
                  <rect x="248" y="310" width="26" height="22" rx="6" fill="#6262bd" />
                  <text x="261" y="325" fontSize="14" fill="white" textAnchor="middle">+</text>

                  {/* Bottom nav */}
                  <rect x="69" y="392" width="222" height="48" fill="white" />
                  <line x1="69" y1="392" x2="291" y2="392" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="155" y="402" width="50" height="28" rx="8" fill="#6262bd" />
                  <text x="180" y="420" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">View Cart</text>
                  {/* Home indicator */}
                  <rect x="155" y="430" width="50" height="4" rx="2" fill="#cbd5e1" />
                </g>

                {/* QR code badge — left side, inside viewBox */}
                <rect x="10" y="130" width="96" height="110" rx="14" fill="white" filter="url(#qr-shadow)" />
                <rect x="20" y="140" width="76" height="76" rx="8" fill="#ede9fe" />
                {/* QR corners */}
                <rect x="26" y="146" width="16" height="16" rx="2" fill="#6262bd" />
                <rect x="30" y="150" width="8" height="8" rx="1" fill="white" />
                <rect x="80" y="146" width="16" height="16" rx="2" fill="#6262bd" />
                <rect x="84" y="150" width="8" height="8" rx="1" fill="white" />
                <rect x="26" y="200" width="16" height="16" rx="2" fill="#6262bd" />
                <rect x="30" y="204" width="8" height="8" rx="1" fill="white" />
                {/* QR dots */}
                <rect x="48" y="146" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="58" y="146" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="68" y="146" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="48" y="156" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="68" y="156" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="48" y="166" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="58" y="166" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="26" y="176" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="38" y="176" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="58" y="176" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="68" y="176" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="26" y="186" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="48" y="186" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="68" y="186" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="38" y="196" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="58" y="196" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="48" y="206" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="68" y="206" width="6" height="6" rx="1" fill="#6262bd" />
                <text x="58" y="234" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">Scan Me</text>
                {/* Arrow from QR to phone */}
                <path d="M106 185 L118 185" fill="none" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
                <polygon points="118,181 124,185 118,189" fill="#6262bd" opacity="0.6" />

                {/* "Updated instantly" badge — right, inside viewBox */}
                <rect x="306" y="100" width="104" height="52" rx="12" fill="white" filter="url(#qr-shadow)" />
                <circle cx="325" cy="126" r="12" fill="#dcfce7" />
                <text x="325" y="131" fontSize="11" textAnchor="middle">✓</text>
                <text x="368" y="118" fontSize="8" fill="#1e293b" fontWeight="bold" textAnchor="middle">Menu updated</text>
                <text x="368" y="131" fontSize="7" fill="#64748b" textAnchor="middle">Changes live</text>
                <text x="368" y="144" fontSize="7" fill="#10b981" textAnchor="middle" fontWeight="bold">instantly</text>

                {/* "No app needed" badge — bottom right, inside viewBox */}
                <rect x="306" y="330" width="104" height="44" rx="12" fill="#6262bd" filter="url(#qr-shadow)" />
                <text x="358" y="348" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">No app download</text>
                <text x="358" y="362" fontSize="7" fill="white" opacity="0.8" textAnchor="middle">Works in any browser</text>
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
              <svg viewBox="0 0 400 420" className="w-full h-auto">
                <defs>
                  <filter id="proc-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
                  </filter>
                  <clipPath id="proc-phone">
                    <rect x="244" y="278" width="88" height="118" rx="6" />
                  </clipPath>
                </defs>

                {/* Dashboard card */}
                <rect x="15" y="15" width="370" height="230" rx="12" fill="white" filter="url(#proc-shadow)" />
                <rect x="15" y="15" width="370" height="40" rx="12" fill="#6262bd" />
                <rect x="15" y="43" width="370" height="12" fill="#6262bd" />
                {/* Window dots */}
                <circle cx="34" cy="35" r="5" fill="white" opacity="0.4" />
                <circle cx="50" cy="35" r="5" fill="white" opacity="0.4" />
                <circle cx="66" cy="35" r="5" fill="white" opacity="0.4" />
                <text x="200" y="40" fontSize="11" fill="white" textAnchor="middle" fontWeight="bold">Menu Dashboard</text>

                {/* Menu list — left column */}
                <rect x="28" y="68" width="162" height="32" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <rect x="36" y="75" width="20" height="18" rx="3" fill="#fef3c7" />
                <text x="47" y="87" fontSize="10" textAnchor="middle">🍔</text>
                <rect x="64" y="78" width="72" height="7" rx="2" fill="#cbd5e1" />
                <rect x="64" y="89" width="46" height="5" rx="2" fill="#e2e8f0" />

                <rect x="28" y="106" width="162" height="32" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <rect x="36" y="113" width="20" height="18" rx="3" fill="#dcfce7" />
                <text x="47" y="125" fontSize="10" textAnchor="middle">🥗</text>
                <rect x="64" y="116" width="62" height="7" rx="2" fill="#cbd5e1" />
                <rect x="64" y="127" width="52" height="5" rx="2" fill="#e2e8f0" />

                <rect x="28" y="144" width="162" height="32" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <rect x="36" y="151" width="20" height="18" rx="3" fill="#fee2e2" />
                <text x="47" y="163" fontSize="10" textAnchor="middle">🍕</text>
                <rect x="64" y="154" width="80" height="7" rx="2" fill="#cbd5e1" />
                <rect x="64" y="165" width="50" height="5" rx="2" fill="#e2e8f0" />

                <rect x="28" y="185" width="162" height="46" rx="8" fill="#6262bd" />
                <text x="109" y="212" fontSize="11" fill="white" textAnchor="middle" fontWeight="bold">＋ Add Item</text>

                {/* QR Preview — right column */}
                <rect x="208" y="58" width="162" height="178" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <text x="289" y="77" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">QR CODE PREVIEW</text>
                <rect x="224" y="86" width="130" height="104" rx="6" fill="#ede9fe" />
                {/* QR corners */}
                <rect x="232" y="94" width="18" height="18" rx="2" fill="#6262bd" />
                <rect x="236" y="98" width="10" height="10" rx="1" fill="white" />
                <rect x="330" y="94" width="18" height="18" rx="2" fill="#6262bd" />
                <rect x="334" y="98" width="10" height="10" rx="1" fill="white" />
                <rect x="232" y="162" width="18" height="18" rx="2" fill="#6262bd" />
                <rect x="236" y="166" width="10" height="10" rx="1" fill="white" />
                {/* QR dots */}
                <rect x="256" y="94" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="266" y="94" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="276" y="94" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="296" y="94" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="316" y="94" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="256" y="106" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="286" y="106" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="316" y="106" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="266" y="118" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="296" y="118" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="256" y="130" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="276" y="130" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="306" y="130" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="256" y="150" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="276" y="150" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="306" y="150" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="316" y="150" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="266" y="162" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="286" y="162" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="316" y="162" width="6" height="6" rx="1" fill="#6262bd" />
                <rect x="224" y="198" width="130" height="28" rx="6" fill="#6262bd" />
                <text x="289" y="216" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">↓ Download QR Code</text>

                {/* Arrow down */}
                <line x1="200" y1="252" x2="200" y2="270" stroke="#6262bd" strokeWidth="2" />
                <polygon points="193,268 200,280 207,268" fill="#6262bd" />

                {/* Result phone */}
                <rect x="240" y="272" width="100" height="136" rx="14" fill="#1e293b" filter="url(#proc-shadow)" />
                <rect x="244" y="278" width="92" height="124" rx="10" fill="#f8fafc" />
                <rect x="270" y="274" width="40" height="6" rx="3" fill="#334155" />
                <g clipPath="url(#proc-phone)">
                  <rect x="244" y="278" width="92" height="24" fill="#6262bd" />
                  <text x="290" y="294" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Your Restaurant</text>
                  <rect x="250" y="308" width="80" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="254" y="312" width="44" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="250" y="328" width="80" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="254" y="332" width="56" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="250" y="348" width="80" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="254" y="352" width="38" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="250" y="372" width="80" height="18" rx="5" fill="#6262bd" />
                  <text x="290" y="384" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">View Menu</text>
                </g>

                {/* Labels */}
                <text x="109" y="270" fontSize="8" fill="#64748b" textAnchor="middle">Admin dashboard</text>
                <text x="290" y="416" fontSize="8" fill="#64748b" textAnchor="middle">Customer sees this</text>
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
            No credit card required. 2 weeks free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
    </>
  )
}
