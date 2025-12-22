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

  /* -------------------- Render -------------------- */

  if (!restaurant) {
    return <div className="p-8">Loading restaurant...</div>;
  }

  return (

      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-3xl font-bold mb-6">Staff Rota & Scheduling</h1>

        {/* Calendar */}
        <div className="bg-white rounded-xl p-6" style={{ height: 700 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">Loading…</div>
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
      </div>

  );
}
