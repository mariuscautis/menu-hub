'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Onboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    restaurantName: '',
    phone: ''
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check if admin
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)

      const isAdmin = admin && admin.length > 0

      // Check if has restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)

      const hasRestaurant = restaurant && restaurant.length > 0

      // If has restaurant, go to dashboard
      if (hasRestaurant) {
        router.push('/dashboard')
        return
      }

      // If admin without restaurant, go to admin panel
      if (isAdmin && !hasRestaurant) {
        router.push('/admin')
        return
      }

      // Otherwise, show onboarding form
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
      
      const { error: dbError } = await supabase.from('restaurants').insert({
        name: formData.restaurantName,
        slug: slug,
        owner_id: user.id,
        email: user.email,
        phone: formData.phone,
        status: 'pending'
      })

      if (dbError) throw dbError

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
        <div className="text-slate-500">Checking account...</div>
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
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Almost there!</h1>
            <p className="text-slate-500">Tell us about your restaurant</p>
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
                  Restaurant Name
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
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="07123 456789"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}