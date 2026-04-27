'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import SiteFooter from '@/components/SiteFooter'
import PlatformLogo from '@/components/PlatformLogo'

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const STATS = [
  { value: 'One bill.', label: 'QR menus, orders, staff & analytics' },
  { value: '98.4%', label: 'Uptime, 12-month average' },
  { value: '£0', label: 'Hardware to buy' },
  { value: '11 min', label: 'Average setup time' },
]

const FEATURES = [
  {
    id: 'qr-menu',
    tag: '01',
    title: 'QR Menu',
    body: 'Customers scan, browse, and order from their own device. No app download. No hardware. Update prices in seconds.',
    href: '/services/qr-menu',
    accent: '#6262bd',
  },
  {
    id: 'table-ordering',
    tag: '02',
    title: 'Table Ordering',
    body: 'Orders route straight to kitchen and bar the moment a guest taps confirm. Fewer errors, faster turns, happier tables.',
    href: '/services/table-ordering',
    accent: '#0ea5e9',
  },
  {
    id: 'offline-hub',
    tag: '03',
    title: 'Offline Hub',
    body: 'Internet cuts out — service keeps going. Every order queues locally and syncs the moment connection returns.',
    href: '/services/offline-hub',
    accent: '#10b981',
  },
  {
    id: 'branded-app',
    tag: '04',
    title: 'Branded App',
    body: 'Your logo, your colors, your name. Guests install it like any real app. Built on Veno, invisible to them.',
    href: '/services/branded-app',
    accent: '#f59e0b',
  },
  {
    id: 'staff',
    tag: '05',
    title: 'Staff & Rotas',
    body: 'Schedules, clock-ins, leave requests, and kitchen displays — all in one place. No spreadsheets.',
    href: '/services/staff-management',
    accent: '#ec4899',
  },
  {
    id: 'analytics',
    tag: '06',
    title: 'Analytics',
    body: 'Sales trends, peak hours, best sellers. The numbers that actually affect your margin — readable at a glance.',
    href: '/services/analytics',
    accent: '#f97316',
  },
]

const INDUSTRIES = [
  { name: 'Restaurants', note: 'Fine dining · casual eateries' },
  { name: 'Cafes', note: 'Quick service · specialty coffee' },
  { name: 'Pubs & Bars', note: 'Drinks · food · atmosphere' },
  { name: 'Takeaways', note: 'Fast food · delivery-first' },
  { name: 'Food Trucks', note: 'Mobile · pop-up · events' },
  { name: 'Hotels', note: 'Room service · in-house dining' },
]

// ─── Marquee strip ────────────────────────────────────────────────────────────

