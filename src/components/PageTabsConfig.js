/**
 * Centralised tab configuration for each section.
 * Each tab may include: href, label, icon (JSX), description (optional).
 * Import the relevant config in each page file.
 */

const icon = (path, extra = '') => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    {extra && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={extra} />}
  </svg>
)

// Pills-only — menu already has a prominent hub page
export const menuNavTabs = [
  { href: '/dashboard/menu/items', label: 'Menu Items' },
  { href: '/dashboard/menu/categories', label: 'Categories' },
]

// Pills-only — stock already has a prominent hub page
export const stockNavTabs = [
  { href: '/dashboard/stock/products', label: 'Food Stock' },
  { href: '/dashboard/stock/inventory', label: 'Inventory' },
  { href: '/dashboard/stock/purchasing-invoices', label: 'Invoices' },
]

// Pills-only — analytics already has a prominent hub page
export const analyticsTabs = [
  { href: '/dashboard/analytics/overview', label: 'Overview' },
  { href: '/dashboard/analytics/tables', label: 'Tables' },
  { href: '/dashboard/analytics/staff', label: 'Staff' },
  { href: '/dashboard/analytics/losses', label: 'Losses' },
  { href: '/dashboard/analytics/labor', label: 'Labor' },
]

// Pills-only (no icons) — reports already has prominent card tiles on its overview page
export const reportsNavTabs = [
  { href: '/dashboard/reports', label: 'Overview' },
  { href: '/dashboard/reports/z-report', label: 'Z-Report' },
  { href: '/dashboard/reports/x-report', label: 'X-Report' },
  { href: '/dashboard/reports/weekly', label: 'Weekly' },
  { href: '/dashboard/reports/monthly', label: 'Monthly' },
  { href: '/dashboard/reports/tax', label: 'Tax' },
  { href: '/dashboard/reports/sales-balance', label: 'Sales Balance' },
  { href: '/dashboard/reports/stock-movement', label: 'Stock Movement' },
]

export const reportsTabs = [
  {
    href: '/dashboard/reports',
    label: 'Overview',
    icon: icon('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'),
  },
  {
    href: '/dashboard/reports/z-report',
    label: 'Z-Report',
    icon: icon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  },
  {
    href: '/dashboard/reports/x-report',
    label: 'X-Report',
    icon: icon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  },
  {
    href: '/dashboard/reports/weekly',
    label: 'Weekly',
    icon: icon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'),
  },
  {
    href: '/dashboard/reports/monthly',
    label: 'Monthly',
    icon: icon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'),
  },
  {
    href: '/dashboard/reports/tax',
    label: 'Tax',
    icon: icon('M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'),
  },
  {
    href: '/dashboard/reports/sales-balance',
    label: 'Sales Balance',
    icon: icon('M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'),
  },
  {
    href: '/dashboard/reports/stock-movement',
    label: 'Stock Movement',
    icon: icon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
  },
]

export const staffTabs = [
  {
    href: '/dashboard/staff',
    label: 'Staff Members',
    icon: icon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'),
  },
  {
    href: '/dashboard/rota',
    label: 'Rota',
    icon: icon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'),
  },
  {
    href: '/dashboard/time-off-requests',
    label: 'Time Off',
    icon: icon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'),
  },
  {
    href: '/dashboard/settings/departments',
    label: 'Departments',
    icon: icon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
  },
]

export const settingsTabs = [
  {
    href: '/dashboard/settings/restaurant-info',
    label: 'Restaurant',
    icon: icon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
  },
  {
    href: '/dashboard/settings/tax-invoicing',
    label: 'Tax & Invoicing',
    icon: icon('M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z'),
  },
  {
    href: '/dashboard/settings/product-tax',
    label: 'Product Tax',
    icon: icon('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z'),
  },
  {
    href: '/dashboard/settings/discounts',
    label: 'Discounts',
    icon: icon('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  },
  {
    href: '/dashboard/settings/security',
    label: 'Security',
    icon: icon('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'),
  },
  {
    href: '/dashboard/settings/billing',
    label: 'Billing',
    icon: icon('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'),
  },
  {
    href: '/dashboard/settings/other-options',
    label: 'Other Options',
    icon: icon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'),
  },
  {
    href: '/dashboard/settings/data-migration',
    label: 'Data Migration',
    icon: icon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'),
  },
]
