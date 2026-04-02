'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import { useModuleGuard } from '@/hooks/useModuleGuard';
import ClockInOut from './ClockInOut';
import WorkHistory from './WorkHistory';
import TimeOffRequestModal from './TimeOffRequestModal';
import RequestHistory from './RequestHistory';
import InfoTooltip from '@/components/InfoTooltip';

const TABS = ['shifts', 'leave', 'history'];

export default function MyRotaPage() {
  useModuleGuard('rota')
  const restaurantCtx = useRestaurant();
  const [restaurant, setRestaurant] = useState(null);
  const [staff, setStaff] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('time_off');
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('shifts');
  const t = useTranslations('myRota');
  const tg = useTranslations('guide');

  useEffect(() => {
    const staffSessionData = localStorage.getItem('staff_session');
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData);
        if (staffSession.restaurant && staffSession.id) {
          setRestaurant(staffSession.restaurant);
          setStaff({
            id: staffSession.id,
            name: staffSession.name,
            email: staffSession.email,
            role: staffSession.role,
            department: staffSession.department,
            restaurant_id: staffSession.restaurant_id
          });
        }
      } catch (err) {
        localStorage.removeItem('staff_session');
      }
    } else if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant);
    }
  }, [restaurantCtx]);

  const fetchShifts = useCallback(async () => {
    if (!restaurant || !staff) return;
    setLoading(true);
    const startDate = new Date();
    const endDate = new Date();
    if (selectedPeriod === 'week') endDate.setDate(startDate.getDate() + 7);
    else endDate.setDate(startDate.getDate() + 30);
    const params = new URLSearchParams({
      restaurant_id: restaurant.id,
      staff_id: staff.id,
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0]
    });
    const response = await fetch(`/api/rota/shifts?${params}`);
    const result = await response.json();
    if (result.shifts) setShifts(result.shifts);
    setLoading(false);
  }, [restaurant, staff, selectedPeriod]);

  /**
   * Fetch leave balance — tries the DB view first, falls back to computing
   * from staff_leave_entitlements + approved shift_requests manually.
   */
  const fetchLeaveBalance = useCallback(async () => {
    if (!restaurant || !staff) return;

    try {
      // Compute from entitlements (via service-role API) + shift_requests
      // Use API route for entitlements to bypass RLS (staff anon session can't read them)
      const [staffRes, requestsResult] = await Promise.all([
        fetch(`/api/staff?restaurant_id=${restaurant.id}&staff_id=${staff.id}`),
        supabase
          .from('shift_requests')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('restaurant_id', restaurant.id)
          .eq('request_type', 'time_off')
          .in('status', ['approved', 'pending'])
      ]);

      const staffJson = await staffRes.json();
      const staffRecord = staffJson.staff?.[0];
      const entitlement = staffRecord?.staff_leave_entitlements?.[0] || null;
      const requests = requestsResult.data || [];

      if (!entitlement) {
        setLeaveBalance(null);
        return;
      }

      const annualDays = parseFloat(entitlement.annual_holiday_days) || 0;

      // Calculate days used in current holiday year
      const yearStart = new Date(entitlement.holiday_year_start);
      const yearEnd = new Date(yearStart);
      yearEnd.setFullYear(yearStart.getFullYear() + 1);
      const today = new Date();

      // If holiday year hasn't started yet, use previous year cycle
      let effectiveYearStart = new Date(yearStart);
      while (effectiveYearStart > today) {
        effectiveYearStart.setFullYear(effectiveYearStart.getFullYear() - 1);
      }
      let effectiveYearEnd = new Date(effectiveYearStart);
      effectiveYearEnd.setFullYear(effectiveYearStart.getFullYear() + 1);

      const approvedRequests = requests.filter(r =>
        r.status === 'approved' &&
        new Date(r.date_from) >= effectiveYearStart &&
        new Date(r.date_from) < effectiveYearEnd
      );
      const pendingRequests = requests.filter(r =>
        r.status === 'pending'
      );

      const daysUsed = approvedRequests.reduce((s, r) => s + (r.days_requested || 0), 0);
      const daysPending = pendingRequests.reduce((s, r) => s + (r.days_requested || 0), 0);
      const daysRemaining = Math.max(0, annualDays - daysUsed);

      setLeaveBalance({
        annual_holiday_days: annualDays,
        holiday_days_used: daysUsed,
        holiday_days_remaining: daysRemaining,
        holiday_days_pending: daysPending,
        holiday_year_start: entitlement.holiday_year_start,
        _computed: true // flag so we know it's computed
      });
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  }, [restaurant, staff]);

  const fetchLeaveHistory = useCallback(async () => {
    if (!restaurant || !staff) return;
    try {
      const params = new URLSearchParams({ restaurant_id: restaurant.id, staff_id: staff.id, request_type: 'time_off' });
      const response = await fetch(`/api/rota/requests?${params}`);
      const result = await response.json();
      if (result.requests) setLeaveHistory(result.requests);
    } catch (error) {
      console.error('Error fetching leave history:', error);
    }
  }, [restaurant, staff]);

  useEffect(() => {
    if (restaurant && staff) {
      fetchShifts();
      fetchLeaveBalance();
      fetchLeaveHistory();
    }
  }, [restaurant, staff, fetchShifts, fetchLeaveBalance, fetchLeaveHistory]);

  useEffect(() => {
    if (!restaurant || !staff) return;
    const ch = supabase
      .channel(`my-shifts-${staff.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `staff_id=eq.${staff.id}` }, fetchShifts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requests', filter: `staff_id=eq.${staff.id}` }, () => { fetchLeaveBalance(); fetchLeaveHistory(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_leave_entitlements', filter: `staff_id=eq.${staff.id}` }, fetchLeaveBalance)
      .subscribe();
    return () => ch.unsubscribe();
  }, [restaurant, staff, fetchShifts, fetchLeaveBalance, fetchLeaveHistory]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (t) => t?.substring(0, 5);
  const calculateShiftDuration = (start, end, breakMin = 0) => {
    const s = new Date(`2000-01-01T${start}`), e = new Date(`2000-01-01T${end}`);
    const total = (e - s) / 60000 - breakMin;
    return `${Math.floor(total / 60)}h ${Math.floor(total % 60)}m`;
  };
  const getTotalHours = () => shifts.reduce((total, shift) => {
    const s = new Date(`2000-01-01T${shift.shift_start}`), e = new Date(`2000-01-01T${shift.shift_end}`);
    return total + ((e - s) / 60000 - (shift.break_duration || 0)) / 60;
  }, 0).toFixed(1);

  const handleTimeOffSubmit = async (requestData) => {
    const response = await fetch('/api/rota/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurant.id, staff_id: staff.id, request_type: 'time_off', ...requestData })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit request');
    setShowRequestModal(false);
    fetchLeaveBalance();
    fetchLeaveHistory();
  };

  const groupShiftsByDate = () => {
    const grouped = {};
    shifts.forEach(shift => {
      if (!grouped[shift.date]) grouped[shift.date] = [];
      grouped[shift.date].push(shift);
    });
    return grouped;
  };

  if (!restaurant || !staff) {
    return <div className="min-h-screen bg-gray-50 p-8"><p>{t('loading') || 'Loading...'}</p></div>;
  }

  const groupedShifts = groupShiftsByDate();
  const availableDays = leaveBalance ? Math.max(0, (leaveBalance.holiday_days_remaining || 0) - (leaveBalance.holiday_days_pending || 0)) : null;

  // Leave history grouped by status for the leave tab
  const approvedLeave = leaveHistory.filter(r => r.status === 'approved' && r.leave_type === 'annual_holiday');
  const pendingLeave = leaveHistory.filter(r => r.status === 'pending');
  const pastLeave = leaveHistory.filter(r => r.status === 'approved' || r.status === 'rejected');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">{t('pageTitle') || 'My Rota'}<InfoTooltip text={tg('my_rota_desc')} /></h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">{t('pageSubtitle') || 'View your upcoming shifts and manage requests'}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t('upcomingShifts') || 'Upcoming Shifts'}</p>
          <p className="text-3xl font-bold text-[#6262bd]">{shifts.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t('totalHours') || 'Total Hours'}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-200">{getTotalHours()}h</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t('nextShift') || 'Next Shift'}</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight">
            {shifts.length > 0 ? formatDate(shifts[0].date) : (t('none') || 'None')}
          </p>
        </div>
        <div
          className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-5 cursor-pointer transition-colors ${activeTab === 'leave' ? 'border-green-400 dark:border-green-600' : 'border-green-100 dark:border-green-900 hover:border-green-300'}`}
          onClick={() => setActiveTab('leave')}
        >
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{t('holidayDaysLeft') || 'Holiday Days Left'}</p>
          <p className="text-3xl font-bold text-green-700 dark:text-green-400">
            {availableDays !== null ? availableDays.toFixed(1) : '—'}
          </p>
          {leaveBalance && leaveBalance.holiday_days_pending > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              +{leaveBalance.holiday_days_pending.toFixed(1)} pending
            </p>
          )}
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <div className="mb-6">
        <ClockInOut staff={staff} restaurant={restaurant} />
      </div>

      {/* Main tab nav */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-1 w-fit">
        {[
          { key: 'shifts',  label: '📅 Upcoming Shifts' },
          { key: 'leave',   label: '🌴 My Leave' },
          { key: 'history', label: '📋 Work History' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-[#6262bd] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SHIFTS TAB ─── */}
      {activeTab === 'shifts' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button onClick={() => { setRequestType('time_off'); setShowRequestModal(true); }}
              className="px-5 py-2.5 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium text-sm">
              🌴 {t('requestTimeOff') || 'Request Time Off'}
            </button>
            <button onClick={() => { setRequestType('swap'); setShowRequestModal(true); }}
              className="px-5 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:border-[#6262bd] transition-colors font-medium text-sm">
              🔄 {t('requestShiftSwap') || 'Request Shift Swap'}
            </button>
            <div className="ml-auto flex gap-2">
              {[['week', t('next7Days') || 'Next 7 Days'], ['month', t('next30Days') || 'Next 30 Days']].map(([key, label]) => (
                <button key={key} onClick={() => setSelectedPeriod(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === key ? 'bg-[#6262bd] text-white' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#6262bd]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd] mb-4"></div>
              <p className="text-slate-500">{t('loadingShifts') || 'Loading your shifts...'}</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">{t('noShifts') || 'No shifts scheduled for the selected period'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('checkBackLater') || 'Check back later or contact your manager'}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.keys(groupedShifts).sort().map(date => (
                <div key={date} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 border-b-2 border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{formatDate(date)}</h3>
                  </div>
                  <div className="divide-y-2 divide-slate-100 dark:divide-slate-700">
                    {groupedShifts[date].map(shift => (
                      <div key={shift.id} className="p-5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-2xl font-bold text-[#6262bd]">{formatTime(shift.shift_start)} – {formatTime(shift.shift_end)}</span>
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium">{shift.role_required}</span>
                              {shift.department && <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">{shift.department}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span>⏱ {calculateShiftDuration(shift.shift_start, shift.shift_end, shift.break_duration)}</span>
                              {shift.break_duration > 0 && <span>☕ {shift.break_duration}min break</span>}
                            </div>
                            {shift.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">📝 {shift.notes}</p>}
                          </div>
                          <div className="ml-4">
                            {shift.status === 'published' && <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg text-sm font-medium">✓ {t('confirmed') || 'Confirmed'}</span>}
                            {shift.status === 'draft' && <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-sm font-medium">⏳ Pending</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── LEAVE TAB ─── */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* Balance Overview */}
          {leaveBalance ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b-2 border-slate-100 dark:border-slate-700">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">🌴 Holiday Entitlement</h2>
                {leaveBalance.holiday_year_start && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Holiday year from {new Date(leaveBalance.holiday_year_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700">
                {[
                  { label: 'Annual Entitlement', value: leaveBalance.annual_holiday_days?.toFixed(1) || '—', sub: 'days/year', color: 'text-[#6262bd]' },
                  { label: 'Used', value: (leaveBalance.holiday_days_used || 0).toFixed(1), sub: 'days taken', color: 'text-slate-700 dark:text-slate-300' },
                  { label: 'Pending', value: (leaveBalance.holiday_days_pending || 0).toFixed(1), sub: 'awaiting approval', color: 'text-amber-600' },
                  { label: 'Available', value: availableDays?.toFixed(1) || '0.0', sub: 'days remaining', color: 'text-green-600' }
                ].map((s, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 px-5 py-5 text-center">
                    <p className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Visual progress bar */}
              {leaveBalance.annual_holiday_days > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>0</span>
                    <span className="font-medium">{leaveBalance.annual_holiday_days} days total</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="bg-green-500 transition-all" style={{ width: `${Math.min(100, ((leaveBalance.holiday_days_used || 0) / leaveBalance.annual_holiday_days) * 100)}%` }}></div>
                      <div className="bg-amber-400 transition-all" style={{ width: `${Math.min(100 - ((leaveBalance.holiday_days_used || 0) / leaveBalance.annual_holiday_days) * 100, ((leaveBalance.holiday_days_pending || 0) / leaveBalance.annual_holiday_days) * 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Used</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Pending</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600 inline-block"></span> Available</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium text-slate-600 dark:text-slate-300">No leave entitlement set up yet</p>
              <p className="text-sm mt-1">Contact your manager to set up your holiday entitlement</p>
            </div>
          )}

          {/* Request time off CTA */}
          <button
            onClick={() => { setRequestType('time_off'); setShowRequestModal(true); }}
            className="w-full py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a5] transition-colors"
          >
            🌴 Request Time Off
          </button>

          {/* Pending requests */}
          {pendingLeave.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                ⏳ Pending Requests
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{pendingLeave.length}</span>
              </h3>
              <div className="space-y-2">
                {pendingLeave.map(r => (
                  <div key={r.id} className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(r.date_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(r.date_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.days_requested} working days · {r.leave_type?.replace(/_/g, ' ')}</p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full">⏳ Awaiting approval</span>
                    </div>
                    {r.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">"{r.reason}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past leave */}
          {pastLeave.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">📜 Leave History</h3>
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                {pastLeave.slice(0, 10).map((r, i) => {
                  const isApproved = r.status === 'approved';
                  return (
                    <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isApproved ? 'bg-green-500' : 'bg-red-400'}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(r.date_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(r.date_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.days_requested}d · {r.leave_type?.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isApproved ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {isApproved ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {leaveHistory.length === 0 && !leaveBalance && (
            <div className="text-center py-8 text-slate-400">
              <p>No leave history yet</p>
            </div>
          )}
        </div>
      )}

      {/* ─── HISTORY TAB ─── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <WorkHistory staff={staff} restaurant={restaurant} />
          <RequestHistory staff={staff} restaurant={restaurant} />
        </div>
      )}

      {/* Time Off Request Modal */}
      {showRequestModal && requestType === 'time_off' && (
        <TimeOffRequestModal
          staff={staff}
          restaurant={restaurant}
          leaveBalance={leaveBalance}
          onClose={() => setShowRequestModal(false)}
          onSubmit={handleTimeOffSubmit}
        />
      )}

      {/* Shift Swap placeholder */}
      {showRequestModal && requestType === 'swap' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">{t('requestShiftSwap') || 'Request Shift Swap'}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{t('shiftSwapComingSoon') || 'Shift swap functionality coming soon'}</p>
            <button onClick={() => setShowRequestModal(false)} className="w-full px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
