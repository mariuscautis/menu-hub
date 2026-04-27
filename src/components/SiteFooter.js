'use client'

import Link from 'next/link'
import PlatformLogo from '@/components/PlatformLogo'

const PRODUCT_LINKS = [
  { label: 'QR Menu', href: '/services/qr-menu' },
  { label: 'Table Ordering', href: '/services/table-ordering' },
  { label: 'Offline Hub', href: '/services/offline-hub' },
  { label: 'Branded App', href: '/services/branded-app' },
  { label: 'Staff & Rotas', href: '/services/staff-management' },
  { label: 'Analytics', href: '/services/analytics' },
  { label: 'Reservations', href: '/services/reservations' },
  { label: 'Inventory', href: '/services/inventory' },
  { label: 'Pricing', href: '/pricing' },
]

const COMPANY_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Help Centre', href: '/help' },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
]

export default function SiteFooter() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-12 md:gap-16 py-16 md:py-20">

          {/* Brand column */}
          <div className="max-w-xs">
            {/* Logo mark */}
            <Link href="/" className="inline-flex items-center mb-6">
              <PlatformLogo size="sm" stacked={false} darkMode={true} />
            </Link>

            <p className="text-sm text-zinc-500 leading-relaxed">
              The complete operating system for venues that can't afford downtime. QR menus, orders, staff, and analytics — one platform, one bill.
            </p>

            {/* Social */}
            <div className="flex items-center gap-4 mt-8">
              <Link
                href="https://www.linkedin.com/in/veno-app-9a80a63b8/"
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </Link>
              <Link
                href="https://www.facebook.com/profile.php?id=61580769582877"
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                aria-label="Facebook"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 mb-5">Product</p>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 mb-5">Company</p>
            <ul className="space-y-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 mb-5">Legal</p>
            <ul className="space-y-3">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800/60 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-zinc-700">
            © {new Date().getFullYear()} Veno App. All rights reserved.
          </p>
          <Link
            href="/auth/register"
            className="font-mono text-[11px] transition-colors"
            style={{ color: '#6262bd' }}
          >
            Start free — no credit card
          </Link>
        </div>

      </div>
    </footer>
  )
}
