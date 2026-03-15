'use client'
export const runtime = 'edge'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { loadTranslations, createTranslator } from '@/lib/clientTranslations'

// ─── Stripe fee payment form ───────────────────────────────────────────────────

function FeePaymentForm({ clientSecret, onPay, processing, publishableKey, stripeAccountId }) {
  const stripeRef = useRef(null)
  const elementsRef = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const init = async () => {
      if (!window.Stripe) {
        const script = document.createElement('script')
        script.src = 'https://js.stripe.com/v3/'
        script.async = true
        document.head.appendChild(script)
        await new Promise(resolve => { script.onload = resolve })
      }
      const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : {}
      const stripe = window.Stripe(publishableKey, stripeOptions)
      stripeRef.current = stripe
      const elements = stripe.elements({ clientSecret })
      elementsRef.current = elements
      const paymentElement = elements.create('payment')
      paymentElement.mount('#stripe-payment-element')
    }

    init()
  }, [clientSecret, publishableKey, stripeAccountId])

  return (
    <div>
      <div id="stripe-payment-element" className="mb-4" />
      <button
        onClick={() => onPay(stripeRef.current, elementsRef.current)}
        disabled={processing}
        className="w-full bg-[#6262bd] text-white py-3.5 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {processing ? 'Processing payment...' : 'Pay deposit & confirm booking'}
      </button>
    </div>
  )
}

// ─── Phone prefix data ────────────────────────────────────────────────────────

const PHONE_PREFIXES = [
  { code: 'AF', dial: '+93',  flag: '🇦🇫', name: 'Afghanistan' },
  { code: 'AL', dial: '+355', flag: '🇦🇱', name: 'Albania' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'AT', dial: '+43',  flag: '🇦🇹', name: 'Austria' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'BG', dial: '+359', flag: '🇧🇬', name: 'Bulgaria' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'CL', dial: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China' },
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: 'HR', dial: '+385', flag: '🇭🇷', name: 'Croatia' },
  { code: 'CY', dial: '+357', flag: '🇨🇾', name: 'Cyprus' },
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: 'DK', dial: '+45',  flag: '🇩🇰', name: 'Denmark' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: 'EE', dial: '+372', flag: '🇪🇪', name: 'Estonia' },
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'GR', dial: '+30',  flag: '🇬🇷', name: 'Greece' },
  { code: 'HU', dial: '+36',  flag: '🇭🇺', name: 'Hungary' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'KR', dial: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: 'LV', dial: '+371', flag: '🇱🇻', name: 'Latvia' },
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: 'LT', dial: '+370', flag: '🇱🇹', name: 'Lithuania' },
  { code: 'LU', dial: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'MT', dial: '+356', flag: '🇲🇹', name: 'Malta' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: 'PE', dial: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'PL', dial: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'RO', dial: '+40',  flag: '🇷🇴', name: 'Romania' },
  { code: 'RU', dial: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'RS', dial: '+381', flag: '🇷🇸', name: 'Serbia' },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'SK', dial: '+421', flag: '🇸🇰', name: 'Slovakia' },
  { code: 'SI', dial: '+386', flag: '🇸🇮', name: 'Slovenia' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: 'TW', dial: '+886', flag: '🇹🇼', name: 'Taiwan' },
  { code: 'TH', dial: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: 'VN', dial: '+84',  flag: '🇻🇳', name: 'Vietnam' },
]

// Map IANA timezone → country code (common ones)
const TIMEZONE_TO_COUNTRY = {
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE', 'Europe/Lisbon': 'PT', 'Europe/Athens': 'GR',
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Oslo': 'NO', 'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU', 'Europe/Sofia': 'BG', 'Europe/Belgrade': 'RS',
  'Europe/Zagreb': 'HR', 'Europe/Ljubljana': 'SI', 'Europe/Bratislava': 'SK',
  'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  'Europe/Luxembourg': 'LU', 'Europe/Nicosia': 'CY', 'Europe/Malta': 'MT',
  'Europe/Dublin': 'IE', 'Europe/Kiev': 'UA', 'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Montreal': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR', 'America/Santiago': 'CL', 'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Beirut': 'LB',
  'Asia/Amman': 'JO', 'Asia/Jerusalem': 'IL', 'Asia/Kolkata': 'IN',
  'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK', 'Asia/Colombo': 'LK',
  'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG', 'Asia/Taipei': 'TW', 'Asia/Bangkok': 'TH',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID',
  'Asia/Ho_Chi_Minh': 'VN',
  'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/Tunis': 'TN',
  'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
}

function detectCountryCode() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_TO_COUNTRY[tz] || 'GB'
  } catch {
    return 'GB'
  }
}

// ─── Phone prefix selector component ─────────────────────────────────────────

