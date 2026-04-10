'use client'

import Link from 'next/link'
import { useState } from 'react'
import PlatformLogo from '@/components/PlatformLogo'
import SiteFooter from '@/components/SiteFooter'
import { useSeoSettings } from '@/lib/useSeoSettings'

// Service categories for mega menu
const services = {
  features: {
    title: 'Features',
    description: 'Everything your venue needs',
    items: [
      {
        name: 'Your Branded App',
        description: 'White-label PWA with your logo',
        icon: '📲',
        href: '/services/branded-app',
      },
      {
        name: 'Offline Hub',
        description: 'Keep serving without internet',
        icon: '📡',
        href: '/services/offline-hub',
      },
      {
        name: 'Digital QR Menu',
        description: 'Contactless menus via smartphone',
        icon: '📱',
        href: '/services/qr-menu',
      },
      {
        name: 'Table Ordering',
        description: 'Customers order directly from tables',
        icon: '🍽️',
        href: '/services/table-ordering',
      },
      {
        name: 'Staff Management',
        description: 'Rotas, shifts, and time tracking',
        icon: '👥',
        href: '/services/staff-management',
      },
      {
        name: 'Staff Dashboard',
        description: 'Kitchen & bar order management',
        icon: '👨‍🍳',
        href: '/services/dashboard',
      },
      {
        name: 'Business Analytics',
        description: 'Sales trends and insights',
        icon: '📈',
        href: '/services/analytics',
      },
      {
        name: 'Reservations',
        description: 'Online booking with confirmations',
        icon: '📅',
        href: '/services/reservations',
      },
      {
        name: 'Inventory Management',
        description: 'Stock tracking and cost control',
        icon: '📦',
        href: '/services/inventory',
      },
    ],
  },
  industries: {
    title: 'Industries',
    description: 'Built for every venue type',
    items: [
      {
        name: 'Restaurants',
        description: 'Fine dining to casual eateries',
        icon: '🍽️',
        href: '#industries',
      },
      {
        name: 'Cafes & Coffee Shops',
        description: 'Quick service and cozy cafes',
        icon: '☕',
        href: '#industries',
      },
      {
        name: 'Pubs & Bars',
        description: 'Drinks, food, and atmosphere',
        icon: '🍺',
        href: '#industries',
      },
      {
        name: 'Takeaways',
        description: 'Fast food and delivery focused',
        icon: '🥡',
        href: '#industries',
      },
    ],
  },
  benefits: {
    title: 'Why Veno App?',
    description: 'What makes us different',
    items: [
      {
        name: 'No Hardware Costs',
        description: 'Works on devices you already own',
        icon: '💻',
        href: '#no-hardware',
      },
      {
        name: 'Save Time',
        description: 'Automate the busy work',
        icon: '⏱️',
        href: '#why-veno-app',
      },
      {
        name: 'Reduce Errors',
        description: 'Digital ordering means clarity',
        icon: '✅',
        href: '#why-veno-app',
      },
      {
        name: 'Boost Revenue',
        description: 'Data-driven growth insights',
        icon: '📊',
        href: '#why-veno-app',
      },
    ],
  },
}

// Feature modules for the main content
const features = [
  {
    id: 'branded-app',
    title: 'Your Branded App',
    subtitle: 'Your Restaurant, Your App',
    description:
      'Get your very own restaurant app with your logo, colors, and name. Customers install it on their phones and it feels like your own custom-built application — powered by Veno App behind the scenes.',
    benefits: [
      'Your logo and branding',
      'Installable on any device',
      'Works offline',
      'No app store needed',
    ],
    color: 'from-indigo-500 to-violet-600',
    href: '/services/branded-app',
  },
  {
    id: 'offline-hub',
    title: 'Offline Hub',
    subtitle: 'Keep Serving, Even Without Internet',
    description:
      'Internet goes down? No problem. Veno App keeps working. Orders still flow and your kitchen stays in sync — all without a single internet connection. When you\'re back online, everything syncs automatically.',
    benefits: [
      'Orders flow even without internet',
      'Kitchen & bar displays stay live',
      'No data lost during an outage',
      'Auto-syncs the moment you reconnect',
    ],
    color: 'from-teal-500 to-emerald-600',
    href: '/services/offline-hub',
  },
  {
    id: 'digital-menu',
    title: 'Digital QR Menu',
    subtitle: 'Contactless Dining Experience',
    description:
      'Transform your menu into an interactive digital experience. Customers scan a QR code and instantly access your full menu with beautiful images, detailed descriptions, and real-time pricing.',
    benefits: [
      'No app download required',
      'Update menu items instantly',
      'Support for multiple languages',
      'Allergen and dietary information',
    ],
    color: 'from-violet-500 to-purple-600',
    href: '/services/qr-menu',
  },
  {
    id: 'table-ordering',
    title: 'Table Ordering System',
    subtitle: 'Faster Service, Happier Customers',
    description:
      'Let customers place orders directly from their table. Orders flow instantly to your kitchen and bar stations, reducing wait times and freeing up your staff for better service.',
    benefits: [
      'Reduce order errors by 90%',
      'Increase table turnover rate',
      'Real-time order status updates',
      'Integrated payment options',
    ],
    color: 'from-blue-500 to-cyan-500',
    href: '/services/table-ordering',
  },
  {
    id: 'staff-management',
    title: 'Staff Management',
    subtitle: 'Complete Workforce Control',
    description:
      'Manage your entire team from one place. Create rotas and schedules, track clock-ins and clock-outs, handle vacation requests, and assign departments. Keep your staff organized and your operations running smoothly.',
    benefits: [
      'Rota & shift scheduling',
      'Clock in/out tracking',
      'Vacation & leave management',
      'Department assignments',
    ],
    color: 'from-cyan-500 to-blue-600',
    href: '/services/staff-management',
  },
  {
    id: 'staff-dashboard',
    title: 'Staff & Kitchen Dashboard',
    subtitle: 'Streamlined Operations',
    description:
      'A powerful dashboard for your team. Kitchen staff see their orders, bar staff see theirs. Managers get the full picture. Everyone stays in sync with real-time updates.',
    benefits: [
      'Role-based access control',
      'Station-specific displays',
      'Audio notifications for new orders',
      'Works offline with local sync',
    ],
    color: 'from-emerald-500 to-teal-500',
    href: '/services/dashboard',
  },
  {
    id: 'analytics',
    title: 'Business Analytics',
    subtitle: 'Data-Driven Decisions',
    description:
      'Understand your business like never before. Track sales trends, identify peak hours, discover your best-selling items, and make informed decisions backed by real data.',
    benefits: [
      'Revenue and sales tracking',
      'Staff performance metrics',
      'Product profitability analysis',
      'Exportable reports',
    ],
    color: 'from-amber-500 to-orange-500',
    href: '/services/analytics',
  },
  {
    id: 'reservations',
    title: 'Reservation System',
    subtitle: 'Never Miss a Booking',
    description:
      'Accept online reservations 24/7. Customers receive automatic confirmations and reminders. Your staff sees all bookings in one calendar view with table assignments.',
    benefits: [
      'Online booking page',
      'Email & SMS confirmations',
      'Table assignment management',
      'Calendar overview for staff',
    ],
    color: 'from-pink-500 to-rose-500',
    href: '/services/reservations',
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    subtitle: 'Control Your Costs',
    description:
      'Track your stock levels, record supplier invoices, and monitor losses. Know exactly what you have, what you need, and where your money is going.',
    benefits: [
      'Real-time stock tracking',
      'Low stock alerts',
      'Supplier invoice management',
      'Loss and waste reporting',
    ],
    color: 'from-slate-500 to-slate-700',
    href: '/services/inventory',
  },
]

// Industries we serve
const industries = [
  {
    name: 'Restaurants',
    icon: '🍽️',
    description: 'Fine dining to casual eateries',
  },
  {
    name: 'Cafes & Coffee Shops',
    icon: '☕',
    description: 'Quick service and cozy cafes',
  },
  {
    name: 'Pubs & Bars',
    icon: '🍺',
    description: 'Drinks, food, and atmosphere',
  },
  {
    name: 'Takeaways',
    icon: '🥡',
    description: 'Fast food and delivery focused',
  },
  {
    name: 'Food Trucks',
    icon: '🚚',
    description: 'Mobile and pop-up venues',
  },
  {
    name: 'Hotels & Resorts',
    icon: '🏨',
    description: 'Room service and dining',
  },
]

