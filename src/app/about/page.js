'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

function FadeIn({ children, delay = 0, className = '', dir = 'up' }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  const from = dir === 'left' ? 'translateX(-24px)' : dir === 'right' ? 'translateX(24px)' : 'translateY(20px)'
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translate(0)' : from, transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

const VALUES = [
  { num: '01', title: 'Simplicity First', desc: 'Technology should make life easier, not harder. Every feature is designed so anyone can use it — no learning curve, no manual needed.' },
  { num: '02', title: 'Customer Obsessed', desc: 'Your success is our success. We listen to venue owners, understand their challenges, and build solutions that make a real difference.' },
  { num: '03', title: 'Continuous Innovation', desc: 'The hospitality industry evolves, and so do we. We constantly improve the platform to stay ahead of what venues actually need.' },
  { num: '04', title: 'Transparent Partnership', desc: 'No hidden fees, no locked contracts, no surprises. Honest relationships built on trust — that\'s the only way we operate.' },
]

export default function AboutPage() {
  const seo = useSeoSettings('about', {
    title: 'About Us — Veno App',
    description: 'Learn about the team behind Veno App and our mission to simplify restaurant management for independent venues everywhere.',
  })

  return (
    <>
      {seo.title && <title>{seo.title}</title>}
      {seo.description && <meta name="description" content={seo.description} />}
      {seo.title && <meta property="og:title" content={seo.title} />}
      {seo.description && <meta property="og:description" content={seo.description} />}
      <meta property="og:type" content="website" />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta name="twitter:card" content={seo.ogImage ? 'summary_large_image' : 'summary'} />
      {seo.title && <meta name="twitter:title" content={seo.title} />}
      {seo.description && <meta name="twitter:description" content={seo.description} />}
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}

      <ServicePageLayout>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-800">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#6262bd 1px,transparent 1px),linear-gradient(90deg,#6262bd 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px]" style={{ backgroundColor: '#6262bd' }} />
          <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-24 md:py-36">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-16 items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-6">About</p>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-white">
                  Built for<br />venue owners.<br />
                  <span style={{ color: '#6262bd' }}>Not accountants.</span>
                </h1>
              </div>
              <div className="md:self-end">
                <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                  We believe running a venue should be about creating memorable experiences — not wrestling with outdated tools, scattered platforms, or mounting admin costs.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/auth/register" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97]" style={{ backgroundColor: '#6262bd' }}>
                    Start free trial
                  </Link>
                  <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all">
                    Get in touch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Our Story ────────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <FadeIn dir="left">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Our story</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Where it started.</h2>
              </FadeIn>
              <FadeIn delay={100}>
                <div className="space-y-5 text-base text-zinc-400 leading-relaxed max-w-2xl">
                  <p>Veno App was born from a simple observation: venue owners spend countless hours on tasks that technology should handle effortlessly.</p>
                  <p>We saw passionate restaurateurs, cafe owners, and hospitality professionals struggling with outdated systems, juggling multiple platforms, and watching their margins shrink under mounting operational costs.</p>
                  <p>We knew there had to be a better way. So we built a platform that brings everything together — menus, orders, staff, analytics, and bookings — all under one roof, designed for the real challenges of running a venue.</p>
                  <p>Today, Veno App helps venues of all sizes streamline their operations, reduce costs, and focus on what truly matters: delivering exceptional experiences.</p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── Before / After ───────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800">
              {/* Before */}
              <FadeIn dir="left" className="bg-zinc-950 p-8 md:p-12">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 mb-8">Before Veno App</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Printing menus', 'Manual orders', 'Paper rotas', 'Separate POS', 'No analytics', 'Phone bookings'].map(item => (
                    <div key={item} className="px-4 py-3 border border-zinc-800 rounded-lg">
                      <div className="w-1 h-1 rounded-full bg-red-800 mb-2" />
                      <p className="text-sm text-zinc-600">{item}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
              {/* After */}
              <FadeIn dir="right" delay={80} className="bg-zinc-900/50 p-8 md:p-12">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-8">With Veno App</p>
                <div className="grid grid-cols-2 gap-3">
                  {['QR menus', 'Table ordering', 'Staff portal', 'Live analytics', 'Online bookings', 'One dashboard'].map(item => (
                    <div key={item} className="px-4 py-3 border border-zinc-700/60 rounded-lg">
                      <div className="w-1 h-1 rounded-full mb-2" style={{ backgroundColor: '#6262bd' }} />
                      <p className="text-sm text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── Mission stats ─────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Mission</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">What we're<br />here for.</h2>
                <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                  Empower venue owners with technology that simplifies operations, reduces costs, and lets them focus on their passion — not paperwork.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800">
                {[
                  { stat: '80%', label: 'Less admin time', accent: '#6262bd' },
                  { stat: '50%', label: 'Average cost reduction', accent: '#10b981' },
                  { stat: '2×', label: 'Faster table turnover', accent: '#f59e0b' },
                ].map(({ stat, label, accent }, i) => (
                  <FadeIn key={label} delay={i * 80} className="bg-zinc-950 px-8 py-8">
                    <p className="text-5xl font-bold tracking-tight" style={{ color: accent }}>{stat}</p>
                    <p className="text-sm text-zinc-500 mt-2">{label}</p>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ───────────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Values</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">What we stand for.</h2>
              </div>
              <div>
                {VALUES.map((v, i) => (
                  <FadeIn key={v.num} delay={i * 80} className="border-t border-zinc-800 py-8 grid grid-cols-[40px_1fr] gap-6">
                    <span className="font-mono text-xs text-zinc-700 mt-1">{v.num}</span>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">{v.title}</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">{v.desc}</p>
                    </div>
                  </FadeIn>
                ))}
                <div className="border-t border-zinc-800" />
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section>
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
            <div className="relative overflow-hidden rounded-2xl px-8 md:px-16 py-16 md:py-24" style={{ backgroundColor: '#0f0e1a' }}>
              <div className="absolute inset-0 opacity-30 blur-[80px]" style={{ background: 'radial-gradient(ellipse at 30% 50%, #6262bd, transparent 70%)' }} />
              <div className="absolute inset-0 rounded-2xl border border-[#6262bd]/20 pointer-events-none" />
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
                <div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                    Ready to transform<br /><span style={{ color: '#6262bd' }}>your venue?</span>
                  </h2>
                  <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">Two weeks free. No card. Up and running the same day.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97] whitespace-nowrap" style={{ backgroundColor: '#6262bd' }}>
                    Start free trial
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <Link href="/contact" className="inline-flex items-center justify-center px-8 py-4 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all whitespace-nowrap">
                    Contact our team
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </ServicePageLayout>
    </>
  )
}
