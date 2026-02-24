'use client'

import Link from 'next/link'
import { useState } from 'react'

// Service categories for mega menu
const services = {
  features: {
    title: 'Features',
    description: 'Everything your venue needs',
    items: [
      {
        name: 'Digital QR Menu',
        description: 'Contactless menus via smartphone',
        icon: '📱',
        href: '#digital-menu',
      },
      {
        name: 'Table Ordering',
        description: 'Customers order directly from tables',
        icon: '🍽️',
        href: '#table-ordering',
      },
      {
        name: 'Staff Dashboard',
        description: 'Kitchen & bar order management',
        icon: '👨‍🍳',
        href: '#staff-dashboard',
      },
      {
        name: 'Business Analytics',
        description: 'Sales trends and insights',
        icon: '📈',
        href: '#analytics',
      },
      {
        name: 'Reservations',
        description: 'Online booking with confirmations',
        icon: '📅',
        href: '#reservations',
      },
      {
        name: 'Inventory Management',
        description: 'Stock tracking and cost control',
        icon: '📦',
        href: '#inventory',
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
    title: 'Why Menu Hub?',
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
        href: '#why-menu-hub',
      },
      {
        name: 'Reduce Errors',
        description: 'Digital ordering means clarity',
        icon: '✅',
        href: '#why-menu-hub',
      },
      {
        name: 'Boost Revenue',
        description: 'Data-driven growth insights',
        icon: '📊',
        href: '#why-menu-hub',
      },
    ],
  },
}