// SVG Illustrations for features
const FeatureIllustrations = {
  'digital-menu': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-dm" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
        <clipPath id="phone-screen-dm">
          <rect x="138" y="45" width="124" height="210" rx="12" />
        </clipPath>
      </defs>

      {/* Phone frame */}
      <rect x="130" y="20" width="140" height="250" rx="20" fill="#1e293b" filter="url(#shadow-dm)" />
      {/* Screen background */}
      <rect x="138" y="45" width="124" height="210" rx="12" fill="#f8fafc" />

      {/* Screen content clipped inside phone */}
      <g clipPath="url(#phone-screen-dm)">
        {/* Screen header bar */}
        <rect x="138" y="45" width="124" height="28" fill="#6262bd" />
        <rect x="150" y="54" width="50" height="8" rx="3" fill="white" opacity="0.7" />
        <rect x="210" y="56" width="16" height="4" rx="2" fill="white" opacity="0.5" />

        {/* QR background tile */}
        <rect x="150" y="82" width="100" height="100" rx="8" fill="#ede9fe" />

        {/* QR pattern: corner squares */}
        <rect x="158" y="90" width="18" height="18" rx="2" fill="#6262bd" />
        <rect x="161" y="93" width="12" height="12" rx="1" fill="white" />
        <rect x="163" y="95" width="8" height="8" rx="1" fill="#6262bd" />

        <rect x="224" y="90" width="18" height="18" rx="2" fill="#6262bd" />
        <rect x="227" y="93" width="12" height="12" rx="1" fill="white" />
        <rect x="229" y="95" width="8" height="8" rx="1" fill="#6262bd" />

        <rect x="158" y="154" width="18" height="18" rx="2" fill="#6262bd" />
        <rect x="161" y="157" width="12" height="12" rx="1" fill="white" />
        <rect x="163" y="159" width="8" height="8" rx="1" fill="#6262bd" />

        {/* QR inner dots */}
        <rect x="182" y="90" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="192" y="90" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="202" y="90" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="212" y="90" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="182" y="100" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="202" y="100" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="182" y="110" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="192" y="110" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="212" y="110" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="182" y="120" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="192" y="120" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="202" y="120" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="182" y="130" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="212" y="130" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="182" y="140" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="192" y="140" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="202" y="140" width="6" height="6" rx="1" fill="#6262bd" />
        <rect x="212" y="140" width="6" height="6" rx="1" fill="#6262bd" />

        {/* Menu item rows */}
        <rect x="148" y="192" width="104" height="22" rx="5" fill="#f1f5f9" />
        <rect x="155" y="198" width="40" height="8" rx="2" fill="#cbd5e1" />
        <rect x="225" y="198" width="20" height="8" rx="2" fill="#6262bd" opacity="0.5" />

        <rect x="148" y="220" width="104" height="22" rx="5" fill="#f1f5f9" />
        <rect x="155" y="226" width="55" height="8" rx="2" fill="#cbd5e1" />
        <rect x="225" y="226" width="20" height="8" rx="2" fill="#10b981" opacity="0.6" />

        <rect x="148" y="248" width="104" height="22" rx="5" fill="#f1f5f9" />
        <rect x="155" y="254" width="35" height="8" rx="2" fill="#cbd5e1" />
        <rect x="225" y="254" width="20" height="8" rx="2" fill="#6262bd" opacity="0.5" />
      </g>

      {/* Home indicator bar */}
      <rect x="175" y="248" width="50" height="4" rx="2" fill="#cbd5e1" />

      {/* Floating "Scan & View" badge top-right, within viewBox */}
      <rect x="282" y="40" width="100" height="36" rx="10" fill="#6262bd" filter="url(#shadow-dm)" />
      <rect x="288" y="46" width="14" height="14" rx="2" fill="white" opacity="0.3" />
      <rect x="290" y="48" width="10" height="10" rx="1" fill="white" opacity="0.6" />
      <text x="310" y="56" fontSize="9" fill="white" fontWeight="bold">Scan &amp; View</text>
      {/* small arrow pointing left */}
      <path d="M282 58 L275 58 L278 54 M275 58 L278 62" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  ),
  'table-ordering': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-to" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
        <clipPath id="phone-screen-to">
          <rect x="34" y="40" width="62" height="100" rx="6" />
        </clipPath>
      </defs>

      {/* Table surface */}
      <ellipse cx="200" cy="230" rx="140" ry="50" fill="#e2e8f0" />
      <ellipse cx="200" cy="222" rx="140" ry="50" fill="#f1f5f9" />
      <ellipse cx="200" cy="220" rx="138" ry="48" fill="white" stroke="#e2e8f0" strokeWidth="2" />

      {/* Plate left */}
      <circle cx="120" cy="210" r="32" fill="white" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="120" cy="210" r="24" fill="#fef3c7" />
      <circle cx="120" cy="210" r="10" fill="#fde68a" />

      {/* Plate right */}
      <circle cx="280" cy="210" r="32" fill="white" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="280" cy="210" r="24" fill="#fee2e2" />
      <circle cx="280" cy="210" r="10" fill="#fca5a5" />

      {/* QR stand center of table */}
      <rect x="186" y="178" width="28" height="44" rx="4" fill="#1e293b" />
      <rect x="189" y="182" width="22" height="30" rx="2" fill="white" />
      {/* QR mini pattern */}
      <rect x="192" y="185" width="5" height="5" rx="1" fill="#6262bd" />
      <rect x="200" y="185" width="5" height="5" rx="1" fill="#6262bd" />
      <rect x="192" y="193" width="5" height="5" rx="1" fill="#6262bd" />
      <rect x="200" y="193" width="5" height="5" rx="1" fill="#6262bd" />
      <rect x="192" y="201" width="5" height="5" rx="1" fill="#6262bd" />
      <rect x="200" y="201" width="5" height="5" rx="1" fill="#6262bd" />
      {/* stand base */}
      <rect x="182" y="220" width="36" height="5" rx="2" fill="#334155" />

      {/* Phone frame left */}
      <rect x="30" y="30" width="70" height="110" rx="10" fill="#1e293b" filter="url(#shadow-to)" />
      {/* Screen bg */}
      <rect x="34" y="40" width="62" height="100" rx="6" fill="#f8fafc" />
      {/* Phone content clipped */}
      <g clipPath="url(#phone-screen-to)">
        <rect x="34" y="40" width="62" height="16" fill="#6262bd" />
        <rect x="38" y="44" width="30" height="6" rx="2" fill="white" opacity="0.7" />
        <rect x="38" y="62" width="54" height="7" rx="2" fill="#e2e8f0" />
        <rect x="38" y="73" width="46" height="7" rx="2" fill="#e2e8f0" />
        <rect x="38" y="84" width="50" height="7" rx="2" fill="#e2e8f0" />
        <rect x="38" y="95" width="42" height="7" rx="2" fill="#e2e8f0" />
        <rect x="38" y="113" width="54" height="18" rx="4" fill="#10b981" />
        <text x="65" y="126" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">ORDER</text>
      </g>
      {/* home bar */}
      <rect x="52" y="135" width="26" height="3" rx="1.5" fill="#475569" />

      {/* Kitchen ticket card — fits x=290 to x=390, y=20 to y=100 */}
      <rect x="290" y="20" width="100" height="80" rx="10" fill="white" filter="url(#shadow-to)" stroke="#e2e8f0" strokeWidth="1" />
      {/* ticket header */}
      <rect x="290" y="20" width="100" height="26" rx="10" fill="#f59e0b" />
      <rect x="290" y="34" width="100" height="12" fill="#f59e0b" />
      <text x="340" y="37" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">NEW ORDER</text>
      {/* ticket content */}
      <rect x="300" y="54" width="60" height="6" rx="2" fill="#e2e8f0" />
      <rect x="300" y="64" width="46" height="6" rx="2" fill="#e2e8f0" />
      <rect x="300" y="74" width="52" height="6" rx="2" fill="#e2e8f0" />
      {/* ticket number */}
      <text x="376" y="72" fontSize="14" fill="#f59e0b" fontWeight="bold" textAnchor="middle">#7</text>
    </svg>
  ),
  'staff-management': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main card */}
      <rect x="20" y="20" width="360" height="260" rx="16" fill="white" filter="url(#shadow-sm)" />

      {/* Header bar */}
      <rect x="20" y="20" width="360" height="44" rx="16" fill="#0891b2" />
      <rect x="20" y="48" width="360" height="16" fill="#0891b2" />
      <text x="200" y="47" fontSize="13" fill="white" textAnchor="middle" fontWeight="bold">Staff Rota</text>

      {/* Day column headers — 7 cols, starting x=70, spacing=42 */}
      <text x="72"  y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Mon</text>
      <text x="114" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Tue</text>
      <text x="156" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Wed</text>
      <text x="198" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Thu</text>
      <text x="240" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Fri</text>
      <text x="282" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Sat</text>
      <text x="324" y="82" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">Sun</text>

      {/* Staff name labels */}
      <text x="34" y="102" fontSize="8" fill="#1e293b" fontWeight="bold">Sarah</text>
      <text x="34" y="136" fontSize="8" fill="#1e293b" fontWeight="bold">Mike</text>
      <text x="34" y="170" fontSize="8" fill="#1e293b" fontWeight="bold">Lisa</text>

      {/* Row 1 — Sarah — blue shifts */}
      <rect x="53" y="89" width="38" height="18" rx="4" fill="#3b82f6" />
      <text x="72" y="101" fontSize="6" fill="white" textAnchor="middle">9–5</text>
      <rect x="95" y="89" width="38" height="18" rx="4" fill="#3b82f6" />
      <text x="114" y="101" fontSize="6" fill="white" textAnchor="middle">9–5</text>
      <rect x="137" y="89" width="38" height="18" rx="4" fill="#3b82f6" />
      <text x="156" y="101" fontSize="6" fill="white" textAnchor="middle">9–5</text>
      <rect x="221" y="89" width="38" height="18" rx="4" fill="#3b82f6" />
      <text x="240" y="101" fontSize="6" fill="white" textAnchor="middle">12–8</text>
      <rect x="263" y="89" width="38" height="18" rx="4" fill="#3b82f6" />
      <text x="282" y="101" fontSize="6" fill="white" textAnchor="middle">12–8</text>

      {/* Row 2 — Mike — amber shifts */}
      <rect x="95"  y="123" width="38" height="18" rx="4" fill="#f59e0b" />
      <text x="114" y="135" fontSize="6" fill="white" textAnchor="middle">6–2</text>
      <rect x="137" y="123" width="38" height="18" rx="4" fill="#f59e0b" />
      <text x="156" y="135" fontSize="6" fill="white" textAnchor="middle">6–2</text>
      <rect x="179" y="123" width="38" height="18" rx="4" fill="#f59e0b" />
      <text x="198" y="135" fontSize="6" fill="white" textAnchor="middle">6–2</text>
      <rect x="221" y="123" width="38" height="18" rx="4" fill="#f59e0b" />
      <text x="240" y="135" fontSize="6" fill="white" textAnchor="middle">6–2</text>
      <rect x="305" y="123" width="38" height="18" rx="4" fill="#f59e0b" />
      <text x="324" y="135" fontSize="6" fill="white" textAnchor="middle">6–2</text>

      {/* Row 3 — Lisa — green shifts */}
      <rect x="53"  y="157" width="38" height="18" rx="4" fill="#22c55e" />
      <text x="72"  y="169" fontSize="6" fill="white" textAnchor="middle">2–10</text>
      <rect x="179" y="157" width="38" height="18" rx="4" fill="#22c55e" />
      <text x="198" y="169" fontSize="6" fill="white" textAnchor="middle">2–10</text>
      <rect x="263" y="157" width="38" height="18" rx="4" fill="#22c55e" />
      <text x="282" y="169" fontSize="6" fill="white" textAnchor="middle">2–10</text>
      <rect x="305" y="157" width="38" height="18" rx="4" fill="#22c55e" />
      <text x="324" y="169" fontSize="6" fill="white" textAnchor="middle">2–10</text>

      {/* Divider */}
      <line x1="30" y1="188" x2="370" y2="188" stroke="#e2e8f0" strokeWidth="1" />

      {/* Stats row — 3 tiles within x=30–370 */}
      <rect x="30"  y="196" width="100" height="34" rx="6" fill="#f0fdf4" />
      <text x="80"  y="209" fontSize="7" fill="#64748b" textAnchor="middle">Active Now</text>
      <text x="80"  y="223" fontSize="12" fill="#16a34a" textAnchor="middle" fontWeight="bold">5 Staff</text>

      <rect x="150" y="196" width="100" height="34" rx="6" fill="#ede9fe" />
      <text x="200" y="209" fontSize="7" fill="#64748b" textAnchor="middle">Hours / Week</text>
      <text x="200" y="223" fontSize="12" fill="#6262bd" textAnchor="middle" fontWeight="bold">156h</text>

      <rect x="270" y="196" width="100" height="34" rx="6" fill="#fef3c7" />
      <text x="320" y="209" fontSize="7" fill="#64748b" textAnchor="middle">Pending</text>
      <text x="320" y="223" fontSize="12" fill="#d97706" textAnchor="middle" fontWeight="bold">2 Req</text>
    </svg>
  ),
  'staff-dashboard': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-sd" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
        <clipPath id="monitor-screen-sd">
          <rect x="42" y="32" width="316" height="186" rx="4" />
        </clipPath>
      </defs>

      {/* Monitor outer frame */}
      <rect x="30" y="20" width="340" height="210" rx="12" fill="#1e293b" filter="url(#shadow-sd)" />
      {/* Screen area */}
      <rect x="42" y="32" width="316" height="186" rx="4" fill="#f8fafc" />

      {/* Screen content clipped */}
      <g clipPath="url(#monitor-screen-sd)">
        {/* Header bar */}
        <rect x="42" y="32" width="316" height="32" fill="#6262bd" />
        <rect x="52" y="42" width="80" height="10" rx="3" fill="white" opacity="0.5" />
        <rect x="320" y="42" width="30" height="10" rx="3" fill="white" opacity="0.3" />

        {/* Order card 1 — Ready */}
        <rect x="52" y="74" width="90" height="72" rx="6" fill="white" stroke="#10b981" strokeWidth="2" />
        <rect x="60" y="82" width="32" height="8" rx="2" fill="#10b981" />
        <rect x="60" y="96" width="70" height="6" rx="2" fill="#e2e8f0" />
        <rect x="60" y="106" width="54" height="6" rx="2" fill="#e2e8f0" />
        <rect x="60" y="124" width="74" height="14" rx="3" fill="#10b981" opacity="0.15" />
        <text x="97" y="135" fontSize="7" fill="#10b981" textAnchor="middle" fontWeight="bold">READY</text>

        {/* Order card 2 — Cooking */}
        <rect x="155" y="74" width="90" height="72" rx="6" fill="white" stroke="#f59e0b" strokeWidth="2" />
        <rect x="163" y="82" width="32" height="8" rx="2" fill="#f59e0b" />
        <rect x="163" y="96" width="70" height="6" rx="2" fill="#e2e8f0" />
        <rect x="163" y="106" width="58" height="6" rx="2" fill="#e2e8f0" />
        <rect x="163" y="124" width="74" height="14" rx="3" fill="#f59e0b" opacity="0.15" />
        <text x="200" y="135" fontSize="7" fill="#f59e0b" textAnchor="middle" fontWeight="bold">COOKING</text>

        {/* Order card 3 — New */}
        <rect x="258" y="74" width="90" height="72" rx="6" fill="white" stroke="#6262bd" strokeWidth="2" />
        <rect x="266" y="82" width="32" height="8" rx="2" fill="#6262bd" />
        <rect x="266" y="96" width="64" height="6" rx="2" fill="#e2e8f0" />
        <rect x="266" y="106" width="48" height="6" rx="2" fill="#e2e8f0" />
        <rect x="266" y="124" width="74" height="14" rx="3" fill="#6262bd" opacity="0.15" />
        <text x="303" y="135" fontSize="7" fill="#6262bd" textAnchor="middle" fontWeight="bold">NEW</text>

        {/* Stats row inside screen */}
        <rect x="52" y="158" width="90" height="52" rx="4" fill="#f0fdf4" />
        <text x="97" y="172" fontSize="7" fill="#64748b" textAnchor="middle">Completed</text>
        <text x="97" y="188" fontSize="13" fill="#16a34a" textAnchor="middle" fontWeight="bold">12</text>
        <text x="97" y="202" fontSize="6" fill="#64748b" textAnchor="middle">orders</text>

        <rect x="155" y="158" width="90" height="52" rx="4" fill="#fef3c7" />
        <text x="200" y="172" fontSize="7" fill="#64748b" textAnchor="middle">In Progress</text>
        <text x="200" y="188" fontSize="13" fill="#d97706" textAnchor="middle" fontWeight="bold">5</text>
        <text x="200" y="202" fontSize="6" fill="#64748b" textAnchor="middle">orders</text>

        <rect x="258" y="158" width="90" height="52" rx="4" fill="#ede9fe" />
        <text x="303" y="172" fontSize="7" fill="#64748b" textAnchor="middle">Queue</text>
        <text x="303" y="188" fontSize="13" fill="#6262bd" textAnchor="middle" fontWeight="bold">3</text>
        <text x="303" y="202" fontSize="6" fill="#64748b" textAnchor="middle">waiting</text>
      </g>

      {/* Monitor stand */}
      <rect x="180" y="230" width="40" height="18" rx="2" fill="#475569" />
      <rect x="155" y="246" width="90" height="10" rx="5" fill="#334155" />
    </svg>
  ),
  'analytics': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-an" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Chart card */}
      <rect x="15" y="15" width="370" height="270" rx="16" fill="white" filter="url(#shadow-an)" />

      {/* Header row */}
      <rect x="28" y="28" width="110" height="11" rx="3" fill="#1e293b" />
      <rect x="28" y="44" width="70" height="8" rx="2" fill="#94a3b8" />
      <text x="358" y="40" fontSize="18" fill="#10b981" textAnchor="end" fontWeight="bold">£24,580</text>
      <text x="358" y="54" fontSize="8" fill="#94a3b8" textAnchor="end">+12% vs last week ↑</text>

      {/* Divider */}
      <line x1="28" y1="62" x2="372" y2="62" stroke="#f1f5f9" strokeWidth="1" />

      {/* === LEFT: Bar chart === x=28 to x=250, baseline y=195 */}
      {/* Grid lines */}
      <line x1="28" y1="75"  x2="250" y2="75"  stroke="#f1f5f9" strokeWidth="1" />
      <line x1="28" y1="105" x2="250" y2="105" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="28" y1="135" x2="250" y2="135" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="28" y1="165" x2="250" y2="165" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="28" y1="195" x2="250" y2="195" stroke="#e2e8f0" strokeWidth="1" />

      {/* 7 bars — width=22, gap=8, starts x=32 */}
      <rect x="32"  y="165" width="22" height="30"  rx="3" fill="#6262bd" opacity="0.25" />
      <rect x="62"  y="145" width="22" height="50"  rx="3" fill="#6262bd" opacity="0.35" />
      <rect x="92"  y="150" width="22" height="45"  rx="3" fill="#6262bd" opacity="0.45" />
      <rect x="122" y="120" width="22" height="75"  rx="3" fill="#6262bd" opacity="0.6" />
      <rect x="152" y="100" width="22" height="95"  rx="3" fill="#6262bd" opacity="0.75" />
      <rect x="182" y="80"  width="22" height="115" rx="3" fill="#6262bd" />
      <rect x="212" y="110" width="22" height="85"  rx="3" fill="#6262bd" opacity="0.65" />

      {/* Bar day labels */}
      <text x="43"  y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Mon</text>
      <text x="73"  y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Tue</text>
      <text x="103" y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Wed</text>
      <text x="133" y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Thu</text>
      <text x="163" y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Fri</text>
      <text x="193" y="208" fontSize="7" fill="#6262bd" textAnchor="middle" fontWeight="bold">Sat</text>
      <text x="223" y="208" fontSize="7" fill="#94a3b8" textAnchor="middle">Sun</text>

      {/* === RIGHT: Donut chart === centred at cx=320, well within 400 */}
      <circle cx="320" cy="138" r="44" fill="none" stroke="#6262bd" strokeWidth="16" strokeDasharray="83 193" />
      <circle cx="320" cy="138" r="44" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray="55 221" strokeDashoffset="-83" />
      <circle cx="320" cy="138" r="44" fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray="55 221" strokeDashoffset="-138" />
      {/* Donut hole */}
      <circle cx="320" cy="138" r="28" fill="white" />
      <text x="320" y="134" fontSize="8" fill="#64748b" textAnchor="middle">Sales</text>
      <text x="320" y="146" fontSize="8" fill="#1e293b" textAnchor="middle" fontWeight="bold">Mix</text>

      {/* Legend below donut */}
      <circle cx="280" cy="210" r="5" fill="#6262bd" />
      <text x="289" y="214" fontSize="8" fill="#64748b">Dine-in</text>
      <circle cx="280" cy="226" r="5" fill="#10b981" />
      <text x="289" y="230" fontSize="8" fill="#64748b">Takeout</text>
      <circle cx="280" cy="242" r="5" fill="#f59e0b" />
      <text x="289" y="246" fontSize="8" fill="#64748b">Delivery</text>

      {/* Vertical separator between bar chart and donut */}
      <line x1="260" y1="68" x2="260" y2="270" stroke="#f1f5f9" strokeWidth="1" />
    </svg>
  ),
  'reservations': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-res" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Calendar card — x=30 to x=370 */}
      <rect x="30" y="20" width="340" height="230" rx="16" fill="white" filter="url(#shadow-res)" />

      {/* Purple header */}
      <rect x="30" y="20" width="340" height="48" rx="16" fill="#6262bd" />
      <rect x="30" y="52" width="340" height="16" fill="#6262bd" />
      <text x="200" y="50" fontSize="15" fill="white" textAnchor="middle" fontWeight="bold">March 2026</text>
      {/* nav arrows */}
      <text x="50"  y="50" fontSize="16" fill="white" textAnchor="middle" opacity="0.7">‹</text>
      <text x="350" y="50" fontSize="16" fill="white" textAnchor="middle" opacity="0.7">›</text>

      {/* Day headers — 7 cols starting x=55, spacing=42 */}
      <text x="55"  y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Sun</text>
      <text x="97"  y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Mon</text>
      <text x="139" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Tue</text>
      <text x="181" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Wed</text>
      <text x="223" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Thu</text>
      <text x="265" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Fri</text>
      <text x="307" y="84" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="bold">Sat</text>

      {/* Row 1 */}
      <text x="55"  y="108" fontSize="11" fill="#cbd5e1" textAnchor="middle">1</text>
      <text x="97"  y="108" fontSize="11" fill="#1e293b" textAnchor="middle">2</text>
      <text x="139" y="108" fontSize="11" fill="#1e293b" textAnchor="middle">3</text>
      <text x="181" y="108" fontSize="11" fill="#1e293b" textAnchor="middle">4</text>
      <text x="223" y="108" fontSize="11" fill="#1e293b" textAnchor="middle">5</text>
      <text x="265" y="108" fontSize="11" fill="#1e293b" textAnchor="middle">6</text>
      <text x="307" y="108" fontSize="11" fill="#1e293b" textAnchor="middle">7</text>

      {/* Row 2 */}
      <text x="55"  y="136" fontSize="11" fill="#1e293b" textAnchor="middle">8</text>
      <text x="97"  y="136" fontSize="11" fill="#1e293b" textAnchor="middle">9</text>
      <text x="139" y="136" fontSize="11" fill="#1e293b" textAnchor="middle">10</text>
      {/* Today highlight */}
      <circle cx="181" cy="131" r="14" fill="#6262bd" />
      <text x="181" y="135" fontSize="11" fill="white" textAnchor="middle" fontWeight="bold">11</text>
      <text x="223" y="136" fontSize="11" fill="#1e293b" textAnchor="middle">12</text>
      {/* Reservation dot */}
      <circle cx="265" cy="131" r="14" fill="#10b981" opacity="0.18" />
      <text x="265" y="135" fontSize="11" fill="#10b981" textAnchor="middle" fontWeight="bold">13</text>
      <text x="307" y="136" fontSize="11" fill="#1e293b" textAnchor="middle">14</text>

      {/* Row 3 */}
      <text x="55"  y="164" fontSize="11" fill="#1e293b" textAnchor="middle">15</text>
      <circle cx="97"  cy="159" r="14" fill="#f59e0b" opacity="0.18" />
      <text x="97"  y="163" fontSize="11" fill="#f59e0b" textAnchor="middle" fontWeight="bold">16</text>
      <text x="139" y="164" fontSize="11" fill="#1e293b" textAnchor="middle">17</text>
      <text x="181" y="164" fontSize="11" fill="#1e293b" textAnchor="middle">18</text>
      <circle cx="223" cy="159" r="14" fill="#6262bd" opacity="0.18" />
      <text x="223" y="163" fontSize="11" fill="#6262bd" textAnchor="middle">19</text>
      <text x="265" y="164" fontSize="11" fill="#1e293b" textAnchor="middle">20</text>
      <text x="307" y="164" fontSize="11" fill="#1e293b" textAnchor="middle">21</text>

      {/* Reservation booking row inside card */}
      <rect x="38" y="178" width="324" height="62" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="38" y="178" width="6" height="62" rx="3" fill="#6262bd" />
      <text x="56" y="198" fontSize="10" fill="#1e293b" fontWeight="bold">Johnson Party</text>
      <text x="56" y="212" fontSize="8" fill="#64748b">Table 5 · 4 guests · 7:30 PM</text>
      <rect x="260" y="186" width="84" height="22" rx="6" fill="#10b981" />
      <text x="302" y="201" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">CONFIRMED</text>
      <text x="56" y="228" fontSize="8" fill="#64748b">Mar 13, 2026</text>
    </svg>
  ),
  'branded-app': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-ba" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
        <clipPath id="phone-screen-ba">
          <rect x="148" y="22" width="104" height="196" rx="10" />
        </clipPath>
        <clipPath id="tablet-screen-ba">
          <rect x="15" y="88" width="70" height="90" rx="4" />
        </clipPath>
        <clipPath id="desktop-screen-ba">
          <rect x="304" y="142" width="72" height="44" rx="2" />
        </clipPath>
      </defs>

      {/* Central phone */}
      <rect x="140" y="10" width="120" height="220" rx="18" fill="#1e293b" filter="url(#shadow-ba)" />
      <rect x="148" y="22" width="104" height="196" rx="10" fill="#f8fafc" />

      {/* Phone screen content */}
      <g clipPath="url(#phone-screen-ba)">
        {/* Branded gradient header */}
        <rect x="148" y="22" width="104" height="70" fill="#6262bd" />
        <rect x="148" y="70" width="104" height="22" fill="#4f4f9e" />
        {/* Logo circle */}
        <circle cx="200" cy="48" r="20" fill="white" opacity="0.2" />
        <circle cx="200" cy="48" r="14" fill="white" opacity="0.35" />
        {/* Logo text stand-in */}
        <rect x="188" y="43" width="24" height="10" rx="3" fill="white" opacity="0.8" />
        {/* Brand name */}
        <text x="200" y="84" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold" opacity="0.9">YOUR BRAND</text>
        {/* Menu rows */}
        <rect x="153" y="100" width="94" height="18" rx="4" fill="#ede9fe" />
        <rect x="158" y="106" width="50" height="6" rx="2" fill="#6262bd" opacity="0.5" />
        <rect x="230" y="106" width="14" height="6" rx="2" fill="#6262bd" opacity="0.7" />

        <rect x="153" y="122" width="94" height="18" rx="4" fill="#f1f5f9" />
        <rect x="158" y="128" width="40" height="6" rx="2" fill="#94a3b8" />
        <rect x="230" y="128" width="14" height="6" rx="2" fill="#94a3b8" />

        <rect x="153" y="144" width="94" height="18" rx="4" fill="#f1f5f9" />
        <rect x="158" y="150" width="55" height="6" rx="2" fill="#94a3b8" />
        <rect x="230" y="150" width="14" height="6" rx="2" fill="#94a3b8" />

        <rect x="153" y="166" width="94" height="18" rx="4" fill="#f1f5f9" />
        <rect x="158" y="172" width="44" height="6" rx="2" fill="#94a3b8" />
        <rect x="230" y="172" width="14" height="6" rx="2" fill="#94a3b8" />

        {/* Bottom nav */}
        <rect x="148" y="196" width="104" height="22" fill="#f8fafc" />
        <rect x="148" y="196" width="104" height="1" fill="#e2e8f0" />
        <rect x="165" y="201" width="12" height="12" rx="2" fill="#6262bd" opacity="0.3" />
        <rect x="194" y="201" width="12" height="12" rx="2" fill="#e2e8f0" />
        <rect x="223" y="201" width="12" height="12" rx="2" fill="#e2e8f0" />
      </g>
      {/* Home indicator */}
      <rect x="183" y="222" width="34" height="4" rx="2" fill="#475569" />

      {/* Small tablet — x=10 to x=90 */}
      <rect x="10" y="80" width="80" height="110" rx="10" fill="#1e293b" filter="url(#shadow-ba)" />
      <rect x="15" y="88" width="70" height="90" rx="4" fill="#f8fafc" />
      <g clipPath="url(#tablet-screen-ba)">
        <rect x="15" y="88" width="70" height="28" fill="#6262bd" />
        <circle cx="50" cy="102" r="10" fill="white" opacity="0.3" />
        <rect x="20" y="122" width="60" height="8" rx="2" fill="#e2e8f0" />
        <rect x="20" y="134" width="46" height="8" rx="2" fill="#e2e8f0" />
        <rect x="20" y="146" width="52" height="8" rx="2" fill="#e2e8f0" />
        <rect x="20" y="158" width="38" height="8" rx="2" fill="#e2e8f0" />
        <rect x="20" y="170" width="60" height="7" rx="2" fill="#ede9fe" />
      </g>
      <rect x="40" y="186" width="20" height="3" rx="1.5" fill="#475569" />

      {/* Small desktop — x=300 to x=380 */}
      <rect x="300" y="130" width="80" height="60" rx="6" fill="#1e293b" filter="url(#shadow-ba)" />
      <rect x="304" y="142" width="72" height="44" rx="2" fill="#f8fafc" />
      <g clipPath="url(#desktop-screen-ba)">
        <rect x="304" y="142" width="72" height="16" fill="#6262bd" />
        <circle cx="310" cy="150" r="4" fill="#ef4444" />
        <circle cx="318" cy="150" r="4" fill="#f59e0b" />
        <circle cx="326" cy="150" r="4" fill="#22c55e" />
        <rect x="308" y="162" width="64" height="6" rx="2" fill="#e2e8f0" />
        <rect x="308" y="172" width="48" height="6" rx="2" fill="#e2e8f0" />
        <rect x="308" y="179" width="54" height="5" rx="2" fill="#ede9fe" />
      </g>
      {/* stand */}
      <rect x="334" y="190" width="12" height="10" rx="1" fill="#475569" />
      <rect x="326" y="199" width="28" height="5" rx="2" fill="#334155" />

      {/* Static dashed lines connecting devices */}
      <path d="M90 135 C110 130 125 130 140 140" fill="none" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      <path d="M260 140 C275 138 288 138 300 150" fill="none" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />

      {/* Brand banner at bottom */}
      <rect x="10" y="260" width="380" height="30" rx="8" fill="#6262bd" opacity="0.12" />
      <rect x="10" y="260" width="4" height="30" rx="2" fill="#6262bd" />
      <text x="200" y="271" fontSize="9" fill="#6262bd" textAnchor="middle" fontWeight="bold">ONE PLATFORM · EVERY DEVICE · YOUR BRAND</text>
      <text x="200" y="283" fontSize="7" fill="#64748b" textAnchor="middle">Customers see your brand, powered by Veno App</text>
    </svg>
  ),
  'inventory': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-inv" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Main card — leaves 15px margin all sides */}
      <rect x="15" y="12" width="370" height="276" rx="14" fill="white" filter="url(#shadow-inv)" />

      {/* Card header */}
      <rect x="15" y="12" width="370" height="42" rx="14" fill="#475569" />
      <rect x="15" y="40" width="370" height="14" fill="#475569" />
      <text x="32" y="38" fontSize="12" fill="white" fontWeight="bold">Inventory</text>
      <rect x="290" y="20" width="80" height="20" rx="6" fill="#f59e0b" />
      <text x="330" y="34" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">2 Low Stock</text>

      {/* Column headers — cols: Item@32, Qty@195, Level@260, Status@340 */}
      <text x="32"  y="72" fontSize="8" fill="#94a3b8" fontWeight="bold">ITEM</text>
      <text x="195" y="72" fontSize="8" fill="#94a3b8" fontWeight="bold" textAnchor="middle">QTY</text>
      <text x="258" y="72" fontSize="8" fill="#94a3b8" fontWeight="bold" textAnchor="middle">LEVEL</text>
      <text x="340" y="72" fontSize="8" fill="#94a3b8" fontWeight="bold" textAnchor="middle">STATUS</text>
      <line x1="25" y1="77" x2="375" y2="77" stroke="#e2e8f0" strokeWidth="1" />

      {/* Row 1 — In Stock */}
      <rect x="25" y="81" width="350" height="28" rx="4" fill="#f8fafc" />
      <text x="32" y="99"  fontSize="9" fill="#1e293b">🧈 Butter</text>
      <text x="195" y="99" fontSize="9" fill="#1e293b" textAnchor="middle">24 kg</text>
      <rect x="228" y="91" width="58" height="7" rx="3" fill="#e2e8f0" />
      <rect x="228" y="91" width="50" height="7" rx="3" fill="#22c55e" />
      <rect x="308" y="88" width="62" height="16" rx="5" fill="#dcfce7" />
      <text x="339" y="100" fontSize="8" fill="#16a34a" textAnchor="middle" fontWeight="bold">In Stock</text>

      {/* Row 2 — Low Stock */}
      <rect x="25" y="113" width="350" height="28" rx="4" fill="#fff7ed" />
      <text x="32" y="131"  fontSize="9" fill="#1e293b">🍅 Tomatoes</text>
      <text x="195" y="131" fontSize="9" fill="#d97706" textAnchor="middle">3 kg</text>
      <rect x="228" y="123" width="58" height="7" rx="3" fill="#e2e8f0" />
      <rect x="228" y="123" width="14" height="7" rx="3" fill="#f59e0b" />
      <rect x="308" y="120" width="62" height="16" rx="5" fill="#fef3c7" />
      <text x="339" y="132" fontSize="8" fill="#d97706" textAnchor="middle" fontWeight="bold">Low</text>

      {/* Row 3 — In Stock */}
      <rect x="25" y="145" width="350" height="28" rx="4" fill="#f8fafc" />
      <text x="32" y="163"  fontSize="9" fill="#1e293b">🧀 Cheese</text>
      <text x="195" y="163" fontSize="9" fill="#1e293b" textAnchor="middle">18 kg</text>
      <rect x="228" y="155" width="58" height="7" rx="3" fill="#e2e8f0" />
      <rect x="228" y="155" width="44" height="7" rx="3" fill="#22c55e" />
      <rect x="308" y="152" width="62" height="16" rx="5" fill="#dcfce7" />
      <text x="339" y="164" fontSize="8" fill="#16a34a" textAnchor="middle" fontWeight="bold">In Stock</text>

      {/* Row 4 — Out of Stock */}
      <rect x="25" y="177" width="350" height="28" rx="4" fill="#fff1f2" />
      <text x="32" y="195"  fontSize="9" fill="#1e293b">🍷 Red Wine</text>
      <text x="195" y="195" fontSize="9" fill="#ef4444" textAnchor="middle">0 btl</text>
      <rect x="228" y="187" width="58" height="7" rx="3" fill="#e2e8f0" />
      <rect x="308" y="184" width="62" height="16" rx="5" fill="#fee2e2" />
      <text x="339" y="196" fontSize="8" fill="#ef4444" textAnchor="middle" fontWeight="bold">Out</text>

      {/* Row 5 — In Stock */}
      <rect x="25" y="209" width="350" height="28" rx="4" fill="#f8fafc" />
      <text x="32" y="227"  fontSize="9" fill="#1e293b">📦 Flour</text>
      <text x="195" y="227" fontSize="9" fill="#1e293b" textAnchor="middle">12 kg</text>
      <rect x="228" y="219" width="58" height="7" rx="3" fill="#e2e8f0" />
      <rect x="228" y="219" width="36" height="7" rx="3" fill="#22c55e" />
      <rect x="308" y="216" width="62" height="16" rx="5" fill="#dcfce7" />
      <text x="339" y="228" fontSize="8" fill="#16a34a" textAnchor="middle" fontWeight="bold">In Stock</text>

      {/* Footer stats — all inside card (card bottom = 12+276=288) */}
      <line x1="25" y1="244" x2="375" y2="244" stroke="#e2e8f0" strokeWidth="1" />
      <text x="90"  y="258" fontSize="8" fill="#64748b" textAnchor="middle">Total Items</text>
      <text x="90"  y="272" fontSize="12" fill="#1e293b" textAnchor="middle" fontWeight="bold">48</text>
      <text x="200" y="258" fontSize="8" fill="#64748b" textAnchor="middle">Low Stock</text>
      <text x="200" y="272" fontSize="12" fill="#f59e0b" textAnchor="middle" fontWeight="bold">2</text>
      <text x="315" y="258" fontSize="8" fill="#64748b" textAnchor="middle">Out of Stock</text>
      <text x="315" y="272" fontSize="12" fill="#ef4444" textAnchor="middle" fontWeight="bold">1</text>
    </svg>
  ),
  'offline-hub': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <defs>
        <filter id="shadow-oh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.12" />
        </filter>
        <linearGradient id="oh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Background card */}
      <rect x="12" y="12" width="376" height="276" rx="16" fill="#f0fdf4" />

      {/* Wifi-off cloud at the top */}
      <circle cx="200" cy="62" r="32" fill="#dcfce7" />
      {/* Crossed-out wifi arcs */}
      <path d="M182 70 Q200 52 218 70" fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" opacity="0.4"/>
      <path d="M174 78 Q200 48 226 78" fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" opacity="0.2"/>
      <circle cx="200" cy="78" r="3.5" fill="#14b8a6" />
      {/* red diagonal slash */}
      <line x1="183" y1="52" x2="217" y2="86" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

      {/* "No internet" label */}
      <rect x="156" y="100" width="88" height="20" rx="10" fill="#fecaca" />
      <text x="200" y="114" fontSize="9" fill="#dc2626" textAnchor="middle" fontWeight="bold">No Internet</text>

      {/* Still working cards - 3 columns */}
      {/* Card 1: Orders */}
      <rect x="30" y="134" width="100" height="72" rx="10" fill="white" filter="url(#shadow-oh)" />
      <rect x="30" y="134" width="100" height="6" rx="10" fill="url(#oh-grad)" />
      <text x="80" y="160" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="semibold">ORDERS</text>
      <rect x="42" y="166" width="56" height="7" rx="3" fill="#dcfce7" />
      <text x="70" y="173" fontSize="7.5" fill="#16a34a" textAnchor="middle" fontWeight="bold">✓ Live</text>
      <rect x="42" y="178" width="40" height="5" rx="2" fill="#e2e8f0" />
      <rect x="42" y="186" width="52" height="5" rx="2" fill="#e2e8f0" />

      {/* Card 2: Staff */}
      <rect x="150" y="134" width="100" height="72" rx="10" fill="white" filter="url(#shadow-oh)" />
      <rect x="150" y="134" width="100" height="6" rx="10" fill="url(#oh-grad)" />
      <text x="200" y="160" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="semibold">STAFF</text>
      <rect x="162" y="166" width="56" height="7" rx="3" fill="#dcfce7" />
      <text x="190" y="173" fontSize="7.5" fill="#16a34a" textAnchor="middle" fontWeight="bold">✓ Live</text>
      <rect x="162" y="178" width="40" height="5" rx="2" fill="#e2e8f0" />
      <rect x="162" y="186" width="52" height="5" rx="2" fill="#e2e8f0" />

      {/* Card 3: Kitchen */}
      <rect x="270" y="134" width="100" height="72" rx="10" fill="white" filter="url(#shadow-oh)" />
      <rect x="270" y="134" width="100" height="6" rx="10" fill="url(#oh-grad)" />
      <text x="320" y="160" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="semibold">KITCHEN</text>
      <rect x="282" y="166" width="56" height="7" rx="3" fill="#dcfce7" />
      <text x="310" y="173" fontSize="7.5" fill="#16a34a" textAnchor="middle" fontWeight="bold">✓ Live</text>
      <rect x="282" y="178" width="40" height="5" rx="2" fill="#e2e8f0" />
      <rect x="282" y="186" width="52" height="5" rx="2" fill="#e2e8f0" />

      {/* Auto-sync banner at bottom */}
      <rect x="60" y="222" width="280" height="36" rx="10" fill="url(#oh-grad)" filter="url(#shadow-oh)" />
      {/* sync icon */}
      <path d="M82 238 a8 8 0 1 1 6 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="86,234 82,238 87,242" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="200" y="238" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">Back online? Syncing automatically…</text>
      <rect x="100" y="244" width="140" height="4" rx="2" fill="white" opacity="0.3" />
      <rect x="100" y="244" width="90" height="4" rx="2" fill="white" opacity="0.7" />
    </svg>
  ),
}

