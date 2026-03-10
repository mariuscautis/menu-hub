'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import PWAInstallButton from '@/components/PWAInstallButton'

const LEAVE_TYPES = [
  { value: 'annual_holiday', label: '🏖️ Annual Holiday (Paid)', description: 'Paid leave from your annual entitlement', requiresReason: false },
  { value: 'sick_self_cert', label: '🤒 Sick Leave – Self Certified', description: 'For illness up to 7 days — no medical certificate required', requiresReason: true },
  { value: 'sick_medical_cert', label: '🏥 Sick Leave – Medical Certificate', description: 'For illness over 7 days — medical certificate required', requiresReason: true },
  { value: 'unpaid', label: '💸 Unpaid Leave', description: 'Time off without pay', requiresReason: true },
  { value: 'compassionate', label: '🕊️ Compassionate Leave', description: 'For bereavement or family emergencies', requiresReason: true },
  { value: 'other', label: '📋 Other', description: 'Other type of leave', requiresReason: true },
]

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-amber-100', text: 'text-amber-700',  dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-green-100',  text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100',    text: 'text-red-700',   dot: 'bg-red-500' },
}

function calculateWorkingDays(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start > end) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function StaffDashboard() {
  const router = useRouter()
  const [staffSession, setStaffSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState([])
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [leaveBalance, setLeaveBalance] = useState(null)

  // Modal state
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [form, setForm] = useState({ leave_type: 'annual_holiday', date_from: '', date_to: '', reason: '', medical_certificate_provided: false })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const workingDays = calculateWorkingDays(form.date_from, form.date_to)

  const fetchData = useCallback(async (session) => {
    const { staff_id, restaurant_id } = session
    try {
      // Shifts via API (bypasses RLS)
      const shiftsRes = await fetch(`/api/rota/shifts?restaurant_id=${restaurant_id}&staff_id=${staff_id}&date_from=${moment().subtract(1, 'month').format('YYYY-MM-DD')}&date_to=${moment().add(3, 'months').format('YYYY-MM-DD')}`)
      if (shiftsRes.ok) {
        const d = await shiftsRes.json()
        setShifts((d.shifts || []).filter(s => s.staff_id === staff_id))
      }

      // Time-off requests via API
      const torRes = await fetch(`/api/rota/requests?restaurant_id=${restaurant_id}&staff_id=${staff_id}&request_type=time_off`)
      if (torRes.ok) {
        const d = await torRes.json()
        setTimeOffRequests(d.requests || [])
      }

      // Leave balance via staff API
      const staffRes = await fetch(`/api/staff?restaurant_id=${restaurant_id}&staff_id=${staff_id}`)
      if (staffRes.ok) {
        const d = await staffRes.json()
        const entitlement = d.staff?.[0]?.staff_leave_entitlements?.[0]
        if (entitlement) {
          // Calculate days used from approved requests
          const approvedDays = (timeOffRequests || []).filter(r => r.status === 'approved' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
          const pendingDays = (timeOffRequests || []).filter(r => r.status === 'pending' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
          setLeaveBalance({
            annual_holiday_days: entitlement.annual_holiday_days,
            holiday_days_remaining: entitlement.annual_holiday_days - approvedDays,
            holiday_days_pending: pendingDays,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching staff dashboard data:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('staff_session')
    if (!raw) { router.push('/staff-login'); return }
    const session = JSON.parse(raw)
    setStaffSession(session)
    fetchData(session)
  }, [router, fetchData])

  // Recalculate leave balance when requests load
  useEffect(() => {
    if (!leaveBalance || timeOffRequests.length === 0) return
    const approvedDays = timeOffRequests.filter(r => r.status === 'approved' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
    const pendingDays = timeOffRequests.filter(r => r.status === 'pending' && r.leave_type === 'annual_holiday').reduce((s, r) => s + (r.days_requested || 0), 0)
    setLeaveBalance(prev => prev ? { ...prev, holiday_days_remaining: prev.annual_holiday_days - approvedDays, holiday_days_pending: pendingDays } : prev)
  }, [timeOffRequests])

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    router.push('/staff-login')
  }

  const openModal = () => {
    setForm({ leave_type: 'annual_holiday', date_from: '', date_to: '', reason: '', medical_certificate_provided: false })
    setFormErrors({})
    setSubmitSuccess(false)
    setShowTimeOffModal(true)
  }

  const validateForm = () => {
    const errs = {}
    if (!form.date_from) errs.date_from = 'Start date is required'
    if (!form.date_to) errs.date_to = 'End date is required'
    if (form.date_from && form.date_to && form.date_from > form.date_to) errs.date_to = 'End date must be on or after start date'
    const today = new Date(); today.setHours(0,0,0,0)
    if (form.date_from && new Date(form.date_from) < today) errs.date_from = 'Cannot request leave for past dates'
    if (workingDays === 0 && form.date_from && form.date_to) errs.days = 'Selected range contains no working days'
    const leaveType = LEAVE_TYPES.find(l => l.value === form.leave_type)
    if (leaveType?.requiresReason && !form.reason.trim()) errs.reason = 'Please provide a reason for this leave type'
    if (form.leave_type === 'sick_medical_cert' && !form.medical_certificate_provided) errs.medical = 'Please confirm you will provide a medical certificate'
    if (form.leave_type === 'annual_holiday' && leaveBalance) {
      const available = (leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)
      if (workingDays > available) errs.days = `You only have ${available.toFixed(1)} days available`
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/rota/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: staffSession.restaurant_id,
          staff_id: staffSession.staff_id,
          request_type: 'time_off',
          date_from: form.date_from,
          date_to: form.date_to,
          reason: form.reason,
          leave_type: form.leave_type,
          days_requested: workingDays,
          medical_certificate_provided: form.medical_certificate_provided,
        })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to submit') }
      setSubmitSuccess(true)
      await fetchData(staffSession)
      setTimeout(() => setShowTimeOffModal(false), 1800)
    } catch (err) {
      setFormErrors(prev => ({ ...prev, submit: err.message }))
    }
    setSubmitting(false)
  }

  const leaveTypeInfo = LEAVE_TYPES.find(l => l.value === form.leave_type) || LEAVE_TYPES[0]

  // Stats
  const upcomingShifts = shifts.filter(s => moment(s.date).isSameOrAfter(moment(), 'day')).length
  const thisWeekShifts = shifts.filter(s => moment(s.date).isBetween(moment().startOf('isoWeek'), moment().endOf('isoWeek'), 'day', '[]')).length
  const pendingTimeOff = timeOffRequests.filter(r => r.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]" />
      </div>
    )
  }

  if (!staffSession) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Welcome, {staffSession.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{staffSession.role} · {staffSession.restaurant_name}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-sm transition-colors">
            Log out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming Shifts', value: upcomingShifts, color: 'text-[#6262bd]' },
            { label: 'This Week', value: thisWeekShifts, color: 'text-[#6262bd]' },
            { label: 'Pending Time-Off', value: pendingTimeOff, color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 leading-tight">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Shifts list */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">My Schedule</h2>
          {shifts.filter(s => moment(s.date).isSameOrAfter(moment(), 'day')).length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm font-medium">No upcoming shifts scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts
                .filter(s => moment(s.date).isSameOrAfter(moment(), 'day'))
                .slice(0, 10)
                .map(shift => {
                  const isToday = moment(shift.date).isSame(moment(), 'day')
                  const isTomorrow = moment(shift.date).isSame(moment().add(1, 'day'), 'day')
                  const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : moment(shift.date).format('ddd D MMM')
                  return (
                    <div key={shift.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl ${isToday ? 'bg-[#6262bd]/10 border-2 border-[#6262bd]/30' : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent'}`}>
                      <div className="flex-shrink-0 text-center min-w-[56px]">
                        <p className={`text-xs font-bold uppercase ${isToday ? 'text-[#6262bd]' : 'text-slate-400 dark:text-slate-500'}`}>{dayLabel}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{shift.shift_start} – {shift.shift_end}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{shift.role_required}{shift.break_duration ? ` · ${shift.break_duration}min break` : ''}</p>
                      </div>
                      {isToday && <span className="text-xs font-bold bg-[#6262bd] text-white px-2 py-0.5 rounded-full flex-shrink-0">Today</span>}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* PWA Install */}
        <PWAInstallButton />

        {/* Time-Off Requests */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Time-Off Requests</h2>
            <button onClick={openModal} className="bg-[#6262bd] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#5252a3] transition-colors">
              + Request Time Off
            </button>
          </div>

          {timeOffRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <div className="text-4xl mb-2">🌴</div>
              <p className="text-sm font-medium">No time-off requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeOffRequests.map(req => {
                const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
                return (
                  <div key={req.id} className={`border-2 rounded-xl p-4 ${req.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : req.status === 'approved' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {moment(req.date_from).format('D MMM YYYY')} – {moment(req.date_to).format('D MMM YYYY')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.days_requested ? `${req.days_requested} working day${req.days_requested !== 1 ? 's' : ''}` : ''}
                          {req.leave_type ? ` · ${req.leave_type.replace(/_/g, ' ')}` : ''}
                        </p>
                        {req.reason && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">"{req.reason}"</p>}
                        {req.status === 'rejected' && req.rejection_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">✕ {req.rejection_reason}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowTimeOffModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Drag handle — mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Request Time Off</h2>
              <button onClick={() => setShowTimeOffModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xl font-bold transition-colors">×</button>
            </div>

            {submitSuccess ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Request submitted!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your manager will be notified.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

                {/* Leave balance */}
                {leaveBalance && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">Entitlement</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{leaveBalance.annual_holiday_days}</p>
                      <p className="text-xs text-blue-500 dark:text-blue-400">days/year</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">Available</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {((leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)).toFixed(1)}
                      </p>
                      <p className="text-xs text-green-500 dark:text-green-400">remaining</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">Pending</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{(leaveBalance.holiday_days_pending || 0).toFixed(1)}</p>
                      <p className="text-xs text-amber-500 dark:text-amber-400">awaiting</p>
                    </div>
                  </div>
                )}

                {/* Leave type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Leave Type *</label>
                  <select name="leave_type" value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 text-sm">
                    {LEAVE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <div className="mt-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <p className="text-xs text-slate-600 dark:text-slate-400">{leaveTypeInfo.description}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Date *</label>
                    <input type="date" value={form.date_from} min={new Date().toISOString().split('T')[0]}
                      onChange={e => { setForm(f => ({ ...f, date_from: e.target.value })); setFormErrors(p => ({ ...p, date_from: undefined })) }}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 ${formErrors.date_from ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                    {formErrors.date_from && <p className="mt-1 text-xs text-red-500">{formErrors.date_from}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Date *</label>
                    <input type="date" value={form.date_to} min={form.date_from || new Date().toISOString().split('T')[0]}
                      onChange={e => { setForm(f => ({ ...f, date_to: e.target.value })); setFormErrors(p => ({ ...p, date_to: undefined })) }}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 ${formErrors.date_to ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                    {formErrors.date_to && <p className="mt-1 text-xs text-red-500">{formErrors.date_to}</p>}
                  </div>
                </div>

                {/* Working days preview */}
                {workingDays > 0 && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${formErrors.days ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Working days requested</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Excludes weekends</p>
                      {formErrors.days && <p className="text-xs text-red-500 mt-0.5">{formErrors.days}</p>}
                    </div>
                    <p className={`text-3xl font-bold ${formErrors.days ? 'text-red-500' : 'text-[#6262bd]'}`}>{workingDays}</p>
                  </div>
                )}

                {/* Medical cert checkbox */}
                {form.leave_type === 'sick_medical_cert' && (
                  <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer ${formErrors.medical ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} hover:border-[#6262bd] transition-colors`}>
                    <input type="checkbox" checked={form.medical_certificate_provided}
                      onChange={e => { setForm(f => ({ ...f, medical_certificate_provided: e.target.checked })); setFormErrors(p => ({ ...p, medical: undefined })) }}
                      className="w-5 h-5 mt-0.5 text-[#6262bd] rounded" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Medical Certificate Provided</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">I confirm I have or will provide a medical certificate</p>
                      {formErrors.medical && <p className="text-xs text-red-500 mt-0.5">{formErrors.medical}</p>}
                    </div>
                  </label>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Reason {leaveTypeInfo.requiresReason ? '*' : '(optional)'}
                  </label>
                  <textarea rows={3} value={form.reason}
                    onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setFormErrors(p => ({ ...p, reason: undefined })) }}
                    placeholder={form.leave_type === 'annual_holiday' ? 'Add any notes about your holiday...' : 'Please provide details...'}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 resize-none ${formErrors.reason ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                  {formErrors.reason && <p className="mt-1 text-xs text-red-500">{formErrors.reason}</p>}
                </div>

                {/* Info box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">Please note:</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Requests require manager approval</li>
                    <li>• You'll be notified by email when your request is reviewed</li>
                    {form.leave_type === 'annual_holiday' && <li>• Holiday days will be deducted from your balance when approved</li>}
                    {form.leave_type.startsWith('sick_') && <li>• Sick leave may require a return-to-work meeting</li>}
                  </ul>
                </div>

                {formErrors.submit && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
                    {formErrors.submit}
                  </div>
                )}

                <div className="flex gap-3 pb-2">
                  <button type="button" onClick={() => setShowTimeOffModal(false)}
                    className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50 text-sm">
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
