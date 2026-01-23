'use client'
export const runtime = 'edge'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { loadTranslations, createTranslator } from '@/lib/clientTranslations'

export default function BookReservation({ params }) {
  const { restaurant: slug } = use(params)
  const router = useRouter()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  // Availability state
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  // Translation state
  const [translations, setTranslations] = useState({})
  const t = createTranslator(translations)

  useEffect(() => {
    fetchRestaurant()
  }, [slug])

  useEffect(() => {
    if (selectedDate && restaurant) {
      generateTimeSlots()
    }
  }, [selectedDate, restaurant])

  const fetchRestaurant = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'approved')
        .single()

      if (fetchError || !data) {
        setError('Restaurant not found')
        setLoading(false)
        return
      }

      if (!data.reservation_settings?.enabled) {
        setError('Reservations are not currently available for this restaurant')
        setLoading(false)
        return
      }

      setRestaurant(data)

      // Load translations based on restaurant's email language
      const locale = data.email_language || 'en'
      const bookingTranslations = loadTranslations(locale, 'booking')
      setTranslations(bookingTranslations)
    } catch (err) {
      setError('Failed to load restaurant')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    if (!restaurant?.reservation_settings) return

    const settings = restaurant.reservation_settings
    const date = new Date(selectedDate)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const dayHours = settings.operating_hours[dayName]

    if (!dayHours || dayHours.closed) {
      setAvailableTimeSlots([])
      return
    }

    const slots = []
    const [openHour, openMin] = dayHours.open.split(':').map(Number)
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number)

    let current = new Date(selectedDate)
    current.setHours(openHour, openMin, 0, 0)

    const closing = new Date(selectedDate)
    closing.setHours(closeHour, closeMin, 0, 0)

    const interval = settings.time_slot_interval || 30

    // If today, skip past time slots
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      const minTime = new Date(now.getTime() + 60 * 60 * 1000) // At least 1 hour from now
      if (current < minTime) {
        current = minTime
        // Round up to next slot
        const minutes = current.getMinutes()
        const roundedMinutes = Math.ceil(minutes / interval) * interval
        current.setMinutes(roundedMinutes)
      }
    }

    while (current < closing) {
      const timeString = current.toTimeString().substring(0, 5)
      slots.push(timeString)
      current = new Date(current.getTime() + interval * 60000)
    }

    setAvailableTimeSlots(slots)
  }

  const checkAvailability = async (date, time) => {
    if (!restaurant) return false

    try {
      setCheckingAvailability(true)

      // Get all tables for this restaurant
      const { data: tables } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurant.id)

      if (!tables || tables.length === 0) {
        return false
      }

      // Get confirmed reservations for this time slot
      const { data: existingReservations } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('restaurant_id', restaurant.id)
        .eq('reservation_date', date)
        .eq('reservation_time', time)
        .eq('status', 'confirmed')
        .not('table_id', 'is', null)

      // Available if not all tables are booked
      const bookedCount = existingReservations?.length || 0
      return bookedCount < tables.length

    } catch (err) {
      console.error('Availability check error:', err)
      return true // Assume available on error
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Final availability check
      const isAvailable = await checkAvailability(selectedDate, selectedTime)
      if (!isAvailable) {
        setError(t('slotUnavailable') || 'Sorry, this time slot is no longer available. Please select another time.')
        setSubmitting(false)
        return
      }

      // Use restaurant's email language preference (fallback to 'en')
      const supportedLocales = ['en', 'ro', 'fr', 'it', 'es']
      const restaurantLocale = restaurant.email_language
      const locale = restaurantLocale && supportedLocales.includes(restaurantLocale) ? restaurantLocale : 'en'

      // Create reservation
      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurant.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          party_size: partySize,
          reservation_date: selectedDate,
          reservation_time: selectedTime,
          special_requests: specialRequests || null,
          status: 'pending',
          locale: locale
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Trigger email notification (non-blocking)
      fetch('/api/reservations/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: data.id,
          isConfirmation: false,  // This is a pending reservation email
          locale: locale
        })
      }).catch(err => console.error('Email error:', err))

      setBookingSuccess(true)

    } catch (err) {
      console.error('Booking error:', err)
      setError(t('bookingError') || 'Failed to create reservation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDays = restaurant?.reservation_settings?.advance_booking_days || 60
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + maxDays)
    return maxDate.toISOString().split('T')[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">{t('loading') || 'Loading...'}</div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">{t('errorTitle') || 'Oops!'}</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">{t('successTitle') || 'Reservation Requested!'}</h1>
          <p className="text-slate-600 mb-2">
            {t('successMessage', {
              name: customerName,
              partySize: partySize.toString(),
              guests: partySize === 1 ? (t('guest') || 'guest') : (t('guests') || 'guests'),
              date: new Date(selectedDate).toLocaleDateString(),
              time: selectedTime
            }) || `Thank you, ${customerName}! We've received your reservation request for ${partySize} ${partySize === 1 ? 'guest' : 'guests'} on ${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}.`}
          </p>
          <p className="text-slate-600 mb-6">
            {t('confirmationEmailMessage', { email: customerEmail }) || `You'll receive a confirmation email at ${customerEmail} once the restaurant approves your request.`}
          </p>
          <button
            onClick={() => router.push(`/${slug}/menu`)}
            className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#5252a3]"
          >
            {t('viewMenuButton') || 'View Menu'}
          </button>
        </div>
      </div>
    )
  }

  const settings = restaurant.reservation_settings

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{restaurant.name}</h1>
              <p className="text-slate-500">{t('pageTitle') || 'Make a Reservation'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('dateLabel') || 'Date'} *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setSelectedTime('') // Reset time when date changes
                }}
                min={getMinDate()}
                max={getMaxDate()}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('timeLabel') || 'Time'} *
              </label>
              {!selectedDate ? (
                <p className="text-slate-400 text-sm">{t('selectDateFirst') || 'Please select a date first'}</p>
              ) : availableTimeSlots.length === 0 ? (
                <p className="text-red-600 text-sm">{t('noAvailableSlots') || 'No available time slots for this date'}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        selectedTime === slot
                          ? 'bg-[#6262bd] text-white'
                          : 'border-2 border-slate-200 text-slate-700 hover:border-[#6262bd]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Party Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('partySizeLabel') || 'Party Size'} *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize(Math.max(settings.min_party_size, partySize - 1))}
                  disabled={partySize <= settings.min_party_size}
                  className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <input
                  type="number"
                  value={partySize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (val >= settings.min_party_size && val <= settings.max_party_size) {
                      setPartySize(val)
                    }
                  }}
                  min={settings.min_party_size}
                  max={settings.max_party_size}
                  required
                  className="w-24 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setPartySize(Math.min(settings.max_party_size, partySize + 1))}
                  disabled={partySize >= settings.max_party_size}
                  className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
                <span className="text-slate-600 ml-2">{partySize === 1 ? (t('guest') || 'guest') : (t('guests') || 'guests')}</span>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('nameLabel') || 'Your Name'} *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('namePlaceholder') || 'John Smith'}
              />
            </div>

            {/* Customer Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailLabel') || 'Email Address'} *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('emailPlaceholder') || 'john@example.com'}
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('emailHelpText') || "We'll send your confirmation to this email"}
              </p>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('phoneLabel') || 'Phone Number'} ({t('optional') || 'Optional'})
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('phonePlaceholder') || '+1 (555) 123-4567'}
              />
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('specialRequestsLabel') || 'Special Requests'} ({t('optional') || 'Optional'})
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                placeholder={t('specialRequestsPlaceholder') || 'Birthday celebration, dietary restrictions, accessibility needs...'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || checkingAvailability || !selectedDate || !selectedTime}
              className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (t('submitting') || 'Creating Reservation...') : checkingAvailability ? (t('checkingAvailability') || 'Checking Availability...') : (t('submitButton') || 'Request Reservation')}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">{t('howItWorksTitle') || 'How Reservations Work'}</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t('howItWorksStep1') || 'Submit your reservation request'}</li>
                <li>{t('howItWorksStep2') || 'Receive confirmation email once approved by restaurant'}</li>
                <li>{t('howItWorksStep3') || 'Cancel anytime using the link in your email'}</li>
                <li>{t('howItWorksStep4') || 'Please arrive within 15 minutes of your reservation time'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
