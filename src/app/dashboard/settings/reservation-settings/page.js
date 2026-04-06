'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import OfflinePageGuard from '@/components/OfflinePageGuard'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_HOURS = {
  monday:    { shifts: [{ open: '09:00', close: '22:00' }], closed: false },
  tuesday:   { shifts: [{ open: '09:00', close: '22:00' }], closed: false },
  wednesday: { shifts: [{ open: '09:00', close: '22:00' }], closed: false },
  thursday:  { shifts: [{ open: '09:00', close: '22:00' }], closed: false },
  friday:    { shifts: [{ open: '09:00', close: '23:00' }], closed: false },
  saturday:  { shifts: [{ open: '10:00', close: '23:00' }], closed: false },
  sunday:    { shifts: [{ open: '10:00', close: '21:00' }], closed: true },
}

// Normalise legacy { open, close } format → { shifts } format
function normaliseHours(raw) {
  const result = {}
  for (const day of DAYS) {
    const d = raw[day] || DEFAULT_HOURS[day]
    if (d.shifts) {
      result[day] = d
    } else {
      result[day] = { closed: d.closed, shifts: [{ open: d.open || '09:00', close: d.close || '22:00' }] }
    }
  }
  return result
}

// Fixed-interval options (manager picks one, customer sees pre-made slots)
const FIXED_SLOT_OPTIONS = [
  { value: 15,  labelKey: 'minute15' },
  { value: 30,  labelKey: 'minute30' },
  { value: 45,  labelKey: 'minute45' },
  { value: 60,  labelKey: 'hour1' },
  { value: 90,  labelKey: 'hour15' },
  { value: 120, labelKey: 'hour2' },
]

// Duration choices the manager can offer to customers (customer-choose mode)
const DURATION_OPTIONS = [
  { value: 15,  labelKey: 'min15' },
  { value: 30,  labelKey: 'min30' },
  { value: 45,  labelKey: 'min45' },
  { value: 60,  labelKey: 'hour1' },
  { value: 90,  labelKey: 'hour15' },
  { value: 120, labelKey: 'hour2' },
  { value: 180, labelKey: 'hour3' },
]

// Padding options between bookings
const PADDING_OPTIONS = [
  { value: 0,  labelKey: 'paddingNone' },
  { value: 5,  labelKey: 'min5' },
  { value: 10, labelKey: 'min10' },
  { value: 15, labelKey: 'min15' },
  { value: 30, labelKey: 'min30' },
  { value: 60, labelKey: 'hour1' },
]

