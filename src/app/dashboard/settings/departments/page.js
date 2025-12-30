'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Define all available permissions with descriptions
const AVAILABLE_PERMISSIONS = [
  { id: 'overview', label: 'Dashboard Overview', description: 'View main dashboard' },
  { id: 'orders_kitchen', label: 'Kitchen Orders', description: 'View and manage kitchen orders' },
  { id: 'orders_bar', label: 'Bar Orders', description: 'View and manage bar orders' },
  { id: 'tables', label: 'Tables & QR', description: 'Manage tables and QR codes' },
  { id: 'reservations', label: 'Reservations', description: 'Manage reservations' },
  { id: 'report_loss', label: 'Report Loss', description: 'Report stock losses' },
  { id: 'floor_plan', label: 'Floor Plan', description: 'View floor plan and place table orders' },
  { id: 'my_rota', label: 'My Rota', description: 'View own work schedule' },
];
export default function DepartmentsSettingsPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    if (restaurantData) {
      setRestaurant(restaurantData);
      // Fetch department permissions
      const { data: deptPerms, error: deptError } = await supabase
        .from('department_permissions')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('department_name');
      if (deptPerms && deptPerms.length > 0) {
        setDepartments(deptPerms.map(dept => ({
          id: dept.id,
          name: dept.department_name,
          permissions: dept.permissions || []
        })));
      } else {
        // Initialize with default departments if none exist
        setDepartments([
          { name: 'kitchen', permissions: ['orders_kitchen'], isNew: true },
          { name: 'bar', permissions: ['orders_bar', 'tables', 'reservations', 'report_loss'], isNew: true },
          { name: 'universal', permissions: ['overview', 'orders_kitchen', 'orders_bar', 'tables', 'reservations', 'report_loss', 'my_rota'], isNew: true }
        ]);
      }
    }
    setLoading(false);
  };
  const handleAddDepartment = () => {
    const trimmed = newDepartmentName.trim().toLowerCase();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Please enter a department name' });
      return;
    }
    if (departments.some(d => d.name === trimmed)) {
      setMessage({ type: 'error', text: 'This department already exists' });
      return;
    }
    setDepartments([...departments, {
      name: trimmed,
      permissions: ['orders_kitchen', 'orders_bar', 'my_rota'], // Default permissions for new departments
      isNew: true
    }]);
    setNewDepartmentName('');
    setMessage(null);
  };
  const handleRemoveDepartment = (deptName) => {
    if (departments.length <= 1) {
      setMessage({ type: 'error', text: 'You must have at least one department' });
      return;
    }
    setDepartments(departments.filter(d => d.name !== deptName));
  };
  const handleTogglePermission = (deptName, permissionId) => {
    setDepartments(departments.map(dept => {
      if (dept.name === deptName) {
        const hasPermission = dept.permissions.includes(permissionId);
        return {
          ...dept,
          permissions: hasPermission
            ? dept.permissions.filter(p => p !== permissionId)
            : [...dept.permissions, permissionId]
        };
      }
      return dept;
    }));
  }
  const handleSelectAll = (deptName) => {
    setDepartments(departments.map(dept => {
      if (dept.name === deptName) {
        return { ...dept, permissions: AVAILABLE_PERMISSIONS.map(p => p.id) }
      }
      return dept;
    }));
  }
  const handleDeselectAll = (deptName) => {
    setDepartments(departments.map(dept => {
      if (dept.name === deptName) {
        return { ...dept, permissions: [] }
      }
      return dept;
    }));
  }
  const handleSave = async () => {
    if (departments.length === 0) {
      setMessage({ type: 'error', text: 'You must have at least one department' });
      return;
    }
    setSaving(true);
    try {
      // Delete all existing department permissions for this restaurant
      await supabase
        .from('department_permissions')
        .delete()
        .eq('restaurant_id', restaurant.id);
      // Insert all departments with their permissions
      const departmentRecords = departments.map(dept => ({
        restaurant_id: restaurant.id,
        department_name: dept.name,
        permissions: dept.permissions
      }));
      const { error: insertError } = await supabase
        .from('department_permissions')
        .insert(departmentRecords);
      if (insertError) throw insertError;
      // Also update the restaurants.departments array for backward compatibility
      const departmentNames = departments.map(d => d.name);
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ departments: departmentNames })
        .eq('id', restaurant.id);
      if (updateError) throw updateError;
      setMessage({ type: 'success', text: 'Department permissions saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
      // Refresh data to get IDs
      fetchData();
    } catch (error) {
      console.error('Error saving department permissions:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save department permissions' });
    }
    setSaving(false);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto"></div>
        </div>
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">No restaurant found</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Departments & Permissions</h1>
        <p className="text-slate-600">Manage departments and control what sections each department can access</p>
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
      {/* Departments List */}
      <div className="space-y-6 mb-6">
        {departments.map((dept, index) => (
          <div key={dept.id || `new-${index}`} className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            {/* Department Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-[#6262bd] rounded-full"></div>
                <h3 className="text-xl font-bold text-slate-800 capitalize">{dept.name}</h3>
                <span className="text-sm text-slate-500">
                  ({dept.permissions.length} permission{dept.permissions.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAll(dept.name)}
                  className="px-3 py-1 text-sm text-[#6262bd] hover:bg-[#6262bd]/10 rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleDeselectAll(dept.name)}
                  className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => handleRemoveDepartment(dept.name)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={departments.length <= 1}
                  title={departments.length <= 1 ? 'Cannot remove last department' : 'Remove department'}
                >
                  Remove
                </button>
              </div>
            </div>
            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_PERMISSIONS.map(permission => {
                const isChecked = dept.permissions.includes(permission.id);
                return (
                  <label
                    key={permission.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#6262bd]/10 border-[#6262bd]'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(dept.name, permission.id)}
                      className="mt-1 w-5 h-5 text-[#6262bd] border-2 border-slate-300 rounded focus:ring-[#6262bd] focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{permission.label}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{permission.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {/* Warning if no permissions */}
            {dept.permissions.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This department has no permissions. Staff in this department will only be able to log in and see a blank dashboard.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Add New Department */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Add New Department</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddDepartment();
              }
            }}
            placeholder="e.g., cleaning, delivery, front desk"
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
          />
          <button
            onClick={handleAddDepartment}
            className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
          >
            Add Department
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          New departments will start with basic permissions (Kitchen Orders, Bar Orders, and My Rota). You can customize them above.
        </p>
      </div>
      {/* Info Boxes */}
      <div className="space-y-4 mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> When staff members log in, they will only see menu items that their department has access to.
            For example, kitchen staff might only see "Kitchen Orders", while bar staff can see "Bar Orders", "Tables", and "Reservations".
            Orders are now split by department - kitchen staff only see kitchen orders, and bar staff only see bar orders.
          </p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-sm text-purple-800">
            <strong>Owner & Admin Access:</strong> Restaurant owners and admin staff always have full access to all features,
            regardless of department permissions. Department permissions only apply to regular staff members.
          </p>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Existing staff members will immediately be affected by permission changes.
            Make sure to test permissions after saving to ensure staff have the access they need.
          </p>
        </div>
      </div>
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
