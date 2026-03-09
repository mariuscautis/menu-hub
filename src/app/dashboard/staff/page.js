'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'

export default function Staff() {
  const t = useTranslations('staff')
  const tc = useTranslations('common')
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
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
    department: '',
    annual_holiday_days: 28.0,
    holiday_year_start: new Date().toISOString().split('T')[0],
    is_hub: false
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: ''
  })

  useEffect(() => {
    fetchData()
  }, [restaurantCtx])

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
    if (!restaurantCtx?.restaurant) return
    const restaurantData = restaurantCtx.restaurant
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
      .select(`
        *,
        staff_leave_entitlements (
          annual_holiday_days,
          holiday_year_start
        )
      `)
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
      setError(t('noRestaurant'))
      return
    }
    if (!formData.pin_code || formData.pin_code.length !== 3) {
      setError(t('pinCodeRequired'))
      return
    }

    // If setting as hub, unset any existing hub user first
    if (formData.is_hub) {
      try {
        await supabase
          .from('staff')
          .update({ is_hub: false })
          .eq('restaurant_id', restaurant.id)
          .eq('is_hub', true)
      } catch (err) {
        console.warn('Failed to unset existing hub:', err)
      }
    }

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          email: formData.is_hub ? `hub_${Date.now()}@menuhub.local` : formData.email,
          name: formData.name,
          role: formData.is_hub ? 'staff' : formData.role,
          pin_code: formData.pin_code,
          department: formData.is_hub ? 'kitchen' : formData.department,
          annual_holiday_days: formData.is_hub ? 0 : parseFloat(formData.annual_holiday_days),
          holiday_year_start: formData.is_hub ? new Date().toISOString().split('T')[0] : formData.holiday_year_start,
          is_hub: formData.is_hub
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add staff')
      }
      setFormData({
        email: '',
        name: '',
        role: 'staff',
        pin_code: '',
        department: departments[0] || '',
        annual_holiday_days: 28.0,
        holiday_year_start: new Date().toISOString().split('T')[0],
        is_hub: false
      })
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
      alert(t('pinUpdatedSuccess'))
      fetchData()
    } catch (err) {
      alert(t('pinUpdateFailed'))
    }
  }

  const updateStaffStatus = async (id, status) => {
    await supabase
      .from('staff')
      .update({ status })
      .eq('id', id)
    fetchData()
  }

  const sendMagicLink = async (staffMember) => {
    if (!staffMember.email) {
      alert(t('noEmail'))
      return
    }

    if (!confirm(t('sendMagicLinkConfirm').replace('{name}', staffMember.name).replace('{email}', staffMember.email))) {
      return
    }

    try {
      // Send magic link via API
      const response = await fetch('/api/staff/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffMember.id,
          restaurant_id: restaurant.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // If email sending failed but we have a magic link, show it for manual sending
        if (data.magic_link) {
          alert(t('magicLinkManualSend').replace('{name}', staffMember.name).replace('{email}', staffMember.email).replace('{link}', data.magic_link))
        } else {
          throw new Error(data.error || 'Failed to send magic link')
        }
      } else {
        alert(t('magicLinkSentSuccess').replace('{name}', staffMember.name).replace('{email}', staffMember.email))
      }
    } catch (error) {
      console.error('Error sending magic link:', error)
      alert(t('magicLinkFailed'))
    }
  }

  const deleteStaff = async (id, name) => {
    if (!confirm(t('removeStaffConfirm').replace('{name}', name || 'this staff member'))) return
    await supabase.from('staff').delete().eq('id', id)
    fetchData()
  }

  const openEditModal = (member) => {
    setSelectedStaff(member)
    const entitlement = member.staff_leave_entitlements?.[0]
    // Normalize date: Supabase may return a full timestamp; we only need YYYY-MM-DD
    const rawDate = entitlement?.holiday_year_start
    const normalizedDate = rawDate
      ? rawDate.split('T')[0]
      : new Date().toISOString().split('T')[0]
    setFormData({
      email: member.email,
      name: member.name,
      role: member.role,
      pin_code: member.pin_code,
      department: member.department,
      annual_holiday_days: entitlement?.annual_holiday_days ?? 28.0,
      holiday_year_start: normalizedDate,
      is_hub: member.is_hub || false
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const editStaff = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      // If setting as hub, unset any existing hub user first
      if (formData.is_hub && !selectedStaff.is_hub) {
        await supabase
          .from('staff')
          .update({ is_hub: false })
          .eq('restaurant_id', restaurant.id)
          .eq('is_hub', true)
      }

      // Use the API route (service role key) so RLS doesn't block entitlement writes
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          restaurantId: restaurant.id,
          name: formData.name,
          email: formData.is_hub ? `hub_${selectedStaff.id}@menuhub.local` : formData.email,
          role: formData.is_hub ? 'staff' : formData.role,
          department: formData.is_hub ? 'kitchen' : formData.department,
          is_hub: formData.is_hub,
          pin_code: formData.pin_code,
          annual_holiday_days: formData.is_hub ? 0 : parseFloat(formData.annual_holiday_days),
          holiday_year_start: formData.is_hub ? null : formData.holiday_year_start
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update staff')

      setShowModal(false)
      setIsEditing(false)
      setSelectedStaff(null)
      setFormData({
        email: '',
        name: '',
        role: 'staff',
        pin_code: '',
        department: departments[0] || '',
        annual_holiday_days: 28.0,
        holiday_year_start: new Date().toISOString().split('T')[0]
      })
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
    return <div className="text-slate-500">{t('loadingStaff')}</div>
  }

  if (!restaurant) {
    return <div className="text-slate-500">{t('noPermission')}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500">{t('subtitle').replace('{restaurantName}', restaurant.name)}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('addStaff')}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-[#6262bd]/5 dark:bg-[#6262bd]/10 border-2 border-[#6262bd]/20 dark:border-[#6262bd]/30 rounded-2xl p-6 mb-8">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('staffRolesTitle')}</h3>
        <ul className="text-slate-600 dark:text-slate-400 text-sm space-y-1">
          <li><strong>{t('adminRole')}</strong> {t('adminRoleDesc')}</li>
          <li><strong>{t('staffRole')}</strong> {t('staffRoleDesc')}</li>
        </ul>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('noStaffMembers')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-[#6262bd] font-medium hover:underline"
          >
            {t('addFirstStaffMember')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-100 dark:border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('name')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('role')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('department')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('pinCode')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('status.label')}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{member.name || '-'}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                      {member.is_hub && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                          🍽️ Hub
                        </span>
                      )}
                    </div>
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
                      <span className="font-mono text-lg font-bold text-[#6262bd] dark:text-[#8b8bdb]">{member.pin_code || '---'}</span>
                      <button
                        onClick={() => openPinModal(member)}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        {t('change')}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadge(member.status)}`}>
                      {t(`status.${member.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => sendMagicLink(member)}
                        className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 dark:bg-purple-600 dark:text-white dark:hover:bg-purple-700"
                        title="Generate and copy magic link for staff login"
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                        </svg>
                        {t('link')}
                      </button>
                      <button
                        onClick={() => openEditModal(member)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                      >
                        {t('edit')}
                      </button>
                      {member.status === 'pending' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'active')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                        >
                          {t('activate')}
                        </button>
                      )}
                      {member.status === 'active' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'inactive')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-700"
                        >
                          {t('deactivate')}
                        </button>
                      )}
                      {member.status === 'inactive' && (
                        <button
                          onClick={() => updateStaffStatus(member.id, 'active')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 dark:bg-green-600 dark:text-white dark:hover:bg-green-700"
                        >
                          {t('reactivate')}
                        </button>
                      )}
                      <button
                        onClick={() => deleteStaff(member.id, member.name)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false)
            setIsEditing(false)
            setSelectedStaff(null)
            setError(null)
            setFormData({ email: '', name: '', role: 'staff', pin_code: '', department: departments[0] || 'kitchen', annual_holiday_days: 28.0, holiday_year_start: new Date().toISOString().split('T')[0], is_hub: false })
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-100 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#6262bd]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {isEditing ? t('editStaffMember') : t('addStaffMember')}
                  </h2>
                  {isEditing && selectedStaff && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStaff.name || selectedStaff.email}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setIsEditing(false); setError(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                {error}
              </div>
            )}

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form id="staff-form" onSubmit={isEditing ? editStaff : addStaff}>
                <div className="space-y-5">

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('nameLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                      placeholder={formData.is_hub ? 'Hub Device Name' : t('namePlaceholder')}
                    />
                  </div>

                  {/* Hub toggle */}
                  <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#6262bd] transition-colors">
                    <input
                      type="checkbox"
                      id="is_hub"
                      checked={formData.is_hub}
                      onChange={(e) => setFormData({ ...formData, is_hub: e.target.checked })}
                      className="mt-0.5 w-5 h-5 text-[#6262bd] border-slate-300 rounded focus:ring-[#6262bd]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">🍽️ Designate as Local Hub</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Coordinates local network sync between devices. Only one hub per restaurant.
                      </p>
                    </div>
                  </label>

                  {formData.is_hub && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <p className="text-green-700 dark:text-green-400 text-sm font-medium">✅ Hub users only need a name and PIN</p>
                    </div>
                  )}

                  {!formData.is_hub && (
                    <>
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          {t('emailLabel')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                            placeholder={t('emailPlaceholder')}
                          />
                        </div>
                      </div>

                      {/* Role + Department side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t('roleLabel')}
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                          >
                            <option value="staff">{t('roleStaff')}</option>
                            <option value="admin">{t('roleAdmin')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t('departmentLabel')}
                          </label>
                          <select
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                          >
                            {departments.map(dept => (
                              <option key={dept} value={dept}>
                                {dept.charAt(0).toUpperCase() + dept.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* PIN Code */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('pinCodeLabel')} {!isEditing && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="pin_code"
                        value={formData.pin_code}
                        onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                        required={!isEditing}
                        maxLength={3}
                        pattern="[0-9]{3}"
                        inputMode="numeric"
                        className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 font-mono text-2xl text-center tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors"
                        placeholder="•••"
                      />
                      <button
                        type="button"
                        onClick={generatePinCode}
                        className="px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm whitespace-nowrap transition-colors"
                      >
                        {t('generate')}
                      </button>
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5">
                      {isEditing ? t('pinHintEdit') : t('pinHintAdd')}
                    </p>
                  </div>

                  {/* Holiday Entitlement — only for non-hub staff */}
                  {!formData.is_hub && (
                    <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('holidayEntitlementTitle')}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            {t('annualHolidayDays')}
                          </label>
                          <input
                            type="number"
                            name="annual_holiday_days"
                            value={formData.annual_holiday_days}
                            onChange={handleChange}
                            step="0.5"
                            min="0"
                            max="365"
                            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                          />
                          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t('annualHolidayDaysHint')}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            {t('holidayYearStartDate')}
                          </label>
                          <input
                            type="date"
                            name="holiday_year_start"
                            value={formData.holiday_year_start}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 transition-colors"
                          />
                          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t('holidayYearStartDateHint')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t-2 border-slate-100 dark:border-slate-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setShowModal(false); setIsEditing(false); setError(null) }}
                className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="staff-form"
                className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-colors shadow-sm"
              >
                {isEditing ? t('updateStaff') : t('addStaffButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showPasswordModal && selectedStaff && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowPasswordModal(false); setPasswordData({ newPassword: '' }); setSelectedStaff(null) }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('changePinTitle').replace('{name}', selectedStaff.name || selectedStaff.email)}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('sharePinHint')}</p>
              </div>
              <button
                onClick={() => { setShowPasswordModal(false); setSelectedStaff(null); setPasswordData({ newPassword: '' }) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xl font-bold transition-colors"
              >×</button>
            </div>
            <form onSubmit={updatePinCode} className="px-6 py-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('newPinCode')}</label>
              <div className="flex gap-2 justify-center mb-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-16 h-16 flex items-center justify-center border-2 rounded-xl text-3xl font-mono font-bold transition-colors ${passwordData.newPassword.length === i ? 'border-[#6262bd] bg-[#6262bd]/5 text-[#6262bd]' : passwordData.newPassword[i] ? 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200' : 'border-slate-200 dark:border-slate-700 text-slate-300'}`}>
                    {passwordData.newPassword[i] || '·'}
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ newPassword: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                maxLength={3}
                pattern="[0-9]{3}"
                inputMode="numeric"
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 font-mono text-xl text-center tracking-widest placeholder:text-slate-300 transition-colors"
                placeholder="Enter 3-digit PIN"
                autoFocus
              />
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setSelectedStaff(null); setPasswordData({ newPassword: '' }) }}
                  className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={passwordData.newPassword.length !== 3}
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('updatePin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
