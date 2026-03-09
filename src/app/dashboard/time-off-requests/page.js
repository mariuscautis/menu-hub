'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', border: 'border-green-200 dark:border-green-800' },
  rejected: { label: 'Rejected', bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',    dot: 'bg-red-500',   border: 'border-red-200 dark:border-red-800' }
}

const LEAVE_LABELS = {
  annual_holiday: { emoji: '🏖️', label: 'Annual Holiday' },
  sick_self_cert: { emoji: '🤒', label: 'Sick (Self-cert)' },
  sick_medical_cert: { emoji: '🏥', label: 'Sick (Medical)' },
  unpaid: { emoji: '💸', label: 'Unpaid Leave' },
  compassionate: { emoji: '🕊️', label: 'Compassionate' },
  other: { emoji: '📋', label: 'Other' }
}

export default function TimeOffRequestsPage() {
  const t = useTranslations('timeOffRequests')
  const restaurantCtx = useRestaurant()
  const [user, setUser] = useState(null)
  const [restaurantData, setRestaurantData] = useState(null)
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedStaff, setSelectedStaff] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedLeaveType, setSelectedLeaveType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date_desc') // date_desc | date_asc | name | days

  // UI state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected'

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const restaurant = restaurantCtx.restaurant
    setRestaurantData(restaurant)

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) setUser(authUser)
    })

    fetch(`/api/staff?restaurant_id=${restaurant.id}`)
      .then(res => res.ok ? res.json() : { staff: [] })
      .then(json => setStaffMembers(json.staff || []))
  }, [restaurantCtx])

  useEffect(() => {
    if (restaurantData) fetchTimeOffRequests()
  }, [restaurantData, selectedStaff, selectedStatus, selectedLeaveType, dateFrom, dateTo])

  const fetchTimeOffRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ restaurant_id: restaurantData.id, request_type: 'time_off' })
      if (selectedStaff !== 'all') params.append('staff_id', selectedStaff)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await fetch(`/api/rota/requests?${params.toString()}`)
      const data = await response.json()
      let requests = data.requests || []

      if (dateFrom) requests = requests.filter(r => moment(r.date_from).isSameOrAfter(dateFrom))
      if (dateTo) requests = requests.filter(r => moment(r.date_to).isSameOrBefore(dateTo))
      if (selectedLeaveType !== 'all') requests = requests.filter(r => r.leave_type === selectedLeaveType)

      setTimeOffRequests(requests)
    } catch (error) {
      console.error('Error fetching time-off requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request) => {
    const confirmMsg = t('confirmApprove')
      .replace('{name}', request.staff.name)
      .replace('{dateFrom}', moment(request.date_from).format('MMM D, YYYY'))
      .replace('{dateTo}', moment(request.date_to).format('MMM D, YYYY'))
      .replace('{days}', request.days_requested)
    if (!confirm(confirmMsg)) return
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'approved', approved_by: user.id })
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || t('errorApprove')) }
      fetchTimeOffRequests()
    } catch (error) { alert(error.message || t('errorApprove')) }
  }

  const handleReject = (request) => { setSelectedRequest(request); setRejectionReason(''); setShowRejectModal(true) }

  const submitRejection = async () => {
    if (!rejectionReason.trim()) { alert(t('provideRejectionReason')); return }
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequest.id, status: 'rejected', rejection_reason: rejectionReason })
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || t('errorReject')) }
      setShowRejectModal(false); setSelectedRequest(null); setRejectionReason('')
      fetchTimeOffRequests()
    } catch (error) { alert(error.message || t('errorReject')) }
  }

  const clearFilters = () => { setSelectedStaff('all'); setSelectedStatus('all'); setSelectedLeaveType('all'); setDateFrom(''); setDateTo('') }

  const hasActiveFilters = selectedStaff !== 'all' || selectedStatus !== 'all' || selectedLeaveType !== 'all' || dateFrom || dateTo

  // Derived stats
  const stats = useMemo(() => ({
    total: timeOffRequests.length,
    pending: timeOffRequests.filter(r => r.status === 'pending').length,
    approved: timeOffRequests.filter(r => r.status === 'approved').length,
    rejected: timeOffRequests.filter(r => r.status === 'rejected').length,
    totalDays: timeOffRequests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.days_requested || 0), 0)
  }), [timeOffRequests])

  // Sorted + tab-filtered requests
  const displayRequests = useMemo(() => {
    let list = activeTab === 'all' ? timeOffRequests : timeOffRequests.filter(r => r.status === activeTab)
    switch (sortBy) {
      case 'date_asc': list = [...list].sort((a, b) => new Date(a.date_from) - new Date(b.date_from)); break
      case 'date_desc': list = [...list].sort((a, b) => new Date(b.date_from) - new Date(a.date_from)); break
      case 'name': list = [...list].sort((a, b) => (a.staff?.name || '').localeCompare(b.staff?.name || '')); break
      case 'days': list = [...list].sort((a, b) => (b.days_requested || 0) - (a.days_requested || 0)); break
      case 'submitted': list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break
    }
    return list
  }, [timeOffRequests, activeTab, sortBy])

  const TABS = [
    { key: 'all',      label: 'All',      count: stats.total },
    { key: 'pending',  label: 'Pending',  count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected }
  ]

  if (!restaurantData) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">{t('loading')}</div></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{t('title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: t('totalRequests'), value: stats.total, color: 'text-[#6262bd]', border: 'border-[#6262bd]/20' },
            { label: t('pendingCount'), value: stats.pending, color: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800' },
            { label: t('approvedCount'), value: stats.approved, color: 'text-green-600', border: 'border-green-200 dark:border-green-800' },
            { label: t('rejectedCount'), value: stats.rejected, color: 'text-red-600', border: 'border-red-200 dark:border-red-800' },
            { label: 'Days approved', value: stats.totalDays, color: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800' }
          ].map((s, i) => (
            <div key={i} className={`bg-white dark:bg-slate-900 border-2 ${s.border} rounded-2xl p-4`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zm-7-14v2h18V4H3zm3 7h12v-2H6v2z"/></svg>
              {t('filters')}
              {hasActiveFilters && <span className="text-xs bg-[#6262bd] text-white px-2 py-0.5 rounded-full">Active</span>}
            </h2>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#6262bd] hover:text-[#5252a3] font-semibold">{t('clearAll')}</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('staffMember')}</label>
              <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors">
                <option value="all">{t('allStaff')}</option>
                {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Leave Type</label>
              <select value={selectedLeaveType} onChange={e => setSelectedLeaveType(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors">
                <option value="all">All types</option>
                {Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('fromDate')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('toDate')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors" />
            </div>
          </div>
        </div>

        {/* Tab bar + sort */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-[#6262bd] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'}`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/25' : tab.key === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort by:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6262bd] transition-colors">
              <option value="date_desc">Latest first</option>
              <option value="date_asc">Earliest first</option>
              <option value="submitted">Recently submitted</option>
              <option value="name">Name A–Z</option>
              <option value="days">Most days</option>
            </select>
          </div>
        </div>

        {/* Requests */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd] mb-4"></div>
            <p className="text-slate-500">{t('loadingRequests')}</p>
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400">
            <div className="text-5xl mb-4">🌴</div>
            <p className="font-medium text-slate-600 dark:text-slate-300">{t('noRequestsFound')}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-sm text-[#6262bd] font-medium hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {displayRequests.map(request => {
              const sc = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending
              const lc = request.leave_type ? LEAVE_LABELS[request.leave_type] : null
              const isExpanded = expandedId === request.id

              return (
                <div key={request.id} className={`bg-white dark:bg-slate-900 border-2 rounded-2xl overflow-hidden transition-all ${sc.border}`}>
                  {/* Card row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${sc.bg} ${sc.text}`}>
                      {request.staff?.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{request.staff?.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{request.staff?.role}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {sc.label}
                        </span>
                        {lc && <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{lc.emoji} {lc.label}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>📅 {moment(request.date_from).format('D MMM')} – {moment(request.date_to).format('D MMM YYYY')}</span>
                        {request.days_requested && (
                          <span className="font-semibold text-[#6262bd]">{request.days_requested} {request.days_requested === 1 ? t('workingDay') : t('workingDays')}</span>
                        )}
                        <span>Submitted {moment(request.created_at).fromNow()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); handleApprove(request) }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
                          >✓ {t('approve')}</button>
                          <button
                            onClick={e => { e.stopPropagation(); handleReject(request) }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                          >✕ {t('reject')}</button>
                        </>
                      )}
                      <span className={`text-slate-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('datesRequested')}</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {moment(request.date_from).format('D MMM YYYY')} – {moment(request.date_to).format('D MMM YYYY')}
                          </p>
                          <p className="text-xs text-[#6262bd] font-medium mt-0.5">
                            {request.days_requested} {request.days_requested === 1 ? t('workingDay') : t('workingDays')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('leaveType')}</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {lc ? `${lc.emoji} ${lc.label}` : (request.leave_type?.replace(/_/g, ' ') || t('annualHoliday'))}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{t('requestedOn')} {moment(request.created_at).format('D MMM YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('reason')}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{request.reason || t('noReasonProvided')}</p>
                        </div>
                      </div>

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">✕ {t('rejectionReason')}</p>
                          <p className="text-sm text-red-600 dark:text-red-400">{request.rejection_reason}</p>
                        </div>
                      )}
                      {request.status === 'approved' && request.approved_at && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                          <p className="text-sm text-green-700 dark:text-green-400">
                            ✅ {t('approvedOn')} {moment(request.approved_at).format('D MMM YYYY')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b-2 border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('rejectModalTitle')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('rejectingRequestFrom')} <strong>{selectedRequest.staff?.name}</strong> ·{' '}
                {moment(selectedRequest.date_from).format('D MMM')} – {moment(selectedRequest.date_to).format('D MMM YYYY')}
                {selectedRequest.days_requested && <span className="ml-1 text-[#6262bd] font-medium">({selectedRequest.days_requested}d)</span>}
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('reasonForRejection')} *
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 transition-colors"
                placeholder={t('reasonPlaceholder')}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowRejectModal(false)}
                  className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={submitRejection}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors">
                  {t('rejectRequest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
