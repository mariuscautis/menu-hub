'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MyAvailabilityPage() {
  const [staff, setStaff] = useState(null);
  const [availability, setAvailability] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      // Check for staff session (PIN login)
      const staffSessionData = localStorage.getItem('staff_session');
      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData);

          if (!staffSession.id) {
            console.error('Invalid staff data in session');
            return;
          }

          // Fetch full staff data from database to get availability
          const { data: staffData, error } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staffSession.id)
            .single();

          if (error) {
            console.error('Error fetching staff data:', error);
            return;
          }

          setStaff(staffData);

          // Load existing availability
          if (staffData.availability) {
            setAvailability(staffData.availability);
          } else {
            // Initialize with all days available
            const initialAvailability = {};
            DAYS.forEach(day => {
              initialAvailability[day.toLowerCase()] = {
                available: true,
                from: '09:00',
                to: '17:00'
              };
            });
            setAvailability(initialAvailability);
          }
        } catch (err) {
          console.error('Error parsing staff session:', err);
          localStorage.removeItem('staff_session');
        }
      }
    };

    fetchStaffData();
  }, []);

  const handleAvailabilityChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!staff) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('staff')
        .update({ availability })
        .eq('id', staff.id);

      if (error) throw error;

      // Update local state
      const updatedStaff = { ...staff, availability };
      setStaff(updatedStaff);

      setMessage({ type: 'success', text: 'Availability saved successfully' });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving availability:', error);
      setMessage({ type: 'error', text: error.message });
    }

    setSaving(false);
  };

  if (!staff) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">My Availability</h1>
        <p className="text-slate-600">Set your weekly availability preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 border-2 border-green-200 text-green-700'
              : 'bg-red-50 border-2 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Setting your availability helps managers schedule shifts that work for you.
          This doesn't guarantee you'll only get shifts during these times, but it shows your preferences.
        </p>
      </div>

      {/* Availability Grid */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-8">
        <div className="space-y-4">
          {DAYS.map(day => {
            const dayKey = day.toLowerCase();
            const dayAvailability = availability[dayKey] || {
              available: false,
              from: '09:00',
              to: '17:00'
            };

            return (
              <div
                key={day}
                className="flex items-center gap-6 p-4 border-2 border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
              >
                <div className="w-32">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayAvailability.available}
                      onChange={(e) =>
                        handleAvailabilityChange(dayKey, 'available', e.target.checked)
                      }
                      className="w-5 h-5 text-[#6262bd] rounded focus:ring-[#6262bd]"
                    />
                    <span className="font-medium text-slate-800">{day}</span>
                  </label>
                </div>

                {dayAvailability.available ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">From</label>
                      <input
                        type="time"
                        value={dayAvailability.from}
                        onChange={(e) =>
                          handleAvailabilityChange(dayKey, 'from', e.target.value)
                        }
                        className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">To</label>
                      <input
                        type="time"
                        value={dayAvailability.to}
                        onChange={(e) =>
                          handleAvailabilityChange(dayKey, 'to', e.target.value)
                        }
                        className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-sm text-slate-400">
                    Not available
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 bg-white border-2 border-slate-100 rounded-2xl p-6">
        <h3 className="font-bold text-slate-800 mb-3">Important Notes:</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-[#6262bd]">•</span>
            <span>Changes to your availability don't affect existing scheduled shifts</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#6262bd]">•</span>
            <span>Managers can still assign shifts outside your available hours if needed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#6262bd]">•</span>
            <span>For specific time-off requests, use the "Request Time Off" feature in My Rota</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
