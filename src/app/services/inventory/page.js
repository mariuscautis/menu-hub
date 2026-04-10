'use client';

import ServicePageLayout from '@/components/ServicePageLayout';
import { useSeoSettings } from '@/lib/useSeoSettings'


export default function InventoryPage() {
  const seo = useSeoSettings('services_inventory', {
    title: 'Inventory Management — Veno App',
    description: 'Track stock levels in real-time, get automatic low-stock alerts, and never run out of ingredients during service again.',
  })
  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    <ServicePageLayout
      title="Inventory Management"
      description="Track stock levels in real-time, get automatic low-stock alerts, and never run out of ingredients during service again."
    >
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#6262bd]/5 to-white dark:from-[#6262bd]/10 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-[#6262bd]/10 text-[#6262bd] rounded-full text-sm font-medium mb-6">
                Stock Control Made Simple
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Know What You Have, When You Need It
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Say goodbye to manual stock counts and surprise shortages. Our intelligent inventory system tracks every ingredient, alerts you before you run low, and helps you reduce waste.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/#cta"
                  className="inline-flex items-center justify-center px-8 py-4 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a8] transition-colors"
                >
                  Start Free Trial
                </a>
                <a
                  href="/"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-[#6262bd] hover:text-[#6262bd] transition-colors"
                >
                  Back to Home
                </a>
              </div>
            </div>

            {/* Hero SVG - Inventory Dashboard */}
            <div className="relative">
              <svg viewBox="0 0 500 400" className="w-full h-auto" aria-hidden="true">
                {/* Background */}
                <rect x="30" y="20" width="440" height="360" rx="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>

                {/* Header */}
                <rect x="30" y="20" width="440" height="60" rx="20" fill="#6262bd"/>
                <rect x="30" y="60" width="440" height="20" fill="#6262bd"/>
                <text x="60" y="58" fill="white" fontSize="18" fontWeight="600">Inventory Overview</text>

                {/* Stock Level Bars */}
                <g>
                  {/* Item 1 - Good Stock */}
                  <rect x="60" y="100" width="180" height="50" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  <rect x="70" y="115" width="30" height="20" rx="4" fill="#fef3c7"/>
                  <text x="75" y="130" fontSize="12">🍅</text>
                  <text x="110" y="122" fill="#374151" fontSize="12" fontWeight="500">Tomatoes</text>
                  <text x="110" y="138" fill="#6b7280" fontSize="10">45 kg in stock</text>
                  <rect x="180" y="118" width="50" height="14" rx="7" fill="#dcfce7"/>
                  <text x="192" y="128" fill="#166534" fontSize="9" fontWeight="500">Good</text>

                  {/* Item 2 - Low Stock Warning */}
                  <rect x="60" y="160" width="180" height="50" rx="8" fill="white" stroke="#fbbf24" strokeWidth="2"/>
                  <rect x="70" y="175" width="30" height="20" rx="4" fill="#fef3c7"/>
                  <text x="75" y="190" fontSize="12">🧀</text>
                  <text x="110" y="182" fill="#374151" fontSize="12" fontWeight="500">Mozzarella</text>
                  <text x="110" y="198" fill="#6b7280" fontSize="10">2 kg in stock</text>
                  <rect x="180" y="178" width="50" height="14" rx="7" fill="#fef3c7"/>
                  <text x="195" y="188" fill="#92400e" fontSize="9" fontWeight="500">Low</text>

                  {/* Item 3 - Critical */}
                  <rect x="60" y="220" width="180" height="50" rx="8" fill="white" stroke="#ef4444" strokeWidth="2"/>
                  <rect x="70" y="235" width="30" height="20" rx="4" fill="#fee2e2"/>
                  <text x="75" y="250" fontSize="12">🫒</text>
                  <text x="110" y="242" fill="#374151" fontSize="12" fontWeight="500">Olive Oil</text>
                  <text x="110" y="258" fill="#6b7280" fontSize="10">0.5 L in stock</text>
                  <rect x="180" y="238" width="50" height="14" rx="7" fill="#fee2e2"/>
                  <text x="188" y="248" fill="#dc2626" fontSize="9" fontWeight="500">Critical</text>
                </g>

                {/* Right Panel - Alerts */}
                <g>
                  <rect x="260" y="100" width="180" height="170" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  <text x="280" y="125" fill="#374151" fontSize="14" fontWeight="600">🔔 Alerts</text>

                  {/* Alert Items */}
                  <rect x="275" y="140" width="150" height="35" rx="6" fill="#fef3c7"/>
                  <text x="285" y="155" fill="#92400e" fontSize="10" fontWeight="500">Low Stock Warning</text>
                  <text x="285" y="168" fill="#92400e" fontSize="9">Mozzarella - Order soon</text>

                  <rect x="275" y="185" width="150" height="35" rx="6" fill="#fee2e2"/>
                  <text x="285" y="200" fill="#dc2626" fontSize="10" fontWeight="500">Critical Alert!</text>
                  <text x="285" y="213" fill="#dc2626" fontSize="9">Olive Oil - Reorder now</text>

                  <rect x="275" y="230" width="150" height="25" rx="6" fill="#dcfce7"/>
                  <text x="285" y="247" fill="#166534" fontSize="10">✓ Flour restocked today</text>
                </g>

                {/* Bottom Stats */}
                <g>
                  <rect x="60" y="290" width="100" height="70" rx="10" fill="#6262bd"/>
                  <text x="110" y="320" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle">156</text>
                  <text x="110" y="340" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">Total Items</text>

                  <rect x="175" y="290" width="100" height="70" rx="10" fill="#f59e0b"/>
                  <text x="225" y="320" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle">8</text>
                  <text x="225" y="340" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">Low Stock</text>

                  <rect x="290" y="290" width="100" height="70" rx="10" fill="#10b981"/>
                  <text x="340" y="320" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle">94%</text>
                  <text x="340" y="340" fill="rgba(255,255,255,0.8)" fontSize="10" textAnchor="middle">In Stock</text>
                </g>

                {/* Decorative Elements */}
                <circle cx="450" cy="50" r="15" fill="rgba(255,255,255,0.2)"/>
                <circle cx="420" cy="45" r="8" fill="rgba(255,255,255,0.15)"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Three simple steps to take control of your stock
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 — Add Your Items */}
            <div className="relative border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-gray-900 flex flex-col">
              <span className="text-7xl font-black text-slate-200 dark:text-slate-700 leading-none select-none mb-2">1</span>
              <div className="w-full rounded-xl overflow-hidden mb-5" style={{background:'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)'}}>
                <svg viewBox="0 0 280 170" className="w-full" style={{display:'block'}}>
                  <defs>
                    <clipPath id="inv-card1">
                      <rect x="10" y="10" width="260" height="150" rx="10"/>
                    </clipPath>
                  </defs>
                  {/* Card */}
                  <rect x="10" y="10" width="260" height="150" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/>
                  {/* Header */}
                  <rect x="10" y="10" width="260" height="34" rx="10" fill="#6262bd"/>
                  <rect x="10" y="30" width="260" height="14" fill="#6262bd"/>
                  <text x="24" y="32" fill="white" fontSize="10" fontWeight="600">Stock Catalogue</text>
                  <rect x="196" y="17" width="64" height="20" rx="6" fill="white" fillOpacity="0.25"/>
                  <text x="204" y="31" fill="white" fontSize="9" fontWeight="700">+ Add Item</text>
                  {/* Row 1 */}
                  <rect x="18" y="52" width="244" height="24" rx="5" fill="#f8fafc" clipPath="url(#inv-card1)"/>
                  <rect x="26" y="59" width="8" height="8" rx="2" fill="#6262bd"/>
                  <text x="42" y="68" fill="#374151" fontSize="9">Tomato Sauce</text>
                  <rect x="176" y="55" width="40" height="16" rx="4" fill="#dcfce7"/>
                  <text x="182" y="67" fill="#16a34a" fontSize="8" fontWeight="600">48 kg</text>
                  <text x="220" y="67" fill="#9ca3af" fontSize="7">min 20</text>
                  {/* Row 2 */}
                  <rect x="18" y="82" width="244" height="24" rx="5" fill="#f8fafc" clipPath="url(#inv-card1)"/>
                  <rect x="26" y="89" width="8" height="8" rx="2" fill="#6262bd"/>
                  <text x="42" y="98" fill="#374151" fontSize="9">Olive Oil</text>
                  <rect x="176" y="85" width="40" height="16" rx="4" fill="#fef9c3"/>
                  <text x="180" y="97" fill="#ca8a04" fontSize="8" fontWeight="600">12 bot</text>
                  <text x="220" y="97" fill="#9ca3af" fontSize="7">min 10</text>
                  {/* Row 3 */}
                  <rect x="18" y="112" width="244" height="24" rx="5" fill="#f8fafc" clipPath="url(#inv-card1)"/>
                  <rect x="26" y="119" width="8" height="8" rx="2" fill="#6262bd"/>
                  <text x="42" y="128" fill="#374151" fontSize="9">Mozzarella</text>
                  <rect x="176" y="115" width="40" height="16" rx="4" fill="#dcfce7"/>
                  <text x="182" y="127" fill="#16a34a" fontSize="8" fontWeight="600">35 kg</text>
                  <text x="220" y="127" fill="#9ca3af" fontSize="7">min 15</text>
                  {/* Footer */}
                  <text x="24" y="150" fill="#9ca3af" fontSize="7">3 of 24 items shown</text>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#6262bd,#8b8bd8)'}}>
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Your Items</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Enter your ingredients and supplies with quantities. Set minimum stock thresholds so the system knows when to warn you.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#6262bd] bg-[#6262bd]/10 rounded-full px-3 py-1 self-start">
                ✓ Import from CSV or add one by one
              </span>
            </div>

            {/* Step 2 — Track Automatically */}
            <div className="relative border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-gray-900 flex flex-col">
              <span className="text-7xl font-black text-slate-200 dark:text-slate-700 leading-none select-none mb-2">2</span>
              <div className="w-full rounded-xl overflow-hidden mb-5" style={{background:'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)'}}>
                <svg viewBox="0 0 280 170" className="w-full" style={{display:'block'}}>
                  <defs>
                    <clipPath id="inv-card2">
                      <rect x="10" y="10" width="260" height="150" rx="10"/>
                    </clipPath>
                  </defs>
                  <rect x="10" y="10" width="260" height="150" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/>
                  {/* Header */}
                  <rect x="10" y="10" width="260" height="34" rx="10" fill="#10b981"/>
                  <rect x="10" y="30" width="260" height="14" fill="#10b981"/>
                  <text x="24" y="32" fill="white" fontSize="10" fontWeight="600">Live Stock Tracker</text>
                  <rect x="214" y="17" width="46" height="18" rx="6" fill="white" fillOpacity="0.25"/>
                  <text x="220" y="30" fill="white" fontSize="8" fontWeight="600">● Live</text>
                  {/* Order banner */}
                  <rect x="18" y="52" width="244" height="18" rx="5" fill="#f0fdf4" clipPath="url(#inv-card2)"/>
                  <text x="26" y="64" fill="#16a34a" fontSize="7.5" fontWeight="600">↓ Order #1042 — deducting ingredients…</text>
                  {/* Tomato Sauce bar */}
                  <text x="18" y="84" fill="#6b7280" fontSize="8">Tomato Sauce</text>
                  <rect x="112" y="76" width="120" height="10" rx="4" fill="#e2e8f0"/>
                  <rect x="112" y="76" width="88" height="10" rx="4" fill="#10b981"/>
                  <text x="238" y="85" fill="#374151" fontSize="8" fontWeight="600">48 kg</text>
                  {/* Olive Oil bar */}
                  <text x="18" y="106" fill="#6b7280" fontSize="8">Olive Oil</text>
                  <rect x="112" y="98" width="120" height="10" rx="4" fill="#e2e8f0"/>
                  <rect x="112" y="98" width="28" height="10" rx="4" fill="#f59e0b"/>
                  <text x="238" y="107" fill="#374151" fontSize="8" fontWeight="600">12 bot</text>
                  {/* Mozzarella bar */}
                  <text x="18" y="128" fill="#6b7280" fontSize="8">Mozzarella</text>
                  <rect x="112" y="120" width="120" height="10" rx="4" fill="#e2e8f0"/>
                  <rect x="112" y="120" width="64" height="10" rx="4" fill="#10b981"/>
                  <text x="238" y="129" fill="#374151" fontSize="8" fontWeight="600">35 kg</text>
                  {/* Footer */}
                  <text x="18" y="150" fill="#9ca3af" fontSize="7">Auto-updated from recipe deductions</text>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#10b981,#34d399)'}}>
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Track Automatically</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Stock levels update in real time as orders come in. Ingredients are deducted automatically based on your recipes — zero manual counting.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full px-3 py-1 self-start">
                ✓ No manual updates needed
              </span>
            </div>

            {/* Step 3 — Get Alerts */}
            <div className="relative border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-gray-900 flex flex-col">
              <span className="text-7xl font-black text-slate-200 dark:text-slate-700 leading-none select-none mb-2">3</span>
              <div className="w-full rounded-xl overflow-hidden mb-5" style={{background:'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)'}}>
                <svg viewBox="0 0 280 170" className="w-full" style={{display:'block'}}>
                  <defs>
                    <clipPath id="inv-card3">
                      <rect x="10" y="10" width="260" height="150" rx="10"/>
                    </clipPath>
                  </defs>
                  <rect x="10" y="10" width="260" height="150" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/>
                  {/* Header */}
                  <rect x="10" y="10" width="260" height="34" rx="10" fill="#f59e0b"/>
                  <rect x="10" y="30" width="260" height="14" fill="#f59e0b"/>
                  <text x="24" y="32" fill="white" fontSize="10" fontWeight="600">Stock Alerts</text>
                  <rect x="198" y="17" width="62" height="18" rx="6" fill="white" fillOpacity="0.25"/>
                  <text x="204" y="30" fill="white" fontSize="8" fontWeight="600">3 alerts</text>
                  {/* Alert row 1 — amber */}
                  <rect x="18" y="52" width="244" height="28" rx="6" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" clipPath="url(#inv-card3)"/>
                  <rect x="26" y="60" width="10" height="10" rx="3" fill="#f59e0b"/>
                  <text x="42" y="67" fill="#92400e" fontSize="8" fontWeight="700">Low Stock</text>
                  <text x="42" y="76" fill="#b45309" fontSize="7">Olive Oil — 12 bottles left (min 20)</text>
                  {/* Alert row 2 — red */}
                  <rect x="18" y="86" width="244" height="28" rx="6" fill="#fff1f2" stroke="#f43f5e" strokeWidth="1" clipPath="url(#inv-card3)"/>
                  <rect x="26" y="94" width="10" height="10" rx="3" fill="#f43f5e"/>
                  <text x="42" y="101" fill="#9f1239" fontSize="8" fontWeight="700">Critical</text>
                  <text x="42" y="110" fill="#be123c" fontSize="7">Garlic — only 2 kg left (min 5)</text>
                  {/* Alert row 3 — green */}
                  <rect x="18" y="120" width="244" height="28" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" clipPath="url(#inv-card3)"/>
                  <rect x="26" y="128" width="10" height="10" rx="3" fill="#22c55e"/>
                  <text x="42" y="135" fill="#15803d" fontSize="8" fontWeight="700">Reorder placed</text>
                  <text x="42" y="144" fill="#166534" fontSize="7">Olive Oil — supplier notified ✓</text>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#f59e0b,#fbbf24)'}}>
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Get Alerts</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Receive instant notifications when items run low or hit critical levels. Never be caught off guard mid-service again.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-full px-3 py-1 self-start">
                ✓ Push, email &amp; in-app alerts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Manage Stock
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful features designed for busy kitchens
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 — Real-Time Tracking */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-[#6262bd]/10 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <rect x="5" y="8" width="30" height="24" rx="3" fill="none" stroke="#6262bd" strokeWidth="2"/>
                  <line x1="5" y1="16" x2="35" y2="16" stroke="#6262bd" strokeWidth="2"/>
                  <rect x="10" y="20" width="8" height="8" rx="1" fill="#6262bd" opacity="0.4"/>
                  <rect x="22" y="20" width="8" height="8" rx="1" fill="#6262bd" opacity="0.4"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Real-Time Tracking</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">See exactly what you have in stock at any moment. No more manual counts, clipboards, or guesswork before a busy service.</p>
              </div>
            </div>

            {/* Feature 2 — Low Stock Alerts */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#f59e0b" strokeWidth="2"/>
                  <path d="M20 10 L20 20 L26 20" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="32" cy="8" r="6" fill="#f59e0b"/>
                  <text x="32" y="11" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">!</text>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Low Stock Alerts</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">Get notified before you run out. Set custom thresholds for each ingredient and receive alerts before stock becomes a problem.</p>
              </div>
            </div>

            {/* Feature 3 — Usage Analytics */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <path d="M8 30 L15 20 L22 25 L32 10" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="15" cy="20" r="3" fill="#10b981"/>
                  <circle cx="22" cy="25" r="3" fill="#10b981"/>
                  <circle cx="32" cy="10" r="3" fill="#10b981"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Usage Analytics</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">Track consumption patterns over time. Know which items you go through fastest and plan your ordering accordingly.</p>
              </div>
            </div>

            {/* Feature 4 — Recipe Integration */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-6 items-start">
              <div className="w-12 h-12 shrink-0 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <rect x="8" y="6" width="24" height="28" rx="2" fill="none" stroke="#3b82f6" strokeWidth="2"/>
                  <line x1="12" y1="13" x2="28" y2="13" stroke="#3b82f6" strokeWidth="2"/>
                  <line x1="12" y1="20" x2="28" y2="20" stroke="#3b82f6" strokeWidth="2"/>
                  <line x1="12" y1="27" x2="20" y2="27" stroke="#3b82f6" strokeWidth="2"/>
                  <circle cx="30" cy="30" r="7" fill="#3b82f6"/>
                  <path d="M27 30 L29 32 L33 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Recipe Integration</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">Link recipes to ingredients. When a dish is sold, the system automatically deducts the right quantities — no manual input needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <svg viewBox="0 0 500 350" className="w-full h-auto" aria-hidden="true">
                {/* Shelves Background */}
                <rect x="20" y="20" width="460" height="310" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>

                {/* Shelf 1 */}
                <rect x="40" y="60" width="420" height="8" fill="#d4a574"/>
                <rect x="40" y="68" width="420" height="4" fill="#c49a6c"/>

                {/* Items on Shelf 1 */}
                <g>
                  {/* Tomato can */}
                  <rect x="60" y="30" width="35" height="30" rx="2" fill="#ef4444"/>
                  <rect x="65" y="38" width="25" height="14" rx="1" fill="white"/>
                  <text x="77" y="48" fill="#ef4444" fontSize="8" textAnchor="middle">TOM</text>

                  {/* Olive oil bottle */}
                  <path d="M120 60 L120 35 L125 30 L140 30 L145 35 L145 60 Z" fill="#84cc16"/>
                  <rect x="125" y="35" width="15" height="20" rx="1" fill="#fef3c7"/>

                  {/* Flour bag */}
                  <rect x="170" y="35" width="40" height="25" rx="3" fill="#fef3c7" stroke="#e5e7eb"/>
                  <text x="190" y="52" fill="#78716c" fontSize="8" textAnchor="middle">FLOUR</text>

                  {/* Pasta box */}
                  <rect x="230" y="32" width="30" height="28" rx="2" fill="#fbbf24"/>
                  <text x="245" y="50" fill="white" fontSize="7" textAnchor="middle">PASTA</text>

                  {/* Rice bag */}
                  <rect x="280" y="35" width="35" height="25" rx="3" fill="white" stroke="#e5e7eb"/>
                  <text x="297" y="52" fill="#78716c" fontSize="8" textAnchor="middle">RICE</text>

                  {/* Salt container */}
                  <rect x="335" y="40" width="25" height="20" rx="2" fill="#60a5fa"/>
                  <text x="347" y="54" fill="white" fontSize="6" textAnchor="middle">SALT</text>

                  {/* Sugar bag */}
                  <rect x="380" y="35" width="35" height="25" rx="3" fill="white" stroke="#e5e7eb"/>
                  <text x="397" y="52" fill="#78716c" fontSize="7" textAnchor="middle">SUGAR</text>
                </g>

                {/* Shelf 2 */}
                <rect x="40" y="140" width="420" height="8" fill="#d4a574"/>
                <rect x="40" y="148" width="420" height="4" fill="#c49a6c"/>

                {/* Items on Shelf 2 */}
                <g>
                  {/* Cheese wheel - LOW STOCK */}
                  <ellipse cx="85" cy="125" rx="25" ry="15" fill="#fbbf24"/>
                  <ellipse cx="85" cy="120" rx="25" ry="12" fill="#fcd34d"/>
                  <circle cx="105" cy="110" r="10" fill="#f59e0b" stroke="white" strokeWidth="2"/>
                  <text x="105" y="114" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">!</text>

                  {/* Milk cartons */}
                  <rect x="130" y="105" width="20" height="35" rx="2" fill="white" stroke="#e5e7eb"/>
                  <rect x="132" y="115" width="16" height="10" fill="#60a5fa"/>
                  <rect x="155" y="105" width="20" height="35" rx="2" fill="white" stroke="#e5e7eb"/>
                  <rect x="157" y="115" width="16" height="10" fill="#60a5fa"/>
                  <rect x="180" y="105" width="20" height="35" rx="2" fill="white" stroke="#e5e7eb"/>
                  <rect x="182" y="115" width="16" height="10" fill="#60a5fa"/>

                  {/* Butter blocks */}
                  <rect x="220" y="120" width="25" height="20" rx="2" fill="#fef3c7" stroke="#fbbf24"/>
                  <rect x="250" y="120" width="25" height="20" rx="2" fill="#fef3c7" stroke="#fbbf24"/>

                  {/* Egg carton */}
                  <rect x="295" y="115" width="50" height="25" rx="3" fill="#fef3c7" stroke="#e5e7eb"/>
                  <g>
                    <ellipse cx="308" cy="127" rx="6" ry="7" fill="#fef9c3"/>
                    <ellipse cx="320" cy="127" rx="6" ry="7" fill="#fef9c3"/>
                    <ellipse cx="332" cy="127" rx="6" ry="7" fill="#fef9c3"/>
                  </g>

                  {/* Cream - CRITICAL */}
                  <rect x="365" y="110" width="25" height="30" rx="3" fill="white" stroke="#ef4444" strokeWidth="2"/>
                  <text x="377" y="130" fill="#78716c" fontSize="6" textAnchor="middle">Cream</text>
                  <circle cx="385" cy="105" r="10" fill="#ef4444" stroke="white" strokeWidth="2"/>
                  <text x="385" y="109" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">!</text>

                  {/* Yogurt */}
                  <circle cx="425" cy="125" r="15" fill="white" stroke="#e5e7eb"/>
                  <circle cx="425" cy="125" r="10" fill="#f0abfc"/>
                </g>

                {/* Shelf 3 */}
                <rect x="40" y="220" width="420" height="8" fill="#d4a574"/>
                <rect x="40" y="228" width="420" height="4" fill="#c49a6c"/>

                {/* Items on Shelf 3 */}
                <g>
                  {/* Vegetables in crates */}
                  <rect x="50" y="185" width="60" height="35" rx="4" fill="#f5f5f4" stroke="#d6d3d1"/>
                  <circle cx="65" cy="200" r="8" fill="#ef4444"/>
                  <circle cx="80" cy="200" r="8" fill="#ef4444"/>
                  <circle cx="95" cy="200" r="8" fill="#ef4444"/>

                  <rect x="125" y="185" width="60" height="35" rx="4" fill="#f5f5f4" stroke="#d6d3d1"/>
                  <ellipse cx="140" cy="200" rx="10" ry="6" fill="#84cc16"/>
                  <ellipse cx="160" cy="200" rx="10" ry="6" fill="#84cc16"/>

                  {/* Onions */}
                  <rect x="200" y="185" width="50" height="35" rx="4" fill="#f5f5f4" stroke="#d6d3d1"/>
                  <circle cx="215" cy="200" r="8" fill="#fbbf24"/>
                  <circle cx="235" cy="200" r="8" fill="#fbbf24"/>

                  {/* Garlic */}
                  <rect x="265" y="190" width="40" height="30" rx="4" fill="white" stroke="#e5e7eb"/>
                  <circle cx="280" cy="205" r="8" fill="#fef9c3" stroke="#fef3c7"/>
                  <circle cx="295" cy="205" r="8" fill="#fef9c3" stroke="#fef3c7"/>

                  {/* Herbs in pots */}
                  <rect x="320" y="200" width="25" height="20" rx="2" fill="#a16207"/>
                  <path d="M325 200 Q332 180 340 200" fill="#22c55e"/>

                  <rect x="355" y="200" width="25" height="20" rx="2" fill="#a16207"/>
                  <path d="M360 200 Q367 175 375 200" fill="#22c55e"/>

                  {/* Lemons */}
                  <rect x="395" y="185" width="50" height="35" rx="4" fill="#f5f5f4" stroke="#d6d3d1"/>
                  <ellipse cx="410" cy="200" rx="10" ry="8" fill="#fde047"/>
                  <ellipse cx="430" cy="200" rx="10" ry="8" fill="#fde047"/>
                </g>

                {/* Floor items */}
                <g>
                  {/* Large container */}
                  <rect x="60" y="250" width="80" height="60" rx="4" fill="#e5e7eb" stroke="#d1d5db"/>
                  <text x="100" y="285" fill="#6b7280" fontSize="10" textAnchor="middle">Flour 25kg</text>
                  <rect x="65" y="255" width="70" height="5" fill="#6262bd"/>

                  {/* Oil containers */}
                  <rect x="160" y="260" width="30" height="50" rx="3" fill="#84cc16"/>
                  <rect x="200" y="260" width="30" height="50" rx="3" fill="#84cc16"/>

                  {/* Boxes */}
                  <rect x="260" y="265" width="50" height="45" rx="3" fill="#d4a574"/>
                  <rect x="320" y="265" width="50" height="45" rx="3" fill="#d4a574"/>
                  <rect x="380" y="265" width="50" height="45" rx="3" fill="#d4a574"/>
                </g>

                {/* Scan indicator */}
                <g>
                  <rect x="380" y="35" width="80" height="40" rx="8" fill="#6262bd"/>
                  <text x="420" y="52" fill="white" fontSize="9" textAnchor="middle">Scanning...</text>
                  <path d="M400 62 L440 62" stroke="white" strokeWidth="2" strokeDasharray="5,3">
                    <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1s" repeatCount="indefinite"/>
                  </path>
                </g>
              </svg>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                See Your Entire Stock at a Glance
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Visual inventory management makes it easy to spot what needs attention. Color-coded alerts highlight items that are running low or critically short.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Green items are well-stocked and ready to go
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Yellow warnings mean it is time to reorder soon
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Red alerts require immediate attention
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-[#6262bd]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stop Losing Money on Poor Stock Control
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Restaurants waste thousands each year on over-ordering and spoilage
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">30%</div>
              <div className="text-white/80">Less food waste</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">2hrs</div>
              <div className="text-white/80">Saved per week on stock takes</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">95%</div>
              <div className="text-white/80">Stock accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">0</div>
              <div className="text-white/80">Surprise shortages</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Take Control of Your Inventory Today
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join restaurants that have eliminated stock surprises and reduced waste. Start your free trial and see the difference smart inventory makes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/#cta"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a8] transition-colors"
            >
              Start Free Trial
            </a>
            <a
              href="/services/analytics"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-[#6262bd] hover:text-[#6262bd] transition-colors"
            >
              Explore Analytics →
            </a>
          </div>
        </div>
      </section>

      {/* Other Services */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Explore Other Features
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <a href="/services/qr-menu" className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#6262bd]/5 dark:hover:bg-[#6262bd]/20 transition-colors text-center group">
              <div className="text-3xl mb-2">📱</div>
              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#6262bd]">QR Menu</div>
            </a>
            <a href="/services/table-ordering" className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#6262bd]/5 dark:hover:bg-[#6262bd]/20 transition-colors text-center group">
              <div className="text-3xl mb-2">🍽️</div>
              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#6262bd]">Table Ordering</div>
            </a>
            <a href="/services/dashboard" className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#6262bd]/5 dark:hover:bg-[#6262bd]/20 transition-colors text-center group">
              <div className="text-3xl mb-2">👨‍🍳</div>
              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#6262bd]">Staff Dashboard</div>
            </a>
            <a href="/services/analytics" className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#6262bd]/5 dark:hover:bg-[#6262bd]/20 transition-colors text-center group">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#6262bd]">Analytics</div>
            </a>
            <a href="/services/reservations" className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#6262bd]/5 dark:hover:bg-[#6262bd]/20 transition-colors text-center group">
              <div className="text-3xl mb-2">📅</div>
              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#6262bd]">Reservations</div>
            </a>
          </div>
        </div>
      </section>
    </ServicePageLayout>
    </>
  );
}
