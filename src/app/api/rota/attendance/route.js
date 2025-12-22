import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch attendance records with filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const staffId = searchParams.get('staff_id');
    const shiftId = searchParams.get('shift_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const status = searchParams.get('status');
    const activeOnly = searchParams.get('active_only') === 'true'; // Filter for active attendance (not clocked out)

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

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
          shift_start,
          shift_end,
          role_required,
          department
        )
      `)
      .eq('restaurant_id', restaurantId);

    // Apply filters
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (activeOnly) {
      query = query.is('clock_out', null);
    }

    // Date filtering via shift relationship
    if (dateFrom || dateTo) {
      let shiftQuery = supabase
        .from('shifts')
        .select('id')
        .eq('restaurant_id', restaurantId);

      if (dateFrom) shiftQuery = shiftQuery.gte('date', dateFrom);
      if (dateTo) shiftQuery = shiftQuery.lte('date', dateTo);

      const { data: shifts } = await shiftQuery;
      if (shifts) {
        const shiftIds = shifts.map(s => s.id);
        query = query.in('shift_id', shiftIds);
      }
    }

    query = query.order('clock_in', { ascending: false, nullsFirst: false })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Attendance query error:', error);
      throw error;
    }

    // Debug logging
    console.log('Attendance GET request:', {
      restaurantId,
      staffId,
      shiftId,
      activeOnly,
      resultCount: data?.length || 0
    });

    // Extra debugging when no results found but filters applied
    if (data?.length === 0 && (staffId || shiftId)) {
      console.log('⚠️ No results with filters. Checking all records for this restaurant...');
      const { data: allData } = await supabase
        .from('attendance')
        .select('id, staff_id, shift_id, clock_in, clock_out')
        .eq('restaurant_id', restaurantId)
        .limit(10);

      console.log('All attendance records (up to 10):', allData);

      if (shiftId) {
        const recordsForShift = allData?.filter(r => r.shift_id === shiftId);
        console.log(`Records for shift ${shiftId}:`, recordsForShift);
      }

      if (staffId) {
        const recordsForStaff = allData?.filter(r => r.staff_id === staffId);
        console.log(`Records for staff ${staffId}:`, recordsForStaff);
      }
    }

    return NextResponse.json({ attendance: data });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Clock in/out or create attendance record
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      staff_id,
      shift_id,
      action, // 'clock_in', 'clock_out', 'break_start', 'break_end', or 'create'
      scheduled_start,
      scheduled_end,
      notes
    } = body;

    if (!restaurant_id || !staff_id || !shift_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify shift exists and belongs to this staff member
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shift_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    if (shift.staff_id !== staff_id) {
      return NextResponse.json(
        { error: 'This shift is not assigned to you' },
        { status: 403 }
      );
    }

    // Get or create attendance record
    let { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('shift_id', shift_id)
      .eq('staff_id', staff_id)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!attendance) {
      // Create new attendance record
      const { data: shift } = await supabase
        .from('shifts')
        .select('shift_start, shift_end, date')
        .eq('id', shift_id)
        .single();

      const insertData = {
        restaurant_id,
        staff_id,
        shift_id,
        scheduled_start: scheduled_start || shift?.shift_start,
        scheduled_end: scheduled_end || shift?.shift_end,
        status: 'scheduled'
      };

      if (action === 'clock_in') {
        insertData.clock_in = now;
        insertData.status = 'present';

        // Check if late (more than 5 minutes after scheduled start)
        if (shift) {
          const scheduledDateTime = new Date(`${shift.date}T${shift.shift_start}`);
          const clockInTime = new Date(now);
          const minutesLate = (clockInTime - scheduledDateTime) / 1000 / 60;

          if (minutesLate > 5) {
            insertData.status = 'late';
          }
        }
      }

      const { data: newAttendance, error } = await supabase
        .from('attendance')
        .insert(insertData)
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
            shift_start,
            shift_end,
            role_required,
            department
          )
        `)
        .single();

      if (error) {
        console.error('Error creating attendance record:', error);
        throw error;
      }

      console.log('✅ Created new attendance record:', {
        id: newAttendance.id,
        shift_id: newAttendance.shift_id,
        staff_id: newAttendance.staff_id,
        clock_in: newAttendance.clock_in,
        clock_out: newAttendance.clock_out
      });

      return NextResponse.json({ attendance: newAttendance }, { status: 201 });
    }

    // Update existing attendance record
    const updateData = { updated_at: now };

    if (action === 'clock_in') {
      // Allow re-clocking-in after clocking out
      updateData.clock_in = now;
      updateData.clock_out = null; // Clear previous clock_out if re-clocking-in
      updateData.status = 'present';

      // Check if late
      const { data: shift } = await supabase
        .from('shifts')
        .select('date, shift_start')
        .eq('id', shift_id)
        .single();

      if (shift) {
        const scheduledDateTime = new Date(`${shift.date}T${shift.shift_start}`);
        const clockInTime = new Date(now);
        const minutesLate = (clockInTime - scheduledDateTime) / 1000 / 60;

        if (minutesLate > 5) {
          updateData.status = 'late';
        }
      }
    } else if (action === 'clock_out' && !attendance.clock_out) {
      updateData.clock_out = now;

      // Check if early leave
      const { data: shift } = await supabase
        .from('shifts')
        .select('date, shift_end')
        .eq('id', shift_id)
        .single();

      if (shift) {
        const scheduledDateTime = new Date(`${shift.date}T${shift.shift_end}`);
        const clockOutTime = new Date(now);
        const minutesEarly = (scheduledDateTime - clockOutTime) / 1000 / 60;

        if (minutesEarly > 5) {
          updateData.status = 'early_leave';
        }
      }
    } else if (action === 'break_start' && !attendance.break_start) {
      updateData.break_start = now;
    } else if (action === 'break_end' && !attendance.break_end) {
      updateData.break_end = now;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: updatedAttendance, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', attendance.id)
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
          shift_start,
          shift_end,
          role_required,
          department
        )
      `)
      .single();

    if (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }

    console.log('✅ Updated attendance record:', {
      id: updatedAttendance.id,
      shift_id: updatedAttendance.shift_id,
      staff_id: updatedAttendance.staff_id,
      action: action,
      clock_in: updatedAttendance.clock_in,
      clock_out: updatedAttendance.clock_out
    });

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error('Error managing attendance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update attendance record (manual corrections)
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      clock_in,
      clock_out,
      break_start,
      break_end,
      status,
      notes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    // Get existing attendance record for validation
    const { data: existingAttendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Validate clock_out is after clock_in
    if (clock_out !== undefined) {
      const finalClockIn = clock_in || existingAttendance.clock_in;
      if (!finalClockIn) {
        return NextResponse.json(
          { error: 'Cannot clock out without clocking in first' },
          { status: 400 }
        );
      }
      if (new Date(clock_out) <= new Date(finalClockIn)) {
        return NextResponse.json(
          { error: 'Clock out time must be after clock in time' },
          { status: 400 }
        );
      }
      updateData.clock_out = clock_out;
    }

    // Validate break times
    if (break_start !== undefined) {
      const finalClockIn = clock_in || existingAttendance.clock_in;
      if (!finalClockIn) {
        return NextResponse.json(
          { error: 'Cannot start break without clocking in first' },
          { status: 400 }
        );
      }
      if (existingAttendance.break_start && !existingAttendance.break_end) {
        return NextResponse.json(
          { error: 'Already on break. Please end current break first' },
          { status: 400 }
        );
      }
      updateData.break_start = break_start;
    }

    if (break_end !== undefined) {
      const finalBreakStart = break_start || existingAttendance.break_start;
      if (!finalBreakStart) {
        return NextResponse.json(
          { error: 'Cannot end break without starting break first' },
          { status: 400 }
        );
      }
      if (new Date(break_end) <= new Date(finalBreakStart)) {
        return NextResponse.json(
          { error: 'Break end time must be after break start time' },
          { status: 400 }
        );
      }
      updateData.break_end = break_end;
    }

    // Validate status
    const validStatuses = ['scheduled', 'present', 'late', 'absent', 'early_leave', 'completed'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (clock_in !== undefined) updateData.clock_in = clock_in;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data: attendance, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', id)
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
          shift_start,
          shift_end,
          role_required,
          department
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete attendance record
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
