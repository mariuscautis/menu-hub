'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PlatformLogo from '@/components/PlatformLogo'

const DEFAULT_VENUE_TYPES = [
  { value: 'beauty',     label: 'Beauty & Wellness' },
  { value: 'fitness',    label: 'Fitness & Sport' },
  { value: 'health',     label: 'Health & Medical' },
  { value: 'restaurant', label: 'Restaurant / Café / Bar' },
]

export default function Register() {
  const router = useRouter()
  const [venueTypes, setVenueTypes] = useState(DEFAULT_VENUE_TYPES)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [emailExists, setEmailExists] = useState(false)
  const [formData, setFormData] = useState({
    restaurantName: '',
    venueType: '',
    venueTypeOther: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()
      .then(({ data }) => {
        if (data?.value?.length) {
          setVenueTypes([...data.value].filter(c => !c.hidden_from_registration).sort((a, b) => a.label.localeCompare(b.label)))
        }
      })
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const generateSlug = (name) => {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const suffix = Math.random().toString(36).substring(2, 6)
    return `${base}-${suffix}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setEmailExists(false)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      const slug = generateSlug(formData.restaurantName)
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      const { error: dbError } = await supabase.from('restaurants').insert({
        name: formData.restaurantName,
        slug,
        owner_id: authData.user.id,
        email: formData.email,
        phone: formData.phone,
        venue_type: formData.venueType,
        venue_type_other: formData.venueType === 'other' ? formData.venueTypeOther : null,
        status: 'pending',
        trial_ends_at: trialEndsAt,
        enabled_modules: { ordering: true, analytics: true, reservations: true, rota: true },
      })

      if (dbError) throw dbError

      // Notify super admin + send welcome email (fire-and-forget)
      fetch('/api/notifications/restaurant-registered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          email: formData.email,
          phone: formData.phone,
          venueType: formData.venueType,
          venueTypeOther: formData.venueType === 'other' ? formData.venueTypeOther : null,
          trialEndsAt,
        }),
      }).catch(() => {})

      // Gate on email confirmation — don't go straight to dashboard
      router.push(`/auth/confirmation?email=${encodeURIComponent(formData.email)}`)

    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setEmailExists(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white placeholder:text-slate-400 transition-colors text-sm"

  return (
    <div className="min-h-screen flex">

      {/* Left panel — brand / trust */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10" style={{background:'linear-gradient(145deg,#4f4fa8 0%,#6262bd 50%,#8b6fd4 100%)'}}>
        <Link href="/">
          <PlatformLogo size="md" darkMode={true} />
        </Link>

        <div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
            Everything your venue needs,<br/>in one place.
          </h2>
          <p className="text-white/70 text-base mb-10">
            Join venue owners who've simplified their operations, cut costs, and delighted their customers with Veno App.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🍽️', text: 'QR menus, table ordering & reservations' },
              { icon: '📊', text: 'Live analytics & inventory tracking' },
              { icon: '👥', text: 'Staff scheduling & self-service portal' },
              { icon: '📱', text: 'Your own branded app — no tech skills needed' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm shrink-0">{icon}</div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">✓</div>
          <div>
            <p className="text-white font-semibold text-sm">2 weeks free — no card needed</p>
            <p className="text-white/60 text-xs">Cancel anytime. Set up in under 5 minutes.</p>
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
          <Link href="/auth/login" className="text-[#6262bd] font-medium text-sm hover:underline">
            Sign in
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Create your account</h1>
              <p className="text-slate-500 text-sm">
                Already have one?{' '}
                <Link href="/auth/login" className="text-[#6262bd] font-semibold hover:underline">Sign in</Link>
              </p>
            </div>

            {/* Alerts */}
            {emailExists && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <p className="font-semibold mb-1">Email already registered.</p>
                <p className="mb-3">Reset your password to regain access.</p>
                <Link
                  href={`/auth/forgot-password?email=${encodeURIComponent(formData.email)}`}
                  className="inline-block px-4 py-2 bg-[#6262bd] text-white rounded-lg font-semibold text-xs hover:bg-[#5151a8] transition-colors"
                >
                  Reset password
                </Link>
              </div>
            )}
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Google */}
            <button
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed mb-5 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-50 text-slate-400 uppercase tracking-wide font-medium">or with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Venue Name</label>
                <input
                  type="text"
                  name="restaurantName"
                  value={formData.restaurantName}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="The Golden Fork"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Venue Type</label>
                <select
                  name="venueType"
                  value={formData.venueType}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
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
                    placeholder="Tell us more about your business in a few words here"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="you@yourvenue.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="07123 456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className={inputClass}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className={inputClass}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6262bd] text-white py-3.5 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md mt-2"
              >
                {loading ? 'Creating account…' : 'Create Account →'}
              </button>

              <p className="text-center text-slate-400 text-xs pt-1">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-[#6262bd] hover:underline">Terms</Link>
                {' '}&{' '}
                <Link href="/privacy" className="text-[#6262bd] hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