// Icons for feature cards
const FeatureIcons = {
  'offline-hub': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  'digital-menu': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  ),
  'table-ordering': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  'staff-management': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  'staff-dashboard': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  'analytics': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'reservations': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'inventory': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  'branded-app': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11l4-4m0 0l-4-4m4 4H3" />
    </svg>
  ),
  'offline-hub': (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
}

export default function HomePage() {
  const seo = useSeoSettings('home', {
    title: 'Veno App — Restaurant Management Platform',
    description: 'Run your restaurant smarter with Veno App. Digital menus, table ordering, staff management, reservations, and real-time analytics — all in one platform.',
  })
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    {/* Open Graph */}
    {seo.title && <meta property="og:title" content={seo.title} />}
    {seo.description && <meta property="og:description" content={seo.description} />}
    <meta property="og:type" content="website" />
    {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
    {/* Twitter / X */}
    <meta name="twitter:card" content={seo.ogImage ? "summary_large_image" : "summary"} />
    {seo.title && <meta name="twitter:title" content={seo.title} />}
    {seo.description && <meta name="twitter:description" content={seo.description} />}
    {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <PlatformLogo size="md" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {/* Services Mega Menu Trigger */}
              <div
                className="relative"
                onMouseEnter={() => setMegaMenuOpen(true)}
                onMouseLeave={() => setMegaMenuOpen(false)}
              >
                <button className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                  <span>Services</span>
                  <svg className={`w-4 h-4 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mega Menu Dropdown */}
                {megaMenuOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[800px]">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                      <div className="flex">
                        {/* Category Tabs */}
                        <div className="w-56 bg-slate-50 dark:bg-slate-900 p-4 space-y-1">
                          {Object.entries(services).map(([key, category]) => (
                            <button
                              key={key}
                              onMouseEnter={() => setActiveCategory(key)}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                                activeCategory === key
                                  ? 'bg-[#6262bd] text-white shadow-lg'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="font-semibold text-sm">{category.title}</div>
                              <div className={`text-xs mt-0.5 ${activeCategory === key ? 'text-white/80' : 'text-slate-400'}`}>
                                {category.description}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Category Items */}
                        <div className="flex-1 p-6">
                          <div className="grid grid-cols-2 gap-3">
                            {services[activeCategory].items.map((item) => (
                              <Link
                                key={item.name}
                                href={item.href}
                                className="group flex items-start space-x-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <div className="text-2xl">{item.icon}</div>
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-white group-hover:text-[#6262bd] dark:group-hover:text-[#8585d0] transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mega Menu Footer */}
                      <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Need help choosing? <Link href="/contact" className="text-[#6262bd] font-medium hover:underline">Talk to our team</Link>
                        </div>
                        <Link href="/pricing" className="text-sm font-medium text-[#6262bd] hover:underline flex items-center space-x-1">
                          <span>View Pricing</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/pricing" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Contact
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/auth/login" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-[#6262bd] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] transition-colors shadow-lg shadow-[#6262bd]/20"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-6 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Services</div>
                {Object.values(services).map((category) => (
                  <div key={category.title} className="space-y-1">
                    <div className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{category.title}</div>
                    {category.items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                <Link href="/pricing" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">Pricing</Link>
                <Link href="/about" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">About</Link>
                <Link href="/contact" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">Contact</Link>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <Link href="/auth/login" className="block w-full text-center px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300">
                  Login
                </Link>
                <Link href="/auth/register" className="block w-full text-center px-4 py-3 bg-[#6262bd] text-white rounded-xl font-medium">
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
                The Complete{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6262bd] to-purple-400">
                  Restaurant Management
                </span>{' '}
                Platform
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                From QR code menus to real-time analytics. Everything you need to run your restaurant smarter, faster, and more profitably.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-xl shadow-[#6262bd]/25 hover:shadow-2xl hover:shadow-[#6262bd]/30 hover:-translate-y-0.5"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <span>Contact Sales</span>
                </Link>
              </div>
            </div>

            {/* Right side - Hero Illustration */}
            <div className="relative lg:pl-8">
              <div className="relative">
                {/* Main dashboard mockup */}
                <svg viewBox="0 0 500 400" className="w-full h-auto">
                  {/* Filter definitions */}
                  <defs>
                    <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                    </filter>
                    <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6262bd" />
                      <stop offset="100%" stopColor="#8585d0" />
                    </linearGradient>
                  </defs>

                  {/* Background dashboard card */}
                  <rect x="40" y="30" width="420" height="340" rx="20" fill="white" filter="url(#heroShadow)" />

                  {/* Header */}
                  <rect x="40" y="30" width="420" height="60" rx="20" fill="url(#heroGradient)" />
                  <rect x="40" y="70" width="420" height="20" fill="url(#heroGradient)" />
                  <circle cx="80" cy="60" r="15" fill="white" opacity="0.2" />
                  <rect x="105" y="52" width="80" height="16" rx="4" fill="white" opacity="0.4" />

                  {/* Order cards */}
                  <g transform="translate(60, 110)">
                    {/* Order 1 - Ready */}
                    <rect x="0" y="0" width="115" height="95" rx="12" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" />
                    <rect x="12" y="12" width="45" height="14" rx="4" fill="#22c55e" />
                    <text x="34" y="23" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">READY</text>
                    <rect x="12" y="35" width="90" height="8" rx="2" fill="#bbf7d0" />
                    <rect x="12" y="50" width="70" height="8" rx="2" fill="#bbf7d0" />
                    <rect x="12" y="65" width="80" height="8" rx="2" fill="#bbf7d0" />
                    <text x="70" y="87" fontSize="11" fill="#16a34a" fontWeight="bold">Table 5</text>

                    {/* Order 2 - Cooking */}
                    <rect x="130" y="0" width="115" height="95" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                    <rect x="142" y="12" width="55" height="14" rx="4" fill="#f59e0b" />
                    <text x="169" y="23" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">COOKING</text>
                    <rect x="142" y="35" width="85" height="8" rx="2" fill="#fde68a" />
                    <rect x="142" y="50" width="65" height="8" rx="2" fill="#fde68a" />
                    <rect x="142" y="65" width="75" height="8" rx="2" fill="#fde68a" />
                    <text x="200" y="87" fontSize="11" fill="#d97706" fontWeight="bold">Table 8</text>

                    {/* Order 3 - New */}
                    <rect x="260" y="0" width="115" height="95" rx="12" fill="#ede9fe" stroke="#6262bd" strokeWidth="2" />
                    <rect x="272" y="12" width="35" height="14" rx="4" fill="#6262bd" />
                    <text x="289" y="23" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">NEW</text>
                    <rect x="272" y="35" width="80" height="8" rx="2" fill="#c4b5fd" />
                    <rect x="272" y="50" width="60" height="8" rx="2" fill="#c4b5fd" />
                    <rect x="272" y="65" width="70" height="8" rx="2" fill="#c4b5fd" />
                    <text x="330" y="87" fontSize="11" fill="#6262bd" fontWeight="bold">Table 3</text>

                    {/* Notification pulse */}
                    <circle cx="367" cy="8" r="10" fill="#ef4444">
                      <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.7;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="367" y="12" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">2</text>
                  </g>

                  {/* Stats row */}
                  <g transform="translate(60, 225)">
                    <rect x="0" y="0" width="90" height="55" rx="10" fill="#f8fafc" />
                    <text x="45" y="25" fontSize="18" fill="#1e293b" textAnchor="middle" fontWeight="bold">$2,458</text>
                    <text x="45" y="42" fontSize="10" fill="#64748b" textAnchor="middle">Today's Sales</text>

                    <rect x="105" y="0" width="90" height="55" rx="10" fill="#f8fafc" />
                    <text x="150" y="25" fontSize="18" fill="#1e293b" textAnchor="middle" fontWeight="bold">47</text>
                    <text x="150" y="42" fontSize="10" fill="#64748b" textAnchor="middle">Orders</text>

                    <rect x="210" y="0" width="90" height="55" rx="10" fill="#f8fafc" />
                    <text x="255" y="25" fontSize="18" fill="#22c55e" textAnchor="middle" fontWeight="bold">+12%</text>
                    <text x="255" y="42" fontSize="10" fill="#64748b" textAnchor="middle">vs Yesterday</text>

                    <rect x="315" y="0" width="60" height="55" rx="10" fill="#f8fafc" />
                    <text x="345" y="25" fontSize="18" fill="#1e293b" textAnchor="middle" fontWeight="bold">8</text>
                    <text x="345" y="42" fontSize="10" fill="#64748b" textAnchor="middle">Active</text>
                  </g>

                  {/* Mini chart */}
                  <g transform="translate(60, 295)">
                    <rect x="0" y="0" width="380" height="60" rx="10" fill="#f8fafc" />
                    <polyline
                      points="20,45 50,35 80,40 110,25 140,30 170,20 200,15 230,25 260,18 290,22 320,12 350,20"
                      fill="none"
                      stroke="#6262bd"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="350" cy="20" r="4" fill="#6262bd">
                      <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>
                </svg>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 hidden lg:block">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white">Order Complete</div>
                      <div className="text-xs text-slate-500">Table 5 • Just now</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 hidden lg:block">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#6262bd]/10 rounded-full flex items-center justify-center">
                      <span className="text-xl">🔔</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white">New Reservation</div>
                      <div className="text-xs text-slate-500">Tonight 7:30 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
              Features
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Everything Your Restaurant Needs
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              A complete suite of tools designed specifically for modern restaurants. From front-of-house to back-office, we've got you covered.
            </p>
          </div>

          {/* Feature Cards with Illustrations */}
          <div className="space-y-24">
            {features.map((feature, index) => {
              const Illustration = FeatureIllustrations[feature.id]
              const Icon = FeatureIcons[feature.id]
              const isReversed = index % 2 === 1

              return (
                <div
                  key={feature.id}
                  id={feature.id}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
                >
                  {/* Text Content */}
                  <div className={`${isReversed ? 'lg:order-2' : ''}`}>
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg mb-6`}>
                      {Icon}
                    </div>

                    {/* Content */}
                    <div className="text-xs font-semibold text-[#6262bd] dark:text-[#8585d0] uppercase tracking-wider mb-2">
                      {feature.subtitle}
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Benefits */}
                    <ul className="space-y-3 mb-8">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Learn More Link */}
                    <Link
                      href={feature.href}
                      className="inline-flex items-center space-x-2 text-[#6262bd] dark:text-[#8585d0] font-semibold hover:underline"
                    >
                      <span>Learn more about {feature.title}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Illustration */}
                  <div className={`${isReversed ? 'lg:order-1' : ''}`}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                      {Illustration && <Illustration />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
              How It Works
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Up and Running in Minutes
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Getting started with Veno App is simple. Set up your restaurant profile, configure your menu, and start accepting orders.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Account',
                description: 'Sign up for free and set up your restaurant profile with your branding, hours, and contact information.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                tag: 'Takes 2 minutes',
                color: 'from-[#6262bd] to-violet-500',
                bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                border: 'border-indigo-100 dark:border-indigo-800/40',
              },
              {
                step: '02',
                title: 'Configure Your Menu',
                description: 'Add your menu items with photos, descriptions, and prices. Organize them into categories and set availability.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                tag: 'Import or build from scratch',
                color: 'from-violet-500 to-purple-600',
                bg: 'bg-violet-50 dark:bg-violet-900/20',
                border: 'border-violet-100 dark:border-violet-800/40',
              },
              {
                step: '03',
                title: 'Start Taking Orders',
                description: 'Print your QR codes, place them on tables, and watch orders flow directly to your kitchen display.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                tag: 'Live instantly',
                color: 'from-emerald-500 to-teal-500',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                border: 'border-emerald-100 dark:border-emerald-800/40',
              },
            ].map((item, index) => (
              <div key={item.step} className={`relative rounded-2xl border-2 ${item.border} ${item.bg} p-8`}>
                {/* Step number — top left, always visible */}
                <div className="text-5xl font-black text-slate-300 dark:text-slate-600 leading-none mb-4 select-none">
                  {item.step}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-5`}>
                  {item.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5">{item.description}</p>

                {/* Tag */}
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item.tag}
                </div>

                {/* Connector arrow between cards — desktop only */}
                {index < 2 && (
                  <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-slate-800 rounded-full border-2 border-slate-100 dark:border-slate-700 items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-[#6262bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No Expensive Hardware Section */}
      <section id="no-hardware" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Illustration */}
            <div className="order-2 lg:order-1">
              <svg viewBox="0 0 500 400" className="w-full h-auto">
                <defs>
                  <filter id="devShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.18" />
                  </filter>
                  <linearGradient id="devGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6262bd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <clipPath id="laptopScreen">
                    <rect x="68" y="48" width="224" height="144" rx="4" />
                  </clipPath>
                  <clipPath id="phoneScreen">
                    <rect x="364" y="174" width="62" height="106" rx="6" />
                  </clipPath>
                  <clipPath id="tabletScreen">
                    <rect x="364" y="28" width="96" height="120" rx="4" />
                  </clipPath>
                </defs>

                {/* ── LAPTOP (left, prominent) ── */}
                {/* Screen bezel */}
                <rect x="56" y="36" width="248" height="168" rx="10" fill="#1e293b" filter="url(#devShadow)" />
                {/* Screen glass */}
                <rect x="68" y="48" width="224" height="144" rx="4" fill="#f8fafc" />
                <g clipPath="url(#laptopScreen)">
                  {/* App header */}
                  <rect x="68" y="48" width="224" height="32" fill="url(#devGrad)" />
                  <rect x="78" y="56" width="70" height="10" rx="3" fill="white" opacity="0.5" />
                  <rect x="256" y="58" width="28" height="8" rx="2" fill="white" opacity="0.3" />
                  {/* Sidebar */}
                  <rect x="68" y="80" width="44" height="112" fill="#1e293b" opacity="0.06" />
                  <rect x="74" y="88" width="32" height="6" rx="2" fill="#6262bd" opacity="0.5" />
                  <rect x="74" y="100" width="28" height="6" rx="2" fill="#94a3b8" opacity="0.4" />
                  <rect x="74" y="112" width="30" height="6" rx="2" fill="#94a3b8" opacity="0.4" />
                  <rect x="74" y="124" width="26" height="6" rx="2" fill="#94a3b8" opacity="0.4" />
                  {/* Order cards */}
                  <rect x="120" y="84" width="70" height="52" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="128" y="92" width="32" height="8" rx="2" fill="#22c55e" />
                  <rect x="128" y="106" width="50" height="6" rx="2" fill="#e2e8f0" />
                  <rect x="128" y="116" width="40" height="6" rx="2" fill="#e2e8f0" />
                  <text x="164" y="131" fontSize="8" fill="#22c55e" textAnchor="middle" fontWeight="bold">Table 4</text>

                  <rect x="198" y="84" width="70" height="52" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="206" y="92" width="38" height="8" rx="2" fill="#f59e0b" />
                  <rect x="206" y="106" width="50" height="6" rx="2" fill="#e2e8f0" />
                  <rect x="206" y="116" width="35" height="6" rx="2" fill="#e2e8f0" />
                  <text x="242" y="131" fontSize="8" fill="#f59e0b" textAnchor="middle" fontWeight="bold">Table 7</text>

                  {/* Stats row */}
                  <rect x="120" y="144" width="50" height="22" rx="4" fill="#f0fdf4" />
                  <text x="145" y="153" fontSize="7" fill="#64748b" textAnchor="middle">Sales Today</text>
                  <text x="145" y="163" fontSize="9" fill="#16a34a" textAnchor="middle" fontWeight="bold">£1,842</text>
                  <rect x="178" y="144" width="42" height="22" rx="4" fill="#ede9fe" />
                  <text x="199" y="153" fontSize="7" fill="#64748b" textAnchor="middle">Orders</text>
                  <text x="199" y="163" fontSize="9" fill="#6262bd" textAnchor="middle" fontWeight="bold">34</text>
                  <rect x="228" y="144" width="50" height="22" rx="4" fill="#fef3c7" />
                  <text x="253" y="153" fontSize="7" fill="#64748b" textAnchor="middle">Active</text>
                  <text x="253" y="163" fontSize="9" fill="#d97706" textAnchor="middle" fontWeight="bold">6</text>
                </g>
                {/* Laptop hinge + base */}
                <rect x="56" y="204" width="248" height="8" rx="2" fill="#334155" />
                <path d="M36 212 L324 212 L334 228 L26 228 Z" fill="#334155" />
                <ellipse cx="180" cy="220" rx="36" ry="4" fill="#475569" />
                {/* Label */}
                <rect x="116" y="234" width="128" height="20" rx="10" fill="#6262bd" opacity="0.1" />
                <text x="180" y="248" fontSize="9" fill="#6262bd" textAnchor="middle" fontWeight="bold">💻  Laptop / Desktop</text>

                {/* ── TABLET (top right) ── */}
                <rect x="360" y="20" width="112" height="140" rx="12" fill="#1e293b" filter="url(#devShadow)" />
                <rect x="364" y="28" width="96" height="120" rx="4" fill="#f8fafc" />
                <g clipPath="url(#tabletScreen)">
                  <rect x="364" y="28" width="96" height="22" fill="url(#devGrad)" />
                  <rect x="370" y="34" width="40" height="8" rx="2" fill="white" opacity="0.5" />
                  {/* Menu items */}
                  <rect x="368" y="56" width="88" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="372" y="60" width="40" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="368" y="76" width="88" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="372" y="80" width="52" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="368" y="96" width="88" height="16" rx="3" fill="#f1f5f9" />
                  <rect x="372" y="100" width="36" height="8" rx="2" fill="#cbd5e1" />
                  <rect x="368" y="118" width="88" height="22" rx="4" fill="#6262bd" />
                  <text x="412" y="133" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Send to Kitchen</text>
                </g>
                <circle cx="416" cy="152" r="5" fill="#475569" />
                <rect x="388" y="164" width="56" height="16" rx="8" fill="#6262bd" opacity="0.1" />
                <text x="416" y="176" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">📱  Tablet</text>

                {/* ── PHONE (bottom right) ── */}
                <rect x="360" y="192" width="80" height="138" rx="12" fill="#1e293b" filter="url(#devShadow)" />
                <rect x="364" y="204" width="72" height="116" rx="6" fill="#f8fafc" />
                {/* Notch */}
                <rect x="385" y="196" width="30" height="6" rx="3" fill="#334155" />
                <g clipPath="url(#phoneScreen)">
                  <rect x="364" y="204" width="72" height="22" fill="url(#devGrad)" />
                  <text x="400" y="219" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">New Order</text>
                  {/* Notification card */}
                  <rect x="368" y="232" width="64" height="38" rx="5" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <rect x="372" y="237" width="28" height="7" rx="2" fill="#22c55e" />
                  <rect x="372" y="248" width="52" height="5" rx="2" fill="#e2e8f0" />
                  <rect x="372" y="256" width="40" height="5" rx="2" fill="#e2e8f0" />
                  <rect x="368" y="274" width="64" height="14" rx="4" fill="#6262bd" />
                  <text x="400" y="284" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">Confirm</text>
                  {/* Home indicator */}
                  <rect x="385" y="306" width="30" height="3" rx="1.5" fill="#cbd5e1" />
                </g>
                <rect x="382" y="334" width="36" height="16" rx="8" fill="#6262bd" opacity="0.1" />
                <text x="400" y="346" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">📲  Phone</text>

                {/* ── Central sync badge ── */}
                <circle cx="340" cy="200" r="28" fill="white" filter="url(#devShadow)" />
                <circle cx="340" cy="200" r="22" fill="url(#devGrad)" opacity="0.12" />
                <circle cx="340" cy="200" r="16" fill="url(#devGrad)" />
                {/* Sync icon */}
                <path d="M333 196 a7 7 0 0 1 14 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M347 204 a7 7 0 0 1 -14 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M345 193 l2 3 l3 -1" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M335 207 l-2 -3 l-3 1" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Connector lines */}
                <line x1="304" y1="180" x2="325" y2="190" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
                <line x1="356" y1="185" x2="368" y2="130" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
                <line x1="356" y1="215" x2="368" y2="240" stroke="#6262bd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />

                {/* No hardware badge */}
                <rect x="26" y="278" width="148" height="44" rx="12" fill="url(#devGrad)" filter="url(#devShadow)" />
                <text x="100" y="297" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">✓  No extra hardware</text>
                <text x="100" y="313" fontSize="8" fill="white" textAnchor="middle" opacity="0.85">Works on what you already own</text>
              </svg>
            </div>

            {/* Right side - Text content */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
                Zero Hardware Costs
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Use the Devices You Already Own
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Forget about expensive POS terminals and proprietary hardware. Veno App works beautifully on any laptop, tablet, or smartphone you already have. No special equipment to buy, no technicians to install it.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: '💻',
                    title: 'Laptops & Desktops',
                    description: 'Perfect for back-office management and analytics',
                  },
                  {
                    icon: '📱',
                    title: 'Tablets',
                    description: 'Ideal for kitchen displays and floor management',
                  },
                  {
                    icon: '📲',
                    title: 'Smartphones',
                    description: 'Great for staff on the move and quick updates',
                  },
                ].map((device) => (
                  <div key={device.title} className="flex items-start space-x-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-2xl">{device.icon}</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{device.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{device.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">Save thousands on equipment</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Traditional POS systems can cost thousands. Veno App works on what you have.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
              Built for Every Venue
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              One Platform, Endless Possibilities
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Whether you run a cozy cafe, a bustling pub, or a high-volume takeaway, Veno App adapts to your unique needs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-lg border border-slate-100 dark:border-slate-700 hover:border-[#6262bd]/30 dark:hover:border-[#6262bd]/50 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{industry.icon}</div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{industry.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{industry.description}</p>
              </div>
            ))}
          </div>

          {/* Bookings beyond restaurants */}
          <div className="mt-20 rounded-3xl bg-gradient-to-br from-[#6262bd] to-violet-700 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left — pitch */}
              <div className="p-10 lg:p-14 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 w-fit">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Reservations Module
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                  The booking system built for <span className="text-violet-200">any appointment business</span>
                </h3>
                <p className="text-white/75 text-lg mb-8 leading-relaxed">
                  Our reservations module isn't just for restaurants. Any business that takes appointments can use it — online bookings, automatic confirmations, SMS reminders, and a clean calendar view for your team.
                </p>
                <ul className="space-y-3 mb-10">
                  {[
                    'Online booking page — 24/7, no phone calls needed',
                    'Email & SMS confirmations sent automatically',
                    'Deposit or booking fee collection via Stripe',
                    'Block or flag unreliable customers',
                  ].map(point => (
                    <li key={point} className="flex items-start gap-3 text-white/85 text-sm">
                      <svg className="w-4 h-4 text-violet-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/services/reservations"
                  className="inline-flex items-center gap-2 bg-white text-[#6262bd] font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-all w-fit shadow-lg"
                >
                  Explore the Reservations Module
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Right — business type grid */}
              <div className="bg-white/10 backdrop-blur-sm p-10 lg:p-14">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-6">Works for any appointment-based business</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '💇', label: 'Hair Salons' },
                    { icon: '✂️', label: 'Barber Shops' },
                    { icon: '💆', label: 'Massage & Wellness' },
                    { icon: '💅', label: 'Beauty & Nail Studios' },
                    { icon: '🦷', label: 'Dental Clinics' },
                    { icon: '🐾', label: 'Pet Grooming' },
                    { icon: '🔧', label: 'Tradespeople' },
                    { icon: '🏋️', label: 'Personal Trainers' },
                    { icon: '📸', label: 'Photographers' },
                    { icon: '🍽️', label: 'Restaurants' },
                    { icon: '🩺', label: 'Private Clinics' },
                    { icon: '🎨', label: 'Tattoo Studios' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-4 py-3">
                      <span className="text-xl">{icon}</span>
                      <span className="text-white text-sm font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Owners Love It Section */}
      <section id="why-veno-app" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
              Why Veno App?
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Built by Hospitality Experts, for Hospitality Experts
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              We understand the challenges of running a food business. That's why we built Veno App to solve real problems you face every day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Save Precious Time',
                description: 'Stop juggling paper orders and phone calls. Let technology handle the busy work so you can focus on what matters - your customers.',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Reduce Costly Errors',
                description: 'Misheard orders and scribbled notes cost money. Digital ordering means crystal-clear communication between customers and kitchen.',
                color: 'from-emerald-500 to-teal-500',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Boost Your Revenue',
                description: 'Faster table turns, higher order accuracy, and data-driven insights help you make more money from every service.',
                color: 'from-amber-500 to-orange-500',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Empower Your Team',
                description: 'Give your staff the tools they need to excel. Clear order displays, role-based access, and intuitive interfaces make training a breeze.',
                color: 'from-violet-500 to-purple-600',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Delight Your Customers',
                description: 'Modern diners expect seamless experiences. Give them the convenience they want while maintaining the personal touch they love.',
                color: 'from-pink-500 to-rose-500',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Make Smarter Decisions',
                description: "No more guessing. Real-time analytics show you exactly what's working, what's not, and where your opportunities lie.",
                color: 'from-slate-500 to-slate-700',
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-700 hover:border-[#6262bd]/30 dark:hover:border-[#6262bd]/50 transition-all hover:shadow-xl"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center text-white shadow-lg mb-6`}>
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-[#6262bd] to-purple-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Start your free trial today and see how Veno App can streamline your operations and delight your customers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all shadow-xl"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 border-2 border-white/30 rounded-xl font-semibold text-lg text-white hover:bg-white/10 transition-all"
            >
              <span>Contact Sales</span>
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">
            No credit card required. 2 weeks free trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
    </>
  )
}
