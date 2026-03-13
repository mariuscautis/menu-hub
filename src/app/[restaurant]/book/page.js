'use client'
export const runtime = 'edge'

import { useState, useEffect, use, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { loadTranslations, createTranslator } from '@/lib/clientTranslations'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// ─── Mini calendar ────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MiniCalendar({ value, onChange, minDate, maxDate, closedDayNames = [], blockedDates = [] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : today
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : today
    return d.getMonth()
  })

  const minD = minDate ? new Date(minDate + 'T00:00:00') : today
  const maxD = maxDate ? new Date(maxDate + 'T00:00:00') : null

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(minD.getFullYear(), minD.getMonth(), 1)
  const canGoNext = !maxD || new Date(viewYear, viewMonth, 1) < new Date(maxD.getFullYear(), maxD.getMonth(), 1)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-slate-800 text-sm">{MONTHS[viewMonth]} {viewYear}</span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />

          const cellDate = new Date(viewYear, viewMonth, day)
          cellDate.setHours(0, 0, 0, 0)
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayName = cellDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

          const isPast = cellDate < minD
          const isBeyondMax = maxD && cellDate > maxD
          const isClosed = closedDayNames.includes(dayName)
          const isBlocked = blockedDates.includes(dateStr)
          const isDisabled = isPast || isBeyondMax || isClosed || isBlocked
          const isSelected = value === dateStr
          const isToday = cellDate.getTime() === today.getTime()

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(dateStr)}
              className={`
                relative text-center text-sm py-1.5 rounded-lg font-medium transition-all
                ${isSelected ? 'bg-[#6262bd] text-white' : ''}
                ${!isSelected && isToday ? 'ring-2 ring-[#6262bd] text-[#6262bd]' : ''}
                ${!isSelected && (isClosed || isBlocked) && !isPast && !isBeyondMax ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : ''}
                ${!isSelected && (isPast || isBeyondMax) ? 'text-slate-200 cursor-not-allowed' : ''}
                ${!isSelected && !isDisabled ? 'text-slate-700 hover:bg-slate-100' : ''}
              `}
              title={isBlocked && !isPast ? 'Unavailable' : isClosed && !isPast ? 'Closed' : undefined}
            >
              {day}
              {!isSelected && !isPast && !isBeyondMax && (isClosed || isBlocked) && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isBlocked ? 'bg-orange-400' : 'bg-red-300'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      {(closedDayNames.length > 0 || blockedDates.length > 0) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          {closedDayNames.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-300 flex-shrink-0" />
              Closed
            </span>
          )}
          {blockedDates.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              Unavailable
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookReservation({ params }) {
  const { restaurant: slug } = use(params)
  const router = useRouter()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // OTP flow
  const [otpStep, setOtpStep] = useState(false) // true = showing OTP input
  const [otpCode, setOtpCode] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState(null)
  const [otpResendCountdown, setOtpResendCountdown] = useState(0)

  // Form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(null) // customer-choice mode
  const [selectedTime, setSelectedTime] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  // Availability
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  // Translations
  const [translations, setTranslations] = useState({})
  const t = createTranslator(translations)

  useEffect(() => { fetchRestaurant() }, [slug])

  // Re-generate slots whenever date or duration changes
  useEffect(() => {
    if (selectedDate && restaurant) generateTimeSlots()
  }, [selectedDate, selectedDuration, restaurant])

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

      if (!data.enabled_modules?.reservations) {
        setError('Reservations are not currently available for this restaurant')
        setLoading(false)
        return
      }

      setRestaurant(data)

      // Default party size
      const rs = data.reservation_settings || {}
      setPartySize(rs.show_party_size !== false ? (rs.min_party_size || 1) : 1)

      // Default duration for customer-choice mode
      if (rs.slot_mode === 'customer_choice' && rs.allowed_durations?.length) {
        setSelectedDuration(rs.allowed_durations[0])
      }

      const locale = data.email_language || 'en'
      setTranslations(loadTranslations(locale, 'booking'))
    } catch (err) {
      setError('Failed to load restaurant')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = useCallback(async () => {
    if (!restaurant?.reservation_settings) return

    const settings = restaurant.reservation_settings

    // Check if this date is explicitly blocked by the manager
    if (settings.blocked_dates?.includes(selectedDate)) {
      setAvailableTimeSlots([])
      return
    }

    // Check minimum advance notice — overrides operating hours
    const minNoticeDays = settings.min_advance_notice_days || 0
    if (minNoticeDays > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selected = new Date(selectedDate + 'T00:00:00')
      const diffDays = Math.round((selected - today) / (1000 * 60 * 60 * 24))
      if (diffDays < minNoticeDays) {
        setAvailableTimeSlots([])
        return
      }
    }

    const dayHours = settings.operating_hours?.[getDayName(selectedDate)]
    if (!dayHours || dayHours.closed) {
      setAvailableTimeSlots([])
      return
    }

    const openMin  = toMinutes(dayHours.open)
    const closeMin = toMinutes(dayHours.close)

    const duration = settings.slot_mode === 'customer_choice'
      ? (selectedDuration || settings.allowed_durations?.[0] || 60)
      : (settings.time_slot_interval || 30)

    const padding = settings.slot_padding || 0

    const step = settings.slot_mode === 'customer_choice'
      ? Math.min(...(settings.allowed_durations || [duration]))
      : duration

    const candidates = []
    for (let m = openMin; m + duration <= closeMin; m += step) {
      candidates.push(m)
    }

    // If today, remove past slots (need at least 1 hour lead time)
    const today = new Date()
    const selectedDay = new Date(selectedDate + 'T00:00:00')
    let filteredCandidates = candidates
    if (selectedDay.toDateString() === today.toDateString()) {
      const nowMin = today.getHours() * 60 + today.getMinutes() + 60
      filteredCandidates = candidates.filter(m => m >= nowMin)
    }

    // For single-booking-area: both pending AND confirmed block slots
    // For multi-table: only confirmed block (table count checked separately)
    const isSingleArea = settings.single_booking_area === true
    const statusFilter = isSingleArea ? ['confirmed', 'pending'] : ['confirmed']

    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('reservation_time')
      .eq('restaurant_id', restaurant.id)
      .eq('reservation_date', selectedDate)
      .in('status', statusFilter)

    const available = filteredCandidates.filter(startMin => {
      const endMin = startMin + duration
      if (!existingReservations?.length) return true

      if (isSingleArea) {
        // Any existing booking blocks the slot entirely
        return !existingReservations.some(r => {
          const rStart = toMinutes(r.reservation_time.substring(0, 5))
          const rEnd = rStart + duration + padding
          return startMin < rEnd && endMin > rStart
        })
      }

      // Multi-table: apply padding only — table capacity check happens on submit
      return !existingReservations.some(r => {
        const rStart = toMinutes(r.reservation_time.substring(0, 5))
        const rEnd = rStart + duration + padding
        return startMin < rEnd && endMin > rStart
      })
    })

    setAvailableTimeSlots(available.map(fromMinutes))
  }, [restaurant, selectedDate, selectedDuration])

  const checkAvailability = async (date, time) => {
    if (!restaurant) return false
    try {
      setCheckingAvailability(true)
      const settings = restaurant.reservation_settings || {}
      const isSingleArea = settings.single_booking_area === true

      if (isSingleArea) {
        // Single booking area: any pending or confirmed booking blocks the slot
        const { data: existing } = await supabase
          .from('reservations')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('reservation_date', date)
          .eq('reservation_time', time)
          .in('status', ['confirmed', 'pending'])
        return (existing?.length || 0) === 0
      }

      // Multi-table: check if any table is still free
      const { data: tables } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurant.id)
      if (!tables?.length) return false
      const { data: existing } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('restaurant_id', restaurant.id)
        .eq('reservation_date', date)
        .eq('reservation_time', time)
        .eq('status', 'confirmed')
        .not('table_id', 'is', null)
      return (existing?.length || 0) < tables.length
    } catch { return true } finally { setCheckingAvailability(false) }
  }

  // Start OTP countdown timer
  const startResendCountdown = () => {
    setOtpResendCountdown(60)
    const interval = setInterval(() => {
      setOtpResendCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // Step 1: validate form, check availability, send OTP
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!customerPhone.trim()) {
      setError('Phone number is required to verify your booking.')
      return
    }

    setSendingOtp(true)
    try {
      const isAvailable = await checkAvailability(selectedDate, selectedTime)
      if (!isAvailable) {
        setError(t('slotUnavailable') || 'Sorry, this time slot is no longer available. Please select another time.')
        return
      }

      const res = await fetch('/api/reservations/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone, restaurantName: restaurant.name })
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error || 'Failed to send verification code. Please check your phone number.')
        return
      }

      setOtpStep(true)
      setOtpCode('')
      setOtpError(null)
      startResendCountdown()
    } catch (err) {
      console.error('OTP send error:', err)
      setError('Failed to send verification code. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  // Resend OTP
  const resendOtp = async () => {
    setOtpError(null)
    setSendingOtp(true)
    try {
      const res = await fetch('/api/reservations/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone, restaurantName: restaurant.name })
      })
      const result = await res.json()
      if (!result.success) {
        setOtpError(result.error || 'Failed to resend code.')
      } else {
        setOtpCode('')
        startResendCountdown()
      }
    } catch {
      setOtpError('Failed to resend code. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  // Step 2: verify OTP and create booking
  const verifyAndBook = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code.')
      return
    }
    setOtpError(null)
    setVerifyingOtp(true)

    try {
      const supportedLocales = ['en', 'ro', 'fr', 'it', 'es']
      const restaurantLocale = restaurant.email_language
      const locale = restaurantLocale && supportedLocales.includes(restaurantLocale) ? restaurantLocale : 'en'

      const res = await fetch('/api/reservations/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customerPhone,
          otp: otpCode,
          restaurantId: restaurant.id,
          customerName,
          customerEmail: customerEmail || null,
          partySize,
          reservationDate: selectedDate,
          reservationTime: selectedTime,
          specialRequests: specialRequests || null,
          locale
        })
      })
      const result = await res.json()

      if (!result.success) {
        setOtpError(result.error || 'Verification failed. Please try again.')
        return
      }

      // Fire-and-forget confirmation email (if email was provided)
      if (customerEmail) {
        fetch('/api/reservations/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: result.reservationId, isConfirmation: false, locale })
        }).catch(err => console.error('Email error:', err))
      }

      setBookingSuccess(true)
    } catch (err) {
      console.error('Verify OTP error:', err)
      setOtpError('Verification failed. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // ── early returns ──────────────────────────────────────────────────────────

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
          {customerEmail ? (
            <p className="text-slate-600 mb-6">
              {t('confirmationEmailMessage', { email: customerEmail }) || `You'll receive a confirmation email at ${customerEmail} once the restaurant approves your request.`}
            </p>
          ) : (
            <p className="text-slate-600 mb-6">
              The restaurant will review your request and get in touch.
            </p>
          )}
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

  // ── render ─────────────────────────────────────────────────────────────────

  const settings = restaurant.reservation_settings || {}
  const isCustomerChoice = settings.slot_mode === 'customer_choice'
  const allowedDurations = settings.allowed_durations || []

  // Closed day names for the calendar
  const closedDayNames = Object.entries(settings.operating_hours || {})
    .filter(([, v]) => v.closed)
    .map(([k]) => k)

  const minDateObj = new Date()
  const minNoticeDays = settings.min_advance_notice_days || 0
  if (minNoticeDays > 0) minDateObj.setDate(minDateObj.getDate() + minNoticeDays)
  const minDate = minDateObj.toISOString().split('T')[0]
  const maxDateObj = new Date()
  maxDateObj.setDate(maxDateObj.getDate() + (settings.advance_booking_days || 60))
  const maxDate = maxDateObj.toISOString().split('T')[0]

  // Hours for selected day
  const selectedDayHours = selectedDate
    ? settings.operating_hours?.[getDayName(selectedDate)]
    : null

  // Duration label for the time picker header
  const activeDuration = isCustomerChoice ? selectedDuration : (settings.time_slot_interval || 30)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center text-center gap-4">
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{restaurant.name}</h1>
              <p className="text-slate-500 mt-1">{t('pageTitle') || 'Make a Reservation'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Duration picker — customer-choice mode only */}
            {isCustomerChoice && allowedDurations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  How long do you need? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {allowedDurations.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setSelectedDuration(d); setSelectedTime('') }}
                      className={`py-3 rounded-xl font-medium text-sm transition-all ${
                        selectedDuration === d
                          ? 'bg-[#6262bd] text-white'
                          : 'border-2 border-slate-200 text-slate-700 hover:border-[#6262bd]'
                      }`}
                    >
                      {formatDuration(d)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date — custom calendar */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('dateLabel') || 'Date'} *
              </label>
              <MiniCalendar
                value={selectedDate}
                onChange={(d) => { setSelectedDate(d); setSelectedTime('') }}
                minDate={minDate}
                maxDate={maxDate}
                closedDayNames={closedDayNames}
                blockedDates={settings.blocked_dates || []}
              />
            </div>

            {/* Time slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t('timeLabel') || 'Time'} *
                </label>
                {selectedDate && activeDuration && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    {formatDuration(activeDuration)} slots
                    {settings.slot_padding > 0 && ` · ${settings.slot_padding}min buffer`}
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <p className="text-slate-400 text-sm">{t('selectDateFirst') || 'Please select a date first'}</p>
              ) : isCustomerChoice && !selectedDuration ? (
                <p className="text-slate-400 text-sm">Please select a duration first</p>
              ) : availableTimeSlots.length === 0 ? (
                <div>
                  <p className="text-red-600 text-sm mb-1">{t('noAvailableSlots') || 'No available time slots for this date'}</p>
                  {settings.blocked_dates?.includes(selectedDate) ? (
                    <p className="text-xs text-slate-500">
                      This date is not available for bookings. Please choose another day.
                    </p>
                  ) : selectedDayHours?.closed && (
                    <p className="text-xs text-slate-500">
                      We are closed on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s. Please choose another day.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {selectedDayHours && !selectedDayHours.closed && (
                    <p className="text-xs text-slate-500 mb-3">
                      Open {selectedDayHours.open} – {selectedDayHours.close}
                    </p>
                  )}
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
                </div>
              )}
            </div>

            {/* Party size */}
            {settings.show_party_size !== false && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('partySizeLabel') || 'Party Size'} *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPartySize(p => Math.max(settings.min_party_size || 1, p - 1))}
                    disabled={partySize <= (settings.min_party_size || 1)}
                    className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >−</button>
                  <input
                    type="number"
                    value={partySize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      const min = settings.min_party_size || 1
                      const max = settings.max_party_size || 20
                      if (val >= min && val <= max) setPartySize(val)
                    }}
                    min={settings.min_party_size || 1}
                    max={settings.max_party_size || 20}
                    required
                    className="w-24 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setPartySize(p => Math.min(settings.max_party_size || 20, p + 1))}
                    disabled={partySize >= (settings.max_party_size || 20)}
                    className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >+</button>
                  <span className="text-slate-600 ml-2">{partySize === 1 ? (t('guest') || 'guest') : (t('guests') || 'guests')}</span>
                </div>
              </div>
            )}

            {/* Customer name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('nameLabel') || 'Your Name'} *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('namePlaceholder') || 'John Smith'}
              />
            </div>

            {/* Phone — mandatory, used for OTP */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('phoneLabel') || 'Phone Number'} *
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('phonePlaceholder') || '+1 (555) 123-4567'}
              />
              <p className="text-xs text-slate-500 mt-1">We'll send a verification code to this number to confirm your booking.</p>
            </div>

            {/* Email — optional */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailLabel') || 'Email Address'} <span className="font-normal text-slate-400">({t('optional') || 'Optional'})</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('emailPlaceholder') || 'john@example.com'}
              />
              <p className="text-xs text-slate-500 mt-1">{t('emailHelpText') || "We'll send your confirmation to this email"}</p>
            </div>

            {/* Special requests */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={sendingOtp || checkingAvailability || !selectedDate || !selectedTime || (isCustomerChoice && !selectedDuration) || !customerName.trim() || !customerPhone.trim()}
              className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sendingOtp || checkingAvailability
                ? 'Checking availability...'
                : 'Continue — Verify Phone'}
            </button>
          </form>

          {/* OTP Verification Step */}
          {otpStep && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#6262bd]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Verify your phone</h2>
                  <p className="text-slate-500 text-sm">
                    We sent a 6-digit code to <strong>{customerPhone}</strong>
                  </p>
                </div>

                {otpError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">{otpError}</div>
                )}

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-800 text-center text-2xl font-bold tracking-widest mb-4"
                  autoFocus
                />

                <button
                  onClick={verifyAndBook}
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full bg-[#6262bd] text-white py-3.5 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-3"
                >
                  {verifyingOtp ? 'Verifying...' : 'Confirm Booking'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => { setOtpStep(false); setOtpCode(''); setOtpError(null) }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    ← Change details
                  </button>
                  {otpResendCountdown > 0 ? (
                    <span className="text-slate-400">Resend in {otpResendCountdown}s</span>
                  ) : (
                    <button
                      onClick={resendOtp}
                      disabled={sendingOtp}
                      className="text-[#6262bd] hover:text-[#5252a3] font-medium disabled:opacity-50"
                    >
                      {sendingOtp ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
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