function Marquee() {
  const words = ['QR Menus', 'Table Orders', 'Staff Rotas', 'Analytics', 'Offline Mode', 'Branded Apps', 'Reservations', 'Inventory']
  const doubled = [...words, ...words]
  return (
    <div className="overflow-hidden border-y border-zinc-800 py-4 bg-zinc-950">
      <div className="marquee-track flex gap-16 whitespace-nowrap">
        {doubled.map((w, i) => (
          <span key={i} className="text-sm font-mono tracking-widest uppercase text-zinc-500 flex-shrink-0">
            {w}
            <span className="ml-16 text-[#6262bd]">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function StatCard({ value, label, index }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="border-l border-zinc-800 pl-6 first:border-l-0 first:pl-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.6s ease ${index * 120}ms, transform 0.6s ease ${index * 120}ms`,
      }}
    >
      <p className="text-3xl md:text-4xl font-bold tracking-tighter text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">{label}</p>
    </div>
  )
}

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({ feature, i }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const isEven = i % 2 === 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-0 border-t border-zinc-800 group cursor-pointer transition-colors duration-300 hover:bg-zinc-900/50 ${isEven ? '' : 'md:grid-cols-[2fr_1fr]'}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : `translateX(${isEven ? '-24px' : '24px'})`,
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {/* Number + title block */}
      <div className={`flex items-center gap-6 px-8 md:px-12 py-10 md:py-14 ${!isEven ? 'md:order-2' : ''}`}>
        <span className="font-mono text-xs text-zinc-600 mt-1 w-6 flex-shrink-0">{feature.tag}</span>
        <div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white group-hover:text-white/90 transition-colors">
            {feature.title}
          </h3>
          <Link
            href={feature.href}
            className="inline-flex items-center gap-2 mt-4 text-xs uppercase tracking-widest font-mono transition-colors"
            style={{ color: feature.accent }}
          >
            Learn more
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Body block */}
      <div className={`px-8 md:px-12 py-10 md:py-14 flex items-center border-t md:border-t-0 md:border-l border-zinc-800 ${!isEven ? 'md:order-1 md:border-l-0 md:border-r' : ''}`}>
        <p className="text-base text-zinc-400 leading-relaxed max-w-md">{feature.body}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef(null)
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white font-sans antialiased">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60' : 'bg-transparent'}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <PlatformLogo size="sm" stacked={false} darkMode={true} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <Link key={l.label} href={l.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
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
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden w-10 h-10 flex flex-col justify-center items-center gap-[5px] rounded-sm bg-zinc-800 hover:bg-zinc-700 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block h-[2px] w-5 bg-zinc-100 transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-80 border-b border-zinc-800' : 'max-h-0'}`}>
          <div className="bg-zinc-950 px-6 pb-6 pt-2 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="text-sm text-zinc-300 hover:text-white transition-colors py-1">
                {l.label}
              </Link>
            ))}
            <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="mt-2 text-center px-5 py-3 rounded-none text-sm font-medium text-white" style={{ backgroundColor: '#6262bd' }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex flex-col justify-end overflow-hidden" ref={heroRef}>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#6262bd 1px, transparent 1px), linear-gradient(90deg, #6262bd 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]" style={{ backgroundColor: '#6262bd' }} />

        {/* Content — bottom-anchored, left-offset */}
        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 pb-20 md:pb-28 pt-32 w-full">
          <div
            className="max-w-3xl"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.9s ease, transform 0.9s ease',
            }}
          >
            {/* Eyebrow */}
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-8">
              Restaurant operating system
            </p>

            {/* Headline — deliberately large and un-centered */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] text-white">
              Run your<br />
              venue like<br />
              <span style={{ color: '#6262bd' }}>you mean it.</span>
            </h1>

            {/* Sub */}
            <p className="mt-8 text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl">
              QR menus, table ordering, staff rotas, kitchen displays, and analytics — one platform, works on hardware you already own.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-none text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97] active:-translate-y-px"
                style={{ backgroundColor: '#6262bd' }}
              >
                Start for free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-none text-sm font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all duration-200 active:scale-[0.97]"
              >
                See pricing
              </Link>
            </div>

            {/* Trust note */}
            <p className="mt-6 text-xs text-zinc-600 font-mono">
              No credit card · cancel anytime · 14-day free trial
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 right-12 hidden md:flex flex-col items-center gap-2"
          style={{ opacity: heroVisible ? 0.4 : 0, transition: 'opacity 1.2s ease 0.6s' }}
        >
          <div className="w-px h-12 bg-zinc-600 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 rotate-90 origin-bottom translate-y-6">scroll</span>
        </div>
      </section>

      {/* ── Marquee ────────────────────────────────────────────────────── */}
      <Marquee />

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="border-b border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
            {STATS.map((s, i) => <StatCard key={i} {...s} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="border-b border-zinc-800">
        {/* Section header — deliberately off-center */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-20 md:pt-28 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">What's included</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                Every tool.<br />One bill.
              </h2>
            </div>
            <p className="text-zinc-400 leading-relaxed text-base max-w-lg md:self-end">
              Built for venues that can't afford downtime. Everything works offline, syncs automatically, and runs on devices your staff already have.
            </p>
          </div>
        </div>

        {/* Feature rows */}
        <div className="max-w-[1400px] mx-auto">
          {FEATURES.map((f, i) => <FeatureRow key={f.id} feature={f} i={i} />)}
        </div>
      </section>

      {/* ── Industries ─────────────────────────────────────────────────── */}
      <section className="border-b border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 md:gap-24 items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Built for</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">Every venue type.</h2>
              <p className="mt-4 text-zinc-500 text-sm leading-relaxed">
                If food or drink moves through it, Veno runs it.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800">
              {INDUSTRIES.map((ind, i) => (
                <IndustryCell key={i} {...ind} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ───────────────────────────────────────────────────── */}
      <section>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="relative overflow-hidden rounded-2xl px-8 md:px-16 py-16 md:py-24" style={{ backgroundColor: '#0f0e1a' }}>
            {/* Glow */}
            <div className="absolute inset-0 opacity-30 blur-[80px]" style={{ background: 'radial-gradient(ellipse at 30% 50%, #6262bd, transparent 70%)' }} />
            {/* 1px border */}
            <div className="absolute inset-0 rounded-2xl border border-[#6262bd]/20 pointer-events-none" />

            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">Ready when you are</p>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                  Set up in<br />
                  <span style={{ color: '#6262bd' }}>11 minutes.</span>
                </h2>
                <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">
                  Upload your menu, generate a QR code, print it. That's the whole setup. No consultants, no training days.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-none text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97] whitespace-nowrap"
                  style={{ backgroundColor: '#6262bd' }}
                >
                  Start for free
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all duration-200 whitespace-nowrap"
                >
                  Talk to us first
                </Link>
                <p className="text-center text-[11px] text-zinc-700 font-mono">No card needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Marquee CSS */}
      <style jsx global>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 28s linear infinite;
          width: max-content;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}

// ─── Industry cell ────────────────────────────────────────────────────────────

function IndustryCell({ name, note, index }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="bg-zinc-950 px-8 py-8 group hover:bg-zinc-900 transition-colors duration-200"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      <p className="text-lg font-semibold tracking-tight text-white group-hover:text-white transition-colors">{name}</p>
      <p className="text-xs text-zinc-600 mt-1 font-mono">{note}</p>
    </div>
  )
}
