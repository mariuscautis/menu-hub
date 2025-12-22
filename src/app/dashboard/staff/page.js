'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [departments, setDepartments] = useState([])
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'staff',
    pin_code: '',
    department: ''
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Real-time subscription for department changes
  useEffect(() => {
    if (!restaurant) return
    const departmentChannel = supabase
      .channel(`departments-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'department_permissions',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        console.log('Department changed - refetching departments')
        fetchData()
      })
      .subscribe()
    return () => {
      departmentChannel.unsubscribe()
    }
  }, [restaurant])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only get restaurant where user is the OWNER
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!restaurantData) {
      setLoading(false)
      return
    }
    setRestaurant(restaurantData)

    // Fetch departments from department_permissions table
    const { data: deptData } = await supabase
      .from('department_permissions')
      .select('department_name')
      .eq('restaurant_id', restaurantData.id)
      .order('department_name')

    if (deptData && deptData.length > 0) {
      const departmentNames = deptData.map(d => d.department_name)
      setDepartments(departmentNames)
      // Set default department if form is empty
      if (!formData.department) {
        setFormData(prev => ({ ...prev, department: departmentNames[0] }))
      }
    } else {
      // Fallback to default departments
      setDepartments(['kitchen', 'bar', 'universal'])
      setFormData(prev => ({ ...prev, department: 'kitchen' }))
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('created_at', { ascending: false })

    setStaff(staffData || [])
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const generatePinCode = () => {
    // Generate random 3-digit code (100-999)
    const pin = Math.floor(Math.random() * 900) + 100
    setFormData({ ...formData, pin_code: pin.toString() })
  }

  const addStaff = async (e) => {
    e.preventDefault()
    setError(null)

    if (!restaurant) {
      setError('No restaurant found')
      return
    }
    if (!formData.pin_code || formData.pin_code.length !== 3) {
      setError('PIN code must be exactly 3 digits')
      return
    }

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          email: formData.email,
          name: formData.name,
          role: formData.role,
          pin_code: formData.pin_code,
          department: formData.department
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add staff')
      }
      setFormData({ email: '', name: '', role: 'staff', pin_code: '', department: departments[0] || '' })
      setShowModal(false)
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const openPinModal = (member) => {
    setSelectedStaff(member)
    const newPin = Math.floor(Math.random() * 900) + 100
    setPasswordData({ newPassword: newPin.toString() })
    setShowPasswordModal(true)
  }

  const updatePinCode = async (e) => {
    e.preventDefault()
    if (!passwordData.newPassword || passwordData.newPassword.length !== 3) {
      return
    }
    try {
      const { error } = await supabase
        .from('staff')
        .update({ pin_code: passwordData.newPassword })
        .eq('id', selectedStaff.id)
      if (error) throw error
      setPasswordData({ newPassword: '' })
      setShowPasswordModal(false)
      setSelectedStaff(null)
      alert('PIN code updated successfully!')
      fetchData()
    } catch (err) {
      alert('Failed to update PIN code')
    }
  }

  const updateStaffStatus = async (id, status) => {
    await supabase
      .from('staff')
      .update({ status })
      .eq('id', id)
    fetchData()
  }

  const deleteStaff = async (id, name) => {
    if (!confirm(`Remove ${name || 'this staff member'}?`)) return
    await supabase.from('staff').delete().eq('id', id)
    fetchData()
  }

  const openEditModal = (member) => {
    setSelectedStaff(member)
    setFormData({
      email: member.email,
      name: member.name,
      role: member.role,
      pin_code: member.pin_code,
      department: member.department
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const editStaff = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department
        })
        .eq('id', selectedStaff.id)
      if (error) throw error
      setShowModal(false)
      setIsEditing(false)
      setSelectedStaff(null)
      setFormData({ email: '', name: '', role: 'staff', pin_code: '', department: departments[0] || '' })
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'inactive':
        return 'bg-slate-100 text-slate-600'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-[#6262bd]/10 text-[#6262bd]'
      case 'staff':
        return 'bg-slate-100 text-slate-600'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const getDepartmentBadge = (department) => {
    // Predefined colors for common departments
    const predefinedColors = {
      'bar': 'bg-orange-100 text-orange-700',
      'kitchen': 'bg-green-100 text-green-700',
      'universal': 'bg-[#6262bd]/10 text-[#6262bd]'
    }
    if (predefinedColors[department]) {
      return predefinedColors[department]
    }
    // For custom departments, use a color based on the department name
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700'
    ]
    const index = department ? department.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0
    return colors[index] || 'bg-slate-100 text-slate-600'
  }

  if (loading) {
    return <div className="text-slate-500">Loading staff...</div>
  }

  if (!restaurant) {
    return <div className="text-slate-500">You don't have permission to manage staff.</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
          <p className="text-slate-500">Manage staff for {restaurant.name}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Staff
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-[#6262bd]/5 border-2 border-[#6262bd]/20 rounded-2xl p-6 mb-8">
        <h3 className="font-semibold text-slate-700 mb-2">Staff Roles</h3>
        <ul className="text-slate-600 text-sm space-y-1">
          <li><strong>Admin:</strong> Full access - can manage menu, tables, orders, and staff</li>
          <li><strong>Staff:</strong> Orders only - can view and update order status</li>
        </ul>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <p className="text-slate-500 mb-4">No staff members yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-[#6262bd] font-medium hover:underline"
          >
            Add your first staff member
          </button>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">PIN Code</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{member.name || '-'}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getDepartmentBadge(member.department)}`}>
                      {member.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-[#6262bd]">{member.pin_code || '---'}</span>
                      <button
                        onClick={() => openPinModal(member)}
                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-slate-200"
                      >
                        Change
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadge(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      {member.status === 'pending' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'active')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          Activate
                        </button>
                      )}
                      {member.status === 'active' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'inactive')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                        >
                          Deactivate
                        </button>
                      )}
                      {member.status === 'inactive' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'active')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => deleteStaff(member.id, member.name)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false)
            setIsEditing(false)
            setSelectedStaff(null)
            setError(null)
            setFormData({ email: '', name: '', role: 'staff', pin_code: '', department: departments[0] || 'kitchen' })
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={isEditing ? editStaff : addStaff}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="staff@restaurant.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PIN Code (3 digits)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pin_code"
                      value={formData.pin_code}
                      onChange={handleChange}
                      required={!isEditing}
                      disabled={isEditing}
                      maxLength={3}
                      pattern="[0-9]{3}"
                      className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 font-mono text-lg disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="123"
                    />
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={generatePinCode}
                        className="px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm whitespace-nowrap"
                      >
                        Generate
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    {isEditing
                      ? 'Use the "Change" button in the table to update the PIN code'
                      : 'Staff will use this PIN to log in quickly'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <option value="staff">Staff (Orders only)</option>
                    <option value="admin">Admin (Full access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-slate-400 text-sm mt-2">
                    Manage departments in Settings → Departments
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setIsEditing(false)
                      setError(null)
                    }}
                    className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                  >
                    {isEditing ? 'Update Staff' : 'Add Staff'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showPasswordModal && selectedStaff && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPasswordModal(false)
            setPasswordData({ newPassword: '' })
            setSelectedStaff(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Change PIN for {selectedStaff.name || selectedStaff.email}
            </h2>
            <form onSubmit={updatePinCode}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New PIN Code
                  </label>
                  <input
                    type="text"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ newPassword: e.target.value })}
                    maxLength={3}
                    pattern="[0-9]{3}"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 font-mono text-2xl text-center"
                    placeholder="123"
                  />
                  <p className="text-slate-400 text-sm mt-2">
                    Share this new PIN with the staff member
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setSelectedStaff(null)
                      setPasswordData({ newPassword: '' })
                    }}
                    className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                  >
                    Update PIN
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
