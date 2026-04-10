'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PlatformLogo from '@/components/PlatformLogo'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function Login() {
  const seo = useSeoSettings('login', {
    title: 'Log In — Veno App',
    description: 'Sign in to your Veno App restaurant dashboard to manage orders, menus, staff, and reports.',
  })
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          await redirectUser(user.id)
        } catch {
          setCheckingSession(false)
        }
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()

    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam === 'deactivated') {
      setError('This account has been deactivated. Please contact the restaurant owner.')
    } else if (errorParam === 'use-admin-portal') {
      setError('Please login via the admin portal.')
    }
  }, [])

  const redirectUser = async (userId) => {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)

    const isAdmin = admin && admin.length > 0

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)

    const hasRestaurant = restaurant && restaurant.length > 0

    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle()

    if (staffMember && staffMember.status === 'inactive') {
      await supabase.auth.signOut()
      throw new Error('This account has been deactivated. Please contact the restaurant owner.')
    }

    const isActiveStaff = staffMember && staffMember.status === 'active'

    if (isAdmin) {
      await supabase.auth.signOut()
      throw new Error('Please login via the admin portal.')
    } else if (hasRestaurant) {
      router.push('/dashboard')
    } else if (isActiveStaff) {
      router.push('/dashboard')
    } else {
      router.push('/auth/onboarding')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials') ||
            authError.message.includes('Email not confirmed')) {
          throw new Error('There is no account associated with those credentials')
        }
        throw authError
      }

      await redirectUser(data.user.id)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background — deep dark with a subtle purple tint */}
        <div className="absolute inset-0 bg-[#0d0d1a]" />
        {/* Radial purple glow top-right */}
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-[#6262bd]/20 rounded-full blur-3xl" />
        {/* Subtle glow bottom-left */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6262bd]/10 rounded-full blur-3xl" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />

        {/* Logo — white background pill for contrast */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
            <PlatformLogo size="sm" stacked={false} showText={false} />
            <span className="text-white font-bold text-base tracking-tight">Veno App</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-white text-[1.6rem] font-semibold leading-snug tracking-tight">
            Built for teams that<br />move fast and serve<br />with precision.
          </blockquote>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Everything your venue needs — orders, reservations, staff, and more — in one elegant platform.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Real-time order & table management',
            'Staff scheduling and time-off tracking',
            'Reservations with deposit handling',
            'Multi-language & multi-venue support',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#6262bd]/20 border border-[#6262bd]/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-[#9090e0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <span className="text-white/60 text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Logo — centered above form (mobile + desktop) */}
          <div className="flex flex-col items-center mb-10">
            <PlatformLogo size="xl" stacked={true} showText={true} darkMode={true} textClassName="text-white/80 font-semibold text-base mt-2" />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to continue to your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-3.5 rounded-2xl font-medium hover:bg-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-5 text-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-slate-950 text-slate-500 text-xs">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[#6262bd] focus:bg-white/8 text-white placeholder:text-slate-600 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-[#6262bd] hover:text-[#8080d0] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[#6262bd] focus:bg-white/8 text-white placeholder:text-slate-600 transition-all text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6262bd] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#7070d0] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm mt-2 shadow-lg shadow-[#6262bd]/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-[#6262bd] hover:text-[#8080d0] font-medium transition-colors">
              Sign up free
            </Link>
          </p>

          <p className="mt-6 text-center text-slate-600 text-xs">
            Are you a staff member?{' '}
            <Link href="/staff-login" className="text-slate-500 hover:text-slate-400 transition-colors">
              Staff login →
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
