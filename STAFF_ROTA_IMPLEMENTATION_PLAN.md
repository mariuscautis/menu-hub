# Staff Rota & Scheduling System - Implementation Plan

## Executive Summary

This plan outlines the implementation of a comprehensive Staff Rota & Scheduling system for Menu Hub, building on existing infrastructure (staff management, authentication, real-time updates, and analytics).

**Estimated Timeline**: 4-6 weeks
**Complexity**: High
**Dependencies**: Existing staff table, Supabase real-time, authentication system

---

## Phase 1: Database Foundation (Week 1)

### 1.1 Database Schema Design

Create SQL migration file: `ADD_STAFF_ROTA_TABLES.sql`

```sql
-- Staff profiles extension (add to existing staff table)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS contract_hours DECIMAL(5,2) DEFAULT 40.00,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  role_required VARCHAR(50) NOT NULL, -- 'waiter', 'bartender', 'kitchen', 'manager'
  department VARCHAR(20) CHECK (department IN ('kitchen', 'bar', 'universal')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  notes TEXT,
  break_duration INTEGER DEFAULT 30, -- minutes
  is_template BOOLEAN DEFAULT FALSE,
  template_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shifts_restaurant_date ON shifts(restaurant_id, date);
CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, date);
CREATE INDEX idx_shifts_status ON shifts(restaurant_id, status);

-- Shift requests (swaps, time-off, cover)
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('time_off', 'swap', 'cover')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- For time-off requests
  date_from DATE,
  date_to DATE,
  reason TEXT,

  -- For shift swaps
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  swap_with_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  swap_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  -- Approval
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shift_requests_restaurant ON shift_requests(restaurant_id, status);
CREATE INDEX idx_shift_requests_staff ON shift_requests(staff_id, status);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  scheduled_start TIME,
  scheduled_end TIME,
  break_start TIMESTAMP,
  break_end TIMESTAMP,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'late', 'absent', 'early_leave')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_restaurant ON attendance(restaurant_id);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, clock_in);
CREATE INDEX idx_attendance_shift ON attendance(shift_id);

-- Shift templates for quick scheduling
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday, NULL=any
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  role_required VARCHAR(50) NOT NULL,
  department VARCHAR(20),
  break_duration INTEGER DEFAULT 30,
  staff_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shift_templates_restaurant ON shift_templates(restaurant_id);

COMMENT ON TABLE shifts IS 'Staff shift scheduling';
COMMENT ON TABLE shift_requests IS 'Time-off, swap, and cover requests';
COMMENT ON TABLE attendance IS 'Clock-in/out tracking and attendance records';
COMMENT ON TABLE shift_templates IS 'Reusable shift templates for quick scheduling';
```

### 1.2 RLS Policies

```sql
-- Shifts RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can manage shifts"
  ON shifts FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shifts.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

CREATE POLICY "Staff can view their own shifts"
  ON shifts FOR SELECT TO public
  USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Shift requests RLS
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their own requests"
  ON shift_requests FOR ALL TO public
  USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Managers can view and approve requests"
  ON shift_requests FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_requests.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Attendance RLS (similar pattern)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their own attendance"
  ON attendance FOR ALL TO public
  USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Managers can view all attendance"
  ON attendance FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = attendance.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Shift templates RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can manage templates"
  ON shift_templates FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_templates.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );
```

### 1.3 Helper Functions

```sql
-- Calculate shift hours
CREATE OR REPLACE FUNCTION calculate_shift_hours(
  p_shift_start TIME,
  p_shift_end TIME,
  p_break_duration INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  total_minutes INTEGER;
  work_hours DECIMAL;
BEGIN
  -- Calculate minutes between start and end
  total_minutes := EXTRACT(EPOCH FROM (p_shift_end - p_shift_start)) / 60;

  -- Subtract break time
  total_minutes := total_minutes - COALESCE(p_break_duration, 0);

  -- Convert to hours
  work_hours := total_minutes / 60.0;

  RETURN GREATEST(work_hours, 0);
END;
$$ LANGUAGE plpgsql;

-- Check for shift conflicts
CREATE OR REPLACE FUNCTION check_shift_conflict(
  p_staff_id UUID,
  p_date DATE,
  p_shift_start TIME,
  p_shift_end TIME,
  p_exclude_shift_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM shifts
  WHERE staff_id = p_staff_id
    AND date = p_date
    AND status NOT IN ('cancelled')
    AND (p_exclude_shift_id IS NULL OR id != p_exclude_shift_id)
    AND (
      (p_shift_start >= shift_start AND p_shift_start < shift_end) OR
      (p_shift_end > shift_start AND p_shift_end <= shift_end) OR
      (p_shift_start <= shift_start AND p_shift_end >= shift_end)
    );

  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Get staff weekly hours
CREATE OR REPLACE FUNCTION get_staff_weekly_hours(
  p_staff_id UUID,
  p_week_start DATE
)
RETURNS DECIMAL AS $$
DECLARE
  total_hours DECIMAL;
BEGIN
  SELECT COALESCE(SUM(
    calculate_shift_hours(shift_start, shift_end, break_duration)
  ), 0)
  INTO total_hours
  FROM shifts
  WHERE staff_id = p_staff_id
    AND date >= p_week_start
    AND date < p_week_start + INTERVAL '7 days'
    AND status NOT IN ('cancelled');

  RETURN total_hours;
END;
$$ LANGUAGE plpgsql;
```

