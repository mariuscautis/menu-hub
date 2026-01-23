'use client'
export const runtime = 'edge'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { loadTranslations, createTranslator } from '@/lib/clientTranslations'
import { supabase } from '@/lib/supabase'

export default function CancelReservation({ params }) {
  const { token, restaurant: slug } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [translations, setTranslations] = useState({})
  const t = createTranslator(translations)

  useEffect(() => {
    const fetchRestaurantLocale = async () => {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('email_language')
        .eq('slug', slug)
        .single()

      const locale = restaurant?.email_language || 'en'
      const cancelTranslations = loadTranslations(locale, 'cancellation')
      setTranslations(cancelTranslations)
    }

    if (slug) {
      fetchRestaurantLocale()
    }
  }, [slug])

  const handleCancel = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationToken: token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel reservation')
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">{t('reservationCancelled') || 'Reservation Cancelled'}</h1>
          <p className="text-slate-600 mb-6">
            {t('cancellationSuccessMessage') || 'Your reservation has been successfully cancelled. We hope to see you again soon!'}
          </p>
          <button
            onClick={() => router.back()}
            className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#5252a3]"
          >
            {t('close') || 'Close'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full border-2 border-slate-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-4 text-center">{t('cancelReservation') || 'Cancel Reservation'}</h1>
        <p className="text-slate-600 mb-6 text-center">
          {t('cancelConfirmationMessage') || 'Are you sure you want to cancel this reservation? This action cannot be undone.'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            disabled={loading}
            className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {t('goBack') || 'Go Back'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (t('cancelling') || 'Cancelling...') : (t('yesCancel') || 'Yes, Cancel')}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center">
          {t('cancelContactMessage') || 'If you have any questions, please contact the restaurant directly.'}
        </p>
      </div>
    </div>
  )
}
