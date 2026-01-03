export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch various analytics data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const type = searchParams.get('type'); // 'labor_cost', 'coverage', 'staff_hours', 'attendance_summary'
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const staffId = searchParams.get('staff_id');
    const department = searchParams.get('department');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Analytics type is required' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'labor_cost':
        return await getLaborCostAnalytics(restaurantId, dateFrom, dateTo, department);

      case 'coverage':
        return await getCoverageAnalytics(restaurantId, dateFrom, dateTo);

      case 'staff_hours':
        return await getStaffHoursAnalytics(restaurantId, dateFrom, dateTo, staffId);

      case 'attendance_summary':
        return await getAttendanceSummary(restaurantId, dateFrom, dateTo, department);

      case 'overtime_report':
        return await getOvertimeReport(restaurantId, dateFrom, dateTo);

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Labor Cost Analytics
async function getLaborCostAnalytics(restaurantId, dateFrom, dateTo, department) {
  try {
    let query = supabase
      .from('labor_cost_summary')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (department) query = query.eq('department', department);

    query = query.order('date', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    // Calculate totals
    const totals = data.reduce((acc, day) => ({
      total_hours: acc.total_hours + (parseFloat(day.total_hours) || 0),
      regular_hours: acc.regular_hours + (parseFloat(day.regular_hours) || 0),
      overtime_hours: acc.overtime_hours + (parseFloat(day.overtime_hours) || 0),
      total_cost: acc.total_cost + (parseFloat(day.total_cost) || 0),
      overtime_cost: acc.overtime_cost + (parseFloat(day.overtime_cost) || 0),
      shifts_scheduled: acc.shifts_scheduled + (day.shifts_scheduled || 0),
      shifts_filled: acc.shifts_filled + (day.shifts_filled || 0),
      shifts_completed: acc.shifts_completed + (day.shifts_completed || 0),
      staff_late: acc.staff_late + (day.staff_late || 0),
      staff_absent: acc.staff_absent + (day.staff_absent || 0)
    }), {
      total_hours: 0,
      regular_hours: 0,
      overtime_hours: 0,
      total_cost: 0,
      overtime_cost: 0,
      shifts_scheduled: 0,
      shifts_filled: 0,
      shifts_completed: 0,
      staff_late: 0,
      staff_absent: 0
    });

    return NextResponse.json({
      daily_data: data,
      totals,
      average_cost_per_hour: totals.total_hours > 0 ? (totals.total_cost / totals.total_hours).toFixed(2) : 0
    });
  } catch (error) {
    throw error;
  }
}

// Coverage Analytics
async function getCoverageAnalytics(restaurantId, dateFrom, dateTo) {
  try {
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Date range is required for coverage analytics' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .rpc('get_shift_coverage', {
        p_restaurant_id: restaurantId,
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

    if (error) throw error;

    return NextResponse.json({ coverage: data });
  } catch (error) {
    throw error;
  }
}

// Staff Hours Analytics
async function getStaffHoursAnalytics(restaurantId, dateFrom, dateTo, staffId) {
  try {
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Date range is required for staff hours analytics' },
        { status: 400 }
      );
    }

    // Get all staff or specific staff
    let staffQuery = supabase
      .from('staff')
      .select('id, name, role, contract_hours, hourly_rate')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active');

    if (staffId) {
      staffQuery = staffQuery.eq('id', staffId);
    }

    const { data: staffList, error: staffError } = await staffQuery;
    if (staffError) throw staffError;

    // Calculate hours for each staff member
    const staffHours = await Promise.all(staffList.map(async (staff) => {
      // Get completed shifts
      const { data: shifts } = await supabase
        .from('shifts')
        .select('shift_start, shift_end, break_duration, date')
        .eq('staff_id', staff.id)
        .eq('status', 'completed')
        .gte('date', dateFrom)
        .lte('date', dateTo);

      // Calculate total hours
      let totalHours = 0;
      if (shifts) {
        totalHours = shifts.reduce((sum, shift) => {
          const start = new Date(`2000-01-01T${shift.shift_start}`);
          const end = new Date(`2000-01-01T${shift.shift_end}`);
          const minutes = (end - start) / 1000 / 60 - (shift.break_duration || 0);
          return sum + (minutes / 60);
        }, 0);
      }

      // Get overtime calculation
      const { data: overtime } = await supabase
        .rpc('calculate_overtime', {
          p_staff_id: staff.id,
          p_date_from: dateFrom,
          p_date_to: dateTo
        });

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        role: staff.role,
        contract_hours: staff.contract_hours,
        hourly_rate: staff.hourly_rate,
        total_hours: totalHours.toFixed(2),
        regular_hours: overtime && overtime.length > 0 ? overtime[0].regular_hours : totalHours,
        overtime_hours: overtime && overtime.length > 0 ? overtime[0].overtime_hours : 0,
        total_cost: overtime && overtime.length > 0 ?
          (parseFloat(overtime[0].regular_hours) * parseFloat(staff.hourly_rate || 0) +
           parseFloat(overtime[0].overtime_hours) * parseFloat(staff.hourly_rate || 0) * 1.5).toFixed(2) : 0,
        shifts_count: shifts ? shifts.length : 0
      };
    }));

    return NextResponse.json({ staff_hours: staffHours });
  } catch (error) {
    throw error;
  }
}

