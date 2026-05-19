'use client'

import { useState } from 'react'
import Link from 'next/link'
import PlatformLogo from '@/components/PlatformLogo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[#0d0d1a]" />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-[#6262bd]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6262bd]/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-none px-4 py-3">
            <PlatformLogo size="sm" stacked={false} showText={false} />
            <span className="text-white font-bold text-base tracking-tight">Veno App</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-white text-[1.6rem] font-semibold leading-snug tracking-tight">
            Back in a moment.<br />We've got you covered.
          </blockquote>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Enter your email and we'll send you a secure link to reset your password.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Secure reset link sent to your inbox',
            'Link expires after 24 hours',
            'No account changes until you confirm',
            'Contact support if you need further help',
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
          <div className="flex flex-col items-center mb-10">
            <PlatformLogo size="xl" stacked={true} showText={true} darkMode={true} textClassName="text-white/80 font-semibold text-base mt-2" />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
            <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#6262bd]/20 border border-[#6262bd]/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#9090e0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <p className="font-semibold text-white mb-2">Check your inbox</p>
              <p className="text-sm text-slate-400 mb-8">
                If an account exists for <span className="text-white font-medium">{email}</span>, you'll receive a reset link shortly.
              </p>
              <Link
                href="/auth/login"
                className="w-full inline-block text-center bg-white/5 border border-white/10 text-white py-3.5 rounded-none font-medium hover:bg-white/10 transition-all text-sm"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-none text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-none focus:outline-none focus:border-[#6262bd] text-white placeholder:text-slate-600 transition-all text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6262bd] text-white py-3.5 rounded-none font-semibold hover:bg-[#7070d0] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-[#6262bd]/25"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send reset link'}
                </button>
              </form>

              <p className="mt-8 text-center text-slate-500 text-sm">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-[#6262bd] hover:text-[#8080d0] font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
