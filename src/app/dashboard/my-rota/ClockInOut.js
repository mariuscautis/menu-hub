'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClockInOut({ staff, restaurant }) {
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [todayShift, setTodayShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchCurrentStatus = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }

    try {
      // Get today's date in LOCAL timezone (not UTC)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      console.log('=== CLOCK IN/OUT DEBUG ===');
      console.log('Looking for shift on date:', today);

      // Fetch today's shifts via API (bypasses RLS issues with PIN-based login)
      const params = new URLSearchParams({
        restaurant_id: restaurant.id,
        staff_id: staff.id,
        date_from: today,
        date_to: today
      });

      const response = await fetch(`/api/rota/shifts?${params}`);
      const result = await response.json();

      console.log('API response:', result);

      // Find today's shift (published or draft)
      let shifts = null;
      if (result.shifts && result.shifts.length > 0) {
        shifts = result.shifts.find(s =>
          s.date === today &&
          (s.status === 'published' || s.status === 'draft')
        );
      }

      console.log('Today\'s shift found:', shifts);
      console.log('=== END DEBUG ===');

      if (shifts) {
        setTodayShift(shifts);
      } else {
        // Check if there's a cancelled shift
        const cancelledShift = result.shifts?.find(s =>
          s.date === today && s.status === 'cancelled'
        );

        if (cancelledShift) {
          setMessage({
            type: 'error',
            text: 'Your shift for today has been cancelled'
          });
        }
      }

      // Fetch current attendance record (if clocked in)
      // If we have a shift today, check for attendance record via API (bypasses RLS)
      let attendance = null;
      if (shifts) {
        console.log('📋 Fetching attendance for shift:', shifts.id);

        const attendanceParams = new URLSearchParams({
          restaurant_id: restaurant.id,
          staff_id: staff.id,
          shift_id: shifts.id,
          active_only: 'true'
        });

        console.log('📋 GET Attendance with params:', {
          restaurant_id: restaurant.id,
          staff_id: staff.id,
          shift_id: shifts.id,
          active_only: 'true',
          url: `/api/rota/attendance?${attendanceParams}`
        });

        const attendanceResponse = await fetch(`/api/rota/attendance?${attendanceParams}`);
        const attendanceResult = await attendanceResponse.json();

        console.log('📋 Attendance API response:', attendanceResult);

        if (attendanceResult.attendance && attendanceResult.attendance.length > 0) {
          attendance = attendanceResult.attendance[0]; // Get the first active attendance record
          console.log('✅ Found active attendance record:', attendance.id);
          console.log('   Clock in:', attendance.clock_in);
          console.log('   On break?', attendance.break_start && !attendance.break_end);
        } else {
          console.log('ℹ️ No active attendance record found (user not clocked in)');
        }
      } else {
        console.log('ℹ️ No shift today, skipping attendance check');
      }

      console.log('🎯 Setting currentAttendance to:', attendance ? `ID: ${attendance.id}` : 'null');
      setCurrentAttendance(attendance);
    } catch (error) {
      console.error('Error fetching current status:', error);
    }

    setLoading(false);
  }, [restaurant, staff]);

  // Initial fetch and polling
  useEffect(() => {
    if (staff && restaurant) {
      console.log('🚀 Component mounted - fetching initial status');
      fetchCurrentStatus();

      // Poll every 10 seconds to keep state fresh (silently in background)
      const pollInterval = setInterval(() => {
        console.log('⏰ Polling attendance status...');
        fetchCurrentStatus(false); // Don't show loading spinner for background polls
      }, 10000); // 10 seconds

      return () => {
        console.log('🛑 Stopping attendance polling');
        clearInterval(pollInterval);
      };
    }
  }, [staff, restaurant, fetchCurrentStatus]);

  // Real-time subscription for attendance changes
  useEffect(() => {
    if (!restaurant || !staff) return;

    const attendanceChannel = supabase
      .channel(`attendance-${staff.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `staff_id=eq.${staff.id}`
      }, () => {
        console.log('🔄 Attendance changed - refreshing silently');
        fetchCurrentStatus(false); // Silent refresh
      })
      .subscribe();

    return () => {
      attendanceChannel.unsubscribe();
    };
  }, [restaurant, staff, fetchCurrentStatus]);

  // Refetch status when tab becomes visible or window gains focus
  useEffect(() => {
    if (!staff || !restaurant) return;

    const handleVisibilityChange = () => {
      console.log('🔔 Visibility changed. Document hidden?', document.hidden);
      if (!document.hidden) {
        console.log('✅ Tab became visible - refreshing silently');
        fetchCurrentStatus(false); // Silent refresh
      }
    };

    const handleWindowFocus = () => {
      console.log('✅ Window gained focus - refreshing silently');
      fetchCurrentStatus(false); // Silent refresh
    };

    const handlePageShow = (event) => {
      console.log('📄 Page show event - persisted?', event.persisted);
      fetchCurrentStatus(false); // Silent refresh
    };

    // Listen for visibility changes, focus, AND pageshow events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handlePageShow);

    console.log('👀 Visibility, focus, and pageshow listeners registered');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handlePageShow);
      console.log('👋 Event listeners removed');
    };
  }, [staff, restaurant, fetchCurrentStatus]);

  const handleClockIn = async () => {
    if (!todayShift) {
      setMessage({ type: 'error', text: 'You do not have a scheduled shift today' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const clockInData = {
        restaurant_id: restaurant.id,
        staff_id: staff.id,
        shift_id: todayShift.id,
        action: 'clock_in'
      };

      console.log('🔵 CLOCK IN REQUEST:', clockInData);

      const response = await fetch('/api/rota/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clockInData)
      });

      const result = await response.json();

      console.log('🔵 CLOCK IN RESPONSE:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock in');
      }

      if (result.attendance) {
        console.log('🔵 Setting currentAttendance from clock in response:', result.attendance.id);
        setCurrentAttendance(result.attendance);
      }
      setMessage({ type: 'success', text: 'Clocked in successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage({ type: 'error', text: error.message });
    }

    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!currentAttendance) return;

    if (!confirm('Are you sure you want to clock out?')) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rota/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentAttendance.id,
          clock_out: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock out');
      }

      setCurrentAttendance(null);
      setMessage({ type: 'success', text: 'Clocked out successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage({ type: 'error', text: error.message });
    }

    setActionLoading(false);
  };

  const handleStartBreak = async () => {
    if (!currentAttendance) return;
    if (currentAttendance.break_start && !currentAttendance.break_end) {
      setMessage({ type: 'error', text: 'You are already on break' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rota/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentAttendance.id,
          break_start: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start break');
      }

      setCurrentAttendance(result.attendance);
      setMessage({ type: 'success', text: 'Break started' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error starting break:', error);
      setMessage({ type: 'error', text: error.message });
    }

    setActionLoading(false);
  };

  const handleEndBreak = async () => {
    if (!currentAttendance || !currentAttendance.break_start) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rota/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentAttendance.id,
          break_end: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to end break');
      }

      setCurrentAttendance(result.attendance);
      setMessage({ type: 'success', text: 'Break ended' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error ending break:', error);
      setMessage({ type: 'error', text: error.message });
    }

    setActionLoading(false);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Time is stored as "HH:mm" format (e.g., "06:00", "14:00")
    // Just return the first 5 characters to display it properly
    return timeString.substring(0, 5);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const calculateDuration = (start, end) => {
    if (!start) return '0h 0m';
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd] mx-auto"></div>
        </div>
      </div>
    );
  }

  const onBreak = currentAttendance?.break_start && !currentAttendance?.break_end;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Clock In/Out</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 border-2 border-green-200 text-green-700'
              : 'bg-red-50 border-2 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Today's Shift Info */}
      {todayShift ? (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Today's Shift</p>
            {todayShift.status === 'draft' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Draft
              </span>
            )}
            {todayShift.status === 'published' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Published
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            {todayShift.role_required} • {formatTime(todayShift.shift_start)} - {formatTime(todayShift.shift_end)}
          </p>
          {todayShift.department && (
            <p className="text-sm text-slate-600 mt-1">
              Department: {todayShift.department.charAt(0).toUpperCase() + todayShift.department.slice(1)}
            </p>
          )}
          {todayShift.status === 'draft' && (
            <p className="text-xs text-blue-600 mt-2">
              Note: This shift is in draft status but you can still clock in.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800">You do not have a scheduled shift today</p>
        </div>
      )}

      {/* Clock Status */}
      {currentAttendance ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-green-800">Clocked In</p>
                <p className="text-lg font-bold text-green-900">
                  {formatDateTime(currentAttendance.clock_in)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700">Duration</p>
                <p className="text-lg font-bold text-green-900">
                  {calculateDuration(currentAttendance.clock_in, null)}
                </p>
              </div>
            </div>

            {onBreak && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm font-medium text-green-800 mb-1">On Break</p>
                <p className="text-sm text-green-700">
                  Started: {formatDateTime(currentAttendance.break_start)}
                </p>
                <p className="text-sm text-green-700">
                  Duration: {calculateDuration(currentAttendance.break_start, null)}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {onBreak ? (
              <button
                onClick={handleEndBreak}
                disabled={actionLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'End Break'}
              </button>
            ) : (
              <button
                onClick={handleStartBreak}
                disabled={actionLoading}
                className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Start Break'}
              </button>
            )}

            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Processing...' : 'Clock Out'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleClockIn}
          disabled={actionLoading || !todayShift}
          className="w-full px-6 py-4 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {actionLoading ? 'Processing...' : 'Clock In'}
        </button>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Clock in when you start your shift and clock out when you finish.
          Use the break buttons to track your break time.
        </p>
      </div>
    </div>
  );
}
