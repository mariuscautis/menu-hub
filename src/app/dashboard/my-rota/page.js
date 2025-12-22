'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ClockInOut from './ClockInOut';
import WorkHistory from './WorkHistory';

export default function MyRotaPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [staff, setStaff] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'week', 'month'
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('time_off');

  useEffect(() => {
    // Check for staff session (PIN login)
    const staffSessionData = localStorage.getItem('staff_session');
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData);

        // Staff properties are at root level, restaurant is separate
        if (staffSession.restaurant && staffSession.id) {
          setRestaurant(staffSession.restaurant);
          // Create staff object from root-level properties
          setStaff({
            id: staffSession.id,
            name: staffSession.name,
            email: staffSession.email,
            role: staffSession.role,
            department: staffSession.department,
            restaurant_id: staffSession.restaurant_id
          });
        } else {
          console.error('Invalid staff session structure:', staffSession);
        }
      } catch (err) {
        console.error('Error parsing staff session:', err);
        localStorage.removeItem('staff_session');
      }
    }
  }, []);

  const fetchShifts = useCallback(async () => {
    if (!restaurant || !staff) return;

    setLoading(true);

    const startDate = new Date();
    let endDate = new Date();

    if (selectedPeriod === 'week') {
      endDate.setDate(startDate.getDate() + 7);
    } else {
      endDate.setDate(startDate.getDate() + 30);
    }

    const params = new URLSearchParams({
      restaurant_id: restaurant.id,
      staff_id: staff.id,
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0]
    });

    const response = await fetch(`/api/rota/shifts?${params}`);
    const result = await response.json();

    if (result.shifts) {
      setShifts(result.shifts);
    }

    setLoading(false);
  }, [restaurant, staff, selectedPeriod]);

  useEffect(() => {
    if (restaurant && staff) {
      fetchShifts();
    }
  }, [restaurant, staff, fetchShifts]);

  // Real-time updates
  useEffect(() => {
    if (!restaurant || !staff) return;

    const shiftsChannel = supabase
      .channel(`my-shifts-${staff.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shifts',
        filter: `staff_id=eq.${staff.id}`
      }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      shiftsChannel.unsubscribe();
    };
  }, [restaurant, staff, fetchShifts]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString?.substring(0, 5);
  };

  const calculateShiftDuration = (start, end, breakMinutes = 0) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    const totalMinutes = (endTime - startTime) / 1000 / 60 - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const getTotalHours = () => {
    return shifts.reduce((total, shift) => {
      const startTime = new Date(`2000-01-01T${shift.shift_start}`);
      const endTime = new Date(`2000-01-01T${shift.shift_end}`);
      const minutes = (endTime - startTime) / 1000 / 60 - (shift.break_duration || 0);
      return total + (minutes / 60);
    }, 0).toFixed(1);
  };

  const groupShiftsByDate = () => {
    const grouped = {};
    shifts.forEach(shift => {
      if (!grouped[shift.date]) {
        grouped[shift.date] = [];
      }
      grouped[shift.date].push(shift);
    });
    return grouped;
  };

  if (!restaurant || !staff) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p>Loading...</p>
      </div>
    );
  }

  const groupedShifts = groupShiftsByDate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">My Rota</h1>
        <p className="text-slate-600">View your upcoming shifts and manage requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <p className="text-sm text-slate-600 mb-1">Upcoming Shifts</p>
          <p className="text-3xl font-bold text-[#6262bd]">{shifts.length}</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <p className="text-sm text-slate-600 mb-1">Total Hours</p>
          <p className="text-3xl font-bold text-slate-800">{getTotalHours()}h</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <p className="text-sm text-slate-600 mb-1">Next Shift</p>
          <p className="text-lg font-bold text-slate-800">
            {shifts.length > 0 ? formatDate(shifts[0].date) : 'None'}
          </p>
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <div className="mb-8">
        <ClockInOut staff={staff} restaurant={restaurant} />
      </div>

      {/* Work History */}
      <div className="mb-8">
        <WorkHistory staff={staff} restaurant={restaurant} />
      </div>

      {/* Upcoming Shifts Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Upcoming Shifts</h2>
        <p className="text-slate-600 text-sm mt-1">Your scheduled shifts for the selected period</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => {
            setRequestType('time_off');
            setShowRequestModal(true);
          }}
          className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
        >
          Request Time Off
        </button>
        <button
          onClick={() => {
            setRequestType('swap');
            setShowRequestModal(true);
          }}
          className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
        >
          Request Shift Swap
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'week'
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700'
            }`}
          >
            Next 7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'month'
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-700'
            }`}
          >
            Next 30 Days
          </button>
        </div>
      </div>

      {/* Shifts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your shifts...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-slate-600 mb-4">No shifts scheduled for the selected period</p>
          <p className="text-sm text-slate-500">Check back later or contact your manager</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedShifts).sort().map(date => (
            <div key={date} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b-2 border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">{formatDate(date)}</h3>
              </div>
              <div className="divide-y-2 divide-slate-100">
                {groupedShifts[date].map(shift => (
                  <div key={shift.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-[#6262bd]">
                            {formatTime(shift.shift_start)} - {formatTime(shift.shift_end)}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                            {shift.role_required}
                          </span>
                          {shift.department && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {shift.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>Duration: {calculateShiftDuration(shift.shift_start, shift.shift_end, shift.break_duration)}</span>
                          {shift.break_duration > 0 && (
                            <span>Break: {shift.break_duration} min</span>
                          )}
                        </div>
                        {shift.notes && (
                          <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                            📝 {shift.notes}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {shift.status === 'published' && (
                          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                            Confirmed
                          </span>
                        )}
                        {shift.status === 'draft' && (
                          <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Modal - Placeholder */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {requestType === 'time_off' ? 'Request Time Off' : 'Request Shift Swap'}
            </h3>
            <p className="text-slate-600 mb-6">Request functionality coming soon</p>
            <button
              onClick={() => setShowRequestModal(false)}
              className="w-full px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