### 1.4 Deliverables
- ✅ SQL migration file
- ✅ RLS policies configured
- ✅ Helper functions created
- ✅ Database indexes optimized

---

## Phase 2: API Routes (Week 1-2)

### 2.1 Shift Management API

**File**: `/src/app/api/rota/shifts/route.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Fetch shifts
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('shifts')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          email,
          department,
          role
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: true })
      .order('shift_start', { ascending: true });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (staffId) query = query.eq('staff_id', staffId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, shifts: data });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

// POST - Create shift
export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantId, staffId, date, shiftStart, shiftEnd, roleRequired, department, notes, breakDuration } = body;

    // Validation
    if (!restaurantId || !date || !shiftStart || !shiftEnd || !roleRequired) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for conflicts if staff assigned
    if (staffId) {
      const { data: hasConflict } = await supabaseAdmin
        .rpc('check_shift_conflict', {
          p_staff_id: staffId,
          p_date: date,
          p_shift_start: shiftStart,
          p_shift_end: shiftEnd
        });

      if (hasConflict) {
        return NextResponse.json({ error: 'Staff member already has a shift at this time' }, { status: 409 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .insert({
        restaurant_id: restaurantId,
        staff_id: staffId || null,
        date,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        role_required: roleRequired,
        department: department || null,
        notes: notes || null,
        break_duration: breakDuration || 30,
        status: 'draft'
      })
      .select(`
        *,
        staff:staff_id (id, name, department)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, shift: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}

