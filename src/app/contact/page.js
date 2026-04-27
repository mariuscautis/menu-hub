'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

const ENQUIRY_TYPES = [
  { value: 'Join', label: 'Join Veno App', redirect: '/auth/register' },
  { value: 'General Enquiries', label: 'General Enquiries' },
  { value: 'Technical Support', label: 'Technical Support' },
  { value: 'Partnerships', label: 'Partnerships' },
  { value: 'Other', label: 'Other' },
]

const BUSINESS_TYPES = [
  'Restaurant / Café / Bar',
  'Beauty & Wellness',
  'Fitness & Sport',
  'Health & Medical',
  'Hotel & Accommodation',
  'Entertainment & Events',
  'Education & Tutoring',
  'Other',
]

export default function ContactPage() {
  const seo = useSeoSettings('contact', {
    title: 'Contact Us — Veno App',
    description: 'Get in touch with the Veno App team.',
  })
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const turnstileRef = useRef(null)
  const [formData, setFormData] = useState({
    enquiryType: 'General Enquiries',
    firstName: '',
    lastName: '',
    businessName: '',
    businessType: '',
    location: '',
    phone: '',
    email: '',
    message: '',
    _trap: '',
  })

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    const existing = document.getElementById('cf-turnstile-script')
    const render = () => {
      if (window.turnstile && turnstileRef.current && !turnstileRef.current.dataset.rendered) {
        turnstileRef.current.dataset.rendered = '1'
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
          theme: 'dark',
          size: 'normal',
        })
      }
    }
    if (existing) { render(); return }
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true; script.defer = true; script.onload = render
    document.head.appendChild(script)
  }, [])

  const handleEnquiryType = (type) => {
    if (type.redirect) { router.push(type.redirect); return }
    setFormData(p => ({ ...p, enquiryType: type.value }))
  }

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, _turnstile: turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setSuccess(true)
      setTurnstileToken(null)
      if (window.turnstile && turnstileRef.current) window.turnstile.reset(turnstileRef.current)
      setFormData({ enquiryType: 'General Enquiries', firstName: '', lastName: '', businessName: '', businessType: '', location: '', phone: '', email: '', message: '', _trap: '' })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again or email us directly.')
    } finally { setLoading(false) }
  }

  const inputClass = "w-full px-4 py-3.5 rounded-sm bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-[#6262bd] text-zinc-100 placeholder:text-zinc-600 transition-colors text-sm"

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
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-28">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600 mb-6">Contact</p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-white max-w-2xl">
              Let's talk<br />
              <span style={{ color: '#6262bd' }}>about your venue.</span>
            </h1>
            <p className="mt-8 text-lg text-zinc-400 leading-relaxed max-w-lg">
              Whether you're curious about the platform, need help, or want to explore working together — we reply within one business day.
            </p>
          </div>
        </section>

        {/* ── Form split ───────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-px bg-zinc-800">

            {/* Left info */}
            <div className="bg-zinc-950 px-8 md:px-12 py-12 md:py-16 flex flex-col gap-10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-6">Reach us</p>
                <div className="space-y-6">
                  {[
                    { label: 'Email', value: 'hello@venoapp.com', href: 'mailto:hello@venoapp.com' },
                    { label: 'Response time', value: 'Within 1 business day' },
                    { label: 'Hours', value: 'Mon – Fri, 9am – 6pm (UK)' },
                  ].map(({ label, value, href }) => (
                    <div key={label}>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700 mb-1">{label}</p>
                      {href
                        ? <a href={href} className="text-sm text-zinc-300 hover:text-white transition-colors">{value}</a>
                        : <p className="text-sm text-zinc-400">{value}</p>
                      }
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-8">
                <p className="text-xs text-zinc-600 font-mono mb-4">Skip the queue</p>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: '#6262bd' }}
                >
                  Start free trial
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right form */}
            <div className="bg-zinc-950 px-8 md:px-12 py-12 md:py-16">
              {success ? (
                <div className="flex flex-col items-start gap-6 py-8">
                  <div className="w-12 h-12 rounded-full border border-zinc-700 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10l4.5 4.5 7.5-8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Message sent.</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">We'll get back to you within one business day.</p>
                  </div>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-sm font-mono text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Enquiry type */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">What can we help with?</label>
                    <div className="flex flex-wrap gap-2">
                      {ENQUIRY_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleEnquiryType(type)}
                          className={`px-4 py-2 rounded-none text-xs font-medium transition-all border ${
                            type.redirect
                              ? 'border-zinc-700 text-zinc-400 hover:border-[#6262bd] hover:text-[#6262bd]'
                              : formData.enquiryType === type.value
                              ? 'border-[#6262bd] text-white bg-[#6262bd]/20'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 bg-zinc-900'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className={inputClass} placeholder="Elena"/>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className={inputClass} placeholder="Rossi"/>
                    </div>
                  </div>

                  {/* Business */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Business Name</label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required className={inputClass} placeholder="Osteria Toscana"/>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Business Type</label>
                      <select name="businessType" value={formData.businessType} onChange={handleChange} required className={inputClass}>
                        <option value="">Select type…</option>
                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputClass} placeholder="London, UK"/>
                  </div>

                  {/* Contact */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClass} placeholder="+44 7911 123456"/>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="elena@osteria.co.uk"/>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">
                      Message <span className="normal-case font-normal text-zinc-700">(optional)</span>
                    </label>
                    <textarea name="message" value={formData.message} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Tell us about your venue…"/>
                  </div>

                  {/* Honeypot */}
                  <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <input type="text" name="_trap" value={formData._trap} onChange={handleChange} tabIndex={-1} autoComplete="off"/>
                  </div>

                  {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="flex justify-start"/>}

                  {error && (
                    <div className="px-4 py-3 rounded-lg border border-red-800/60 bg-red-950/40 text-xs text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (TURNSTILE_SITE_KEY && !turnstileToken)}
                    className="w-full py-4 rounded-none text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    style={{ backgroundColor: '#6262bd' }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Sending…
                      </span>
                    ) : 'Send message'}
                  </button>

                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── Info tiles ───────────────────────────────────────────────── */}
        <section className="border-b border-zinc-800">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800">
            {[
              { label: 'Email Us', note: 'hello@venoapp.com', action: <a href="mailto:hello@venoapp.com" className="text-xs font-mono mt-3 inline-block transition-colors" style={{ color: '#6262bd' }}>Send email</a> },
              { label: 'Help Centre', note: 'Answers to common questions about setup, features, and billing.', action: <Link href="/help" className="text-xs font-mono mt-3 inline-block transition-colors" style={{ color: '#6262bd' }}>Browse FAQs</Link> },
              { label: 'Start Today', note: 'Skip the queue — sign up and be live in under 15 minutes.', action: <Link href="/auth/register" className="text-xs font-mono mt-3 inline-block transition-colors" style={{ color: '#6262bd' }}>Start free trial</Link> },
            ].map(({ label, note, action }) => (
              <div key={label} className="bg-zinc-950 px-8 py-8">
                <p className="text-sm font-semibold text-white mb-2">{label}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{note}</p>
                {action}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section>
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 md:py-32">
            <div className="relative overflow-hidden rounded-2xl px-8 md:px-16 py-16 md:py-24" style={{ backgroundColor: '#0f0e1a' }}>
              <div className="absolute inset-0 opacity-30 blur-[80px]" style={{ background: 'radial-gradient(ellipse at 70% 50%, #6262bd, transparent 70%)' }} />
              <div className="absolute inset-0 rounded-2xl border border-[#6262bd]/20 pointer-events-none" />
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
                <div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                    Not ready<br />to talk yet?
                  </h2>
                  <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">Start your free trial and explore the platform at your own pace. No credit card required.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/auth/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-none text-sm font-semibold text-white transition-all active:scale-[0.97] whitespace-nowrap" style={{ backgroundColor: '#6262bd' }}>
                    Start free trial
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                  <Link href="/about" className="inline-flex items-center justify-center px-8 py-4 rounded-none text-sm font-semibold text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 transition-all whitespace-nowrap">
                    Learn about us
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
