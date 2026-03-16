'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const VENUE_TYPES = [
  { value: '', label: 'Select your venue type…' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café / Coffee Shop' },
  { value: 'bar', label: 'Bar / Pub' },
  { value: 'fast_food', label: 'Fast Food / Takeaway' },
  { value: 'beauty', label: 'Beauty Salon / Nail Studio' },
  { value: 'barber', label: 'Barber Shop' },
  { value: 'wellness', label: 'Wellness / Massage / Spa' },
  { value: 'fitness', label: 'Personal Trainer / Gym' },
  { value: 'medical', label: 'Medical / Dental Clinic' },
  { value: 'pet', label: 'Pet Grooming' },
  { value: 'photographer', label: 'Photographer / Creative Studio' },
  { value: 'trade', label: 'Tradesperson / Contractor' },
  { value: 'other', label: 'Other' },
]

export default function Onboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    restaurantName: '',
    venueType: '',
    phone: '',
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)

      const isAdmin = admin && admin.length > 0

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)

      const hasRestaurant = restaurant && restaurant.length > 0

      if (hasRestaurant) {
        router.push('/dashboard')
        return
      }

      if (isAdmin && !hasRestaurant) {
        router.push('/admin')
        return
      }

      setUser(user)
      setChecking(false)
    }
    checkUser()
  }, [router])

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

    try {
      const slug = generateSlug(formData.restaurantName)
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      const { error: dbError } = await supabase.from('restaurants').insert({
        name: formData.restaurantName,
        slug,
        owner_id: user.id,
        email: user.email,
        phone: formData.phone,
        venue_type: formData.venueType,
        status: 'pending',
        trial_ends_at: trialEndsAt,
        enabled_modules: { ordering: true, analytics: true, reservations: true, rota: true },
      })

      if (dbError) throw dbError

      fetch('/api/notifications/restaurant-registered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: formData.restaurantName,
          email: user.email,
          phone: formData.phone,
          venueType: formData.venueType,
          trialEndsAt,
        }),
      }).catch(() => {})

      router.push('/dashboard')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Checking account…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">Veno App</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#6262bd]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#6262bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Almost there!</h1>
            <p className="text-slate-500">Tell us a little about your venue to complete setup.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-100 rounded-2xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Venue Name
                </label>
                <input
                  type="text"
                  name="restaurantName"
                  value={formData.restaurantName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="The Golden Fork"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Venue Type
                </label>
                <select
                  name="venueType"
                  value={formData.venueType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white"
                >
                  {VENUE_TYPES.map(({ value, label }) => (
                    <option key={value} value={value} disabled={value === ''}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="07123 456789"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up your venue…' : 'Complete Setup'}
              </button>
            </div>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Signed in as <span className="font-medium text-slate-700">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
