'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import SiteFooter from '@/components/SiteFooter'
import PlatformLogo from '@/components/PlatformLogo'

const FEATURES_MENU = [
  { tag: '01', label: 'QR Menu', desc: 'Scan, browse, order', href: '/services/qr-menu' },
  { tag: '02', label: 'Table Ordering', desc: 'Straight to kitchen', href: '/services/table-ordering' },
  { tag: '03', label: 'Offline Hub', desc: 'No internet? No problem', href: '/services/offline-hub' },
  { tag: '04', label: 'Branded App', desc: 'Your name, your colours', href: '/services/branded-app' },
  { tag: '05', label: 'Staff & Rotas', desc: 'Schedules to clock-outs', href: '/services/staff-management' },
  { tag: '06', label: 'Kitchen Dashboard', desc: 'Live order board', href: '/services/dashboard' },
  { tag: '07', label: 'Analytics', desc: 'Numbers that matter', href: '/services/analytics' },
  { tag: '08', label: 'Reservations', desc: 'Bookings & reminders', href: '/services/reservations' },
  { tag: '09', label: 'Inventory', desc: 'Stock under control', href: '/services/inventory' },
]

const NAV_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function ServicePageLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const megaRef = useRef(null)
  const megaBtnRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mega menu on outside click
  useEffect(() => {
    if (!megaOpen) return
    const handler = (e) => {
      if (
        megaRef.current && !megaRef.current.contains(e.target) &&
        megaBtnRef.current && !megaBtnRef.current.contains(e.target)
      ) setMegaOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [megaOpen])

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white antialiased">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60' : 'bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/30'}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <PlatformLogo size="sm" stacked={false} darkMode={true} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Features mega trigger */}
            <button
              ref={megaBtnRef}
              onClick={() => setMegaOpen(o => !o)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-none transition-colors ${megaOpen ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}
            >
              Features
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {NAV_LINKS.map(l => (
              <Link key={l.label} href={l.href} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-none transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right CTA */}
          <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
            <Link href="/auth/login" className="text-sm text-zinc-500 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2.5 rounded-none text-sm font-medium text-white transition-all duration-200 active:scale-[0.97]"
              style={{ backgroundColor: '#6262bd' }}
            >
              Start free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden w-10 h-10 flex flex-col justify-center items-center gap-[5px] rounded-none bg-zinc-800 hover:bg-zinc-700 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 origin-center ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>

        {/* ── Mega menu ────────────────────────────────────────────────── */}
        <div
          ref={megaRef}
          className={`hidden lg:block absolute top-full left-0 right-0 border-b border-zinc-800 bg-zinc-950 overflow-hidden transition-all duration-300 ${megaOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="max-w-[1400px] mx-auto px-12 py-10">
            <div className="grid grid-cols-[200px_1fr] gap-12">
              {/* Left panel */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Platform</p>
                <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
                  Every tool<br />in one place.
                </h3>
                <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
                  Built for venues that can't afford downtime.
                </p>
                <Link
                  href="/pricing"
                  onClick={() => setMegaOpen(false)}
                  className="inline-flex items-center gap-2 mt-6 text-xs font-mono uppercase tracking-widest transition-colors"
                  style={{ color: '#6262bd' }}
                >
                  See pricing
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-3 gap-px bg-zinc-800/50">
                {FEATURES_MENU.map((f) => (
                  <Link
                    key={f.href}
                    href={f.href}
                    onClick={() => setMegaOpen(false)}
                    className="group bg-zinc-950 px-6 py-5 hover:bg-zinc-900 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[10px] text-zinc-700 mt-0.5 flex-shrink-0 group-hover:text-zinc-500 transition-colors">{f.tag}</span>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-white/90 transition-colors">{f.label}</p>
                        <p className="text-xs text-zinc-600 mt-0.5 group-hover:text-zinc-500 transition-colors">{f.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 border-t border-zinc-800 ${mobileOpen ? 'max-h-[600px]' : 'max-h-0 border-transparent'}`}>
          <div className="bg-zinc-950 px-6 py-6 flex flex-col gap-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2 px-2">Features</p>
            {FEATURES_MENU.map(f => (
              <Link
                key={f.href}
                href={f.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-2 py-2.5 text-sm text-zinc-300 hover:text-white rounded-none hover:bg-zinc-800/60 transition-colors"
              >
                <span className="font-mono text-[10px] text-zinc-600 w-5">{f.tag}</span>
                {f.label}
              </Link>
            ))}
            <div className="border-t border-zinc-800 mt-3 pt-4 flex flex-col gap-1">
              {NAV_LINKS.map(l => (
                <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="px-2 py-2.5 text-sm text-zinc-400 hover:text-white rounded-none hover:bg-zinc-800/60 transition-colors">
                  {l.label}
                </Link>
              ))}
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="mt-3 text-center px-5 py-3 rounded-none text-sm font-medium text-white"
                style={{ backgroundColor: '#6262bd' }}
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="pt-16">{children}</main>

      <SiteFooter />
    </div>
  )
}
