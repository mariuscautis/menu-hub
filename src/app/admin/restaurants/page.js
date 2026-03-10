'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MODULE_CONFIG = [
  {
    key: 'ordering',
    label: 'Ordering & Menu',
    description: 'Orders, Tables & QR, Menu management, Stock & Inventory, Report Loss, and all Reports',
    includes: ['Orders', 'Tables & QR', 'Menu', 'Stock', 'Report Loss', 'Reports'],
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
      </svg>
    )
  },
  {
    key: 'reservations',
    label: 'Reservations & Booking',
    description: 'Online table booking page and reservations management dashboard',
    includes: ['Reservations dashboard', 'Public booking page'],
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
      </svg>
    )
  },
  {
    key: 'rota',
    label: 'Staff & Rota',
    description: 'Staff management, shift scheduling, time-off requests, clock in/out',
    includes: ['Staff directory', 'Rota calendar', 'Time-off requests'],
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    )
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'Revenue charts, peak hours, product profitability, table and staff analytics',
    includes: ['Analytics dashboards', 'Performance charts'],
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
    )
  },
]

const DEFAULT_MODULES = {
  ordering: true,
  reservations: true,
  rota: true,
  analytics: true,
}

export default function AdminRestaurants() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Module panel state
  const [modulePanelOpen, setModulePanelOpen] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [modules, setModules] = useState({})
  const [savingModules, setSavingModules] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    setRestaurants(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase
      .from('restaurants')
      .update({ status })
      .eq('id', id)

    fetchRestaurants()
  }

  const handleImpersonate = (restaurant) => {
    sessionStorage.setItem('impersonation_session', JSON.stringify({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    }))
    router.push('/dashboard')
  }

  const deleteRestaurant = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all their data including menu items, tables, and orders.`)) {
      return
    }

    await supabase.from('restaurants').delete().eq('id', id)
    fetchRestaurants()
  }

  const openModulePanel = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setModules({ ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) })
    setSaveSuccess(false)
    setModulePanelOpen(true)
  }

  const closeModulePanel = () => {
    setModulePanelOpen(false)
    setSelectedRestaurant(null)
  }

  const toggleModule = (key) => {
    setModules(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Reports is bundled with Ordering — always keep in sync
      if (key === 'ordering') next.reports = next.ordering
      return next
    })
    setSaveSuccess(false)
  }

  const saveModules = async () => {
    if (!selectedRestaurant) return
    setSavingModules(true)
    setSaveSuccess(false)

    const { error } = await supabase
      .from('restaurants')
      .update({ enabled_modules: modules })
      .eq('id', selectedRestaurant.id)

    setSavingModules(false)
    if (!error) {
      setSaveSuccess(true)
      // Update local state so the panel reflects current saved state
      setRestaurants(prev => prev.map(r =>
        r.id === selectedRestaurant.id ? { ...r, enabled_modules: modules } : r
      ))
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const enabledCount = (restaurant) => {
    const m = { ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) }
    return Object.values(m).filter(Boolean).length
  }

  const filteredRestaurants = restaurants.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return <div className="text-slate-500">Loading restaurants...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Restaurants</h1>
          <p className="text-slate-500">Manage all restaurant accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium capitalize ${
              filter === f
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f}
            {f === 'pending' && restaurants.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {restaurants.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Restaurants List */}
      {filteredRestaurants.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-slate-500">No {filter === 'all' ? '' : filter} restaurants found</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Restaurant</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Modules</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Registered</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{restaurant.name}</p>
                    <p className="text-sm text-slate-400">{restaurant.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{restaurant.email}</p>
                    {restaurant.phone && (
                      <p className="text-sm text-slate-400">{restaurant.phone}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(restaurant.status)}`}>
                      {restaurant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openModulePanel(restaurant)}
                      className="flex items-center gap-2 group"
                      title="Manage modules"
                    >
                      <div className="flex gap-0.5">
                        {MODULE_CONFIG.map(m => {
                          const active = { ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) }[m.key]
                          return (
                            <div
                              key={m.key}
                              className={`w-2 h-2 rounded-full transition-colors ${active ? 'bg-[#6262bd]' : 'bg-slate-200'}`}
                              title={m.label}
                            />
                          )
                        })}
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-[#6262bd] transition-colors">
                        {enabledCount(restaurant)}/{MODULE_CONFIG.length}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(restaurant.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {restaurant.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(restaurant.id, 'approved')}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(restaurant.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {restaurant.status === 'approved' && (
                        <button
                          onClick={() => updateStatus(restaurant.id, 'rejected')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                        >
                          Suspend
                        </button>
                      )}
                      {restaurant.status === 'rejected' && (
                        <button
                          onClick={() => updateStatus(restaurant.id, 'approved')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => openModulePanel(restaurant)}
                        className="px-3 py-1.5 bg-[#6262bd]/10 text-[#6262bd] rounded-lg text-sm font-medium hover:bg-[#6262bd]/20"
                      >
                        Modules
                      </button>
                      <button
                        onClick={() => handleImpersonate(restaurant)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                      >
                        Login as
                      </button>
                      <button
                        onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Module Management Panel */}
      {modulePanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={closeModulePanel}
          />

          {/* Slide-over panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Module Access</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedRestaurant?.name}
                </p>
              </div>
              <button
                onClick={closeModulePanel}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Module list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Toggle modules on or off for this restaurant
              </p>

              {MODULE_CONFIG.map((mod) => {
                const enabled = modules[mod.key] !== false
                return (
                  <button
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      enabled
                        ? 'border-[#6262bd]/30 bg-[#6262bd]/5'
                        : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      enabled ? 'bg-[#6262bd] text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {mod.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                        {mod.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        {mod.description}
                      </p>
                      {mod.includes && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mod.includes.map(item => (
                            <span key={item} className={`text-xs px-2 py-0.5 rounded-full ${enabled ? 'bg-[#6262bd]/10 text-[#6262bd]' : 'bg-slate-100 text-slate-400'}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Toggle */}
                    <div className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                      enabled ? 'bg-[#6262bd]' : 'bg-slate-200'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100">
              {saveSuccess && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  Changes saved successfully
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModulePanel}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveModules}
                  disabled={savingModules}
                  className="flex-1 px-4 py-3 bg-[#6262bd] text-white rounded-xl font-medium hover:bg-[#5151a8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingModules ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
