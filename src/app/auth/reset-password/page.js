'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PlatformLogo from '@/components/PlatformLogo'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 2500)
    }
    setLoading(false)
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
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
            Almost there.<br />Choose a strong<br />new password.
          </blockquote>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Pick something memorable but hard to guess. At least 6 characters is required.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Use at least 6 characters',
            'Mix letters, numbers and symbols',
            'Avoid reusing old passwords',
            'You\'ll be signed in automatically',
          ].map((tip) => (
            <div key={tip} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#6262bd]/20 border border-[#6262bd]/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-[#9090e0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <span className="text-white/60 text-sm">{tip}</span>
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
            <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
            <p className="text-slate-400 text-sm">Choose a new password for your account.</p>
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#6262bd]/20 border border-[#6262bd]/40 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#9090e0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <p className="font-semibold text-white mb-2">Password updated!</p>
              <p className="text-sm text-slate-400">Redirecting you to sign in…</p>
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
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-none focus:outline-none focus:border-[#6262bd] text-white placeholder:text-slate-600 transition-all text-sm"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-none focus:outline-none focus:border-[#6262bd] text-white placeholder:text-slate-600 transition-all text-sm"
                    placeholder="Repeat your new password"
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
                      Updating…
                    </span>
                  ) : 'Update password'}
                </button>
              </form>

              <p className="mt-8 text-center text-slate-500 text-sm">
                <Link href="/auth/login" className="text-[#6262bd] hover:text-[#8080d0] font-medium transition-colors">
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
