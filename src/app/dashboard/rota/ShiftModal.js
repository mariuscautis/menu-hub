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

  // Fetch available staff when date changes
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
      // Fetch approved time-off requests that overlap with this date
      const response = await fetch(`/api/rota/requests?restaurant_id=${restaurant.id}&status=approved&request_type=time_off`);
      const result = await response.json();

      if (result.requests) {
        const unavailableStaffIds = new Set();

        // Check which staff members have approved time-off on this date
        result.requests.forEach(request => {
          const shiftDate = new Date(formData.date);
          const dateFrom = new Date(request.date_from);
          const dateTo = new Date(request.date_to);

          // Check if shift date falls within time-off period
          if (shiftDate >= dateFrom && shiftDate <= dateTo) {
            unavailableStaffIds.add(request.staff_id);
          }
        });

        // Separate staff into available and unavailable
        const available = [];
        const unavailable = [];

        staff.forEach(s => {
          if (unavailableStaffIds.has(s.id)) {
            // Find the time-off request for this staff member
            const timeOffRequest = result.requests.find(r =>
              r.staff_id === s.id &&
              new Date(formData.date) >= new Date(r.date_from) &&
              new Date(formData.date) <= new Date(r.date_to)
            );
            unavailable.push({
              ...s,
              unavailableReason: timeOffRequest ? getUnavailableReason(timeOffRequest) : 'On time off'
            });
          } else {
            available.push(s);
          }
        });

        setAvailableStaff(available);
        setUnavailableStaff(unavailable);
      }
    } catch (error) {
      console.error('Error checking staff availability:', error);
      // If error, show all staff as available
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

    if (request.date_from === request.date_to) {
      return `${label} (${dateFrom})`;
    }
    return `${label} (${dateFrom} - ${dateTo})`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setConflictError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setConflictError(null);

    if (!restaurant) {
      alert(t('restaurantNotFound'));
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        restaurant_id: restaurant.id,
        staff_id: formData.staff_id || null,
        department: formData.department || null // Convert empty string to null
      };

      let response;
      if (shift?.id) {
        // Update existing shift
        response = await fetch('/api/rota/shifts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: shift.id, ...payload })
        });
      } else {
        // Create new shift
        response = await fetch('/api/rota/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();

      if (!response.ok) {
        if (result.conflict) {
          setConflictError(result.conflict.message);
        } else {
          throw new Error(result.error || 'Failed to save shift');
        }
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
      const response = await fetch(`/api/rota/shifts?id=${shift.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete shift');
      }

      if (onDelete) onDelete(shift.id);
      onClose();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {shift?.id ? t('titleEdit') : t('titleCreate')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {conflictError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
            <strong>{t('conflictLabel')}</strong> {conflictError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('date')} *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Role Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('roleRequired')} *
              </label>
              <input
                type="text"
                name="role_required"
                value={formData.role_required}
                onChange={handleChange}
                placeholder={t('roleRequiredPlaceholder')}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Shift Start */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('startTime')} *
              </label>
              <input
                type="time"
                name="shift_start"
                value={formData.shift_start}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Shift End */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('endTime')} *
              </label>
              <input
                type="time"
                name="shift_end"
                value={formData.shift_end}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('department')}
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t('selectDepartment')}</option>
                {departments && departments.length > 0 ? (
                  departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
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

            {/* Break Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('breakDuration')}
              </label>
              <input
                type="number"
                name="break_duration"
                value={formData.break_duration}
                onChange={handleChange}
                min="0"
                max="180"
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Staff Assignment */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('assignStaff')}
                </label>
                {unavailableStaff.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUnavailable(!showUnavailable)}
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#6262bd] font-medium transition-colors"
                  >
                    {showUnavailable ? t('hideUnavailable') : t('showUnavailable')} ({unavailableStaff.length})
                  </button>
                )}
              </div>
              <select
                name="staff_id"
                value={formData.staff_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t('leaveUnfilled')}</option>

                {/* Available Staff */}
                {availableStaff && availableStaff.length > 0 ? (
                  <>
                    <optgroup label={t('availableStaff')}>
                      {availableStaff.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {s.role}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : loadingAvailable ? (
                  <option disabled>{t('loadingAvailability')}</option>
                ) : (
                  <option disabled>{t('noAvailableStaff')}</option>
                )}

                {/* Unavailable Staff (if toggle is on) */}
                {showUnavailable && unavailableStaff.length > 0 && (
                  <optgroup label={t('unavailableOnTimeOff')}>
                    {unavailableStaff.map(s => (
                      <option key={s.id} value={s.id} disabled>
                        {s.name} - {s.unavailableReason}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {loadingAvailable ? (
                    t('checkingAvailability')
                  ) : availableStaff.length === 0 && unavailableStaff.length > 0 ? (
                    t('allStaffUnavailable')
                  ) : unavailableStaff.length > 0 ? (
                    t('staffAvailabilitySummary').replace('{available}', availableStaff.length).replace('{unavailable}', unavailableStaff.length)
                  ) : (
                    t('selectStaffHint')
                  )}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="draft">{t('statusDraft')}</option>
                <option value="published">{t('statusPublished')}</option>
                <option value="completed">{t('statusCompleted')}</option>
                <option value="cancelled">{t('statusCancelled')}</option>
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder={t('notesPlaceholder')}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between items-center">
            <div>
              {shift?.id && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  {t('deleteShift')}
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
              >
                {t('cancel')}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('saving') : shift?.id ? t('updateShift') : t('createShift')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
