'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function ShiftModal({ shift, staff, restaurant, departments = [], onClose, onSave, onDelete }) {
  const t = useTranslations('rota.shiftModal');
  const [formData, setFormData] = useState({
    date: '',
    shift_start: '',
    shift_end: '',
    staff_id: '',
    role_required: '',
    department: '',
    break_duration: 30,
    notes: '',
    status: 'draft'
  });

  const [availableStaff, setAvailableStaff] = useState([]);
  const [unavailableStaff, setUnavailableStaff] = useState([]);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shift) {
      setFormData({
        date: shift.date || '',
        shift_start: shift.shift_start || '',
        shift_end: shift.shift_end || '',
        staff_id: shift.staff_id || '',
        role_required: shift.role_required || '',
        department: shift.department || '',
        break_duration: shift.break_duration || 30,
        notes: shift.notes || '',
        status: shift.status || 'draft'
      });
    }
  }, [shift]);

  useEffect(() => {
    if (formData.date && staff && staff.length > 0 && restaurant) {
      checkStaffAvailability();
    } else {
      setAvailableStaff(staff || []);
      setUnavailableStaff([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, staff, restaurant]);

  const checkStaffAvailability = async () => {
    if (!restaurant || !formData.date) return;
    setLoadingAvailable(true);
    try {
      const response = await fetch(`/api/rota/requests?restaurant_id=${restaurant.id}&status=approved&request_type=time_off`);
      const result = await response.json();
      if (result.requests) {
        const unavailableStaffIds = new Set();
        result.requests.forEach(request => {
          const shiftDate = new Date(formData.date);
          const dateFrom = new Date(request.date_from);
          const dateTo = new Date(request.date_to);
          if (shiftDate >= dateFrom && shiftDate <= dateTo) {
            unavailableStaffIds.add(request.staff_id);
          }
        });
        const available = [];
        const unavailable = [];
        staff.forEach(s => {
          if (unavailableStaffIds.has(s.id)) {
            const timeOffRequest = result.requests.find(r =>
              r.staff_id === s.id &&
              new Date(formData.date) >= new Date(r.date_from) &&
              new Date(formData.date) <= new Date(r.date_to)
            );
            unavailable.push({ ...s, unavailableReason: timeOffRequest ? getUnavailableReason(timeOffRequest) : 'On time off' });
          } else {
            available.push(s);
          }
        });
        setAvailableStaff(available);
        setUnavailableStaff(unavailable);
      }
    } catch (error) {
      console.error('Error checking staff availability:', error);
      setAvailableStaff(staff || []);
      setUnavailableStaff([]);
    }
    setLoadingAvailable(false);
  };

  const getUnavailableReason = (request) => {
    const leaveTypeLabels = {
      annual_holiday: t('unavailableReasons.onHoliday'),
      sick_self_cert: t('unavailableReasons.onSickLeave'),
      sick_medical_cert: t('unavailableReasons.onSickLeave'),
      unpaid: t('unavailableReasons.onUnpaidLeave'),
      compassionate: t('unavailableReasons.onCompassionateLeave'),
      other: t('unavailableReasons.onTimeOff')
    };
    const label = leaveTypeLabels[request.leave_type] || t('unavailableReasons.onTimeOff');
    const dateFrom = new Date(request.date_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const dateTo = new Date(request.date_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (request.date_from === request.date_to) return `${label} (${dateFrom})`;
    return `${label} (${dateFrom} - ${dateTo})`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setConflictError(null);
  };

  // Calculate shift duration for display
  const getShiftDuration = () => {
    if (!formData.shift_start || !formData.shift_end) return null;
    const start = new Date(`2000-01-01T${formData.shift_start}`);
    const end = new Date(`2000-01-01T${formData.shift_end}`);
    const totalMin = (end - start) / 60000 - (Number(formData.break_duration) || 0);
    if (totalMin <= 0) return null;
    const h = Math.floor(totalMin / 60);
    const m = Math.floor(totalMin % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const shiftDuration = getShiftDuration();

  const statusConfig = {
    draft: { label: t('statusDraft'), color: 'text-amber-600 bg-amber-50 border-amber-200' },
    published: { label: t('statusPublished'), color: 'text-blue-600 bg-blue-50 border-blue-200' },
    completed: { label: t('statusCompleted'), color: 'text-green-600 bg-green-50 border-green-200' },
    cancelled: { label: t('statusCancelled'), color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700' }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setConflictError(null);
    if (!restaurant) { alert(t('restaurantNotFound')); setSaving(false); return; }
    try {
      const payload = {
        ...formData,
        restaurant_id: restaurant.id,
        staff_id: formData.staff_id || null,
        department: formData.department || null
      };
      let response;
      if (shift?.id) {
        response = await fetch('/api/rota/shifts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: shift.id, ...payload })
        });
      } else {
        response = await fetch('/api/rota/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const result = await response.json();
      if (!response.ok) {
        if (result.conflict) { setConflictError(result.conflict.message); }
        else { throw new Error(result.error || 'Failed to save shift'); }
        setSaving(false);
        return;
      }
      onSave(result.shift);
      onClose();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert(error.message);
    }
    setSaving(false);
  };

  const handleDeleteClick = async () => {
    if (!shift?.id) return;
    if (!confirm(t('confirmDelete'))) return;
    try {
      const response = await fetch(`/api/rota/shifts?id=${shift.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete shift');
      if (onDelete) onDelete(shift.id);
      onClose();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert(error.message);
    }
  };

  const assignedStaff = formData.staff_id ? [...availableStaff, ...unavailableStaff].find(s => s.id === formData.staff_id) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-sm w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
              {shift?.id ? t('titleEdit') : t('titleCreate')}
            </h2>
            {shiftDuration && (
              <p className="text-sm text-[#6262bd] font-medium mt-0.5">
                ⏱ {shiftDuration} net working time
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {shift?.id && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusConfig[formData.status]?.color || statusConfig.draft.color}`}>
                {statusConfig[formData.status]?.label || formData.status}
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-2xl font-bold transition-colors">×</button>
          </div>
        </div>

        {/* Conflict Error */}
        {conflictError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-sm text-red-700 text-sm flex items-start gap-2 flex-shrink-0">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <span><strong>{t('conflictLabel')}</strong> {conflictError}</span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="shift-form" onSubmit={handleSubmit}>
            <div className="space-y-5">

              {/* Date + Role row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('date')} *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('roleRequired')} *</label>
                  <input
                    type="text"
                    name="role_required"
                    value={formData.role_required}
                    onChange={handleChange}
                    placeholder={t('roleRequiredPlaceholder')}
                    required
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:text-zinc-500 dark:placeholder:text-zinc-500 transition-colors"
                  />
                </div>
              </div>

              {/* Time row with visual separator */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('startTime')} / {t('endTime')} *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    name="shift_start"
                    value={formData.shift_start}
                    onChange={handleChange}
                    required
                    className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                  />
                  <span className="text-zinc-400 dark:text-zinc-500 font-bold text-lg">→</span>
                  <input
                    type="time"
                    name="shift_end"
                    value={formData.shift_end}
                    onChange={handleChange}
                    required
                    className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                  />
                  <div className="flex-shrink-0 w-28">
                    <div className="flex items-center gap-2 px-3 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 whitespace-nowrap">☕ Break</span>
                      <input
                        type="number"
                        name="break_duration"
                        value={formData.break_duration}
                        onChange={handleChange}
                        min="0"
                        max="180"
                        className="w-12 bg-transparent focus:outline-none text-zinc-700 dark:text-zinc-300 text-sm font-mono"
                      />
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">m</span>
                    </div>
                  </div>
                </div>
                {shiftDuration && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1.5">
                    Net working time after break: <strong className="text-[#6262bd]">{shiftDuration}</strong>
                  </p>
                )}
              </div>

              {/* Department + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('department')}</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <option value="">{t('selectDepartment')}</option>
                    {departments && departments.length > 0 ? (
                      departments.map(dept => (
                        <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                      ))
                    ) : (
                      <>
                        <option value="kitchen">{t('departmentKitchen')}</option>
                        <option value="bar">{t('departmentBar')}</option>
                        <option value="universal">{t('departmentUniversal')}</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('status')}</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <option value="draft">{t('statusDraft')}</option>
                    <option value="published">{t('statusPublished')}</option>
                    <option value="completed">{t('statusCompleted')}</option>
                    <option value="cancelled">{t('statusCancelled')}</option>
                  </select>
                </div>
              </div>

              {/* Staff Assignment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{t('assignStaff')}</label>
                  {unavailableStaff.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowUnavailable(!showUnavailable)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-1 rounded-sm transition-colors"
                    >
                      {showUnavailable ? '▲' : '▼'} {unavailableStaff.length} on leave
                    </button>
                  )}
                </div>

                {/* Current assignee pill */}
                {assignedStaff && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#6262bd]/5 border border-[#6262bd]/20 rounded-sm">
                    <div className="w-6 h-6 rounded-full bg-[#6262bd] flex items-center justify-center text-white text-xs font-bold">
                      {assignedStaff.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-[#6262bd] font-medium">{assignedStaff.name}</span>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, staff_id: '' }))} className="ml-auto text-zinc-400 dark:text-zinc-500 hover:text-red-500 text-xs">✕ Remove</button>
                  </div>
                )}

                <select
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <option value="">{t('leaveUnfilled')}</option>
                  {availableStaff.length > 0 && (
                    <optgroup label={`✅ ${t('availableStaff')} (${availableStaff.length})`}>
                      {availableStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                      ))}
                    </optgroup>
                  )}
                  {showUnavailable && unavailableStaff.length > 0 && (
                    <optgroup label={`⚠️ ${t('unavailableOnTimeOff')} (${unavailableStaff.length})`}>
                      {unavailableStaff.map(s => (
                        <option key={s.id} value={s.id} disabled>{s.name} — {s.unavailableReason}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1.5">
                  {loadingAvailable ? t('checkingAvailability') :
                    availableStaff.length === 0 && unavailableStaff.length > 0 ? t('allStaffUnavailable') :
                    unavailableStaff.length > 0 ? t('staffAvailabilitySummary').replace('{available}', availableStaff.length).replace('{unavailable}', unavailableStaff.length) :
                    t('selectStaffHint')}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('notes')}</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder={t('notesPlaceholder')}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] resize-none bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:text-zinc-500 dark:placeholder:text-zinc-500 transition-colors"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex items-center justify-between flex-shrink-0">
          <div>
            {shift?.id && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-4 py-2.5 text-red-600 border-2 border-red-200 hover:bg-red-50 rounded-sm transition-colors font-medium text-sm"
              >
                🗑 {t('deleteShift')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 rounded-sm hover:border-[#6262bd] transition-colors font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="shift-form"
              disabled={saving}
              className="px-5 py-2.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a5] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px]"
            >
              {saving ? t('saving') : shift?.id ? t('updateShift') : t('createShift')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
