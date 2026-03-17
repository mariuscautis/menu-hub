'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PlatformLogo from '@/components/PlatformLogo'


const DEFAULT_VENUE_TYPES = [
  { value: 'beauty',     label: 'Beauty & Wellness' },
  { value: 'fitness',    label: 'Fitness & Sport' },
  { value: 'health',     label: 'Health & Medical' },
  { value: 'restaurant', label: 'Restaurant / Café / Bar' },
]

const inputClass = "w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white placeholder:text-slate-400 transition-colors text-sm"

export default function RegisterInterest() {
  const [venueTypes, setVenueTypes] = useState(DEFAULT_VENUE_TYPES)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    venueName: '',
    venueType: '',
    venueTypeOther: '',
    country: '',
  })

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()
      .then(({ data }) => {
        if (data?.value?.length) {
          setVenueTypes([...data.value].sort((a, b) => a.label.localeCompare(b.label)))
        }
      })
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/register-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          venueName: formData.venueName,
          venueType: formData.venueType,
          venueTypeOther: formData.venueTypeOther,
          country: formData.country,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">You're on the list!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Thanks for registering your interest. We'll be in touch as soon as Veno App launches in your country — you'll be one of the first to know.
          </p>
          <Link href="/" className="inline-block bg-[#6262bd] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#5252a3] transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10" style={{background:'linear-gradient(145deg,#4f4fa8 0%,#6262bd 50%,#8b6fd4 100%)'}}>
        <Link href="/">
          <PlatformLogo size="md" darkMode={true} />
        </Link>

        <div>
          {/* Map illustration */}
          <div className="mb-8">
            <svg viewBox="0 0 340 200" className="w-full opacity-90" fill="none">
              {/* Globe outline */}
              <ellipse cx="170" cy="100" rx="120" ry="90" stroke="white" strokeOpacity=".15" strokeWidth="1.5"/>
              <ellipse cx="170" cy="100" rx="80" ry="90" stroke="white" strokeOpacity=".1" strokeWidth="1"/>
              <ellipse cx="170" cy="100" rx="40" ry="90" stroke="white" strokeOpacity=".1" strokeWidth="1"/>
              <line x1="50" y1="100" x2="290" y2="100" stroke="white" strokeOpacity=".1" strokeWidth="1"/>
              <line x1="50" y1="65"  x2="290" y2="65"  stroke="white" strokeOpacity=".07" strokeWidth="1"/>
              <line x1="50" y1="135" x2="290" y2="135" stroke="white" strokeOpacity=".07" strokeWidth="1"/>
              {/* Pulsing pins */}
              {[
                { cx: 148, cy: 72 },
                { cx: 210, cy: 88 },
                { cx: 175, cy: 118 },
                { cx: 125, cy: 105 },
                { cx: 230, cy: 60 },
              ].map(({ cx, cy }, i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="10" fill="white" fillOpacity=".08"/>
                  <circle cx={cx} cy={cy} r="5"  fill="white" fillOpacity=".2"/>
                  <circle cx={cx} cy={cy} r="3"  fill="white" fillOpacity=".9"/>
                </g>
              ))}
              {/* "Coming soon" badge */}
              <rect x="115" y="148" width="110" height="28" rx="14" fill="white" fillOpacity=".15"/>
              <text x="170" y="167" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" opacity=".9">Launching near you soon</text>
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
            We're heading to<br/>your country soon.
          </h2>
          <p className="text-white/70 text-base mb-10">
            Register your interest today and be first in line when Veno App launches in your area. No commitment — just a heads-up when you're good to go.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🚀', text: 'Early access before public launch' },
              { icon: '🎁', text: 'Exclusive launch pricing for early registrants' },
              { icon: '⚡', text: 'Set up in under 5 minutes when ready' },
              { icon: '💬', text: 'Direct line to our team for onboarding help' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm shrink-0">{icon}</div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0 text-lg">✓</div>
          <div>
            <p className="text-white font-semibold text-sm">Free to register — no card needed</p>
            <p className="text-white/60 text-xs">We'll only contact you when we launch in your country.</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Mobile nav */}
        <nav className="flex justify-between items-center p-6 lg:hidden">
          <Link href="/">
            <PlatformLogo size="md" />
          </Link>
          <Link href="/" className="text-[#6262bd] font-medium text-sm hover:underline">
            Back to home
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">

            <div className="mb-8">
              <span className="inline-block bg-[#6262bd]/10 text-[#6262bd] text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">Coming soon to your country</span>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Register your interest</h1>
              <p className="text-slate-500 text-sm">
                Leave your details and we'll reach out the moment we launch near you.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">First Name</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className={inputClass} placeholder="Jane"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className={inputClass} placeholder="Smith"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Venue Name</label>
                <input type="text" name="venueName" value={formData.venueName} onChange={handleChange} required className={inputClass} placeholder="The Golden Fork"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Venue Type</label>
                <select name="venueType" value={formData.venueType} onChange={handleChange} required className={inputClass}>
                  <option value="" disabled>Select your venue type…</option>
                  {venueTypes.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                  <option value="other">✦ Other — tell us more</option>
                </select>
              </div>

              {formData.venueType === 'other' && (
                <div className="rounded-xl border-2 border-[#6262bd]/30 bg-[#6262bd]/5 p-4">
                  <label className="block text-xs font-bold text-[#6262bd] mb-2 uppercase tracking-wide">Tell us about your business</label>
                  <textarea
                    name="venueTypeOther"
                    value={formData.venueTypeOther}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-[#6262bd]/30 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white placeholder:text-slate-400 resize-none transition-colors text-sm"
                    placeholder="Tell us more about your business in a few words"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="you@yourvenue.com"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClass} placeholder="+44 7123 456789"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Country</label>
                <input type="text" name="country" value={formData.country} onChange={handleChange} required className={inputClass} placeholder="e.g. Italy, Greece, United Kingdom…"/>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6262bd] text-white py-3.5 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md mt-2"
              >
                {loading ? 'Sending…' : 'Register My Interest →'}
              </button>

              <p className="text-center text-slate-400 text-xs pt-1">
                No spam, ever. We'll only contact you about your launch.
              </p>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
