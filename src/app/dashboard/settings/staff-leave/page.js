'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function StaffLeaveSettings() {
  const [restaurant, setRestaurant] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current user and restaurant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      // Get restaurant owned by user
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!restaurantData) {
        setMessage({ type: 'error', text: 'Restaurant not found or you do not have permission' });
        return;
      }

      setRestaurant(restaurantData);

      // Fetch staff with their leave balances
      const { data: staffData, error: staffError } = await supabase
        .from('staff_leave_balances')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('staff_name');

      if (staffError) throw staffError;

      setStaff(staffData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateEntitlement = async (staffMember, updates) => {
    setSaving(true);

    try {
      // Check if entitlement exists
      const { data: existing } = await supabase
        .from('staff_leave_entitlements')
        .select('id')
        .eq('staff_id', staffMember.staff_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('staff_leave_entitlements')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('staff_id', staffMember.staff_id);

        if (error) throw error;
      } else {
        // Create new entitlement
        const { error } = await supabase
          .from('staff_leave_entitlements')
          .insert({
            restaurant_id: restaurant.id,
            staff_id: staffMember.staff_id,
            annual_holiday_days: 28.0,
            holiday_year_start: new Date().toISOString().split('T')[0],
            ...updates
          });

        if (error) throw error;
      }

      showMessage('success', 'Leave entitlement updated successfully');
      setEditingStaff(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating entitlement:', error);
      showMessage('error', 'Failed to update entitlement');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLeaveYear = async (staffMember) => {
    if (!confirm(`Reset leave year for ${staffMember.staff_name}? This will:\n- Reset used holiday and sick days to 0\n- Move remaining days to carry over (max 5 days)\n- Set new holiday year start date`)) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc('reset_staff_leave_year', {
        p_staff_id: staffMember.staff_id
      });

      if (error) throw error;

      showMessage('success', 'Leave year reset successfully');
      await fetchData();
    } catch (error) {
      console.error('Error resetting leave year:', error);
      showMessage('error', 'Failed to reset leave year');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-red-500">Access denied - Restaurant owners only</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Staff Leave Management</h1>
          <p className="text-sm text-slate-500 mt-2">
            Manage holiday entitlements and leave balances for your staff
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">UK Employment Law Compliance</p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• <strong>Statutory Minimum:</strong> 28 days (5.6 weeks) annual leave including bank holidays</li>
                <li>• <strong>Sick Leave:</strong> No statutory limit - tracked for SSP eligibility (Statutory Sick Pay)</li>
                <li>• <strong>Self-Certification:</strong> Up to 7 days without medical certificate</li>
                <li>• <strong>Medical Certificate:</strong> Required after 7 consecutive days of sickness</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Staff List */}
        {staff.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-slate-100 rounded-2xl">
            <p className="text-slate-500">No active staff members found</p>
          </div>
        ) : (
          <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Staff Member</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Annual Entitlement</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Used</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Pending</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Available</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Sick Days</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Holiday Year</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((staffMember) => (
                    <tr key={staffMember.staff_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{staffMember.staff_name}</div>
                        <div className="text-xs text-slate-500">{staffMember.role}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-700">
                          {staffMember.annual_holiday_days || '—'} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-red-600">
                          {staffMember.holiday_days_used?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-amber-600">
                          {staffMember.holiday_days_pending?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-green-600">
                          {staffMember.holiday_days_available?.toFixed(1) || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-orange-600">
                          {staffMember.sick_days_this_year?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs text-slate-600">
                          {staffMember.holiday_year_start
                            ? new Date(staffMember.holiday_year_start).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingStaff(staffMember)}
                            className="px-3 py-1.5 text-sm bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetLeaveYear(staffMember)}
                            disabled={saving}
                            className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50"
                          >
                            Reset Year
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Edit Leave Entitlement</h3>
              <p className="text-sm text-slate-600 mb-6">
                {editingStaff.staff_name} ({editingStaff.role})
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleUpdateEntitlement(editingStaff, {
                    annual_holiday_days: parseFloat(formData.get('annual_holiday_days')),
                    holiday_year_start: formData.get('holiday_year_start')
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Annual Holiday Entitlement (days)
                  </label>
                  <input
                    type="number"
                    name="annual_holiday_days"
                    defaultValue={editingStaff.annual_holiday_days || 28.0}
                    step="0.5"
                    min="0"
                    max="365"
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  />
                  <p className="text-xs text-slate-500 mt-1">UK statutory minimum is 28 days (including bank holidays)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Holiday Year Start Date
                  </label>
                  <input
                    type="date"
                    name="holiday_year_start"
                    defaultValue={editingStaff.holiday_year_start || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  />
                  <p className="text-xs text-slate-500 mt-1">Usually the staff member's hire date anniversary</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-600">
                    <strong>Note:</strong> Changes to entitlement will not affect already used or pending days.
                    Current balances will be recalculated based on the new entitlement.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
