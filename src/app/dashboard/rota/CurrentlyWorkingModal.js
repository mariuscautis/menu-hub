'use client';

import { useState, useEffect } from 'react';

export default function CurrentlyWorkingModal({ restaurant, onClose }) {
  const [activeStaff, setActiveStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockingOut, setClockingOut] = useState(null);

  useEffect(() => {
    fetchActiveStaff();
    // Refresh every 30 seconds to keep data current
    const interval = setInterval(fetchActiveStaff, 30000);
    return () => clearInterval(interval);
  }, [restaurant]);

  const fetchActiveStaff = async () => {
    if (!restaurant) return;

    try {
      setLoading(true);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch ALL attendance records for today (both active and completed)
      const params = new URLSearchParams({
        restaurant_id: restaurant.id,
        date_from: today,
        date_to: today
      });

      const response = await fetch(`/api/rota/attendance?${params}`);
      const result = await response.json();

      if (result.attendance) {
        // Filter for records that have clocked in today
        const todayAttendance = result.attendance.filter(att => {
          if (!att.shift || !att.clock_in) return false;
          return att.shift.date === today;
        });

        // Sort: currently working first, then completed, ordered by clock_in time
        const sorted = todayAttendance.sort((a, b) => {
          // Active (no clock_out) come first
          if (!a.clock_out && b.clock_out) return -1;
          if (a.clock_out && !b.clock_out) return 1;
          // Within each group, sort by clock_in time (earliest first)
          return new Date(a.clock_in) - new Date(b.clock_in);
        });

        setActiveStaff(sorted);
      }
    } catch (error) {
      console.error('Error fetching active staff:', error);
    }

    setLoading(false);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeFromString = (timeString) => {
    if (!timeString) return 'N/A';
    // Time is stored as "HH:mm:ss"
    return timeString.substring(0, 5);
  };

  const calculateDuration = (clockIn) => {
    if (!clockIn) return '0h 0m';
    const start = new Date(clockIn);
    const now = new Date();
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleManualClockOut = async (attendance) => {
    if (!confirm(`Clock out ${attendance.staff?.name}?\n\nThis will set their clock out time to now.`)) {
      return;
    }

    setClockingOut(attendance.id);

    try {
      const response = await fetch('/api/rota/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: attendance.id,
          clock_out: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clock out');
      }

      // Refresh the data
      await fetchActiveStaff();
    } catch (error) {
      console.error('Error clocking out staff:', error);
      alert(`Error: ${error.message}`);
    }

    setClockingOut(null);
  };

  const getStatusBadge = (attendance) => {
    if (attendance.clock_out) {
      return (
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full font-medium">
          Completed
        </span>
      );
    }
    if (attendance.break_start && !attendance.break_end) {
      return (
        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full font-medium">
          On Break
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
        Working
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Today's Attendance</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Staff members who worked today (currently working and completed shifts)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto"></div>
            <p className="text-slate-500 dark:text-slate-400 mt-4">Loading...</p>
          </div>
        ) : activeStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">No attendance records for today</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Staff members will appear here when they clock in for their shifts
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Staff</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Clocked In</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Clocked Out</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Scheduled Out</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((attendance) => (
                  <tr
                    key={attendance.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {attendance.staff?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">
                        {attendance.shift?.role_required || attendance.staff?.role || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm capitalize">
                        {attendance.staff?.department || attendance.shift?.department || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(attendance)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {formatTime(attendance.clock_in)}
                        </div>
                        {attendance.break_start && !attendance.break_end && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Break: {formatTime(attendance.break_start)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {attendance.clock_out ? (
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {formatTime(attendance.clock_out)}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Still working</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatTimeFromString(attendance.shift?.shift_end)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {attendance.clock_out
                          ? calculateDuration(attendance.clock_in, attendance.clock_out)
                          : calculateDuration(attendance.clock_in)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {!attendance.clock_out && (
                        <button
                          onClick={() => handleManualClockOut(attendance)}
                          disabled={clockingOut === attendance.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {clockingOut === attendance.id ? 'Clocking Out...' : 'Clock Out'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {activeStaff.filter(att => !att.clock_out).length}
            </span> currently working • {' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {activeStaff.filter(att => att.clock_out).length}
            </span> completed • {' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {activeStaff.length}
            </span> total today
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
