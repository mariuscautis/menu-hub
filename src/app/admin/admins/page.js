'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminAdmins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false })

    setAdmins(data || [])
    setLoading(false)
  }

  const addAdmin = async (e) => {
    e.preventDefault()
    setError(null)

    // Find user by email in auth.users (we need to use a workaround)
    // First check if the email exists in restaurants table
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('email', newAdminEmail)
      .single()

    if (!restaurant) {
      setError('User not found. They must have a registered account first.')
      return
    }

    // Check if already admin
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', restaurant.owner_id)
      .single()

    if (existingAdmin) {
      setError('This user is already an admin.')
      return
    }

    const { error: insertError } = await supabase
      .from('admins')
      .insert({
        user_id: restaurant.owner_id,
        email: newAdminEmail
      })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setNewAdminEmail('')
    setShowModal(false)
    fetchAdmins()
  }

  const removeAdmin = async (id, email) => {
    if (admins.length === 1) {
      alert('Cannot remove the last admin.')
      return
    }

    if (!confirm(`Remove ${email} as admin?`)) return

    await supabase.from('admins').delete().eq('id', id)
    fetchAdmins()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return <div className="text-slate-500">Loading admins...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admins</h1>
          <p className="text-slate-500">Manage platform administrators</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Admin
        </button>
      </div>

      {/* Admins List */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b-2 border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Added</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-slate-100 last:border-0">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{admin.email}</p>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {formatDate(admin.created_at)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeAdmin(admin.id, admin.email)}
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

      {/* Add Admin Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false)
            setError(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">Add New Admin</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={addAdmin}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="admin@example.com"
                />
                <p className="text-slate-400 text-sm mt-2">
                  User must have a registered restaurant account
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
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
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}