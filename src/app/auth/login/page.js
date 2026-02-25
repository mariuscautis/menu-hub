'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await redirectUser(user.id)
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()

    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam === 'deactivated') {
      setError('This account has been deactivated. Please contact the restaurant owner.')
    }
  }, [])

  const redirectUser = async (userId) => {
    // Check if admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)

    const isAdmin = admin && admin.length > 0

    // Check if has restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)

    const hasRestaurant = restaurant && restaurant.length > 0

    // Check if is staff member (any status)
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle()

    // Check if staff is deactivated
    if (staffMember && staffMember.status === 'inactive') {
      await supabase.auth.signOut()
      throw new Error('This account has been deactivated. Please contact the restaurant owner.')
    }

    const isActiveStaff = staffMember && staffMember.status === 'active'

    if (isAdmin && !hasRestaurant) {
      router.push('/admin')
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
        // Provide user-friendly error message
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">Veno App</span>
        </Link>
        <div className="flex items-center space-x-4">
          <span className="text-slate-500 text-sm">Don't have an account?</span>
          <Link href="/auth/register" className="text-[#6262bd] font-medium hover:underline">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome back</h1>
            <p className="text-slate-500">Sign in to your account</p>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-2xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400">or sign in with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex justify-end">
                  <Link href="/auth/forgot-password" className="text-sm text-[#6262bd] hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}