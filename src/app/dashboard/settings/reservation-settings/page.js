'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_HOURS = {
  monday:    { open: '09:00', close: '22:00', closed: false },
  tuesday:   { open: '09:00', close: '22:00', closed: false },
  wednesday: { open: '09:00', close: '22:00', closed: false },
  thursday:  { open: '09:00', close: '22:00', closed: false },
  friday:    { open: '09:00', close: '23:00', closed: false },
  saturday:  { open: '10:00', close: '23:00', closed: false },
  sunday:    { open: '10:00', close: '21:00', closed: true },
}

// Fixed-interval options (manager picks one, customer sees pre-made slots)
const FIXED_SLOT_OPTIONS = [
  { value: 15,  label: '15 minutes' },
  { value: 30,  label: '30 minutes' },
  { value: 45,  label: '45 minutes' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

// Duration choices the manager can offer to customers (customer-choose mode)
const DURATION_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
]

// Padding options between bookings
const PADDING_OPTIONS = [
  { value: 0,  label: 'None' },
  { value: 5,  label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
]

export default function ReservationSettingsPage() {
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Slot mode: 'fixed' | 'customer_choice'
  const [slotMode, setSlotMode] = useState('fixed')
  const [slotInterval, setSlotInterval] = useState(30)
  const [allowedDurations, setAllowedDurations] = useState([60])
  const [slotPadding, setSlotPadding] = useState(0)
  const [advanceBookingDays, setAdvanceBookingDays] = useState(60)
  const [showPartySize, setShowPartySize] = useState(true)
  const [singleBookingArea, setSingleBookingArea] = useState(false)
  const [operatingHours, setOperatingHours] = useState(DEFAULT_HOURS)

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const r = restaurantCtx.restaurant
    setRestaurant(r)

    const s = r.reservation_settings || {}
    setSlotMode(s.slot_mode || 'fixed')
    setSlotInterval(s.time_slot_interval || 30)
    setAllowedDurations(s.allowed_durations?.length ? s.allowed_durations : [60])
    setSlotPadding(s.slot_padding || 0)
    setAdvanceBookingDays(s.advance_booking_days || 60)
    setShowPartySize(s.show_party_size !== false)
    setSingleBookingArea(s.single_booking_area === true)
    setOperatingHours(s.operating_hours || DEFAULT_HOURS)
    setLoading(false)
  }, [restaurantCtx])

  const toggleDuration = (val) => {
    setAllowedDurations(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val].sort((a, b) => a - b)
    )
  }

  const updateDay = (day, field, value) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSave = async () => {
    if (slotMode === 'customer_choice' && allowedDurations.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one duration option for customers.' })
      return
    }

    setSaving(true)
    setMessage(null)

    const reservation_settings = {
      ...(restaurant.reservation_settings || {}),
      slot_mode: slotMode,
      time_slot_interval: slotMode === 'fixed' ? slotInterval : Math.min(...allowedDurations),
      allowed_durations: allowedDurations,
      slot_padding: slotPadding,
      advance_booking_days: advanceBookingDays,
      show_party_size: showPartySize,
      single_booking_area: singleBookingArea,
      operating_hours: operatingHours,
    }

    const { error } = await supabase
      .from('restaurants')
      .update({ reservation_settings })
      .eq('id', restaurant.id)

    setMessage(error
      ? { type: 'error', text: 'Failed to save settings. Please try again.' }
      : { type: 'success', text: 'Reservation settings saved successfully.' }
    )
    setSaving(false)
  }

  if (loading) return <div className="text-slate-500">Loading...</div>
  if (!restaurant) return <div className="text-red-600">No restaurant found.</div>

  return (
    <div>
      <PageTabs tabs={settingsTabs} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Reservation Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure booking slots, hours and availability</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Booking slot mode */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Booking slot mode</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Choose whether customers select from fixed time slots you define, or whether they pick their own session duration.
        </p>

        {/* Mode toggle */}
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSlotMode('fixed')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              slotMode === 'fixed'
                ? 'border-[#6262bd] bg-[#6262bd]/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`font-semibold mb-1 ${slotMode === 'fixed' ? 'text-[#6262bd]' : 'text-slate-700 dark:text-slate-300'}`}>Fixed slots</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">You define the interval. Customers pick a start time from pre-made slots (e.g. every 30 min).</div>
          </button>
          <button
            onClick={() => setSlotMode('customer_choice')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              slotMode === 'customer_choice'
                ? 'border-[#6262bd] bg-[#6262bd]/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`font-semibold mb-1 ${slotMode === 'customer_choice' ? 'text-[#6262bd]' : 'text-slate-700 dark:text-slate-300'}`}>Customer chooses duration</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">You offer duration options. Customers first choose how long they need, then pick a start time.</div>
          </button>
        </div>

        {/* Fixed: slot interval */}
        {slotMode === 'fixed' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Slot interval</label>
            <div className="grid grid-cols-3 gap-3">
              {FIXED_SLOT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSlotInterval(opt.value)}
                  className={`py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
                    slotInterval === opt.value
                      ? 'border-[#6262bd] bg-[#6262bd]/10 text-[#6262bd]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer choice: allowed durations */}
        {slotMode === 'customer_choice' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration options to offer customers</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Select all that apply. Customers will choose from these before picking a time.</p>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleDuration(opt.value)}
                  className={`py-2.5 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    allowedDurations.includes(opt.value)
                      ? 'border-[#6262bd] bg-[#6262bd]/10 text-[#6262bd]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {allowedDurations.length === 0 && (
              <p className="text-xs text-red-500 mt-2">Select at least one duration.</p>
            )}
          </div>
        )}
      </div>

      {/* Padding between bookings */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Buffer time between bookings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Extra time after each confirmed booking before the next slot opens. Useful for cleaning, setup, or travel between sessions.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PADDING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSlotPadding(opt.value)}
              className={`py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all ${
                slotPadding === opt.value
                  ? 'border-[#6262bd] bg-[#6262bd]/10 text-[#6262bd]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {slotPadding > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            After a confirmed booking, the next available slot will start {slotPadding} minute{slotPadding > 1 ? 's' : ''} later.
          </p>
        )}
      </div>

      {/* Advance booking window */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Advance booking window</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          How many days in advance customers can make a reservation.
        </p>
        <div className="flex items-center gap-4 max-w-xs">
          <input
            type="number"
            min={1}
            max={365}
            value={advanceBookingDays}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
            className="w-28 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center text-lg font-semibold"
          />
          <span className="text-slate-600 dark:text-slate-400 font-medium">days</span>
        </div>
      </div>

      {/* Party size toggle */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Party size selector</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              When enabled, customers choose how many people will attend. Disable if each booking is always for one person (e.g. individual appointments).
            </p>
          </div>
          <button
            onClick={() => setShowPartySize(v => !v)}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${showPartySize ? 'bg-[#6262bd]' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showPartySize ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className={`mt-3 text-sm font-medium ${showPartySize ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {showPartySize ? 'Party size selection shown to customers' : 'Hidden — each booking is treated as 1 person'}
        </div>
      </div>

      {/* Single booking area */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Single booking area</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enable if your venue has only one bookable space (e.g. a private dining room, a studio, a single court). When enabled, only one booking can be confirmed per time slot — no table assignment needed. Pending bookings block the slot to prevent double-bookings.
            </p>
          </div>
          <button
            onClick={() => setSingleBookingArea(v => !v)}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${singleBookingArea ? 'bg-[#6262bd]' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${singleBookingArea ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className={`mt-3 text-sm font-medium ${singleBookingArea ? 'text-[#6262bd]' : 'text-slate-500 dark:text-slate-400'}`}>
          {singleBookingArea
            ? 'Single area — only one booking per slot, no table assignment required'
            : 'Multiple areas — table assignment required, multiple concurrent bookings allowed'}
        </div>
      </div>

      {/* Operating hours */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Operating hours</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Set open and close times for each day. Closed days are greyed out on the booking calendar.
        </p>
        <div className="space-y-3">
          {DAYS.map(day => {
            const hours = operatingHours[day] || DEFAULT_HOURS[day]
            return (
              <div key={day} className="flex items-center gap-4 flex-wrap">
                <div className="w-28 flex-shrink-0">
                  <span className={`text-sm font-semibold capitalize ${hours.closed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                </div>
                <button
                  onClick={() => updateDay(day, 'closed', !hours.closed)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    hours.closed
                      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
                      : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700'
                  }`}
                >
                  {hours.closed ? 'Closed' : 'Open'}
                </button>
                {!hours.closed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateDay(day, 'open', e.target.value)}
                      className="px-3 py-2 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
                    />
                    <span className="text-slate-400 dark:text-slate-500 text-sm">to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateDay(day, 'close', e.target.value)}
                      className="px-3 py-2 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? 'Saving…' : 'Save reservation settings'}
      </button>
    </div>
  )
}