function PhonePrefixSelector({ selectedCode, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = PHONE_PREFIXES.find(p => p.code === selectedCode) || PHONE_PREFIXES.find(p => p.code === 'GB')
  const filtered = PHONE_PREFIXES.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.dial.includes(search)
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex items-center gap-1.5 px-3 py-3 border-2 border-r-0 border-slate-200 rounded-l-xl bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 whitespace-nowrap h-full"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-sm font-medium">{selected.dial}</span>
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border-2 border-slate-200 rounded-xl shadow-xl w-64 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => { onChange(p.code); setOpen(false); setSearch('') }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left ${p.code === selectedCode ? 'bg-[#6262bd]/5 text-[#6262bd] font-medium' : 'text-slate-700'}`}
                >
                  <span className="text-base">{p.flag}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-slate-400 text-xs">{p.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-slate-400 text-center">No results</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

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
  const [fullPhone, setFullPhone] = useState('') // dial code + local number
  const [otpLocale, setOtpLocale] = useState('en') // locale used when OTP was sent (for resend)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState(null)
  const [otpResendCountdown, setOtpResendCountdown] = useState(0)

  // Fee payment flow (triggered when customer has a deposit restriction)
  const [feeStep, setFeeStep] = useState(false)
  const [feeAmount, setFeeAmount] = useState(null)
  const [feeCurrency, setFeeCurrency] = useState('GBP')
  const [feeCustomerId, setFeeCustomerId] = useState(null)
  const [feeClientSecret, setFeeClientSecret] = useState(null)
  const [feePaymentIntentId, setFeePaymentIntentId] = useState(null)
  const [feeStripeAccountId, setFeeStripeAccountId] = useState(null)
  const [processingFee, setProcessingFee] = useState(false)
  const [feeError, setFeeError] = useState(null)
  const [verifiedLocale, setVerifiedLocale] = useState('en')

  // Form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(null) // customer-choice mode
  const [selectedTime, setSelectedTime] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('GB') // auto-detected
  const [specialRequests, setSpecialRequests] = useState('')

  // Availability
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  // Translations
  const [translations, setTranslations] = useState({})
  const t = createTranslator(translations)

  useEffect(() => {
    fetchRestaurant()
    setPhoneCountryCode(detectCountryCode())
  }, [slug])

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

  // Derive SMS flag from restaurant data
  const smsEnabled = !!restaurant?.sms_billing_enabled

  // Step 1: validate form, check availability, then either send OTP or direct book
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (smsEnabled && !customerPhone.trim()) {
      setError('Phone number is required to verify your booking.')
      return
    }

    if (!smsEnabled && !customerEmail.trim()) {
      setError('Email address is required to confirm your booking.')
      return
    }

    const supportedLocales = ['en', 'ro', 'fr', 'it', 'es']
    const restaurantLocale = restaurant.email_language
    const locale = restaurantLocale && supportedLocales.includes(restaurantLocale) ? restaurantLocale : 'en'

    // ── Non-SMS path: direct booking ──────────────────────────────────────────
    if (!smsEnabled) {
      setSendingOtp(true)
      try {
        const isAvailable = await checkAvailability(selectedDate, selectedTime)
        if (!isAvailable) {
          setError(t('slotUnavailable') || 'Sorry, this time slot is no longer available. Please select another time.')
          return
        }

        const res = await fetch('/api/reservations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            customerName,
            customerEmail,
            customerPhone: customerPhone.trim() || null,
            partySize,
            reservationDate: selectedDate,
            reservationTime: selectedTime,
            specialRequests: specialRequests || null,
            locale,
          })
        })
        const result = await res.json()

        if (!result.success) {
          setError(result.error || 'Failed to submit your booking. Please try again.')
          return
        }

        // Fire-and-forget confirmation email
        fetch('/api/reservations/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: result.reservationId, isConfirmation: false, locale })
        }).catch(err => console.error('Email error:', err))

        setBookingSuccess(true)
      } catch (err) {
        console.error('Direct booking error:', err)
        setError('Failed to submit your booking. Please try again.')
      } finally {
        setSendingOtp(false)
      }
      return
    }

    // ── SMS path: send OTP ────────────────────────────────────────────────────
    const dialCode = PHONE_PREFIXES.find(p => p.code === phoneCountryCode)?.dial || '+44'
    const localNumber = customerPhone.replace(/^\+/, '').replace(/^0/, '')
    const fullPhone = dialCode + localNumber

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
        body: JSON.stringify({ phone: fullPhone, restaurantName: restaurant.name, restaurantId: restaurant.id, locale })
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error || 'Failed to send verification code. Please check your phone number.')
        return
      }

      setFullPhone(fullPhone)
      setOtpLocale(locale)
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
        body: JSON.stringify({ phone: fullPhone, restaurantName: restaurant.name, restaurantId: restaurant.id, locale: otpLocale })
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
          phone: fullPhone,
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

      // Deposit required — move to payment step
      if (result.requiresFee) {
        setVerifiedLocale(locale)
        setFeeAmount(result.feeAmount)
        setFeeCurrency(result.feeCurrency || 'GBP')
        setFeeCustomerId(result.customer.id)

        // Create a payment intent
        const piRes = await fetch('/api/reservations/create-fee-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            customerId: result.customer.id,
            amount: result.feeAmount,
            currency: result.feeCurrency || 'GBP',
          })
        })
        const piData = await piRes.json()

        if (!piData.clientSecret) {
          setOtpError(piData.error || 'Failed to initialise payment. Please try again.')
          return
        }

        setFeeClientSecret(piData.clientSecret)
        setFeePaymentIntentId(piData.paymentIntentId)
        setFeeStripeAccountId(piData.stripeAccountId || null)
        setOtpStep(false)
        setFeeStep(true)
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

  const payFeeAndBook = async (stripe, elements) => {
    if (!stripe || !elements) return
    setProcessingFee(true)
    setFeeError(null)

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })

      if (stripeError) {
        setFeeError(stripeError.message || 'Payment failed. Please try again.')
        return
      }

      if (paymentIntent?.status !== 'succeeded') {
        setFeeError('Payment was not completed. Please try again.')
        return
      }

      // Payment succeeded — complete the booking
      const res = await fetch('/api/reservations/complete-with-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: feePaymentIntentId,
          restaurantId: restaurant.id,
          customerId: feeCustomerId,
          customerName,
          customerEmail: customerEmail || null,
          customerPhone: fullPhone,
          partySize,
          reservationDate: selectedDate,
          reservationTime: selectedTime,
          specialRequests: specialRequests || null,
          locale: verifiedLocale,
          feeAmount,
          feeCurrency,
        })
      })
      const result = await res.json()

      if (!result.success) {
        setFeeError(result.error || 'Failed to complete booking. Please contact the venue.')
        return
      }

      setBookingSuccess(true)
    } catch (err) {
      console.error('payFeeAndBook error:', err)
      setFeeError('Something went wrong. Please try again.')
    } finally {
      setProcessingFee(false)
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

            {/* Phone — mandatory for OTP flow, optional otherwise */}
            {smsEnabled ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('phoneLabel') || 'Phone Number'} *
                </label>
                <div className="flex">
                  <PhonePrefixSelector
                    selectedCode={phoneCountryCode}
                    onChange={setPhoneCountryCode}
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-r-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="7700 900000"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">We'll send a verification code to this number to confirm your booking.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('phoneLabel') || 'Phone Number'} <span className="font-normal text-slate-400">({t('optional') || 'Optional'})</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="07700 900000"
                />
              </div>
            )}

            {/* Email — required when SMS is off, optional otherwise */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailLabel') || 'Email Address'} {smsEnabled
                  ? <span className="font-normal text-slate-400">({t('optional') || 'Optional'})</span>
                  : '*'}
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required={!smsEnabled}
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
              disabled={
                sendingOtp || checkingAvailability ||
                !selectedDate || !selectedTime ||
                (isCustomerChoice && !selectedDuration) ||
                !customerName.trim() ||
                (smsEnabled ? !customerPhone.trim() : !customerEmail.trim())
              }
              className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sendingOtp || checkingAvailability
                ? 'Checking availability...'
                : smsEnabled ? 'Continue — Verify Phone' : 'Request Booking'}
            </button>
          </form>

          {/* OTP Verification Step — only when SMS billing is active */}
          {smsEnabled && otpStep && (
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
                    We sent a 6-digit code to <strong>{fullPhone}</strong>
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

          {/* Fee Payment Step */}
          {feeStep && feeClientSecret && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Booking deposit required</h2>
                  <p className="text-slate-500 text-sm mb-1">
                    A deposit of <strong>{feeCurrency} {Number(feeAmount).toFixed(2)}</strong> is required to complete your booking at <strong>{restaurant.name}</strong>.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                  <p className="font-medium mb-1">💳 About this deposit</p>
                  <p>This amount will be deducted from your bill on the day. It is <strong>non-refundable</strong> if you do not show up for your reservation.</p>
                </div>

                {feeError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">{feeError}</div>
                )}

                <FeePaymentForm
                  clientSecret={feeClientSecret}
                  onPay={payFeeAndBook}
                  processing={processingFee}
                  publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
                  stripeAccountId={feeStripeAccountId}
                />

                <button
                  onClick={() => { setFeeStep(false); setOtpStep(false); setFeeError(null) }}
                  className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Change details
                </button>
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
