'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StaffMagicLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('Verifying your magic link...')

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing token. Please request a new magic link.')
      return
    }

    try {
      // Fetch the magic link record
      const { data: linkData, error: linkError } = await supabase
        .from('staff_magic_links')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            email,
            restaurant_id,
            department,
            role,
            status,
            restaurants(name)
          )
        `)
        .eq('token', token)
        .eq('used', false)
        .maybeSingle()

      if (linkError || !linkData) {
        setStatus('error')
        setMessage('Invalid or expired magic link. Please request a new one.')
        return
      }

      // Check if token has expired
      const now = new Date()
      const expiresAt = new Date(linkData.expires_at)

      if (now > expiresAt) {
        setStatus('error')
        setMessage('This magic link has expired. Please request a new one.')
        return
      }

      // Check if staff is still active
      if (linkData.staff.status !== 'active') {
        setStatus('error')
        setMessage('Your account is not active. Please contact your manager.')
        return
      }

      // Mark token as used
      await supabase
        .from('staff_magic_links')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token)

      // Create staff session
      const staffSession = {
        staff_id: linkData.staff.id,
        name: linkData.staff.name,
        email: linkData.staff.email,
        restaurant_id: linkData.staff.restaurant_id,
        restaurant_name: linkData.staff.restaurants?.name,
        department: linkData.staff.department,
        role: linkData.staff.role,
        logged_in_at: new Date().toISOString()
      }

      // Store session
      localStorage.setItem('staff_session', JSON.stringify(staffSession))

      setStatus('success')
      setMessage('Login successful! Redirecting to your dashboard...')

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/staff-dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error verifying magic link:', error)
      setStatus('error')
      setMessage('An error occurred during verification. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#6262bd] mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifying...</h1>
            <p className="text-slate-500">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Success!</h1>
            <p className="text-slate-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Login Failed</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <button
              onClick={() => router.push('/staff-login')}
              className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors"
            >
              Try PIN Login Instead
            </button>
          </>
        )}
      </div>
    </div>
  )
}
