'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function RequestHistory({ staff, restaurant }) {
  const t = useTranslations('myRota.requestHistory');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    fetchRequests();
  }, [staff, restaurant, filter]);

  const fetchRequests = async () => {
    if (!staff || !restaurant) return;

    setLoading(true);

    const params = new URLSearchParams({
      restaurant_id: restaurant.id,
      staff_id: staff.id,
      request_type: 'time_off'
    });

    if (filter !== 'all') {
      params.append('status', filter);
    }

    try {
      const response = await fetch(`/api/rota/requests?${params}`);
      const result = await response.json();

      if (result.requests) {
        setRequests(result.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }

    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const labels = {
      pending: `⏳ ${t('pending') || 'Pending'}`,
      approved: `✅ ${t('approved') || 'Approved'}`,
      rejected: `❌ ${t('rejected') || 'Rejected'}`,
      cancelled: `🚫 ${t('cancelled') || 'Cancelled'}`
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getLeaveTypeBadge = (leaveType) => {
    if (!leaveType) return null;

    const badges = {
      annual_holiday: 'bg-blue-50 text-blue-700',
      sick_self_cert: 'bg-orange-50 text-orange-700',
      sick_medical_cert: 'bg-red-50 text-red-700',
      unpaid: 'bg-gray-50 text-gray-700',
      compassionate: 'bg-purple-50 text-purple-700',
      other: 'bg-slate-50 text-slate-700'
    };

    const leaveTypeLabels = t('leaveTypes') || {};
    const labels = {
      annual_holiday: `🏖️ ${leaveTypeLabels.annualHoliday || 'Holiday'}`,
      sick_self_cert: `🤒 ${leaveTypeLabels.sickSelfCert || 'Sick (Self-Cert)'}`,
      sick_medical_cert: `🏥 ${leaveTypeLabels.sickMedicalCert || 'Sick (Medical)'}`,
      unpaid: `💰 ${leaveTypeLabels.unpaid || 'Unpaid'}`,
      compassionate: `🕊️ ${leaveTypeLabels.compassionate || 'Compassionate'}`,
      other: leaveTypeLabels.other || 'Other'
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${badges[leaveType] || 'bg-gray-50 text-gray-700'}`}>
        {labels[leaveType] || leaveType}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (from, to) => {
    if (!from || !to) return 'N/A';
    if (from === to) return formatDate(from);
    return `${formatDate(from)} - ${formatDate(to)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">{t('loadingRequests') || 'Loading request history...'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">{t('title') || 'My Request History'}</h2>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(filterOption) || filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg mb-2">📭 {t('noRequestsFound') || 'No requests found'}</p>
          <p className="text-sm">
            {filter === 'all'
              ? (t('noRequestsYet') || 'You haven\'t submitted any time-off requests yet.')
              : (t('noRequestsWithFilter') || `You don't have any ${filter} requests.`).replace('{filter}', t(filter) || filter)}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${requests.length > 3 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
          {requests.map((request) => (
            <div
              key={request.id}
              className="border-2 border-slate-200 rounded-xl p-4 hover:border-[#6262bd] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getLeaveTypeBadge(request.leave_type)}
                  {getStatusBadge(request.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{t('submitted') || 'Submitted'}</p>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDate(request.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">{t('dates') || 'Dates'}</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDateRange(request.date_from, request.date_to)}
                  </p>
                </div>
                {request.days_requested && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('duration') || 'Duration'}</p>
                    <p className="text-sm font-semibold text-[#6262bd]">
                      {request.days_requested} {request.days_requested === 1 ? (t('workingDay') || 'working day') : (t('workingDays') || 'working days')}
                    </p>
                  </div>
                )}
              </div>

              {request.reason && (
                <div className="mb-3">
                  <p className="text-xs text-slate-600 mb-1">{t('reason') || 'Reason'}</p>
                  <p className="text-sm text-slate-800">{request.reason}</p>
                </div>
              )}

              {request.status === 'approved' && request.approved_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  ✅ {t('approvedOn') || 'Approved on'} {formatDate(request.approved_at)}
                </div>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">❌ {t('rejectionReason') || 'Rejection Reason'}:</p>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⏳ {t('awaitingApproval') || 'Awaiting manager approval'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
