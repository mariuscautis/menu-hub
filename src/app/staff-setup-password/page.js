'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const staffId = searchParams.get('staff_id')
  const staffName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')) : ''

  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!staffId) router.push('/staff-login')
  }, [staffId, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/staff/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, pin_code: pin, password, confirm_password: confirmPassword })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to set password')
        setLoading(false)
        return
      }
      // Password set — redirect to login to sign in properly
      router.push('/staff-login?setup=done')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#6262bd] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Set Your Password</h1>
          {staffName && <p className="text-slate-500 mt-1">Welcome, {staffName}</p>}
          <p className="text-slate-500 text-sm mt-2">
            Create a password to secure your account. You'll use it to log in from now on.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your PIN (to verify it's you)
            </label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              inputMode="numeric"
              placeholder="Enter your current PIN"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                )}
              </button>
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="mt-1 text-xs text-amber-600">{8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Repeat your password"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 ${
                confirmPassword && confirmPassword !== password ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-600">Passwords don't match</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700">
              <strong>After setting your password</strong>, you'll be redirected to the login page where you can sign in with your email and new password.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword || !pin}
            className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting password...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function StaffSetupPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
