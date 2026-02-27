'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function TimeOffRequestModal({ staff, restaurant, leaveBalance, onClose, onSubmit }) {
  const t = useTranslations('myRota.timeOffRequest');
  const [formData, setFormData] = useState({
    leave_type: 'annual_holiday',
    date_from: '',
    date_to: '',
    reason: '',
    medical_certificate_provided: false
  });
  const [workingDays, setWorkingDays] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Calculate working days when dates change
  useEffect(() => {
    if (formData.date_from && formData.date_to) {
      const days = calculateWorkingDays(formData.date_from, formData.date_to);
      setWorkingDays(days);
    } else {
      setWorkingDays(0);
    }
  }, [formData.date_from, formData.date_to]);

  const calculateWorkingDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return 0;

    let count = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Count Monday (1) through Friday (5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  };

  const validate = () => {
    const newErrors = {};
    const errorTranslations = t('errors') || {};

    if (!formData.date_from) {
      newErrors.date_from = errorTranslations.startDateRequired || 'Start date is required';
    }

    if (!formData.date_to) {
      newErrors.date_to = errorTranslations.endDateRequired || 'End date is required';
    }

    if (formData.date_from && formData.date_to && formData.date_from > formData.date_to) {
      newErrors.date_to = errorTranslations.endDateAfterStart || 'End date must be after start date';
    }

    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.date_from);

    if (startDate < today) {
      newErrors.date_from = errorTranslations.noPastDates || 'Cannot request leave for past dates';
    }

    // Check if requesting more days than available (for annual holiday)
    if (formData.leave_type === 'annual_holiday' && leaveBalance) {
      const remaining = leaveBalance.holiday_days_remaining || 0;
      const pending = leaveBalance.holiday_days_pending || 0;
      const availableDays = remaining - pending;
      if (workingDays > availableDays) {
        const insufficientMsg = errorTranslations.insufficientDays || 'You only have {available} days available ({remaining} remaining - {pending} pending)';
        newErrors.days = insufficientMsg
          .replace('{available}', availableDays.toFixed(1))
          .replace('{remaining}', remaining.toFixed(1))
          .replace('{pending}', pending.toFixed(1));
      }
    }

    // Sick leave validation
    if (formData.leave_type === 'sick_medical_cert' && !formData.medical_certificate_provided) {
      newErrors.medical_certificate = errorTranslations.medicalCertRequired || 'Medical certificate must be provided for medical certificated sick leave';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        days_requested: workingDays
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const getLeaveTypeInfo = () => {
    const leaveTypeDescriptions = t('leaveTypeDescriptions') || {};
    const leaveTypes = t('leaveTypes') || {};

    const info = {
      annual_holiday: {
        title: leaveTypes.annualHoliday || 'Annual Holiday',
        description: leaveTypeDescriptions.annualHoliday || 'Paid leave from your annual entitlement',
        color: 'blue',
        requiresReason: false
      },
      sick_self_cert: {
        title: leaveTypes.sickSelfCert || 'Sick Leave (Self-Certified)',
        description: leaveTypeDescriptions.sickSelfCert || 'For illness up to 7 days - no medical certificate required',
        color: 'orange',
        requiresReason: true
      },
      sick_medical_cert: {
        title: leaveTypes.sickMedicalCert || 'Sick Leave (Medical Certificate)',
        description: leaveTypeDescriptions.sickMedicalCert || 'For illness over 7 days - requires medical certificate',
        color: 'red',
        requiresReason: true
      },
      unpaid: {
        title: leaveTypes.unpaid || 'Unpaid Leave',
        description: leaveTypeDescriptions.unpaid || 'Time off without pay',
        color: 'gray',
        requiresReason: true
      },
      compassionate: {
        title: leaveTypes.compassionate || 'Compassionate Leave',
        description: leaveTypeDescriptions.compassionate || 'For bereavement or family emergencies',
        color: 'purple',
        requiresReason: true
      },
      other: {
        title: leaveTypes.other || 'Other',
        description: leaveTypeDescriptions.other || 'Other type of leave',
        color: 'slate',
        requiresReason: true
      }
    };

    return info[formData.leave_type] || info.annual_holiday;
  };

  const leaveTypeInfo = getLeaveTypeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{t('title') || 'Request Time Off'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Leave Balance Summary */}
        {leaveBalance && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">{t('annualEntitlement') || 'Annual Entitlement'}</p>
              <p className="text-2xl font-bold text-blue-900">{leaveBalance.annual_holiday_days}</p>
              <p className="text-xs text-blue-600">{t('daysPerYear') || 'days/year'}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-100 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">{t('available') || 'Available'}</p>
              <p className="text-2xl font-bold text-green-900">
                {((leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)).toFixed(1)}
              </p>
              <p className="text-xs text-green-600">{t('daysRemaining') || 'days remaining'}</p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-100 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium mb-1">{t('pending') || 'Pending'}</p>
              <p className="text-2xl font-bold text-amber-900">{(leaveBalance.holiday_days_pending || 0).toFixed(1)}</p>
              <p className="text-xs text-amber-600">{t('daysAwaitingApproval') || 'days awaiting approval'}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('leaveTypeRequired') || 'Leave Type *'}
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            >
              <option value="annual_holiday">{(t('leaveTypes') || {}).annualHoliday || 'Annual Holiday (Paid)'}</option>
              <option value="sick_self_cert">{(t('leaveTypes') || {}).sickSelfCert || 'Sick Leave - Self Certified (up to 7 days)'}</option>
              <option value="sick_medical_cert">{(t('leaveTypes') || {}).sickMedicalCert || 'Sick Leave - Medical Certificate Required (7+ days)'}</option>
              <option value="unpaid">{(t('leaveTypes') || {}).unpaid || 'Unpaid Leave'}</option>
              <option value="compassionate">{(t('leaveTypes') || {}).compassionate || 'Compassionate Leave'}</option>
              <option value="other">{(t('leaveTypes') || {}).other || 'Other'}</option>
            </select>
            <div className={`mt-2 p-3 bg-${leaveTypeInfo.color}-50 border border-${leaveTypeInfo.color}-200 rounded-lg`}>
              <p className="text-sm text-slate-700">
                <strong>{leaveTypeInfo.title}:</strong> {leaveTypeInfo.description}
              </p>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('startDateRequired') || 'Start Date *'}
              </label>
              <input
                type="date"
                name="date_from"
                value={formData.date_from}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] ${
                  errors.date_from ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {errors.date_from && (
                <p className="mt-1 text-sm text-red-600">{errors.date_from}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('endDateRequired') || 'End Date *'}
              </label>
              <input
                type="date"
                name="date_to"
                value={formData.date_to}
                onChange={handleChange}
                required
                min={formData.date_from || new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:border-[#6262bd] ${
                  errors.date_to ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {errors.date_to && (
                <p className="mt-1 text-sm text-red-600">{errors.date_to}</p>
              )}
            </div>
          </div>

          {/* Working Days Calculation */}
          {workingDays > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{t('workingDaysRequested') || 'Working Days Requested'}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('excludesWeekends') || 'Excludes weekends'}</p>
                </div>
                <p className="text-3xl font-bold text-[#6262bd]">{workingDays}</p>
              </div>
              {errors.days && (
                <p className="mt-2 text-sm text-red-600">{errors.days}</p>
              )}
            </div>
          )}

          {/* Medical Certificate Checkbox (for sick_medical_cert) */}
          {formData.leave_type === 'sick_medical_cert' && (
            <div>
              <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-[#6262bd] transition-colors">
                <input
                  type="checkbox"
                  name="medical_certificate_provided"
                  checked={formData.medical_certificate_provided}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#6262bd] rounded focus:ring-[#6262bd]"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{t('medicalCertificateProvided') || 'Medical Certificate Provided'}</p>
                  <p className="text-xs text-slate-500">{t('medicalCertificateConfirm') || 'I confirm that I have or will provide a medical certificate'}</p>
                </div>
              </label>
              {errors.medical_certificate && (
                <p className="mt-1 text-sm text-red-600">{errors.medical_certificate}</p>
              )}
            </div>
          )}

          {/* Reason (required for some leave types) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {leaveTypeInfo.requiresReason ? (t('reasonRequired') || 'Reason *') : (t('reason') || 'Reason')}
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required={leaveTypeInfo.requiresReason}
              rows="4"
              placeholder={
                formData.leave_type === 'annual_holiday'
                  ? (t('reasonPlaceholderHoliday') || 'Optional - add any notes about your holiday...')
                  : (t('reasonPlaceholder') || 'Please provide details...')
              }
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>{t('pleaseNote') || 'Please note:'}</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
              <li>• {t('requiresApproval') || 'Requests require manager approval'}</li>
              <li>• {t('notifyOnReview') || "You'll receive a notification when your request is reviewed"}</li>
              {formData.leave_type === 'annual_holiday' && (
                <li>• {t('holidayDeduction') || 'Holiday days will be deducted from your balance when approved'}</li>
              )}
              {formData.leave_type.startsWith('sick_') && (
                <li>• {t('sickLeaveNote') || 'Sick leave may require a return-to-work meeting'}</li>
              )}
            </ul>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || Object.keys(errors).length > 0}
              className="flex-1 px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (t('submitting') || 'Submitting...') : (t('submitRequest') || 'Submit Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
