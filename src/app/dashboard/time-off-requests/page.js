'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import moment from 'moment'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function TimeOffRequestsPage() {
  const router = useRouter()
  const t = useTranslations('timeOffRequests')
  const [user, setUser] = useState(null)
  const [restaurantData, setRestaurantData] = useState(null)
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (restaurantData) {
      fetchTimeOffRequests()
    }
  }, [restaurantData, selectedStaff, selectedStatus, dateFrom, dateTo])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      router.push('/onboarding')
      return
    }

    setRestaurantData(restaurant)

    // Fetch staff members for filter
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, role')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'active')
      .order('name')

    setStaffMembers(staff || [])
  }

  const fetchTimeOffRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        restaurant_id: restaurantData.id,
        request_type: 'time_off'
      })

      if (selectedStaff !== 'all') {
        params.append('staff_id', selectedStaff)
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }

      const response = await fetch(`/api/rota/requests?${params.toString()}`)
      const data = await response.json()

      let requests = data.requests || []

      // Apply date filters client-side
      if (dateFrom) {
        requests = requests.filter(r => moment(r.date_from).isSameOrAfter(dateFrom))
      }
      if (dateTo) {
        requests = requests.filter(r => moment(r.date_to).isSameOrBefore(dateTo))
      }

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

    if (!confirm(confirmMsg)) {
      return
    }

    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'approved',
          approved_by: user.id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errorApprove'))
      }

      alert(t('approvedSuccess'))
      fetchTimeOffRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      alert(error.message || t('errorApprove'))
    }
  }

  const handleReject = (request) => {
    setSelectedRequest(request)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      alert(t('provideRejectionReason'))
      return
    }

    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: 'rejected',
          rejection_reason: rejectionReason
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errorReject'))
      }

      alert(t('rejectedSuccess'))
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectionReason('')
      fetchTimeOffRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert(error.message || t('errorReject'))
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return badges[status] || 'bg-slate-100 text-slate-700'
  }

  const clearFilters = () => {
    setSelectedStaff('all')
    setSelectedStatus('all')
    setDateFrom('')
    setDateTo('')
  }

  if (!user || !restaurantData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('title')}</h1>
          <p className="text-slate-500">{t('subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">{t('filters')}</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-[#6262bd] hover:text-[#5252a3] font-medium"
            >
              {t('clearAll')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('staffMember')}
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              >
                <option value="all">{t('allStaff')}</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('status')}
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="approved">{t('approved')}</option>
                <option value="rejected">{t('rejected')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('fromDate')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('toDate')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('totalRequests')}</p>
            <p className="text-3xl font-bold text-[#6262bd]">{timeOffRequests.length}</p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('pendingCount')}</p>
            <p className="text-3xl font-bold text-yellow-600">
              {timeOffRequests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('approvedCount')}</p>
            <p className="text-3xl font-bold text-green-600">
              {timeOffRequests.filter(r => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{t('rejectedCount')}</p>
            <p className="text-3xl font-bold text-red-600">
              {timeOffRequests.filter(r => r.status === 'rejected').length}
            </p>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">{t('requests')}</h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <p>{t('loadingRequests')}</p>
            </div>
          ) : timeOffRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>{t('noRequestsFound')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeOffRequests.map(request => (
                <div
                  key={request.id}
                  className="border-2 border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800 text-lg">
                          {request.staff.name}
                        </h3>
                        <span className="text-sm text-slate-500">
                          {request.staff.role}
                        </span>
                        <span className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusBadge(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">{t('datesRequested')}</p>
                          <p className="font-medium text-slate-800">
                            {moment(request.date_from).format('MMM D, YYYY')} - {moment(request.date_to).format('MMM D, YYYY')}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {request.days_requested} {request.days_requested > 1 ? t('workingDays') : t('workingDay')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500 mb-1">{t('leaveType')}</p>
                          <p className="font-medium text-slate-800">
                            {request.leave_type ? request.leave_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : t('annualHoliday')}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {t('requestedOn')} {moment(request.created_at).format('MMM D, YYYY')}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-slate-500 mb-1">{t('reason')}</p>
                        <p className="text-slate-700">{request.reason || t('noReasonProvided')}</p>
                      </div>

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="bg-red-50 border-2 border-red-100 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-700 mb-1">{t('rejectionReason')}</p>
                          <p className="text-sm text-red-600">{request.rejection_reason}</p>
                        </div>
                      )}

                      {request.status === 'approved' && request.approved_at && (
                        <div className="bg-green-50 border-2 border-green-100 rounded-lg p-3">
                          <p className="text-sm text-green-700">
                            {t('approvedOn')} {moment(request.approved_at).format('MMM D, YYYY')}
                          </p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(request)}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                        >
                          {t('approve')}
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                        >
                          {t('reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">{t('rejectModalTitle')}</h2>

            <div className="mb-6">
              <p className="text-slate-600 mb-2">
                {t('rejectingRequestFrom')} <strong>{selectedRequest.staff.name}</strong>
              </p>
              <p className="text-sm text-slate-500">
                {moment(selectedRequest.date_from).format('MMM D, YYYY')} - {moment(selectedRequest.date_to).format('MMM D, YYYY')}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('reasonForRejection')} *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
                placeholder={t('reasonPlaceholder')}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={submitRejection}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700"
              >
                {t('rejectRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
