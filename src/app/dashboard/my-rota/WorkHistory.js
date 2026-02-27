'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function WorkHistory({ staff, restaurant }) {
  const t = useTranslations('myRota.workHistory');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_week'); // this_week, last_week, this_month, last_month, custom
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let dateFrom, dateTo;

    switch (period) {
      case 'this_week':
        // Start of this week (Monday)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;

      case 'last_week':
        // Last week (Monday to Sunday)
        const lastWeekEnd = new Date(now);
        const lastWeekDay = lastWeekEnd.getDay();
        const lastWeekDiff = lastWeekEnd.getDate() - lastWeekDay + (lastWeekDay === 0 ? -6 : 1) - 7;
        lastWeekEnd.setDate(lastWeekDiff + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);

        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);
        lastWeekStart.setHours(0, 0, 0, 0);

        dateFrom = lastWeekStart.toISOString().split('T')[0];
        dateTo = lastWeekEnd.toISOString().split('T')[0];
        break;

      case 'this_month':
        // Start of this month to today
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom = startOfMonth.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        break;

      case 'last_month':
        // Last month (full month)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFrom = lastMonthStart.toISOString().split('T')[0];
        dateTo = lastMonthEnd.toISOString().split('T')[0];
        break;

      case 'custom':
        dateFrom = customDateFrom;
        dateTo = customDateTo;
        break;

      default:
        dateFrom = now.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
    }

    return { dateFrom, dateTo };
  }, [period, customDateFrom, customDateTo]);

  const fetchWorkHistory = useCallback(async () => {
    if (!restaurant || !staff) return;

    setLoading(true);

    try {
      const { dateFrom, dateTo } = getDateRange();

      const params = new URLSearchParams({
        restaurant_id: restaurant.id,
        staff_id: staff.id,
        date_from: dateFrom,
        date_to: dateTo
      });

      const response = await fetch(`/api/rota/attendance?${params}`);
      const result = await response.json();

      if (result.attendance) {
        // Filter for completed shifts (has clock_out)
        const completed = result.attendance.filter(att => att.clock_out);
        // Sort by date (newest first)
        completed.sort((a, b) => {
          const dateA = a.shift?.date || '';
          const dateB = b.shift?.date || '';
          return dateB.localeCompare(dateA);
        });
        setAttendance(completed);
      }
    } catch (error) {
      console.error('Error fetching work history:', error);
    }

    setLoading(false);
  }, [restaurant, staff, getDateRange]);

  useEffect(() => {
    if (restaurant && staff) {
      fetchWorkHistory();
    }
  }, [restaurant, staff, fetchWorkHistory]);

  const calculateHoursWorked = (clockIn, clockOut, breakStart, breakEnd) => {
    if (!clockIn || !clockOut) return 0;

    const start = new Date(clockIn);
    const end = new Date(clockOut);
    let totalMinutes = (end - start) / 1000 / 60;

    // Subtract break time if available
    if (breakStart && breakEnd) {
      const breakStartTime = new Date(breakStart);
      const breakEndTime = new Date(breakEnd);
      const breakMinutes = (breakEndTime - breakStartTime) / 1000 / 60;
      totalMinutes -= breakMinutes;
    }

    return totalMinutes / 60; // Return hours as decimal
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTotalHours = () => {
    return attendance.reduce((total, att) => {
      return total + calculateHoursWorked(att.clock_in, att.clock_out, att.break_start, att.break_end);
    }, 0);
  };

  const groupByDate = () => {
    const grouped = {};
    attendance.forEach(att => {
      const date = att.shift?.date || 'unknown';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(att);
    });
    return grouped;
  };

  const handleCustomDateApply = () => {
    if (customDateFrom && customDateTo) {
      setPeriod('custom');
      setShowCustom(false);
    }
  };

  const groupedAttendance = groupByDate();

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">{t('title') || 'Work History'}</h2>
        <div className="text-right">
          <p className="text-sm text-slate-600">{t('totalHoursWorked') || 'Total Hours Worked'}</p>
          <p className="text-2xl font-bold text-[#6262bd]">{formatHours(getTotalHours())}</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => { setPeriod('this_week'); setShowCustom(false); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'this_week'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('thisWeek') || 'This Week'}
          </button>
          <button
            onClick={() => { setPeriod('last_week'); setShowCustom(false); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'last_week'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('lastWeek') || 'Last Week'}
          </button>
          <button
            onClick={() => { setPeriod('this_month'); setShowCustom(false); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'this_month'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('thisMonth') || 'This Month'}
          </button>
          <button
            onClick={() => { setPeriod('last_month'); setShowCustom(false); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'last_month'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('lastMonth') || 'Last Month'}
          </button>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'custom'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('customRange') || 'Custom Range'}
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {showCustom && (
          <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('fromDate') || 'From Date'}
                </label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('toDate') || 'To Date'}
                </label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                />
              </div>
            </div>
            <button
              onClick={handleCustomDateApply}
              disabled={!customDateFrom || !customDateTo}
              className="px-6 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('apply') || 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Work History List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">{t('loading') || 'Loading work history...'}</p>
        </div>
      ) : attendance.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-600 font-medium">{t('noHistory') || 'No work history for this period'}</p>
          <p className="text-sm text-slate-500 mt-1">{t('completedShiftsNote') || 'Completed shifts will appear here'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedAttendance).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date} className="border-2 border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b-2 border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">{formatDate(date)}</h3>
                  <span className="text-sm font-medium text-[#6262bd]">
                    {formatHours(
                      groupedAttendance[date].reduce((sum, att) =>
                        sum + calculateHoursWorked(att.clock_in, att.clock_out, att.break_start, att.break_end)
                      , 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="divide-y-2 divide-slate-100">
                {groupedAttendance[date].map(att => {
                  const hoursWorked = calculateHoursWorked(att.clock_in, att.clock_out, att.break_start, att.break_end);
                  const breakDuration = att.break_start && att.break_end
                    ? (new Date(att.break_end) - new Date(att.break_start)) / 1000 / 60
                    : 0;

                  return (
                    <div key={att.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">
                              {formatTime(att.clock_in)} - {formatTime(att.clock_out)}
                            </span>
                            {att.shift?.role_required && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                {att.shift.role_required}
                              </span>
                            )}
                            {att.status === 'late' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                {t('late') || 'Late'}
                              </span>
                            )}
                            {att.status === 'early_leave' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                {t('earlyLeave') || 'Early Leave'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>{t('worked') || 'Worked'}: {formatHours(hoursWorked)}</span>
                            {breakDuration > 0 && (
                              <span>{t('break') || 'Break'}: {Math.round(breakDuration)}m</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#6262bd]">
                            {formatHours(hoursWorked)}
                          </div>
                        </div>
                      </div>
                      {att.notes && (
                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded">
                          {att.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {attendance.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-xl">
            <p className="text-sm text-blue-700 mb-1">{t('totalShifts') || 'Total Shifts'}</p>
            <p className="text-2xl font-bold text-blue-800">{attendance.length}</p>
          </div>
          <div className="p-4 bg-green-50 border-2 border-green-100 rounded-xl">
            <p className="text-sm text-green-700 mb-1">{t('totalHours') || 'Total Hours'}</p>
            <p className="text-2xl font-bold text-green-800">{formatHours(getTotalHours())}</p>
          </div>
          <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl">
            <p className="text-sm text-purple-700 mb-1">{t('averagePerShift') || 'Average per Shift'}</p>
            <p className="text-2xl font-bold text-purple-800">
              {formatHours(getTotalHours() / attendance.length)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
