'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DeletedRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchDeleted()
  }, [])

  const fetchDeleted = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('deleted_at', { ascending: false })
    setRestaurants((data || []).filter(r => !!r.deleted_at))
    setLoading(false)
  }

  const reinstateRestaurant = async (restaurant) => {
    if (!confirm(`Reinstate "${restaurant.name}"? They will be directed to billing to subscribe.`)) return
    await supabase
      .from('restaurants')
      .update({
        deleted_at: null,
        recovery_requested_at: null,
        status: 'approved',
        subscription_status: 'trialing',
        subscription_plans: '',
        enabled_modules: { ordering: false, analytics: false, reservations: false, rota: false },
      })
      .eq('id', restaurant.id)
    fetchDeleted()
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const filtered = restaurants.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
  })

  const recoveryCount = restaurants.filter(r => r.recovery_requested_at).length

  if (loading) return <div className="text-slate-500">Loading…</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Deleted Restaurants</h1>
          <p className="text-slate-500">Soft-deleted accounts — reinstate to restore access.</p>
        </div>
        {recoveryCount > 0 && (
          <span className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
            {recoveryCount} recovery request{recoveryCount > 1 ? 's' : ''} pending
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 w-72">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#6262bd] w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No deleted restaurants</p>
          <p className="text-slate-400 text-sm mt-1">Deleted accounts will appear here and can be reinstated.</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Restaurant</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Registered</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Deleted on</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Recovery request</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    <p className="text-sm text-slate-400">{r.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{r.email}</p>
                    {r.phone && <p className="text-sm text-slate-400">{r.phone}</p>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(r.created_at)}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(r.deleted_at)}</td>
                  <td className="px-6 py-4">
                    {r.recovery_requested_at ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        {formatDate(r.recovery_requested_at)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => reinstateRestaurant(r)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        Reinstate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
