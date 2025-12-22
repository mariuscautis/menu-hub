'use client';

import { useState, useEffect } from 'react';

export default function ShiftModal({ shift, staff, restaurant, departments = [], onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    date: '',
    shift_start: '',
    shift_end: '',
    staff_id: '',
    role_required: '',
    department: '',
    break_duration: 30,
    notes: '',
    status: 'draft'
  });

  const [availableStaff, setAvailableStaff] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shift) {
      setFormData({
        date: shift.date || '',
        shift_start: shift.shift_start || '',
        shift_end: shift.shift_end || '',
        staff_id: shift.staff_id || '',
        role_required: shift.role_required || '',
        department: shift.department || '',
        break_duration: shift.break_duration || 30,
        notes: shift.notes || '',
        status: shift.status || 'draft'
      });
    }
  }, [shift]);

  // Fetch available staff when shift details change
  // TODO: Implement available staff API endpoint
  // useEffect(() => {
  //   if (formData.date && formData.shift_start && formData.shift_end) {
  //     fetchAvailableStaff();
  //   }
  // }, [formData.date, formData.shift_start, formData.shift_end, formData.role_required, formData.department]);

  // const fetchAvailableStaff = async () => {
  //   if (!restaurant) return;
  //   setLoadingAvailable(true);
  //   // API endpoint not yet implemented
  //   setLoadingAvailable(false);
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setConflictError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setConflictError(null);

    if (!restaurant) {
      alert('Restaurant data not found');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        restaurant_id: restaurant.id,
        staff_id: formData.staff_id || null,
        department: formData.department || null // Convert empty string to null
      };

      let response;
      if (shift?.id) {
        // Update existing shift
        response = await fetch('/api/rota/shifts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: shift.id, ...payload })
        });
      } else {
        // Create new shift
        response = await fetch('/api/rota/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();

      if (!response.ok) {
        if (result.conflict) {
          setConflictError(result.conflict.message);
        } else {
          throw new Error(result.error || 'Failed to save shift');
        }
        setSaving(false);
        return;
      }

      onSave(result.shift);
      onClose();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert(error.message);
    }

    setSaving(false);
  };

  const handleDeleteClick = async () => {
    if (!shift?.id) return;

    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const response = await fetch(`/api/rota/shifts?id=${shift.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete shift');
      }

      if (onDelete) onDelete(shift.id);
      onClose();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {shift?.id ? 'Edit Shift' : 'Create New Shift'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {conflictError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
            <strong>Conflict:</strong> {conflictError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            {/* Role Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role Required *
              </label>
              <input
                type="text"
                name="role_required"
                value={formData.role_required}
                onChange={handleChange}
                placeholder="e.g., Server, Chef, Bartender"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            {/* Shift Start */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                name="shift_start"
                value={formData.shift_start}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            {/* Shift End */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Time *
              </label>
              <input
                type="time"
                name="shift_end"
                value={formData.shift_end}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              >
                <option value="">Select Department</option>
                {departments && departments.length > 0 ? (
                  departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                    <option value="universal">Universal</option>
                  </>
                )}
              </select>
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                name="break_duration"
                value={formData.break_duration}
                onChange={handleChange}
                min="0"
                max="180"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            {/* Staff Assignment */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Staff
              </label>
              <select
                name="staff_id"
                value={formData.staff_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              >
                <option value="">Leave Unfilled</option>
                {staff && staff.length > 0 ? (
                  staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.role}
                    </option>
                  ))
                ) : (
                  <option disabled>No staff available</option>
                )}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Select a staff member to assign to this shift
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Optional notes about this shift..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between items-center">
            <div>
              {shift?.id && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Delete Shift
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : shift?.id ? 'Update Shift' : 'Create Shift'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