export default function ReservationSettingsPage() {
  const t = useTranslations('reservationSettings')
  const tg = useTranslations('guide')
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [categoryLabels, setCategoryLabels] = useState({})

  // Slot mode: 'fixed' | 'customer_choice'
  const [slotMode, setSlotMode] = useState('fixed')
  const [slotInterval, setSlotInterval] = useState(30)
  const [allowedDurations, setAllowedDurations] = useState([60])
  const [slotPadding, setSlotPadding] = useState(0)
  const [advanceBookingDays, setAdvanceBookingDays] = useState(60)
  const [minAdvanceNoticeDays, setMinAdvanceNoticeDays] = useState(0)
  const [showPartySize, setShowPartySize] = useState(true)
  const [singleBookingArea, setSingleBookingArea] = useState(false)
  const [operatingHours, setOperatingHours] = useState(DEFAULT_HOURS)

  // "See menu" button on booking confirmation page
  const [showMenuButton, setShowMenuButton] = useState(true)
  const [menuButtonText, setMenuButtonText] = useState('')

  // Global booking fee
  const [globalFeeEnabled, setGlobalFeeEnabled] = useState(false)
  const [globalFeeAmount, setGlobalFeeAmount] = useState('')

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const map = {}
          data.value.forEach(c => { map[c.value] = c.label })
          setCategoryLabels(map)
        }
      })
  }, [])

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
    setMinAdvanceNoticeDays(s.min_advance_notice_days || 0)
    setShowPartySize(s.show_party_size !== false)
    setSingleBookingArea(s.single_booking_area === true)
    setShowMenuButton(s.show_menu_button !== false)
    setMenuButtonText(s.menu_button_text || '')
    setOperatingHours(normaliseHours(s.operating_hours || DEFAULT_HOURS))
    setGlobalFeeEnabled(!!r.global_booking_fee_enabled)
    setGlobalFeeAmount(r.global_booking_fee_amount != null ? String(r.global_booking_fee_amount) : '')
    setLoading(false)
  }, [restaurantCtx])

  const toggleDuration = (val) => {
    setAllowedDurations(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val].sort((a, b) => a - b)
    )
  }

  const toggleDayClosed = (day) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed }
    }))
  }

  const updateShift = (day, idx, field, value) => {
    setOperatingHours(prev => {
      const shifts = prev[day].shifts.map((s, i) => i === idx ? { ...s, [field]: value } : s)
      return { ...prev, [day]: { ...prev[day], shifts } }
    })
  }

  const addShift = (day) => {
    setOperatingHours(prev => {
      const last = prev[day].shifts[prev[day].shifts.length - 1]
      const newShift = { open: last?.close || '14:00', close: '22:00' }
      return { ...prev, [day]: { ...prev[day], shifts: [...prev[day].shifts, newShift] } }
    })
  }

  const removeShift = (day, idx) => {
    setOperatingHours(prev => {
      const shifts = prev[day].shifts.filter((_, i) => i !== idx)
      return { ...prev, [day]: { ...prev[day], shifts: shifts.length ? shifts : [{ open: '09:00', close: '22:00' }] } }
    })
  }

  const handleSave = async () => {
    if (slotMode === 'customer_choice' && allowedDurations.length === 0) {
      setMessage({ type: 'error', text: t('errorSelectDuration') })
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
      min_advance_notice_days: minAdvanceNoticeDays,
      show_party_size: showPartySize,
      single_booking_area: singleBookingArea,
      show_menu_button: showMenuButton,
      menu_button_text: menuButtonText.trim() || null,
      operating_hours: operatingHours,
    }

    const updates = { reservation_settings }
    updates.global_booking_fee_enabled = globalFeeEnabled
    updates.global_booking_fee_amount = globalFeeEnabled && globalFeeAmount !== ''
      ? parseFloat(globalFeeAmount)
      : null

    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id)

    setMessage(error
      ? { type: 'error', text: t('errorSave') }
      : { type: 'success', text: t('successSave') }
    )
    setSaving(false)
  }

  if (loading) return <div className="text-slate-500">{t('loading')}</div>
  if (!restaurant) return <div className="text-red-600">{t('noRestaurant')}</div>

  return (
    <OfflinePageGuard>
    <div>
      <PageTabs tabs={settingsTabs} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">{t('title')}<InfoTooltip text={tg('reservation_settings_desc')} /></h1>
        <p className="text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>

      {/* Industry category (read-only) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('industryCategory')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          {t('industryCategoryDesc')}
        </p>
        {restaurant.industry_category ? (
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-[#6262bd]/10 text-[#6262bd] font-semibold text-sm">
            {categoryLabels[restaurant.industry_category] || restaurant.industry_category}
          </span>
        ) : (
          <span className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
            {t('notAssigned')}
          </span>
        )}
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
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('bookingSlotMode')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {t('bookingSlotModeDesc')}
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
            <div className={`font-semibold mb-1 ${slotMode === 'fixed' ? 'text-[#6262bd]' : 'text-slate-700 dark:text-slate-300'}`}>{t('fixedSlots')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('fixedSlotsDesc')}</div>
          </button>
          <button
            onClick={() => setSlotMode('customer_choice')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              slotMode === 'customer_choice'
                ? 'border-[#6262bd] bg-[#6262bd]/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className={`font-semibold mb-1 ${slotMode === 'customer_choice' ? 'text-[#6262bd]' : 'text-slate-700 dark:text-slate-300'}`}>{t('customerChooses')}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('customerChoosesDesc')}</div>
          </button>
        </div>

        {/* Fixed: slot interval */}
        {slotMode === 'fixed' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('slotInterval')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer choice: allowed durations */}
        {slotMode === 'customer_choice' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('durationOptions')}</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('durationOptionsDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
            {allowedDurations.length === 0 && (
              <p className="text-xs text-red-500 mt-2">{t('selectAtLeastOne')}</p>
            )}
          </div>
        )}
      </div>

      {/* Padding between bookings */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('bufferTime')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {t('bufferTimeDesc')}
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
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
        {slotPadding > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            {t('bufferNote', { minutes: slotPadding, plural: slotPadding > 1 ? 's' : '' })}
          </p>
        )}
      </div>

      {/* Advance booking window */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('advanceBookingWindow')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {t('advanceBookingWindowDesc')}
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
          <span className="text-slate-600 dark:text-slate-400 font-medium">{t('days')}</span>
        </div>
      </div>

      {/* Party size toggle */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('partySize')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('partySizeDesc')}
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
          {showPartySize ? t('partySizeOn') : t('partySizeOff')}
        </div>
      </div>

      {/* Single booking area */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('singleBookingArea')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('singleBookingAreaDesc')}
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
          {singleBookingArea ? t('singleAreaOn') : t('singleAreaOff')}
        </div>
      </div>

      {/* "See menu" button on confirmation page */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('seeMenuButton')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('seeMenuButtonDesc')}
            </p>
          </div>
          <button
            onClick={() => setShowMenuButton(v => !v)}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${showMenuButton ? 'bg-[#6262bd]' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showMenuButton ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className={`mt-3 text-sm font-medium ${showMenuButton ? 'text-[#6262bd]' : 'text-slate-500 dark:text-slate-400'}`}>
          {showMenuButton ? t('menuButtonOn') : t('menuButtonOff')}
        </div>
        {showMenuButton && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t('buttonLabel')} <span className="text-slate-400 font-normal">{t('buttonLabelOptional')}</span>
            </label>
            <input
              type="text"
              value={menuButtonText}
              onChange={e => setMenuButtonText(e.target.value)}
              placeholder={t('viewMenuPlaceholder')}
              maxLength={60}
              className="w-full max-w-xs px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
            />
          </div>
        )}
      </div>

      {/* Operating hours */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('operatingHours')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {t('operatingHoursDesc')}
        </p>

        {/* Minimum advance notice */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('minAdvanceNotice')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t('minAdvanceNoticeDesc')}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {[0, 1, 2, 3, 5, 7].map(n => (
              <button
                key={n}
                onClick={() => setMinAdvanceNoticeDays(n)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  minAdvanceNoticeDays === n
                    ? 'border-[#6262bd] bg-[#6262bd]/10 text-[#6262bd]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {n === 0 ? t('sameDay') : n === 1 ? t('oneDay') : t('nDays', { n })}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={30}
                value={minAdvanceNoticeDays}
                onChange={e => setMinAdvanceNoticeDays(Math.max(0, Number(e.target.value)))}
                className="w-20 px-3 py-2 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center text-sm font-semibold"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('days')}</span>
            </div>
          </div>
          {minAdvanceNoticeDays > 0 && (
            <p className="text-xs text-[#6262bd] mt-3 font-medium">
              {t('minAdvanceNote', {
                n: minAdvanceNoticeDays,
                plural: minAdvanceNoticeDays > 1 ? 's' : '',
                remaining: minAdvanceNoticeDays - 1,
                remainingPlural: minAdvanceNoticeDays > 1 ? 's' : '',
              })}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {DAYS.map((day, dayIdx) => {
            const hours = operatingHours[day] || DEFAULT_HOURS[day]
            return (
              <div
                key={day}
                className={`px-4 py-3 ${
                  dayIdx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                {/* Day name + toggle on one line */}
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-sm font-semibold capitalize w-20 flex-shrink-0 ${hours.closed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {t(day)}
                  </span>
                  <button
                    onClick={() => toggleDayClosed(day)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${hours.closed ? 'bg-slate-300 dark:bg-slate-600' : 'bg-[#6262bd]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hours.closed ? 'translate-x-0' : 'translate-x-5'}`} />
                  </button>
                  {hours.closed && (
                    <span className="text-sm text-slate-400 dark:text-slate-500">{t('closed')}</span>
                  )}
                </div>

                {/* Time inputs below */}
                {!hours.closed && (
                  <div className="flex flex-col gap-2 ml-2">
                    {hours.shifts.map((shift, idx) => (
                      <div key={idx}>
                        {idx > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('shift', { n: idx + 1 })}</span>
                            <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
                          </div>
                        )}
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={shift.open}
                              onChange={e => updateShift(day, idx, 'open', e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm flex-1 min-w-0"
                            />
                            <span className="text-slate-400 dark:text-slate-500 text-xs">–</span>
                            <input
                              type="time"
                              value={shift.close}
                              onChange={e => updateShift(day, idx, 'close', e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm flex-1 min-w-0"
                            />
                          </div>
                          {hours.shifts.length > 1 && (
                            <button
                              onClick={() => removeShift(day, idx)}
                              className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-base leading-none"
                              title="Remove shift"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {hours.shifts.length < 3 && (
                      <button
                        onClick={() => addShift(day)}
                        className="self-start text-xs text-[#6262bd] hover:underline font-medium mt-0.5"
                      >
                        {t('addShift')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Global booking fee */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t('reservationFee')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('reservationFeeDesc')}
            </p>
          </div>
          <button
            onClick={() => setGlobalFeeEnabled(v => !v)}
            disabled={!restaurant.sms_billing_enabled || !restaurant.stripe_connect_onboarded}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${globalFeeEnabled ? 'bg-[#6262bd]' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${globalFeeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {!restaurant.sms_billing_enabled && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
            {t('smsRequired')}
          </p>
        )}
        {restaurant.sms_billing_enabled && !restaurant.stripe_connect_onboarded && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
            {t('stripeRequired')}
          </p>
        )}

        {globalFeeEnabled && restaurant.sms_billing_enabled && restaurant.stripe_connect_onboarded && (
          <div className="mt-5 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{t('feeAmount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                {restaurant.invoice_settings?.currency || 'GBP'}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={globalFeeAmount}
                onChange={e => setGlobalFeeAmount(e.target.value)}
                placeholder="0.00"
                className="pl-14 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 w-40 text-sm"
              />
            </div>
            <span className="text-xs text-slate-400">{t('perBooking')}</span>
          </div>
        )}

        {globalFeeEnabled && restaurant.sms_billing_enabled && restaurant.stripe_connect_onboarded && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('feeNote')}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? t('saving') : t('saveButton')}
      </button>
    </div>
    </OfflinePageGuard>
  )
}
