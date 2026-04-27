'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'

function FadeIn({ children, delay = 0, className = '', dir = 'up' }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  const from = dir === 'left' ? 'translateX(-20px)' : dir === 'right' ? 'translateX(20px)' : 'translateY(16px)'
  return (
    <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translate(0)' : from, transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

/**
 * ServiceInnerPage — dark-themed service page shell.
 *
 * Props:
 *   tag          string   "01"
 *   category     string   "QR Menu"
 *   title        string   Main H1 headline
 *   titleAccent  string   Highlighted part of title (appended, colored)
 *   subtitle     string   Hero paragraph
 *   accent       string   CSS color for accents "#6262bd"
 *   features     [{ label, desc }]   Bullet features for hero
 *   benefits     [{ title, desc }]   Grid of benefit cards
 *   stats        [{ value, label }]  Three numbers
 *   howItWorks   [{ step, title, desc }]
 */
export default function ServiceInnerPage({
  tag,
  category,
  title,
  titleAccent,
  subtitle,
  accent = '#6262bd',
  features = [],
  benefits = [],
  stats = [],
  howItWorks = [],
}) {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="border-b border-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(#6262bd 1px,transparent 1px),linear-gradient(90deg,#6262bd 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-[140px]" style={{ backgroundColor: accent }} />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
          <Link href="/#features" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors mb-10">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            All features
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[10px] text-zinc-700">{tag}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">{category}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[0.95] text-white">
                {title}
                {titleAccent && (
                  <><br /><span style={{ color: accent }}>{titleAccent}</span></>
                )}
              </h1>
              <p className="mt-7 text-base text-zinc-400 leading-relaxed max-w-lg">{subtitle}</p>

              {features.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0" style={{ color: accent }}>
                        <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/auth/register" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97]" style={{ backgroundColor: accent }}>
                  Start free trial
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all">
                  Contact sales
                </Link>
              </div>
            </div>

            {/* Stats side */}
            {stats.length > 0 && (
              <div className="md:pt-16">
                <div className="grid grid-cols-1 gap-px bg-zinc-800">
                  {stats.map(({ value, label }, i) => (
                    <FadeIn key={label} delay={i * 80} className="bg-zinc-950 px-8 py-8">
                      <p className="text-5xl font-bold tracking-tight" style={{ color: accent }}>{value}</p>
                      <p className="text-sm text-zinc-500 mt-2">{label}</p>
                    </FadeIn>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      {benefits.length > 0 && (
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Why it works</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">Built for real venues.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-zinc-800">
                {benefits.map(({ title, desc }, i) => (
                  <FadeIn key={title} delay={i * 60} className="bg-zinc-950 px-7 py-7">
                    <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      {howItWorks.length > 0 && (
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-16 items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-4">Setup</p>
                <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">How it works.</h2>
              </div>
              <div>
                {howItWorks.map(({ step, title, desc }, i) => (
                  <FadeIn key={step} delay={i * 80} className="border-t border-zinc-800 py-8 grid grid-cols-[48px_1fr] gap-6">
                    <span className="font-mono text-[10px] text-zinc-700 mt-1">{step}</span>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                    </div>
                  </FadeIn>
                ))}
                <div className="border-t border-zinc-800" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="relative overflow-hidden rounded-2xl px-8 md:px-16 py-16 md:py-24" style={{ backgroundColor: '#0f0e1a' }}>
            <div className="absolute inset-0 opacity-30 blur-[80px]" style={{ background: `radial-gradient(ellipse at 30% 50%, ${accent}, transparent 70%)` }} />
            <div className="absolute inset-0 rounded-2xl border pointer-events-none" style={{ borderColor: `${accent}30` }} />
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                  Try it free.<br />
                  <span style={{ color: accent }}>14 days, no card.</span>
                </h2>
                <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">Up and running in under 15 minutes. No consultants, no training days.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97] whitespace-nowrap" style={{ backgroundColor: accent }}>
                  Start free trial
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
                <Link href="/pricing" className="inline-flex items-center justify-center px-8 py-4 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all whitespace-nowrap">
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