// PUT - Update shift
export async function PUT(request) {
  try {
    const body = await request.json();
    const { shiftId, staffId, shiftStart, shiftEnd, notes, status } = body;

    if (!shiftId) {
      return NextResponse.json({ error: 'Shift ID required' }, { status: 400 });
    }

    const updates = {};
    if (staffId !== undefined) updates.staff_id = staffId;
    if (shiftStart) updates.shift_start = shiftStart;
    if (shiftEnd) updates.shift_end = shiftEnd;
    if (notes !== undefined) updates.notes = notes;
    if (status) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .update(updates)
      .eq('id', shiftId)
      .select(`
        *,
        staff:staff_id (id, name, department)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, shift: data });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}

// DELETE - Delete shift
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'Shift ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Shift deleted' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
```

### 2.2 Additional API Routes to Create

1. **`/api/rota/requests/route.js`** - Shift requests (time-off, swaps, cover)
2. **`/api/rota/attendance/route.js`** - Clock in/out tracking
3. **`/api/rota/templates/route.js`** - Shift templates management
4. **`/api/rota/bulk-assign/route.js`** - Bulk shift assignment
5. **`/api/rota/publish/route.js`** - Publish rota to staff
6. **`/api/rota/analytics/route.js`** - Labor cost, overtime, coverage analytics

### 2.3 Deliverables
- ✅ CRUD API routes for shifts
- ✅ Shift request management API
- ✅ Attendance tracking API
- ✅ Template management API
- ✅ Bulk operations API
- ✅ Analytics API

---

## Phase 3: Manager Calendar View (Week 2-3)

### 3.1 Install Dependencies

```bash
npm install react-big-calendar@1.15.0 moment@2.30.1 date-fns@4.1.0
```

### 3.2 Main Rota Page Component

**File**: `/src/app/dashboard/rota/page.js`

```javascript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '@/lib/supabase';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function StaffRotaPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState('week'); // week, month, day
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Fetch restaurant and initial data
  useEffect(() => {
    fetchRestaurantAndData();
  }, []);

  const fetchRestaurantAndData = async () => {
    try {
      // Get current user's restaurant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!ownedRestaurant) return;

      setRestaurant(ownedRestaurant);
      await Promise.all([
        fetchStaff(ownedRestaurant.id),
        fetchShifts(ownedRestaurant.id)
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async (restaurantId) => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .order('name');

    if (!error) setStaff(data || []);
  };

  const fetchShifts = async (restaurantId) => {
    // Fetch shifts for current view period
    const startDate = moment(viewDate).startOf(view).format('YYYY-MM-DD');
    const endDate = moment(viewDate).endOf(view).format('YYYY-MM-DD');

    const response = await fetch(
      `/api/rota/shifts?restaurantId=${restaurantId}&startDate=${startDate}&endDate=${endDate}`
    );
    const result = await response.json();

    if (result.success) {
      setShifts(result.shifts);
    }
  };

  // Transform shifts for calendar
  const calendarEvents = useMemo(() => {
    return shifts.map(shift => ({
      id: shift.id,
      title: shift.staff?.name || `${shift.role_required} (Unassigned)`,
      start: new Date(`${shift.date}T${shift.shift_start}`),
      end: new Date(`${shift.date}T${shift.shift_end}`),
      resource: shift,
      allDay: false
    }));
  }, [shifts]);

  // Handle shift selection
  const handleSelectEvent = (event) => {
    setSelectedShift(event.resource);
    setShowShiftModal(true);
  };

  // Handle slot selection (create new shift)
  const handleSelectSlot = ({ start }) => {
    setSelectedShift({
      date: moment(start).format('YYYY-MM-DD'),
      shift_start: moment(start).format('HH:mm'),
      shift_end: moment(start).add(8, 'hours').format('HH:mm'),
      staff_id: null,
      role_required: 'waiter',
      department: 'universal'
    });
    setShowShiftModal(true);
  };

  // Event styling
  const eventStyleGetter = (event) => {
    const shift = event.resource;
    let backgroundColor = '#6262bd';

    if (shift.status === 'draft') backgroundColor = '#94a3b8';
    else if (shift.status === 'published') backgroundColor = '#6262bd';
    else if (shift.status === 'completed') backgroundColor = '#10b981';
    else if (shift.status === 'cancelled') backgroundColor = '#ef4444';

    if (!shift.staff_id) backgroundColor = '#f59e0b';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
  };

  // Real-time updates
  useEffect(() => {
    if (!restaurant) return;

    const channel = supabase
      .channel(`rota-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shifts',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetchShifts(restaurant.id);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [restaurant]);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading rota...</div>;
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Staff Rota</h1>
          <p className="text-slate-500 mt-1">
            Manage staff schedules and shifts
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRequestsModal(true)}
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
          >
            Requests (3)
          </button>
          <button
            onClick={() => setShowShiftModal(true)}
            className="px-4 py-2 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3]"
          >
            + Create Shift
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-6" style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={viewDate}
          onNavigate={setViewDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          step={30}
          timeslots={2}
          defaultView="week"
          min={new Date(2000, 1, 1, 6, 0, 0)} // 6 AM
          max={new Date(2000, 1, 1, 23, 59, 59)} // Midnight
        />
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <ShiftModal
          shift={selectedShift}
          staff={staff}
          restaurantId={restaurant.id}
          onClose={() => {
            setShowShiftModal(false);
            setSelectedShift(null);
          }}
          onSave={() => {
            fetchShifts(restaurant.id);
            setShowShiftModal(false);
          }}
        />
      )}

      {/* Requests Modal */}
      {showRequestsModal && (
        <RequestsModal
          restaurantId={restaurant.id}
          onClose={() => setShowRequestsModal(false)}
        />
      )}
    </div>
  );
}
```

### 3.3 Supporting Components

Create these components:
1. **`ShiftModal.js`** - Create/edit shift form
2. **`RequestsModal.js`** - View and approve/reject requests
3. **`StaffAvailabilityModal.js`** - View staff availability
4. **`BulkAssignModal.js`** - Bulk assign shifts
5. **`TemplateModal.js`** - Create shift templates
6. **`PublishRotaModal.js`** - Publish rota confirmation

### 3.4 Deliverables
- ✅ Calendar view with react-big-calendar
- ✅ Shift creation/editing modals
- ✅ Drag-and-drop shift assignment
- ✅ Color-coded shift statuses
- ✅ Real-time updates
- ✅ Responsive design

---

## Phase 4: Staff Features (Week 3-4)

### 4.1 Staff Rota View

**File**: `/src/app/dashboard/my-rota/page.js`

Mobile-optimized view for staff to:
- View upcoming shifts (list view)
- See shift details (time, location, role)
- Request time off
- Offer shift swaps
- Clock in/out

### 4.2 Availability Management

**File**: `/src/app/dashboard/my-availability/page.js`

- Set recurring weekly availability
- Mark one-off unavailability (vacations, appointments)
- View availability calendar
- Notification preferences

### 4.3 Time-Off Requests

Component within staff rota view:
- Date range picker
- Reason text input
- Status tracking (pending/approved/rejected)
- Notification on approval/rejection

### 4.4 Clock In/Out

**File**: `/src/components/ClockInOut.js`

- Quick action button
- GPS verification (optional)
- Break management
- Total hours display
- Integration with attendance table

### 4.5 Deliverables
- ✅ Staff-facing rota view (mobile-first)
- ✅ Availability management
- ✅ Time-off request system
- ✅ Clock in/out functionality
- ✅ Shift swap interface

---

## Phase 5: Business Logic & Validations (Week 4)

### 5.1 Conflict Prevention

Implement in API routes:
- **Double-booking check**: Prevent staff from having overlapping shifts
- **Rest period enforcement**: 11-hour minimum rest between shifts
- **Maximum hours**: Weekly hour limits based on contract
- **Availability check**: Warn when assigning shifts outside availability

### 5.2 Labor Cost Tracking

Create analytics API route:
- Calculate shift costs (hours × hourly_rate)
- Track overtime (hours over contract)
- Daily/weekly/monthly labor cost summaries
- Compare labor cost to revenue (labor cost percentage)

### 5.3 Overtime Calculation

Function to calculate overtime:
```javascript
function calculateOvertime(staffId, weekStart) {
  const contractHours = staff.contract_hours;
  const actualHours = getWeeklyHours(staffId, weekStart);
  const overtime = Math.max(0, actualHours - contractHours);
  const overtimeRate = staff.hourly_rate * 1.5; // 1.5x for overtime
  return {
    overtimeHours: overtime,
    overtimeCost: overtime * overtimeRate
  };
}
```

### 5.4 Coverage Analysis

Identify understaffed shifts:
- Compare required staff vs. assigned staff by role/department
- Highlight gaps in coverage
- Suggest available staff for unassigned shifts

### 5.5 Smart Suggestions

**API Route**: `/api/rota/suggest-staff`

Suggest staff based on:
- Availability
- Department match
- Skill/role match
- Hours worked (balance workload)
- Previous shift patterns

### 5.6 Deliverables
- ✅ Conflict prevention logic
- ✅ Labor cost tracking
- ✅ Overtime calculations
- ✅ Coverage analysis
- ✅ Staff suggestion algorithm

---

## Phase 6: Analytics & Reports (Week 5)

### 6.1 Labor Analytics Dashboard

**File**: `/src/app/dashboard/analytics/labor/page.js`

Charts to create:
- **Labor Cost Trend**: Line chart showing daily labor costs
- **Labor vs Revenue**: Comparison chart (labor cost %)
- **Staff Utilization**: Bar chart of hours worked by staff member
- **Overtime Breakdown**: Pie chart of overtime by department
- **Coverage Heatmap**: Visual representation of shift coverage

### 6.2 Attendance Reports

- Punctuality tracking (on-time vs late)
- Absence rate by staff member
- Unplanned absences
- Average hours worked per week

### 6.3 Shift Reports

- Shifts created vs filled
- Average shift length
- Peak shift times
- Department distribution

### 6.4 Integration with Sales Analytics

Link labor data with sales:
- Labor cost as % of revenue by day/week
- Optimal staffing during peak sales hours
- Predictive staffing based on expected revenue

### 6.5 Deliverables
- ✅ Labor analytics dashboard
- ✅ Attendance reports
- ✅ Shift utilization reports
- ✅ Integration with sales data
- ✅ Export to CSV/PDF

---

## Phase 7: Advanced Features (Week 6)

### 7.1 Shift Templates

Quick scheduling with templates:
- "Monday Morning Shift" template
- "Weekend Bartender" template
- Apply template to multiple dates
- Bulk assign from templates

### 7.2 Recurring Shifts

Auto-generate shifts:
- Create recurring pattern (e.g., "Every Monday 9am-5pm")
- Specify end date or count
- Auto-assign based on availability

### 7.3 Notifications

**Email/SMS notifications** (using Supabase Edge Functions):
- Rota published
- New shift assigned
- Shift change
- Request approved/rejected
- Shift reminder (1 day before)

### 7.4 Mobile App View

Optimize for mobile:
- Bottom navigation for staff features
- Swipe actions on shift cards
- Quick clock-in button
- Push notifications (PWA)

### 7.5 Shift Trading

Staff-to-staff shift exchanges:
- Browse available shifts
- Offer to swap shifts
- Manager approval required
- Automatic conflict checking

### 7.6 Deliverables
- ✅ Shift template system
- ✅ Recurring shift creation
- ✅ Notification system
- ✅ Mobile-optimized views
- ✅ Shift trading marketplace

---

## Implementation Order & Dependencies

### Week 1: Foundation
1. Database schema (Phase 1.1)
2. RLS policies (Phase 1.2)
3. Helper functions (Phase 1.3)
4. Basic API routes (Phase 2.1)

### Week 2: Core Features
5. Shift management API (Phase 2.2)
6. Manager calendar view (Phase 3.1-3.2)
7. Shift modal components (Phase 3.3)

### Week 3: Staff Features
8. Staff rota view (Phase 4.1)
9. Clock in/out (Phase 4.4)
10. Time-off requests (Phase 4.3)
11. Availability management (Phase 4.2)

### Week 4: Business Logic
12. Conflict prevention (Phase 5.1)
13. Labor cost tracking (Phase 5.2)
14. Overtime calculations (Phase 5.3)
15. Smart suggestions (Phase 5.5)

### Week 5: Analytics
16. Labor analytics dashboard (Phase 6.1)
17. Reports and charts (Phase 6.2-6.4)

### Week 6: Polish & Advanced
18. Templates and recurring shifts (Phase 7.1-7.2)
19. Notifications (Phase 7.3)
20. Mobile optimization (Phase 7.4)
21. Testing and bug fixes

---

## Key Technical Considerations

### Performance
- Index on `(restaurant_id, date)` for fast queries
- Limit calendar queries to visible date range
- Use `supabaseAdmin` for complex aggregations
- Cache staff data (rarely changes)

### Real-Time Updates
- Subscribe to shifts table for live calendar updates
- Subscribe to shift_requests for notification badges
- Update attendance in real-time for clock-in/out

### Security
- RLS policies prevent cross-restaurant access
- Validate staff permissions in API routes
- Use service role only in API routes (never client)

### Mobile Responsiveness
- Calendar: Switch to list view on mobile
- Touch-friendly buttons (min 44px tap targets)
- Bottom sheet modals for mobile
- Swipe gestures for quick actions

### Accessibility
- ARIA labels for calendar navigation
- Keyboard navigation for forms
- High contrast mode support
- Screen reader announcements for updates

---

## Testing Checklist

### Unit Tests
- [ ] Shift conflict detection
- [ ] Overtime calculation
- [ ] Labor cost calculation
- [ ] Rest period validation

### Integration Tests
- [ ] Create shift via API
- [ ] Assign staff to shift
- [ ] Approve time-off request
- [ ] Clock in/out flow

### E2E Tests
- [ ] Manager creates and publishes rota
- [ ] Staff views and accepts shift
- [ ] Staff requests time off
- [ ] Manager approves request
- [ ] Staff clocks in/out

### Performance Tests
- [ ] Load 500 shifts in calendar
- [ ] Real-time updates with 10 concurrent users
- [ ] Complex analytics queries

---

## Deployment Notes

1. **Run database migrations** in Supabase SQL Editor
2. **Deploy API routes** (automatic with Next.js)
3. **Update navigation** to include Rota link
4. **Configure notifications** (Supabase Edge Functions)
5. **Test with sample data** before production use
6. **Train staff and managers** on new features

---

## Future Enhancements (Post-Launch)

- AI-powered shift optimization
- Integration with payroll systems
- Skills matrix for staff qualifications
- Shift bidding system
- Multi-location support
- Labor forecasting based on sales predictions
- Compliance tracking (break times, max hours)
- Shift pattern analytics

---

## Success Metrics

- **Manager efficiency**: Time to create weekly rota < 30 minutes
- **Staff satisfaction**: 90%+ shifts filled with preferred staff
- **Labor cost accuracy**: Track within 5% of budget
- **Attendance tracking**: 95%+ clock-in compliance
- **Request turnaround**: Approve/reject within 24 hours

---

## Questions Before Starting

1. **Hourly rates**: Should hourly_rate be visible to all staff or managers only?
2. **Notifications**: Email, SMS, or in-app only?
3. **Clock-in GPS**: Required or optional?
4. **Shift approval**: Auto-approve manager-created shifts or require staff acceptance?
5. **Overtime rules**: 1.5x rate for overtime or configurable?

---

This plan provides a comprehensive roadmap for implementing a full-featured Staff Rota & Scheduling system while following Menu Hub's existing architecture and conventions.
