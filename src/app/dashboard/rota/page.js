'use client';

import { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { supabase } from '@/lib/supabase';

import ShiftModal from './ShiftModal';
import RequestsModal from './RequestsModal';
import TemplatesModal from './TemplatesModal';
import CurrentlyWorkingModal from './CurrentlyWorkingModal';
import MobileRotaView from './MobileRotaView';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

export default function RotaPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedView, setSelectedView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);

  const [filters, setFilters] = useState({
    department: '',
    status: '',
    staff_id: ''
  });

  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCurrentlyWorkingModal, setShowCurrentlyWorkingModal] = useState(false);

  /* -------------------- Fetch Restaurant -------------------- */

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    let restaurantData = null;

    const staffSession = localStorage.getItem('staff_session');
    if (staffSession) {
      try {
        restaurantData = JSON.parse(staffSession).restaurant;
      } catch {
        localStorage.removeItem('staff_session');
      }
    }

    if (!restaurantData) {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      restaurantData = data;
    }

    setRestaurant(restaurantData);
    setLoading(false);
  };

  /* -------------------- Fetch Data -------------------- */

  const fetchDepartments = useCallback(async () => {
    if (!restaurant) return;

    const { data } = await supabase
      .from('department_permissions')
      .select('department_name')
      .eq('restaurant_id', restaurant.id)
      .order('department_name');

    setDepartments(data?.map(d => d.department_name) || []);
  }, [restaurant]);

  const fetchStaff = useCallback(async () => {
    if (!restaurant) return;

    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'active')
      .order('name');

    setStaff(data || []);
  }, [restaurant]);

  const fetchShifts = useCallback(async () => {
    if (!restaurant) return;

    setLoading(true);

    const start = moment(selectedDate).startOf(selectedView === 'month' ? 'month' : 'week');
    const end = moment(selectedDate).endOf(selectedView === 'month' ? 'month' : 'week');

    const params = new URLSearchParams({
      restaurant_id: restaurant.id,
      date_from: start.format('YYYY-MM-DD'),
      date_to: end.format('YYYY-MM-DD'),
      ...filters
    });

    const res = await fetch(`/api/rota/shifts?${params}`);
    const json = await res.json();

    setShifts(json.shifts || []);
    setLoading(false);
  }, [restaurant, selectedDate, selectedView, filters]);

  useEffect(() => {
    if (!restaurant) return;
    fetchDepartments();
    fetchStaff();
    fetchShifts();
  }, [restaurant, fetchDepartments, fetchStaff, fetchShifts]);

  /* -------------------- Realtime -------------------- */

  useEffect(() => {
    if (!restaurant) return;

    const channel = supabase
      .channel(`shifts-${restaurant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts', filter: `restaurant_id=eq.${restaurant.id}` },
        fetchShifts
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [restaurant, fetchShifts]);

  /* -------------------- Helpers -------------------- */

  const getStaffColor = (staffId) => {
    if (!staffId) return null;

    let hash = 0;
    const str = staffId.toString();

    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const sat = 65 + (Math.abs(hash) % 10);
    const light = 50 + (Math.abs(hash) % 10);

    return {
      background: `hsl(${hue}, ${sat}%, ${light}%)`,
      border: `hsl(${hue}, ${sat}%, ${light - 15}%)`,
      text: light > 55 ? '#1f2937' : '#ffffff'
    };
  };

  const getEventStyle = (shift) => {
    const base = {
      borderRadius: '6px',
      border: '2px solid',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: 500
    };

    if (shift.status === 'cancelled') {
      return { ...base, backgroundColor: '#9ca3af', borderColor: '#6b7280', color: '#fff' };
    }

    if (!shift.staff_id) {
      return { ...base, backgroundColor: '#fbbf24', borderColor: '#d97706', color: '#1f2937' };
    }

    const staffColor = getStaffColor(shift.staff_id);

    if (shift.status === 'completed') {
      return { ...base, backgroundColor: '#10b981', borderColor: staffColor?.border, color: '#fff' };
    }

    return {
      ...base,
      backgroundColor: staffColor?.background,
      borderColor: staffColor?.border,
      color: staffColor?.text
    };
  };

  /* -------------------- Calendar Events -------------------- */

  const events = shifts.map(shift => ({
    id: shift.id,
    title: shift.staff?.name || `${shift.role_required} (Unfilled)`,
    start: new Date(`${shift.date}T${shift.shift_start}`),
    end: new Date(`${shift.date}T${shift.shift_end}`),
    resource: shift,
    style: getEventStyle(shift)
  }));

  /* -------------------- Calendar Event Handlers -------------------- */

  const handleSelectSlot = (slotInfo) => {
    // When clicking on an empty slot, create a new shift
    const newShift = {
      date: moment(slotInfo.start).format('YYYY-MM-DD'),
      shift_start: moment(slotInfo.start).format('HH:mm'),
      shift_end: moment(slotInfo.end).format('HH:mm')
    };
    setSelectedShift(newShift);
    setShowShiftModal(true);
  };

  const handleSelectEvent = (event) => {
    // When clicking on an existing shift, edit it
    setSelectedShift(event.resource);
    setShowShiftModal(true);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    // When dragging a shift to a new time
    try {
      const updatedShift = {
        id: event.resource.id,
        date: moment(start).format('YYYY-MM-DD'),
        shift_start: moment(start).format('HH:mm'),
        shift_end: moment(end).format('HH:mm'),
        restaurant_id: restaurant.id,
        staff_id: event.resource.staff_id,
        role_required: event.resource.role_required,
        department: event.resource.department,
        break_duration: event.resource.break_duration,
        notes: event.resource.notes,
        status: event.resource.status
      };

      const response = await fetch('/api/rota/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShift)
      });

      if (!response.ok) {
        throw new Error('Failed to update shift');
      }

      fetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert(error.message);
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    // When resizing a shift
    handleEventDrop({ event, start, end });
  };

  /* -------------------- Modal Handlers -------------------- */

  const handleSaveShift = () => {
    fetchShifts();
  };

  const handleDeleteShift = () => {
    fetchShifts();
  };

  /* -------------------- Render -------------------- */

  if (!restaurant) {
    return <div className="p-8">Loading restaurant...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Staff Rota & Scheduling</h1>
          <p className="text-slate-600 mt-1">Manage shifts and staff schedules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
          >
            📋 Templates
          </button>
          <button
            onClick={() => setShowRequestsModal(true)}
            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
          >
            📨 Requests
          </button>
          <button
            onClick={() => setShowCurrentlyWorkingModal(true)}
            className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            👥 Currently Working
          </button>
          <button
            onClick={() => {
              setSelectedShift(null);
              setShowShiftModal(true);
            }}
            className="px-5 py-2.5 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
          >
            ➕ Create Shift
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <select
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.staff_id}
          onChange={(e) => setFilters({ ...filters, staff_id: e.target.value })}
          className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white"
        >
          <option value="">All Staff</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {(filters.department || filters.status || filters.staff_id) && (
          <button
            onClick={() => setFilters({ department: '', status: '', staff_id: '' })}
            className="px-4 py-2 text-slate-600 hover:text-[#6262bd] font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl p-6 shadow-sm" style={{ height: 700 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
              <p className="text-slate-600">Loading shifts...</p>
            </div>
          </div>
        ) : (
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            selectable
            resizable
            view={selectedView}
            onView={setSelectedView}
            date={selectedDate}
            onNavigate={setSelectedDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onDragStart={() => setIsDragging(true)}
            onDragOver={() => setIsDragging(false)}
            draggableAccessor={(e) =>
              ['draft', 'published'].includes(e.resource.status)
            }
            eventPropGetter={(event) => ({
              style: {
                ...event.style,
                cursor: isDragging ? 'grabbing' : 'grab'
              }
            })}
          />
        )}
      </div>

      {/* Modals */}
      {showShiftModal && (
        <ShiftModal
          shift={selectedShift}
          staff={staff}
          restaurant={restaurant}
          departments={departments}
          onClose={() => {
            setShowShiftModal(false);
            setSelectedShift(null);
          }}
          onSave={handleSaveShift}
          onDelete={handleDeleteShift}
        />
      )}

      {showRequestsModal && (
        <RequestsModal
          restaurant={restaurant}
          staff={staff}
          onClose={() => setShowRequestsModal(false)}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          restaurant={restaurant}
          staff={staff}
          departments={departments}
          onClose={() => setShowTemplatesModal(false)}
          onApplyTemplate={fetchShifts}
        />
      )}

      {showCurrentlyWorkingModal && (
        <CurrentlyWorkingModal
          restaurant={restaurant}
          onClose={() => setShowCurrentlyWorkingModal(false)}
        />
      )}
    </div>
  );
}