// Feature modules for the main content
const features = [
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
      {/* Phone frame */}
      <rect x="130" y="30" width="140" height="240" rx="20" fill="#1e293b" />
      <rect x="138" y="45" width="124" height="210" rx="12" fill="#f8fafc" />

      {/* QR Code */}
      <rect x="160" y="65" width="80" height="80" rx="8" fill="#6262bd" opacity="0.1" />
      <g fill="#6262bd">
        <rect x="170" y="75" width="15" height="15" rx="2" />
        <rect x="195" y="75" width="15" height="15" rx="2" />
        <rect x="220" y="75" width="15" height="15" rx="2" />
        <rect x="170" y="100" width="15" height="15" rx="2" />
        <rect x="195" y="100" width="15" height="15" rx="2" />
        <rect x="220" y="100" width="15" height="15" rx="2" />
        <rect x="170" y="125" width="15" height="15" rx="2" />
        <rect x="195" y="125" width="15" height="15" rx="2" />
        <rect x="220" y="125" width="15" height="15" rx="2" />
      </g>

      {/* Menu items */}
      <rect x="148" y="160" width="104" height="24" rx="6" fill="#e2e8f0" />
      <rect x="148" y="190" width="80" height="24" rx="6" fill="#e2e8f0" />
      <rect x="148" y="220" width="90" height="24" rx="6" fill="#e2e8f0" />

      {/* Scan effect circles */}
      <circle cx="200" cy="105" r="60" fill="none" stroke="#6262bd" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" values="50;70;50" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="200" cy="105" r="45" fill="none" stroke="#6262bd" strokeWidth="2" opacity="0.5">
        <animate attributeName="r" values="35;55;35" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Floating menu card */}
      <g transform="translate(280, 80)">
        <rect x="0" y="0" width="100" height="120" rx="12" fill="white" filter="url(#shadow)" />
        <rect x="10" y="10" width="80" height="50" rx="8" fill="#e2e8f0" />
        <rect x="10" y="70" width="60" height="10" rx="3" fill="#cbd5e1" />
        <rect x="10" y="90" width="40" height="10" rx="3" fill="#6262bd" />
        <text x="60" y="100" fontSize="12" fill="#6262bd" fontWeight="bold">$12</text>
      </g>

      {/* Filter definition */}
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
        </filter>
      </defs>
    </svg>
  ),
  'table-ordering': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Table */}
      <ellipse cx="200" cy="200" rx="150" ry="60" fill="#f1f5f9" />
      <ellipse cx="200" cy="190" rx="150" ry="60" fill="#e2e8f0" />

      {/* Plate 1 */}
      <circle cx="130" cy="175" r="35" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="130" cy="175" r="25" fill="#fef3c7" />

      {/* Plate 2 */}
      <circle cx="270" cy="175" r="35" fill="white" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="270" cy="175" r="25" fill="#fee2e2" />

      {/* QR code stand */}
      <rect x="185" y="140" width="30" height="50" rx="4" fill="#1e293b" />
      <rect x="188" y="145" width="24" height="30" rx="2" fill="white" />
      <g fill="#6262bd">
        <rect x="191" y="148" width="6" height="6" rx="1" />
        <rect x="200" y="148" width="6" height="6" rx="1" />
        <rect x="191" y="157" width="6" height="6" rx="1" />
        <rect x="200" y="157" width="6" height="6" rx="1" />
        <rect x="191" y="166" width="6" height="6" rx="1" />
        <rect x="200" y="166" width="6" height="6" rx="1" />
      </g>

      {/* Phone with order */}
      <g transform="translate(90, 40)">
        <rect x="0" y="0" width="70" height="120" rx="10" fill="#1e293b" />
        <rect x="4" y="10" width="62" height="100" rx="6" fill="#f8fafc" />
        <rect x="10" y="20" width="50" height="12" rx="3" fill="#6262bd" />
        <rect x="10" y="40" width="40" height="8" rx="2" fill="#e2e8f0" />
        <rect x="10" y="54" width="35" height="8" rx="2" fill="#e2e8f0" />
        <rect x="10" y="68" width="45" height="8" rx="2" fill="#e2e8f0" />
        <rect x="10" y="90" width="50" height="16" rx="4" fill="#10b981" />
        <text x="35" y="102" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">ORDER</text>
      </g>

      {/* Order flow arrows */}
      <path d="M165 90 Q200 50 235 90" fill="none" stroke="#6262bd" strokeWidth="2" strokeDasharray="5,5">
        <animate attributeName="stroke-dashoffset" values="0;-10" dur="1s" repeatCount="indefinite" />
      </path>
      <circle cx="200" cy="50" r="3" fill="#6262bd">
        <animate attributeName="cy" values="70;50;70" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Kitchen notification */}
      <g transform="translate(250, 30)">
        <rect x="0" y="0" width="100" height="70" rx="10" fill="white" filter="url(#shadow)" />
        <circle cx="20" cy="20" r="10" fill="#fef3c7" />
        <text x="20" y="24" fontSize="12" textAnchor="middle">🍳</text>
        <rect x="38" y="14" width="50" height="8" rx="2" fill="#e2e8f0" />
        <rect x="38" y="26" width="35" height="6" rx="2" fill="#cbd5e1" />
        <rect x="10" y="45" width="80" height="16" rx="4" fill="#10b981" />
        <text x="50" y="56" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">NEW ORDER</text>
      </g>
    </svg>
  ),
  'staff-dashboard': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Monitor frame */}
      <rect x="50" y="30" width="300" height="200" rx="12" fill="#1e293b" />
      <rect x="60" y="40" width="280" height="170" rx="6" fill="#f8fafc" />

      {/* Dashboard header */}
      <rect x="70" y="50" width="260" height="30" rx="4" fill="#6262bd" />
      <circle cx="85" cy="65" r="8" fill="white" opacity="0.3" />
      <rect x="100" y="60" width="60" height="10" rx="2" fill="white" opacity="0.5" />

      {/* Order cards */}
      <g>
        {/* Order 1 - Ready */}
        <rect x="70" y="90" width="80" height="70" rx="6" fill="white" stroke="#10b981" strokeWidth="2" />
        <rect x="78" y="98" width="30" height="8" rx="2" fill="#10b981" />
        <rect x="78" y="112" width="60" height="6" rx="2" fill="#e2e8f0" />
        <rect x="78" y="122" width="45" height="6" rx="2" fill="#e2e8f0" />
        <rect x="78" y="140" width="64" height="14" rx="3" fill="#10b981" opacity="0.2" />
        <text x="110" y="151" fontSize="8" fill="#10b981" textAnchor="middle" fontWeight="bold">READY</text>
      </g>

      <g>
        {/* Order 2 - In Progress */}
        <rect x="160" y="90" width="80" height="70" rx="6" fill="white" stroke="#f59e0b" strokeWidth="2" />
        <rect x="168" y="98" width="30" height="8" rx="2" fill="#f59e0b" />
        <rect x="168" y="112" width="60" height="6" rx="2" fill="#e2e8f0" />
        <rect x="168" y="122" width="50" height="6" rx="2" fill="#e2e8f0" />
        <rect x="168" y="140" width="64" height="14" rx="3" fill="#f59e0b" opacity="0.2" />
        <text x="200" y="151" fontSize="8" fill="#f59e0b" textAnchor="middle" fontWeight="bold">COOKING</text>
      </g>

      <g>
        {/* Order 3 - New */}
        <rect x="250" y="90" width="80" height="70" rx="6" fill="white" stroke="#6262bd" strokeWidth="2" />
        <rect x="258" y="98" width="30" height="8" rx="2" fill="#6262bd" />
        <rect x="258" y="112" width="55" height="6" rx="2" fill="#e2e8f0" />
        <rect x="258" y="122" width="40" height="6" rx="2" fill="#e2e8f0" />
        <rect x="258" y="140" width="64" height="14" rx="3" fill="#6262bd" opacity="0.2" />
        <text x="290" y="151" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">NEW</text>
        {/* Notification badge */}
        <circle cx="322" cy="95" r="10" fill="#ef4444">
          <animate attributeName="r" values="10;12;10" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="322" y="99" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">!</text>
      </g>

      {/* Stats row */}
      <rect x="70" y="170" width="60" height="30" rx="4" fill="#f0fdf4" />
      <text x="100" y="190" fontSize="10" fill="#16a34a" textAnchor="middle" fontWeight="bold">12 Done</text>

      <rect x="140" y="170" width="60" height="30" rx="4" fill="#fef3c7" />
      <text x="170" y="190" fontSize="10" fill="#d97706" textAnchor="middle" fontWeight="bold">5 Active</text>

      <rect x="210" y="170" width="60" height="30" rx="4" fill="#ede9fe" />
      <text x="240" y="190" fontSize="10" fill="#6262bd" textAnchor="middle" fontWeight="bold">3 New</text>

      {/* Monitor stand */}
      <rect x="175" y="230" width="50" height="15" rx="2" fill="#cbd5e1" />
      <rect x="165" y="245" width="70" height="8" rx="4" fill="#94a3b8" />
    </svg>
  ),
  'analytics': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Chart container */}
      <rect x="40" y="40" width="320" height="220" rx="16" fill="white" filter="url(#shadow)" />

      {/* Chart header */}
      <rect x="55" y="55" width="100" height="12" rx="3" fill="#1e293b" />
      <rect x="55" y="72" width="60" height="8" rx="2" fill="#94a3b8" />

      {/* Revenue number */}
      <text x="280" y="68" fontSize="24" fill="#10b981" textAnchor="end" fontWeight="bold">$24,580</text>
      <text x="280" y="82" fontSize="10" fill="#94a3b8" textAnchor="end">+12% vs last week</text>

      {/* Bar chart */}
      <g transform="translate(55, 100)">
        {/* Grid lines */}
        <line x1="0" y1="0" x2="290" y2="0" stroke="#e2e8f0" strokeDasharray="4" />
        <line x1="0" y1="35" x2="290" y2="35" stroke="#e2e8f0" strokeDasharray="4" />
        <line x1="0" y1="70" x2="290" y2="70" stroke="#e2e8f0" strokeDasharray="4" />
        <line x1="0" y1="105" x2="290" y2="105" stroke="#e2e8f0" />

        {/* Bars */}
        <rect x="10" y="55" width="30" height="50" rx="4" fill="#6262bd" opacity="0.3" />
        <rect x="50" y="35" width="30" height="70" rx="4" fill="#6262bd" opacity="0.4" />
        <rect x="90" y="45" width="30" height="60" rx="4" fill="#6262bd" opacity="0.5" />
        <rect x="130" y="25" width="30" height="80" rx="4" fill="#6262bd" opacity="0.6" />
        <rect x="170" y="15" width="30" height="90" rx="4" fill="#6262bd" opacity="0.8" />
        <rect x="210" y="5" width="30" height="100" rx="4" fill="#6262bd">
          <animate attributeName="height" values="90;100;90" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y" values="15;5;15" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="250" y="20" width="30" height="85" rx="4" fill="#6262bd" opacity="0.7" />

        {/* Labels */}
        <text x="25" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Mon</text>
        <text x="65" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Tue</text>
        <text x="105" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Wed</text>
        <text x="145" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Thu</text>
        <text x="185" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Fri</text>
        <text x="225" y="120" fontSize="8" fill="#6262bd" textAnchor="middle" fontWeight="bold">Sat</text>
        <text x="265" y="120" fontSize="8" fill="#94a3b8" textAnchor="middle">Sun</text>
      </g>

      {/* Pie chart */}
      <g transform="translate(320, 180)">
        <circle cx="0" cy="0" r="35" fill="none" stroke="#6262bd" strokeWidth="12" strokeDasharray="55 165" />
        <circle cx="0" cy="0" r="35" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="35 185" strokeDashoffset="-55" />
        <circle cx="0" cy="0" r="35" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="30 190" strokeDashoffset="-90" />
        <circle cx="0" cy="0" r="20" fill="white" />
      </g>

      {/* Trend arrow */}
      <g transform="translate(290, 55)">
        <path d="M0 10 L8 0 L16 10 M8 0 L8 18" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  ),
  'reservations': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Calendar */}
      <rect x="60" y="40" width="280" height="220" rx="16" fill="white" filter="url(#shadow)" />

      {/* Calendar header */}
      <rect x="60" y="40" width="280" height="50" rx="16" fill="#6262bd" />
      <rect x="60" y="75" width="280" height="15" fill="#6262bd" />
      <text x="200" y="72" fontSize="16" fill="white" textAnchor="middle" fontWeight="bold">February 2026</text>

      {/* Day headers */}
      <g transform="translate(75, 105)">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <text key={i} x={i * 38} y="0" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="bold">{day}</text>
        ))}
      </g>

      {/* Calendar days */}
      <g transform="translate(75, 125)">
        {/* Row 1 */}
        <text x="0" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">26</text>
        <text x="38" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">27</text>
        <text x="76" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">28</text>
        <text x="114" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">29</text>
        <text x="152" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">30</text>
        <text x="190" y="0" fontSize="12" fill="#cbd5e1" textAnchor="middle">31</text>
        <text x="228" y="0" fontSize="12" fill="#1e293b" textAnchor="middle">1</text>

        {/* Row 2 */}
        <text x="0" y="28" fontSize="12" fill="#1e293b" textAnchor="middle">2</text>
        <text x="38" y="28" fontSize="12" fill="#1e293b" textAnchor="middle">3</text>
        <text x="76" y="28" fontSize="12" fill="#1e293b" textAnchor="middle">4</text>
        <text x="114" y="28" fontSize="12" fill="#1e293b" textAnchor="middle">5</text>

        {/* Highlighted day */}
        <circle cx="152" cy="24" r="14" fill="#6262bd" />
        <text x="152" y="28" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">6</text>

        <text x="190" y="28" fontSize="12" fill="#1e293b" textAnchor="middle">7</text>
        <circle cx="228" cy="24" r="14" fill="#10b981" opacity="0.2" />
        <text x="228" y="28" fontSize="12" fill="#10b981" textAnchor="middle" fontWeight="bold">8</text>

        {/* Row 3 */}
        <text x="0" y="56" fontSize="12" fill="#1e293b" textAnchor="middle">9</text>
        <text x="38" y="56" fontSize="12" fill="#1e293b" textAnchor="middle">10</text>
        <text x="76" y="56" fontSize="12" fill="#1e293b" textAnchor="middle">11</text>
        <circle cx="114" cy="52" r="14" fill="#f59e0b" opacity="0.2" />
        <text x="114" y="56" fontSize="12" fill="#f59e0b" textAnchor="middle" fontWeight="bold">12</text>
        <text x="152" y="56" fontSize="12" fill="#1e293b" textAnchor="middle">13</text>
        <circle cx="190" cy="52" r="14" fill="#6262bd" opacity="0.2" />
        <text x="190" y="56" fontSize="12" fill="#6262bd" textAnchor="middle">14</text>
        <circle cx="228" cy="52" r="14" fill="#10b981" opacity="0.2" />
        <text x="228" y="56" fontSize="12" fill="#10b981" textAnchor="middle">15</text>
      </g>

      {/* Reservation card */}
      <g transform="translate(75, 210)">
        <rect x="0" y="0" width="250" height="40" rx="8" fill="#6262bd" opacity="0.1" />
        <circle cx="20" cy="20" r="12" fill="#6262bd" opacity="0.2" />
        <text x="20" y="24" fontSize="12" textAnchor="middle">👤</text>
        <text x="40" y="16" fontSize="11" fill="#1e293b" fontWeight="bold">Johnson Party - Table 5</text>
        <text x="40" y="30" fontSize="9" fill="#64748b">7:30 PM • 4 guests</text>
        <rect x="180" y="10" width="60" height="20" rx="4" fill="#10b981" />
        <text x="210" y="24" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">CONFIRMED</text>
      </g>
    </svg>
  ),
  'inventory': () => (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Shelving unit */}
      <rect x="60" y="50" width="280" height="200" rx="8" fill="#f1f5f9" />

      {/* Shelves */}
      <rect x="60" y="100" width="280" height="4" fill="#cbd5e1" />
      <rect x="60" y="165" width="280" height="4" fill="#cbd5e1" />
      <rect x="60" y="230" width="280" height="4" fill="#cbd5e1" />

      {/* Items on shelf 1 */}
      <g transform="translate(75, 60)">
        <rect x="0" y="0" width="35" height="38" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <text x="17" y="28" fontSize="16" textAnchor="middle">🧈</text>
        <rect x="45" y="0" width="35" height="38" rx="4" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
        <text x="62" y="28" fontSize="16" textAnchor="middle">🥛</text>
        <rect x="90" y="8" width="35" height="30" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
        <text x="107" y="30" fontSize="14" textAnchor="middle">🍅</text>
        {/* Low stock alert */}
        <circle cx="115" cy="12" r="8" fill="#ef4444">
          <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="115" y="16" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">!</text>
        <rect x="135" y="0" width="35" height="38" rx="4" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <text x="152" y="28" fontSize="16" textAnchor="middle">🧀</text>
      </g>

      {/* Items on shelf 2 */}
      <g transform="translate(75, 115)">
        <rect x="0" y="0" width="40" height="48" rx="4" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" />
        <text x="20" y="32" fontSize="18" textAnchor="middle">🍷</text>
        <rect x="50" y="0" width="40" height="48" rx="4" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" />
        <text x="70" y="32" fontSize="18" textAnchor="middle">🍷</text>
        <rect x="100" y="10" width="30" height="38" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <text x="115" y="36" fontSize="16" textAnchor="middle">🫒</text>
        <rect x="140" y="5" width="45" height="43" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
        <text x="162" y="34" fontSize="18" textAnchor="middle">📦</text>
      </g>

      {/* Items on shelf 3 */}
      <g transform="translate(75, 178)">
        <rect x="0" y="0" width="60" height="50" rx="4" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
        <text x="30" y="32" fontSize="10" fill="#16a34a" textAnchor="middle" fontWeight="bold">FLOUR</text>
        <text x="30" y="44" fontSize="8" fill="#16a34a" textAnchor="middle">5kg</text>
        <rect x="70" y="0" width="60" height="50" rx="4" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
        <text x="100" y="32" fontSize="10" fill="#16a34a" textAnchor="middle" fontWeight="bold">SUGAR</text>
        <text x="100" y="44" fontSize="8" fill="#16a34a" textAnchor="middle">2kg</text>
        <rect x="140" y="0" width="50" height="50" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <text x="165" y="32" fontSize="10" fill="#d97706" textAnchor="middle" fontWeight="bold">RICE</text>
        <text x="165" y="44" fontSize="8" fill="#d97706" textAnchor="middle">Low</text>
      </g>

      {/* Inventory stats panel */}
      <g transform="translate(250, 60)">
        <rect x="0" y="0" width="80" height="95" rx="8" fill="white" filter="url(#shadow)" />
        <text x="40" y="20" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">STOCK LEVEL</text>

        {/* Progress bars */}
        <rect x="10" y="32" width="60" height="6" rx="3" fill="#e2e8f0" />
        <rect x="10" y="32" width="50" height="6" rx="3" fill="#22c55e" />
        <text x="10" y="48" fontSize="7" fill="#64748b">Dairy</text>

        <rect x="10" y="55" width="60" height="6" rx="3" fill="#e2e8f0" />
        <rect x="10" y="55" width="20" height="6" rx="3" fill="#ef4444" />
        <text x="10" y="71" fontSize="7" fill="#64748b">Produce</text>

        <rect x="10" y="78" width="60" height="6" rx="3" fill="#e2e8f0" />
        <rect x="10" y="78" width="40" height="6" rx="3" fill="#f59e0b" />
        <text x="10" y="94" fontSize="7" fill="#64748b">Dry Goods</text>
      </g>
    </svg>
  ),
}

