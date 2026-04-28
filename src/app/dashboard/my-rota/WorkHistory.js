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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('title') || 'Work History'}</h2>
        <div className="text-right">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('totalHoursWorked') || 'Total Hours'}</p>
          <p className="text-xl font-bold text-[#6262bd]">{formatHours(getTotalHours())}</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {[
            ['this_week', t('thisWeek') || 'This Week'],
            ['last_week', t('lastWeek') || 'Last Week'],
            ['this_month', t('thisMonth') || 'This Month'],
            ['last_month', t('lastMonth') || 'Last Month'],
            ['custom', t('customRange') || 'Custom Range'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { if (key === 'custom') { setShowCustom(!showCustom); } else { setPeriod(key); setShowCustom(false); } }}
              className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                period === key ? 'bg-[#6262bd] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {showCustom && (
          <div className="p-4 bg-zinc-50 dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('fromDate') || 'From Date'}
                </label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('toDate') || 'To Date'}
                </label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd]"
                />
              </div>
            </div>
            <button
              onClick={handleCustomDateApply}
              disabled={!customDateFrom || !customDateTo}
              className="px-6 py-2 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('apply') || 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Work History List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-7 h-7 border-2 border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">{t('loading') || 'Loading work history...'}</p>
        </div>
      ) : attendance.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">{t('noHistory') || 'No work history for this period'}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('completedShiftsNote') || 'Completed shifts will appear here'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedAttendance).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date} className="border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden">
              <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-zinc-800 dark:text-zinc-200">{formatDate(date)}</h3>
                  <span className="text-sm font-medium text-[#6262bd]">
                    {formatHours(
                      groupedAttendance[date].reduce((sum, att) =>
                        sum + calculateHoursWorked(att.clock_in, att.clock_out, att.break_start, att.break_end)
                      , 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="divide-y-2 divide-zinc-200 dark:divide-zinc-800">
                {groupedAttendance[date].map(att => {
                  const hoursWorked = calculateHoursWorked(att.clock_in, att.clock_out, att.break_start, att.break_end);
                  const breakDuration = att.break_start && att.break_end
                    ? (new Date(att.break_end) - new Date(att.break_start)) / 1000 / 60
                    : 0;

                  return (
                    <div key={att.id} className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
                          {formatTime(att.clock_in)} – {formatTime(att.clock_out)}
                        </span>
                        <span className="text-base font-bold text-[#6262bd] shrink-0">
                          {formatHours(hoursWorked)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {att.shift?.role_required && (
                          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 rounded-full text-xs font-medium">
                            {att.shift.role_required}
                          </span>
                        )}
                        {att.status === 'late' && (
                          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                            {t('late') || 'Late'}
                          </span>
                        )}
                        {att.status === 'early_leave' && (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                            {t('earlyLeave') || 'Early Leave'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                        <span>⏱ {t('worked') || 'Worked'}: {formatHours(hoursWorked)}</span>
                        {breakDuration > 0 && (
                          <span>☕ {t('break') || 'Break'}: {Math.round(breakDuration)}m</span>
                        )}
                      </div>
                      {att.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
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
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-sm text-center">
            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">{t('totalShifts') || 'Total Shifts'}</p>
            <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{attendance.length}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-sm text-center">
            <p className="text-xs text-green-700 dark:text-green-400 mb-1">{t('totalHours') || 'Total Hours'}</p>
            <p className="text-xl font-bold text-green-800 dark:text-green-300">{formatHours(getTotalHours())}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-100 dark:border-purple-800 rounded-sm text-center">
            <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">{t('averagePerShift') || 'Avg / Shift'}</p>
            <p className="text-xl font-bold text-purple-800 dark:text-purple-300">
              {formatHours(getTotalHours() / attendance.length)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
