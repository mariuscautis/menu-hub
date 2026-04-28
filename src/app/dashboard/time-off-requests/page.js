'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { staffTabs } from '@/components/PageTabsConfig'
import InfoTooltip from '@/components/InfoTooltip'
import OfflinePageGuard from '@/components/OfflinePageGuard'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500',  border: 'border-amber-200 dark:border-amber-800' },
  approved:  { label: 'Approved',  bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500',  border: 'border-green-200 dark:border-green-800' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-zinc-100 dark:bg-zinc-800',     text: 'text-zinc-500 dark:text-zinc-400 dark:text-zinc-400',  dot: 'bg-slate-400',  border: 'border-zinc-200 dark:border-zinc-700' }
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
  useModuleGuard('rota')
  const t = useTranslations('timeOffRequests')
  const tg = useTranslations('guide')
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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

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
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'approved', approved_by: user?.id })
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

  const openEdit = (request) => {
    setEditingId(request.id)
    setEditForm({
      date_from: request.date_from?.split('T')[0] || '',
      date_to: request.date_to?.split('T')[0] || '',
      leave_type: request.leave_type || 'annual_holiday',
      reason: request.reason || ''
    })
  }

  const submitEdit = async (request) => {
    if (!editForm.date_from || !editForm.date_to) { alert('Please provide both start and end dates.'); return }
    if (editForm.date_to < editForm.date_from) { alert('End date must be on or after start date.'); return }
    setEditSaving(true)
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          date_from: editForm.date_from,
          date_to: editForm.date_to,
          leave_type: editForm.leave_type,
          reason: editForm.reason,
          amended: true
        })
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to update request') }
      setEditingId(null)
      fetchTimeOffRequests()
    } catch (error) { alert(error.message || 'Failed to update request') }
    setEditSaving(false)
  }

  const clearFilters = () => { setSelectedStaff('all'); setSelectedStatus('all'); setSelectedLeaveType('all'); setDateFrom(''); setDateTo('') }

  const hasActiveFilters = selectedStaff !== 'all' || selectedStatus !== 'all' || selectedLeaveType !== 'all' || dateFrom || dateTo

  const handleCancel = async (request) => {
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'cancelled', cancelled: true })
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to cancel request') }
      fetchTimeOffRequests()
    } catch (error) { alert(error.message || 'Failed to cancel request') }
  }

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
    return <div className="flex items-center justify-center min-h-screen"><div className="text-zinc-500 dark:text-zinc-400">{t('loading')}</div></div>
  }

  return (
    <OfflinePageGuard>
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-950 p-4 md:p-8">
      <PageTabs tabs={staffTabs} />
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 flex items-center gap-2">{t('title')}<InfoTooltip text={tg('time_off_desc')} /></h1>
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: t('totalRequests'), value: stats.total, color: 'text-[#6262bd]', border: 'border-[#6262bd]/20', span: '' },
            { label: t('pendingCount'), value: stats.pending, color: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800', span: '' },
            { label: t('approvedCount'), value: stats.approved, color: 'text-green-600', border: 'border-green-200 dark:border-green-800', span: '' },
            { label: t('rejectedCount'), value: stats.rejected, color: 'text-red-600', border: 'border-red-200 dark:border-red-800', span: '' },
            { label: 'Days approved', value: stats.totalDays, color: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800', span: 'col-span-2 sm:col-span-1' }
          ].map((s, i) => (
            <div key={i} className={`bg-white dark:bg-zinc-900 border-2 ${s.border} rounded-sm p-4 ${s.span}`}>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zm-7-14v2h18V4H3zm3 7h12v-2H6v2z"/></svg>
              {t('filters')}
              {hasActiveFilters && <span className="text-xs bg-[#6262bd] text-white px-2 py-0.5 rounded-full">Active</span>}
            </h2>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#6262bd] hover:text-[#5252a3] font-semibold">{t('clearAll')}</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('staffMember')}</label>
              <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors">
                <option value="all">{t('allStaff')}</option>
                {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">Leave Type</label>
              <select value={selectedLeaveType} onChange={e => setSelectedLeaveType(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors">
                <option value="all">All types</option>
                {Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('fromDate')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('toDate')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors" />
            </div>
          </div>
        </div>

        {/* Tab bar + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm p-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-sm text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab.key ? 'bg-[#6262bd] text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400'}`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/25' : tab.key === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 whitespace-nowrap">Sort by:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 focus:outline-none focus:border-[#6262bd] transition-colors">
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
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm">
            <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 dark:text-zinc-400">{t('loadingRequests')}</p>
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm text-zinc-400 dark:text-zinc-500">
            <div className="text-5xl mb-4">🌴</div>
            <p className="font-medium text-zinc-600 dark:text-zinc-400">{t('noRequestsFound')}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-sm text-[#6262bd] font-medium hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="space-y-2">
            {displayRequests.map(request => {
              const sc = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending
              const lc = request.leave_type ? LEAVE_LABELS[request.leave_type] : null
              const isExpanded = expandedId === request.id

              return (
                <div key={request.id} className={`bg-white dark:bg-zinc-900 border-2 rounded-sm overflow-hidden transition-all ${sc.border}`}>
                  {/* Card row */}
                  <div
                    className="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-100/50 dark:bg-zinc-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm mt-0.5 ${sc.bg} ${sc.text}`}>
                      {request.staff?.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{request.staff?.name}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500">{request.staff?.role}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {sc.label}
                        </span>
                        {lc && <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{lc.emoji} {lc.label}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 flex-wrap">
                        <span>📅 {moment(request.date_from).format('D MMM')} – {moment(request.date_to).format('D MMM YYYY')}</span>
                        {request.days_requested && (
                          <span className="font-semibold text-[#6262bd]">{request.days_requested} {request.days_requested === 1 ? t('workingDay') : t('workingDays')}</span>
                        )}
                        <span>Submitted {moment(request.created_at).fromNow()}</span>
                      </div>
                      {/* Actions — inline on mobile below info */}
                      {request.status === 'pending' && (
                        <div className="flex gap-2 mt-2 sm:hidden">
                          <button
                            onClick={e => { e.stopPropagation(); handleApprove(request) }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors text-xs font-semibold"
                          >✓ {t('approve')}</button>
                          <button
                            onClick={e => { e.stopPropagation(); handleReject(request) }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors text-xs font-semibold"
                          >✕ {t('reject')}</button>
                        </div>
                      )}
                    </div>

                    {/* Actions — desktop only */}
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); handleApprove(request) }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors text-xs font-semibold"
                          >✓ {t('approve')}</button>
                          <button
                            onClick={e => { e.stopPropagation(); handleReject(request) }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors text-xs font-semibold"
                          >✕ {t('reject')}</button>
                        </>
                      )}
                      <span className={`text-zinc-400 dark:text-zinc-500 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                    {/* Chevron — mobile only, always visible */}
                    <span className={`sm:hidden text-zinc-400 dark:text-zinc-500 text-sm flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 dark:bg-zinc-800/30">

                      {editingId === request.id ? (
                        /* ── Edit form ── */
                        <div>
                          <p className="text-xs font-semibold text-[#6262bd] uppercase tracking-wide mb-3">Edit Request</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">Start Date</label>
                              <input type="date" value={editForm.date_from}
                                onChange={e => setEditForm(f => ({ ...f, date_from: e.target.value }))}
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:border-[#6262bd]" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">End Date</label>
                              <input type="date" value={editForm.date_to}
                                onChange={e => setEditForm(f => ({ ...f, date_to: e.target.value }))}
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:border-[#6262bd]" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">Leave Type</label>
                              <select value={editForm.leave_type}
                                onChange={e => setEditForm(f => ({ ...f, leave_type: e.target.value }))}
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:border-[#6262bd]">
                                {Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">Reason (optional)</label>
                              <input type="text" value={editForm.reason}
                                onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="Enter reason..."
                                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:border-[#6262bd]" />
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mb-3">Saving will notify the staff member by email that their request has been amended.</p>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 py-2 rounded-sm text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors">
                              Cancel
                            </button>
                            <button onClick={() => submitEdit(request)} disabled={editSaving}
                              className="flex-1 bg-[#6262bd] text-white py-2 rounded-sm text-sm font-semibold hover:bg-[#5252a3] transition-colors disabled:opacity-50">
                              {editSaving ? 'Saving…' : 'Save & Notify Staff'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Read-only details ── */
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('datesRequested')}</p>
                              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">
                                {moment(request.date_from).format('D MMM YYYY')} – {moment(request.date_to).format('D MMM YYYY')}
                              </p>
                              {request.days_requested > 0 && (
                                <p className="text-xs text-[#6262bd] font-medium mt-0.5">
                                  {request.days_requested} {request.days_requested === 1 ? t('workingDay') : t('workingDays')}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('leaveType')}</p>
                              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">
                                {lc ? `${lc.emoji} ${lc.label}` : (request.leave_type?.replace(/_/g, ' ') || t('annualHoliday'))}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('requestedOn')} {moment(request.created_at).format('D MMM YYYY')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('reason')}</p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{request.reason || t('noReasonProvided')}</p>
                            </div>
                          </div>

                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm p-3 mb-3">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">✕ {t('rejectionReason')}</p>
                              <p className="text-sm text-red-600 dark:text-red-400">{request.rejection_reason}</p>
                            </div>
                          )}
                          {request.status === 'approved' && request.approved_at && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm p-3 mb-3">
                              <p className="text-sm text-green-700 dark:text-green-400">
                                ✅ {t('approvedOn')} {moment(request.approved_at).format('D MMM YYYY')}
                              </p>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 mt-1">
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(request) }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#6262bd] hover:text-[#5252a3] px-3 py-1.5 rounded-sm hover:bg-[#6262bd]/10 transition-colors border border-[#6262bd]/30"
                            >
                              ✏️ Edit Request
                            </button>
                            {request.status === 'approved' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleCancel(request) }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800"
                              >
                                ✕ Cancel Approval
                              </button>
                            )}
                          </div>
                        </>
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
          <div className="bg-white dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('rejectModalTitle')}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">
                {t('rejectingRequestFrom')} <strong>{selectedRequest.staff?.name}</strong> ·{' '}
                {moment(selectedRequest.date_from).format('D MMM')} – {moment(selectedRequest.date_to).format('D MMM YYYY')}
                {selectedRequest.days_requested && <span className="ml-1 text-[#6262bd] font-medium">({selectedRequest.days_requested}d)</span>}
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('reasonForRejection')} *
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={4}
                autoFocus
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] resize-none text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:text-zinc-500 transition-colors"
                placeholder={t('reasonPlaceholder')}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowRejectModal(false)}
                  className="flex-1 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 py-3 rounded-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={submitRejection}
                  className="flex-1 bg-red-600 text-white py-3 rounded-sm font-semibold hover:bg-red-700 transition-colors">
                  {t('rejectRequest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </OfflinePageGuard>
  )
}