// Attendance Summary
async function getAttendanceSummary(restaurantId, dateFrom, dateTo, department) {
  try {
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Date range is required for attendance summary' },
        { status: 400 }
      );
    }

    // Get all attendance records
    let query = supabase
      .from('attendance')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          role,
          department
        ),
        shift:shift_id (
          id,
          date,
          department
        )
      `)
      .eq('restaurant_id', restaurantId);

    const { data: allAttendance } = await query;

    // Filter by date range and department
    const filteredAttendance = allAttendance?.filter(a => {
      if (!a.shift) return false;
      const date = a.shift.date;
      const matchesDate = date >= dateFrom && date <= dateTo;
      const matchesDept = !department || a.shift.department === department;
      return matchesDate && matchesDept;
    }) || [];

    // Calculate summary stats
    const summary = {
      total_attendance: filteredAttendance.length,
      present: filteredAttendance.filter(a => a.status === 'present').length,
      late: filteredAttendance.filter(a => a.status === 'late').length,
      absent: filteredAttendance.filter(a => a.status === 'absent').length,
      early_leave: filteredAttendance.filter(a => a.status === 'early_leave').length,
      scheduled: filteredAttendance.filter(a => a.status === 'scheduled').length,
      on_time_percentage: 0,
      late_percentage: 0,
      absent_percentage: 0
    };

    const completed = summary.present + summary.late + summary.early_leave;
    if (completed > 0) {
      summary.on_time_percentage = ((summary.present / completed) * 100).toFixed(1);
      summary.late_percentage = ((summary.late / completed) * 100).toFixed(1);
    }

    if (summary.total_attendance > 0) {
      summary.absent_percentage = ((summary.absent / summary.total_attendance) * 100).toFixed(1);
    }

    // Group by staff
    const staffSummary = {};
    filteredAttendance.forEach(a => {
      if (!a.staff) return;

      if (!staffSummary[a.staff.id]) {
        staffSummary[a.staff.id] = {
          staff_id: a.staff.id,
          staff_name: a.staff.name,
          role: a.staff.role,
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          early_leave: 0
        };
      }

      staffSummary[a.staff.id].total++;
      staffSummary[a.staff.id][a.status]++;
    });

    return NextResponse.json({
      summary,
      by_staff: Object.values(staffSummary),
      details: filteredAttendance
    });
  } catch (error) {
    throw error;
  }
}

// Overtime Report
async function getOvertimeReport(restaurantId, dateFrom, dateTo) {
  try {
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Date range is required for overtime report' },
        { status: 400 }
      );
    }

    const { data: staffList } = await supabase
      .from('staff')
      .select('id, name, role, contract_hours, hourly_rate')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active');

    const overtimeData = await Promise.all(staffList.map(async (staff) => {
      const { data: overtime } = await supabase
        .rpc('calculate_overtime', {
          p_staff_id: staff.id,
          p_date_from: dateFrom,
          p_date_to: dateTo
        });

      if (overtime && overtime.length > 0 && overtime[0].overtime_hours > 0) {
        return {
          staff_id: staff.id,
          staff_name: staff.name,
          role: staff.role,
          contract_hours: staff.contract_hours,
          hourly_rate: staff.hourly_rate,
          total_hours: overtime[0].total_hours,
          regular_hours: overtime[0].regular_hours,
          overtime_hours: overtime[0].overtime_hours,
          overtime_cost: (parseFloat(overtime[0].overtime_hours) * parseFloat(staff.hourly_rate || 0) * 1.5).toFixed(2),
          weekly_breakdown: overtime[0].weekly_breakdown
        };
      }
      return null;
    }));

    const filteredData = overtimeData.filter(d => d !== null);

    const totalOvertimeCost = filteredData.reduce((sum, d) =>
      sum + parseFloat(d.overtime_cost || 0), 0
    );

    return NextResponse.json({
      staff_overtime: filteredData,
      total_overtime_cost: totalOvertimeCost.toFixed(2)
    });
  } catch (error) {
    throw error;
  }
}
