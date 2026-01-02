'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StaffLogin() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    pin: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Find staff member by email and PIN
      const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select(`
          *,
          restaurants(*)
        `)
        .eq('email', formData.email.toLowerCase().trim())
        .eq('pin', formData.pin)
        .eq('status', 'active')
        .maybeSingle()

      if (staffError) throw staffError

      if (!staffMember) {
        setError('Invalid email or PIN. Please try again.')
        setLoading(false)
        return
      }

      // Store staff session in localStorage
      localStorage.setItem('staff_session', JSON.stringify({
        staff_id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        restaurant_id: staffMember.restaurant_id,
        restaurant_name: staffMember.restaurants?.name,
        department: staffMember.department,
        role: staffMember.role,
        logged_in_at: new Date().toISOString()
      }))

      // Redirect to staff dashboard
      router.push('/staff-dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred during login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#6262bd] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Login</h1>
          <p className="text-slate-500 mt-2">Access your schedule and time-off requests</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="email"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              PIN
            </label>
            <input
              type="password"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              required
              inputMode="numeric"
              maxLength="6"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              placeholder="Enter your PIN"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Don't have your login details?<br />
            Contact your manager for assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