// Icons for feature cards
const FeatureIcons = {
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
}

export default function HomePage() {
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6262bd] to-[#8585d0] rounded-xl flex items-center justify-center shadow-lg shadow-[#6262bd]/20">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-slate-800 dark:text-white">Menu Hub</span>
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
          <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
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
              Getting started with Menu Hub is simple. Set up your restaurant profile, configure your menu, and start accepting orders.
            </p>
          </div>

          <div className="relative">
            {/* Connection line for desktop */}
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#6262bd]/20 via-[#6262bd] to-[#6262bd]/20"></div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: '01',
                  title: 'Create Your Account',
                  description: 'Sign up for free and set up your restaurant profile with your branding, hours, and contact information.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  step: '02',
                  title: 'Configure Your Menu',
                  description: 'Add your menu items with photos, descriptions, and prices. Organize them into categories and set availability.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ),
                },
                {
                  step: '03',
                  title: 'Start Taking Orders',
                  description: 'Print your QR codes, place them on tables, and watch orders flow directly to your kitchen display.',
                  icon: (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <div key={item.step} className="relative text-center">
                  {/* Step circle */}
                  <div className="relative inline-flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#6262bd] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#6262bd]/25 mb-6 relative z-10">
                      {item.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-2 border-[#6262bd]">
                      <span className="text-sm font-bold text-[#6262bd]">{item.step}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
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
                  <filter id="deviceShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Laptop */}
                <g transform="translate(50, 80)">
                  <rect x="0" y="0" width="200" height="130" rx="8" fill="#1e293b" />
                  <rect x="8" y="8" width="184" height="114" rx="4" fill="#f8fafc" />
                  {/* Screen content */}
                  <rect x="16" y="16" width="168" height="20" rx="4" fill="#6262bd" />
                  <rect x="16" y="44" width="50" height="35" rx="4" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1" />
                  <rect x="72" y="44" width="50" height="35" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
                  <rect x="128" y="44" width="56" height="35" rx="4" fill="#ede9fe" stroke="#6262bd" strokeWidth="1" />
                  <rect x="16" y="86" width="168" height="28" rx="4" fill="#f1f5f9" />
                  {/* Laptop base */}
                  <path d="M-10 130 L210 130 L220 145 L-20 145 Z" fill="#334155" />
                  <ellipse cx="100" cy="137" rx="30" ry="3" fill="#475569" />
                </g>

                {/* Tablet */}
                <g transform="translate(280, 50)">
                  <rect x="0" y="0" width="120" height="170" rx="12" fill="#1e293b" filter="url(#deviceShadow)" />
                  <rect x="6" y="12" width="108" height="146" rx="6" fill="#f8fafc" />
                  {/* Screen content */}
                  <rect x="12" y="20" width="96" height="16" rx="3" fill="#6262bd" />
                  <rect x="12" y="44" width="44" height="50" rx="4" fill="#e2e8f0" />
                  <rect x="62" y="44" width="46" height="50" rx="4" fill="#e2e8f0" />
                  <rect x="12" y="100" width="96" height="12" rx="3" fill="#f1f5f9" />
                  <rect x="12" y="118" width="70" height="12" rx="3" fill="#f1f5f9" />
                  <rect x="12" y="136" width="96" height="16" rx="4" fill="#10b981" />
                  {/* Home button */}
                  <circle cx="60" cy="163" r="4" fill="#475569" />
                </g>

                {/* Smartphone */}
                <g transform="translate(320, 230)">
                  <rect x="0" y="0" width="70" height="130" rx="10" fill="#1e293b" filter="url(#deviceShadow)" />
                  <rect x="4" y="12" width="62" height="106" rx="6" fill="#f8fafc" />
                  {/* Screen content */}
                  <rect x="8" y="18" width="54" height="12" rx="2" fill="#6262bd" />
                  <rect x="8" y="36" width="54" height="30" rx="3" fill="#e2e8f0" />
                  <rect x="8" y="72" width="40" height="8" rx="2" fill="#f1f5f9" />
                  <rect x="8" y="84" width="54" height="8" rx="2" fill="#f1f5f9" />
                  <rect x="8" y="98" width="54" height="14" rx="3" fill="#10b981" />
                  {/* Notch */}
                  <rect x="22" y="4" width="26" height="6" rx="3" fill="#475569" />
                </g>

                {/* Checkmarks */}
                <g transform="translate(180, 260)">
                  <circle cx="0" cy="0" r="20" fill="#10b981" />
                  <path d="M-8 0 L-3 5 L8 -6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* "Works on" labels */}
                <text x="150" y="320" fontSize="12" fill="#64748b" textAnchor="middle" fontWeight="500">Laptop</text>
                <text x="340" y="320" fontSize="12" fill="#64748b" textAnchor="middle" fontWeight="500">Tablet</text>
                <text x="355" y="380" fontSize="12" fill="#64748b" textAnchor="middle" fontWeight="500">Phone</text>

                {/* No cost badge */}
                <g transform="translate(30, 280)">
                  <rect x="0" y="0" width="100" height="40" rx="20" fill="#6262bd" />
                  <text x="50" y="18" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">NO EXTRA</text>
                  <text x="50" y="32" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">HARDWARE</text>
                </g>
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
                Forget about expensive POS terminals and proprietary hardware. Menu Hub works beautifully on any laptop, tablet, or smartphone you already have. No special equipment to buy, no technicians to install it.
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
                    <p className="text-sm text-green-600 dark:text-green-400">Traditional POS systems can cost thousands. Menu Hub works on what you have.</p>
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
              Whether you run a cozy cafe, a bustling pub, or a high-volume takeaway, Menu Hub adapts to your unique needs.
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
        </div>
      </section>

      {/* Why Owners Love It Section */}
      <section id="why-menu-hub" className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-full text-[#6262bd] dark:text-[#8585d0] text-sm font-semibold mb-4">
              Why Menu Hub?
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Built by Hospitality Experts, for Hospitality Experts
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              We understand the challenges of running a food business. That's why we built Menu Hub to solve real problems you face every day.
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
            Start your free trial today and see how Menu Hub can streamline your operations and delight your customers.
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
            No credit card required. 1 month free trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6262bd] to-[#8585d0] rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <span className="text-2xl font-bold text-white">Menu Hub</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                The complete restaurant management platform. Simplify operations, delight customers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/services/qr-menu" className="hover:text-white transition-colors">QR Menu</Link></li>
                <li><Link href="/services/table-ordering" className="hover:text-white transition-colors">Table Ordering</Link></li>
                <li><Link href="/services/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link href="/services/reservations" className="hover:text-white transition-colors">Reservations</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">System Status</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Menu Hub. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="https://linkedin.com" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </Link>
              <Link href="https://facebook.com" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
