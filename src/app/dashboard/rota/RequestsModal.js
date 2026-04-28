'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useTranslations } from '@/lib/i18n/LanguageContext';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400',     dot: 'bg-red-500'   },
  cancelled:{ label: 'Cancelled',bg: 'bg-zinc-100 dark:bg-zinc-800',    text: 'text-zinc-600 dark:text-zinc-400 dark:text-zinc-400', dot: 'bg-slate-400' }
};

const LEAVE_CONFIG = {
  annual_holiday:   { emoji: '🏖️', label: 'Annual Holiday',      bg: 'bg-blue-100 text-blue-800'   },
  sick_self_cert:   { emoji: '🤒', label: 'Sick (Self-cert)',    bg: 'bg-orange-100 text-orange-800' },
  sick_medical_cert:{ emoji: '🏥', label: 'Sick (Medical)',      bg: 'bg-red-100 text-red-800'     },
  unpaid:           { emoji: '💰', label: 'Unpaid Leave',        bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' },
  compassionate:    { emoji: '🕊️', label: 'Compassionate',      bg: 'bg-purple-100 text-purple-800'},
  other:            { emoji: '📋', label: 'Other',               bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' }
};

export default function RequestsModal({ onClose, onRequestUpdated }) {
  const t = useTranslations('rota.requestsModal');
  const tCommon = useTranslations('common');
  const restaurantCtx = useRestaurant();

  const [restaurant, setRestaurant] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({ date_from: '', date_to: '', status: '', reason: '', leave_type: '', rejection_reason: '' });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (restaurantCtx?.restaurant) setRestaurant(restaurantCtx.restaurant);
  }, [restaurantCtx]);

  useEffect(() => {
    if (restaurant) fetchRequests();
  }, [restaurant, filter]);

  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase
      .channel(`requests-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requests', filter: `restaurant_id=eq.${restaurant.id}` }, fetchRequests)
      .subscribe();
    return () => ch.unsubscribe();
  }, [restaurant, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    const params = new URLSearchParams({ restaurant_id: restaurant.id });
    if (filter !== 'all') params.append('status', filter);
    const response = await fetch(`/api/rota/requests?${params}`);
    const result = await response.json();
    if (result.requests) {
      setRequests(result.requests.filter(req => req.request_type !== 'time_off'));
    }
    setLoading(false);
  };

  const handleApprove = async (request) => {
    const staffData = localStorage.getItem('staff');
    const staff = staffData ? JSON.parse(staffData) : null;
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'approved', approved_by: staff?.id || restaurant.owner_id })
      });
      if (!response.ok) throw new Error('Failed to approve request');
      fetchRequests();
      if (onRequestUpdated) onRequestUpdated();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReject = async (request) => {
    if (!rejectionReason.trim()) { alert(t('provideRejectionReason')); return; }
    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: 'rejected', rejection_reason: rejectionReason })
      });
      if (!response.ok) throw new Error('Failed to reject request');
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
      if (onRequestUpdated) onRequestUpdated();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setEditForm({ date_from: request.date_from || '', date_to: request.date_to || '', status: request.status || '', reason: request.reason || '', leave_type: request.leave_type || '', rejection_reason: request.rejection_reason || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    try {
      const staffData = localStorage.getItem('staff');
      const staff = staffData ? JSON.parse(staffData) : null;
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingRequest.id, ...editForm, approved_by: editForm.status === 'approved' ? (staff?.id || restaurant.owner_id) : undefined })
      });
      if (!response.ok) throw new Error('Failed to update request');
      setEditingRequest(null);
      fetchRequests();
      if (onRequestUpdated) onRequestUpdated();
    } catch (error) {
      alert(error.message);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const TABS = [
    { key: 'pending',  label: t('filterPending') },
    { key: 'approved', label: t('filterApproved') },
    { key: 'rejected', label: t('filterRejected') },
    { key: 'all',      label: t('filterAll') }
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-sm w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('title')}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">Shift swaps and cover requests</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xl font-bold transition-colors">×</button>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pt-4 flex gap-1 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-sm text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                filter === tab.key
                  ? 'bg-[#6262bd] text-white'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === 'pending' ? 'bg-white/30' : 'bg-red-500 text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400">{t('loadingRequests')}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-300">{t('noRequestsFound')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => {
                const sc = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                const lc = request.leave_type ? LEAVE_CONFIG[request.leave_type] : null;
                const isExpanded = expandedId === request.id;

                return (
                  <div key={request.id} className="border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm overflow-hidden hover:border-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-600 transition-colors">
                    {/* Card header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#6262bd]/10 flex-shrink-0 flex items-center justify-center text-[#6262bd] font-bold text-sm">
                          {request.staff?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{request.staff?.name}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                              {sc.label}
                            </span>
                            {lc && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lc.bg}`}>{lc.emoji} {lc.label}</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">
                            {request.staff?.role} · {t('submitted')} {formatDate(request.created_at)}
                            {request.days_requested && <span className="ml-1 text-[#6262bd] font-medium">· {request.days_requested}d</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleApprove(request); }}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors text-xs font-semibold"
                            >✓ {t('approve')}</button>
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedRequest(request); }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors text-xs font-semibold"
                            >✕ {t('reject')}</button>
                          </>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(request); }}
                          className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 rounded-sm hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors text-xs font-semibold"
                        >✎ {t('edit')}</button>
                        <span className={`text-zinc-400 dark:text-zinc-500 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
                        {request.request_type === 'time_off' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{t('from')}</p>
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{formatDate(request.date_from)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{t('to')}</p>
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{formatDate(request.date_to)}</p>
                            </div>
                          </div>
                        )}
                        {request.request_type === 'swap' && request.shift && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                            <strong>{t('wantsToSwap')}:</strong> {formatDate(request.shift.date)} {request.shift.shift_start}–{request.shift.shift_end}
                            {request.swap_with_staff && <span> → with <strong>{request.swap_with_staff.name}</strong></span>}
                          </p>
                        )}
                        {request.request_type === 'cover' && request.shift && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                            <strong>{t('needsCoverFor')}:</strong> {formatDate(request.shift.date)} {request.shift.shift_start}–{request.shift.shift_end}
                          </p>
                        )}
                        {request.reason && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mt-2">
                            <strong>{t('reason')}:</strong> {request.reason}
                          </p>
                        )}
                        {request.status === 'approved' && request.approver && (
                          <p className="text-xs text-green-600 mt-2">
                            ✅ {t('approvedBy').replace('{approver}', request.approver.name).replace('{date}', formatDate(request.approved_at))}
                          </p>
                        )}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <p className="text-xs text-red-600 mt-2">
                            ✕ {t('rejectedLabel')}: {request.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rejection inline modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => { setSelectedRequest(null); setRejectionReason(''); }}>
          <div className="bg-white dark:bg-zinc-900 rounded-sm p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-1">{t('rejectRequestTitle')}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-4">
              Rejecting request from <strong>{selectedRequest.staff?.name}</strong>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows="3"
              autoFocus
              placeholder={t('rejectionReasonPlaceholder')}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] resize-none text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setSelectedRequest(null); setRejectionReason(''); }} className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
                {tCommon('cancel')}
              </button>
              <button onClick={() => handleReject(selectedRequest)} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-sm font-semibold hover:bg-red-700 transition-colors">
                {t('rejectRequestButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setEditingRequest(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('editRequestTitle')}</h3>
              <button onClick={() => setEditingRequest(null)} className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xl font-bold">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800 rounded-sm">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{editingRequest.staff?.name} <span className="font-normal text-zinc-500 dark:text-zinc-400">({editingRequest.staff?.role})</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['date_from', t('startDate')], ['date_to', t('endDate')]].map(([name, label]) => (
                  <div key={name}>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1.5">{label}</label>
                    <input type="date" name={name} value={editForm[name]} onChange={e => setEditForm(p => ({ ...p, [name]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1.5">{t('leaveTypeLabel')}</label>
                  <select name="leave_type" value={editForm.leave_type} onChange={e => setEditForm(p => ({ ...p, leave_type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800">
                    <option value="">{t('selectType')}</option>
                    <option value="annual_holiday">Annual Holiday</option>
                    <option value="sick_self_cert">Sick (Self-cert)</option>
                    <option value="sick_medical_cert">Sick (Medical cert)</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="compassionate">Compassionate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1.5">{t('statusLabel')}</label>
                  <select name="status" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1.5">{t('reasonLabel')}</label>
                <textarea name="reason" value={editForm.reason} onChange={e => setEditForm(p => ({ ...p, reason: e.target.value }))} rows="2" placeholder={t('reasonPlaceholder')}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] resize-none text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:text-zinc-500" />
              </div>
              {editForm.status === 'rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1.5">{t('rejectionReasonLabel')}</label>
                  <textarea name="rejection_reason" value={editForm.rejection_reason} onChange={e => setEditForm(p => ({ ...p, rejection_reason: e.target.value }))} rows="2" placeholder={t('rejectionReasonEditPlaceholder')}
                    className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] resize-none text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:text-zinc-500" />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex gap-3">
              <button onClick={() => setEditingRequest(null)} className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">{tCommon('cancel')}</button>
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 bg-[#6262bd] text-white rounded-sm font-semibold hover:bg-[#5252a5] transition-colors">{t('saveChanges')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
