'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function ContactPage() {
  const seo = useSeoSettings('contact', {
    title: 'Contact Us — Veno App',
    description: 'Get in touch with the Veno App team. We\'d love to hear from you — whether it\'s a question, feedback, or a partnership enquiry.',
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

  // Load Turnstile script and render widget
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
          theme: 'light',
          size: 'normal',
        })
      }
    }
    if (existing) { render(); return }
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = render
    document.head.appendChild(script)
  }, [])

  const enquiryTypes = [
    { value: 'Join', label: '🚀 Join Veno App', redirect: '/auth/register' },
    { value: 'General Enquiries', label: '💬 General Enquiries' },
    { value: 'Technical Support', label: '🔧 Technical Support' },
    { value: 'Partnerships', label: '🤝 Partnerships' },
    { value: 'Other', label: '✉️ Other' },
  ]

  const businessTypes = [
    'Restaurant / Café / Bar',
    'Beauty & Wellness',
    'Fitness & Sport',
    'Health & Medical',
    'Hotel & Accommodation',
    'Entertainment & Events',
    'Education & Tutoring',
    'Other',
  ]

  const handleEnquiryType = (type) => {
    if (type.redirect) {
      router.push(type.redirect)
      return
    }
    setFormData({ ...formData, enquiryType: type.value })
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, _turnstile: turnstileToken }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')

      setSuccess(true)
      setTurnstileToken(null)
      if (window.turnstile && turnstileRef.current) window.turnstile.reset(turnstileRef.current)
      setFormData({
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
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again or email us directly.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder:text-slate-400 transition-colors text-sm"

  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    <ServicePageLayout>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-6">
              Get in Touch
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-5">
              We'd love to hear from you
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Whether you're curious about the platform, need help, or want to explore working together — our team is here and happy to talk.
            </p>
          </div>

          {/* Split panel */}
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row">

            {/* Left — info panel */}
            <div className="lg:w-5/12 flex flex-col justify-between p-8 lg:p-10" style={{background:'linear-gradient(145deg,#4f4fa8 0%,#6262bd 50%,#8b6fd4 100%)'}}>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Let's talk</h2>
                <p className="text-white/70 text-sm mb-8">Fill in the form and we'll get back to you within one business day.</p>

                <div className="space-y-5">
                  {[
                    {
                      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                      label: 'Email',
                      value: 'hello@venoapp.com',
                      href: 'mailto:hello@venoapp.com',
                    },
                    {
                      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                      label: 'Response time',
                      value: 'Within 1 business day',
                    },
                    {
                      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
                      label: 'General enquiries',
                      value: 'Mon – Fri, 9am – 6pm (UK)',
                    },
                  ].map(({ icon, label, value, href }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">{icon}</div>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wide font-semibold">{label}</p>
                        {href
                          ? <a href={href} className="text-white font-medium hover:underline text-sm">{value}</a>
                          : <p className="text-white font-medium text-sm">{value}</p>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/20">
                <p className="text-white/60 text-xs mb-3">Ready to get started right away?</p>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 bg-white text-[#6262bd] px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Start free trial →
                </Link>
              </div>
            </div>

            {/* Right — form */}
            <div className="flex-1 bg-white dark:bg-slate-800 p-8 lg:p-10">
              {success ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Message sent!</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
                    Thanks for reaching out. We'll get back to you within one business day.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-all"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Enquiry type chips */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
                      What can we help you with?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {enquiryTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleEnquiryType(type)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                            type.redirect
                              ? 'border-[#6262bd] bg-[#6262bd]/10 text-[#6262bd] hover:bg-[#6262bd] hover:text-white dark:text-[#a78bfa]'
                              : formData.enquiryType === type.value
                              ? 'bg-[#6262bd] text-white border-[#6262bd]'
                              : 'bg-transparent border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-[#6262bd] hover:text-[#6262bd]'
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
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className={inputClass} placeholder="John"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className={inputClass} placeholder="Smith"/>
                    </div>
                  </div>

                  {/* Business */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Business Name</label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required className={inputClass} placeholder="Your Venue Name"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Business Type</label>
                      <select name="businessType" value={formData.businessType} onChange={handleChange} required className={inputClass}>
                        <option value="">Select type…</option>
                        {businessTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Location</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputClass} placeholder="City, Country"/>
                  </div>

                  {/* Contact */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClass} placeholder="+1 234 567 890"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="you@yourvenue.com"/>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      Message <span className="normal-case font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea name="message" value={formData.message} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Tell us more about your venue and how we can help…"/>
                  </div>

                  {/* Honeypot — hidden from humans, visible to bots */}
                  <div style={{position:'absolute',left:'-9999px',opacity:0,pointerEvents:'none'}} aria-hidden="true">
                    <input
                      type="text"
                      name="_trap"
                      value={formData._trap}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Turnstile widget */}
                  {TURNSTILE_SITE_KEY && (
                    <div ref={turnstileRef} className="flex justify-start"/>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (TURNSTILE_SITE_KEY && !turnstileToken)}
                    className="w-full bg-[#6262bd] text-white px-6 py-4 rounded-xl font-semibold text-base hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#6262bd]/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Sending…
                      </span>
                    ) : 'Send Message →'}
                  </button>

                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Info tiles */}
      <section className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                title: 'Email Us',
                description: 'Reach us any time. We aim to reply within 24 hours on business days.',
                action: <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline font-semibold text-sm">hello@venoapp.com</a>,
              },
              {
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                title: 'Help Centre',
                description: 'Find answers to common questions about setup, features, and billing.',
                action: <Link href="/help" className="text-[#6262bd] hover:underline font-semibold text-sm">Browse FAQs →</Link>,
              },
              {
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
                title: 'Start Today',
                description: 'Skip the queue — sign up and be live in under 5 minutes. No card needed.',
                action: <Link href="/auth/register" className="text-[#6262bd] hover:underline font-semibold text-sm">Start free trial →</Link>,
              },
            ].map(({ icon, title, description, action }) => (
              <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 flex gap-5 items-start">
                <div className="w-12 h-12 rounded-xl bg-[#6262bd]/10 flex items-center justify-center text-[#6262bd] shrink-0">{icon}</div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 leading-relaxed">{description}</p>
                  {action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#6262bd] to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-5">Not ready to talk yet?</h2>
          <p className="text-xl text-white/80 mb-10">
            No problem. Start your free trial and explore the platform at your own pace. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all">
              Start Free Trial
            </Link>
            <Link href="/about" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
              Learn About Us
            </Link>
          </div>
        </div>
      </section>

    </ServicePageLayout>
    </>
  )
}
