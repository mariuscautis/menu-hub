'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LaborAnalyticsPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week'); // 'week', 'month', 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalHours: 0,
    totalCost: 0,
    scheduledHours: 0,
    actualHours: 0,
    overtimeHours: 0,
    staffCount: 0,
    avgHoursPerStaff: 0,
    costPerHour: 0,
    departmentBreakdown: [],
    dailyBreakdown: [],
    staffPerformance: []
  });

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      setLoading(false);
      return;
    }

    let restaurantData = null;

    // Check for staff session (PIN login)
    const staffSessionData = localStorage.getItem('staff_session');
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData);
        restaurantData = staffSession.restaurant;
      } catch (err) {
        console.error('Error parsing staff session:', err);
        localStorage.removeItem('staff_session');
      }
    }

    if (!restaurantData) {
      // Check if owner - fetch restaurant
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (restaurants) {
        restaurantData = restaurants;
      }
    }

    if (restaurantData) {
      setRestaurant(restaurantData);
    } else {
      console.error('No restaurant found for this user');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      fetchAnalytics();
    }
  }, [restaurant, dateRange, customDateFrom, customDateTo]);

  const getDateRange = () => {
    const today = new Date();
    let dateFrom, dateTo;

    if (dateRange === 'week') {
      dateFrom = new Date(today);
      dateFrom.setDate(today.getDate() - 7);
      dateTo = today;
    } else if (dateRange === 'month') {
      dateFrom = new Date(today);
      dateFrom.setDate(today.getDate() - 30);
      dateTo = today;
    } else if (dateRange === 'custom' && customDateFrom && customDateTo) {
      dateFrom = new Date(customDateFrom);
      dateTo = new Date(customDateTo);
    } else {
      return null;
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0]
    };
  };

  const fetchAnalytics = async () => {
    if (!restaurant) return;

    const dates = getDateRange();
    if (!dates) return;

    setLoading(true);

    try {
      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            role,
            department,
            hourly_rate
          ),
          shift:shift_id (
            id,
            date,
            shift_start,
            shift_end,
            break_duration,
            department,
            role_required
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', dates.dateFrom)
        .lte('created_at', dates.dateTo)
        .not('clock_in', 'is', null);

      // Fetch shifts (for scheduled hours)
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select(`
          *,
          staff:staff_id (
            id,
            name,
            role,
            department,
            hourly_rate
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .gte('date', dates.dateFrom)
        .lte('date', dates.dateTo)
        .eq('status', 'published');

      processAnalytics(attendanceData || [], shiftsData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }

    setLoading(false);
  };

  const processAnalytics = (attendance, shifts) => {
    // Calculate total scheduled hours
    const scheduledHours = shifts.reduce((total, shift) => {
      const start = new Date(`2000-01-01T${shift.shift_start}`);
      const end = new Date(`2000-01-01T${shift.shift_end}`);
      const hours = (end - start) / (1000 * 60 * 60) - (shift.break_duration || 0) / 60;
      return total + hours;
    }, 0);

    // Calculate actual hours worked
    let totalActualHours = 0;
    let totalCost = 0;
    const staffHours = {};
    const departmentHours = {};
    const dailyHours = {};

    attendance.forEach(record => {
      if (!record.clock_in || !record.clock_out) return;

      const clockIn = new Date(record.clock_in);
      const clockOut = new Date(record.clock_out);
      let hours = (clockOut - clockIn) / (1000 * 60 * 60);

      // Subtract break time
      if (record.break_start && record.break_end) {
        const breakStart = new Date(record.break_start);
        const breakEnd = new Date(record.break_end);
        const breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
        hours -= breakHours;
      }

      totalActualHours += hours;

      // Calculate cost
      const hourlyRate = record.staff?.hourly_rate || 12; // Default minimum wage
      const cost = hours * hourlyRate;
      totalCost += cost;

      // Track by staff
      if (!staffHours[record.staff_id]) {
        staffHours[record.staff_id] = {
          staff: record.staff,
          hours: 0,
          cost: 0,
          shifts: 0
        };
      }
      staffHours[record.staff_id].hours += hours;
      staffHours[record.staff_id].cost += cost;
      staffHours[record.staff_id].shifts += 1;

      // Track by department
      const dept = record.shift?.department || 'universal';
      if (!departmentHours[dept]) {
        departmentHours[dept] = { hours: 0, cost: 0 };
      }
      departmentHours[dept].hours += hours;
      departmentHours[dept].cost += cost;

      // Track by day
      const day = record.shift?.date || clockIn.toISOString().split('T')[0];
      if (!dailyHours[day]) {
        dailyHours[day] = { hours: 0, cost: 0, shifts: 0 };
      }
      dailyHours[day].hours += hours;
      dailyHours[day].cost += cost;
      dailyHours[day].shifts += 1;
    });

    // Calculate overtime (hours over 40 per week per staff)
    let overtimeHours = 0;
    Object.values(staffHours).forEach(staff => {
      if (dateRange === 'week' && staff.hours > 40) {
        overtimeHours += staff.hours - 40;
      }
    });

    // Prepare staff performance array
    const staffPerformance = Object.values(staffHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10 staff

    // Prepare department breakdown
    const departmentBreakdown = Object.entries(departmentHours).map(([dept, data]) => ({
      department: dept,
      hours: data.hours,
      cost: data.cost
    }));

    // Prepare daily breakdown
    const dailyBreakdown = Object.entries(dailyHours)
      .map(([date, data]) => ({
        date,
        hours: data.hours,
        cost: data.cost,
        shifts: data.shifts
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setAnalytics({
      totalHours: totalActualHours,
      totalCost,
      scheduledHours,
      actualHours: totalActualHours,
      overtimeHours,
      staffCount: Object.keys(staffHours).length,
      avgHoursPerStaff: Object.keys(staffHours).length > 0
        ? totalActualHours / Object.keys(staffHours).length
        : 0,
      costPerHour: totalActualHours > 0 ? totalCost / totalActualHours : 0,
      departmentBreakdown,
      dailyBreakdown,
      staffPerformance
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(1)}h`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p>Loading restaurant data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Labor Analytics</h1>
        <p className="text-slate-600">Track labor costs, hours worked, and staff performance</p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-8 bg-white border-2 border-slate-100 rounded-2xl p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('week')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                dateRange === 'week'
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                dateRange === 'custom'
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-3 items-center">
              <div>
                <label className="block text-xs text-slate-600 mb-1">From</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">To</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-1">Total Labor Cost</p>
              <p className="text-3xl font-bold text-[#6262bd]">{formatCurrency(analytics.totalCost)}</p>
              <p className="text-xs text-slate-500 mt-2">
                {formatCurrency(analytics.costPerHour)}/hour average
              </p>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-1">Hours Worked</p>
              <p className="text-3xl font-bold text-slate-800">{formatHours(analytics.actualHours)}</p>
              <p className="text-xs text-slate-500 mt-2">
                Scheduled: {formatHours(analytics.scheduledHours)}
              </p>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-1">Active Staff</p>
              <p className="text-3xl font-bold text-slate-800">{analytics.staffCount}</p>
              <p className="text-xs text-slate-500 mt-2">
                {formatHours(analytics.avgHoursPerStaff)} average per staff
              </p>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <p className="text-sm text-slate-600 mb-1">Overtime Hours</p>
              <p className="text-3xl font-bold text-orange-600">{formatHours(analytics.overtimeHours)}</p>
              <p className="text-xs text-slate-500 mt-2">
                {analytics.actualHours > 0
                  ? `${((analytics.overtimeHours / analytics.actualHours) * 100).toFixed(1)}% of total`
                  : '0% of total'
                }
              </p>
            </div>
          </div>

          {/* Department Breakdown */}
          {analytics.departmentBreakdown.length > 0 && (
            <div className="mb-8 bg-white border-2 border-slate-100 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Department Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.departmentBreakdown.map(dept => (
                  <div key={dept.department} className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-2 capitalize">
                      {dept.department}
                    </p>
                    <p className="text-2xl font-bold text-[#6262bd] mb-1">
                      {formatCurrency(dept.cost)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatHours(dept.hours)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Breakdown */}
          {analytics.dailyBreakdown.length > 0 && (
            <div className="mb-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Daily Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Shifts</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Hours</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dailyBreakdown.map(day => (
                      <tr key={day.date} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">{formatDate(day.date)}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-right">{day.shifts}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-right">
                          {formatHours(day.hours)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-[#6262bd] dark:text-[#8b8bdb] text-right">
                          {formatCurrency(day.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">Total</td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                        {analytics.dailyBreakdown.reduce((sum, day) => sum + day.shifts, 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                        {formatHours(analytics.dailyBreakdown.reduce((sum, day) => sum + day.hours, 0))}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#6262bd] dark:text-[#8b8bdb] text-right">
                        {formatCurrency(analytics.dailyBreakdown.reduce((sum, day) => sum + day.cost, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Staff Performance */}
          {analytics.staffPerformance.length > 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Top Performing Staff</h2>
              <div className="space-y-3">
                {analytics.staffPerformance.map((staff, index) => (
                  <div
                    key={staff.staff.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-[#6262bd] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{staff.staff.name}</p>
                        <p className="text-sm text-slate-600">{staff.staff.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#6262bd]">{formatHours(staff.hours)}</p>
                      <p className="text-sm text-slate-600">{staff.shifts} shifts</p>
                      <p className="text-xs text-slate-500">{formatCurrency(staff.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Data State */}
          {analytics.dailyBreakdown.length === 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <p className="text-slate-600 mb-2">No labor data found for the selected period</p>
              <p className="text-sm text-slate-500">
                Make sure staff are clocking in and out for their shifts
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
