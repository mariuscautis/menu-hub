'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_INDUSTRY_CATEGORIES = [
  { value: 'restaurant',    label: 'Restaurant / Café / Bar' },
  { value: 'beauty',        label: 'Beauty & Wellness' },
  { value: 'fitness',       label: 'Fitness & Sport' },
  { value: 'hotel',         label: 'Hotel & Accommodation' },
  { value: 'entertainment', label: 'Entertainment & Events' },
  { value: 'health',        label: 'Health & Medical' },
  { value: 'education',     label: 'Education & Tutoring' },
  { value: 'other',         label: 'Other' },
]

const MODULE_CONFIG = [
  {
    key: 'ordering',
    abbr: 'O&M',
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
    abbr: 'Res',
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
    abbr: 'Rota',
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
    abbr: 'Ana',
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
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)

  // Suspension state
  const [suspendPanelOpen, setSuspendPanelOpen] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [suspensionMessage, setSuspensionMessage] = useState('')
  const [suspending, setSuspending] = useState(false)

  // Module panel state
  const [modulePanelOpen, setModulePanelOpen] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [modules, setModules] = useState({})
  const [trialEndsAt, setTrialEndsAt] = useState('')
  const [industryCategory, setIndustryCategory] = useState('')
  const [industryCategories, setIndustryCategories] = useState([])
  const [savingModules, setSavingModules] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchRestaurants()
    fetchIndustryCategories()
  }, [])

  const fetchIndustryCategories = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()
    setIndustryCategories(data?.value ?? DEFAULT_INDUSTRY_CATEGORIES)
  }

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })
    // Only show non-deleted restaurants here; deleted ones are on the separate page
    setRestaurants((data || []).filter(r => !r.deleted_at))
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase
      .from('restaurants')
      .update({ status })
      .eq('id', id)

    fetchRestaurants()
  }

  const openSuspendPanel = (restaurant) => {
    setSuspendTarget(restaurant)
    setSuspensionMessage(restaurant.suspension_message || '')
    setSuspendPanelOpen(true)
  }

  const confirmSuspend = async () => {
    if (!suspendTarget) return
    setSuspending(true)
    await supabase
      .from('restaurants')
      .update({ status: 'rejected', suspension_message: suspensionMessage.trim() || null })
      .eq('id', suspendTarget.id)
    setSuspending(false)
    setSuspendPanelOpen(false)
    setSuspendTarget(null)
    setSuspensionMessage('')
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
    if (!confirm(`Are you sure you want to delete "${name}"? The record will be kept and can be reinstated later.`)) {
      return
    }
    await supabase
      .from('restaurants')
      .update({ deleted_at: new Date().toISOString(), status: 'rejected' })
      .eq('id', id)
    fetchRestaurants()
  }

  const reinstateRestaurant = async (restaurant) => {
    if (!confirm(`Reinstate "${restaurant.name}"? They will be redirected to billing to subscribe.`)) return
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
    fetchRestaurants()
  }

  const openModulePanel = (restaurant) => {
    setSelectedRestaurant(restaurant)
    setModules({ ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) })
    // Convert ISO string to local date string for the date input (YYYY-MM-DD)
    setTrialEndsAt(restaurant.trial_ends_at ? restaurant.trial_ends_at.substring(0, 10) : '')
    setIndustryCategory(restaurant.industry_category || '')
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

    const updates = { enabled_modules: modules }
    // Save trial_ends_at — store as midnight UTC on the chosen date, or null if cleared
    updates.trial_ends_at = trialEndsAt ? new Date(trialEndsAt).toISOString() : null
    updates.industry_category = industryCategory || null

    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', selectedRestaurant.id)

    setSavingModules(false)
    if (!error) {
      setSaveSuccess(true)
      setRestaurants(prev => prev.map(r =>
        r.id === selectedRestaurant.id ? { ...r, enabled_modules: modules, trial_ends_at: updates.trial_ends_at, industry_category: updates.industry_category } : r
      ))
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const enabledCount = (restaurant) => {
    const m = { ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) }
    return MODULE_CONFIG.filter(mod => m[mod.key] !== false).length
  }

  const filteredRestaurants = restaurants.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (filterCategory === '__unassigned' && r.industry_category) return false
    if (filterCategory !== 'all' && filterCategory !== '__unassigned' && r.industry_category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q)
      )
    }
    return true
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

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
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
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-[#6262bd] cursor-pointer"
        >
          <option value="all">All industries</option>
          {industryCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
          <option value="__unassigned">Unassigned</option>
        </select>
        <div className="relative ml-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or slug…"
            className="pl-9 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#6262bd] w-64"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Restaurants List */}
      {filteredRestaurants.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-slate-500">
            {search ? `No restaurants matching "${search}"` : `No ${filter === 'all' ? '' : filter + ' '}restaurants found`}
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Restaurant</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Subscription</th>
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
                    {restaurant.industry_category && (() => {
                      const cat = industryCategories.find(c => c.value === restaurant.industry_category)
                      return cat ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[#6262bd]/10 text-[#6262bd]">
                          {cat.label}
                        </span>
                      ) : null
                    })()}
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
                    {(() => {
                      const sub    = restaurant.subscription_status || 'trialing'
                      const plans  = (restaurant.subscription_plans || '').split(',').filter(Boolean)
                      const PLAN_LABELS = { orders: 'Orders', bookings: 'Bookings', team: 'Team' }
                      const badgeColor = {
                        trialing: 'bg-blue-100 text-blue-700',
                        active:   'bg-green-100 text-green-700',
                        past_due: 'bg-amber-100 text-amber-700',
                        canceled: 'bg-red-100 text-red-700',
                        unpaid:   'bg-red-100 text-red-700',
                      }[sub] || 'bg-slate-100 text-slate-600'
                      return (
                        <div className="flex flex-col gap-1">
                          {plans.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {plans.map(p => (
                                <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#6262bd]/10 text-[#6262bd]">
                                  {PLAN_LABELS[p] || p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">None</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${badgeColor}`}>
                            {sub.replace('_', ' ')}
                          </span>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openModulePanel(restaurant)}
                      className="flex items-center gap-2 group"
                      title="Manage modules"
                    >
                      {MODULE_CONFIG.map((m, i) => {
                        const active = { ...DEFAULT_MODULES, ...(restaurant.enabled_modules || {}) }[m.key] !== false
                        return (
                          <span key={m.key} className="flex items-center gap-2">
                            {i > 0 && <span className="text-slate-200 select-none">·</span>}
                            <span
                              title={m.label}
                              className={`text-xs font-medium transition-colors ${
                                active ? 'text-[#6262bd]' : 'text-slate-300 line-through'
                              }`}
                            >
                              {m.abbr}
                            </span>
                          </span>
                        )
                      })}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(restaurant.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-2">
                      {/* Primary status action — always visible */}
                      {restaurant.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(restaurant.id, 'approved')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          Approve
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

                      {/* ⋯ dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === restaurant.id ? null : restaurant.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                          </svg>
                        </button>

                        {openMenuId === restaurant.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                              <button
                                onClick={() => { openModulePanel(restaurant); setOpenMenuId(null) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/></svg>
                                Modules & category
                              </button>
                              <button
                                onClick={() => { handleImpersonate(restaurant); setOpenMenuId(null) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                Login as venue
                              </button>
                              {restaurant.status === 'pending' && (
                                <button
                                  onClick={() => { updateStatus(restaurant.id, 'rejected'); setOpenMenuId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                  Reject
                                </button>
                              )}
                              {restaurant.status === 'approved' && (
                                <button
                                  onClick={() => { openSuspendPanel(restaurant); setOpenMenuId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                  Suspend
                                </button>
                              )}
                              {restaurant.status === 'rejected' && (
                                <button
                                  onClick={() => { openSuspendPanel(restaurant); setOpenMenuId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                  Edit suspension
                                </button>
                              )}
                              <div className="border-t border-slate-100 mt-1 pt-1">
                                <button
                                  onClick={() => { deleteRestaurant(restaurant.id, restaurant.name); setOpenMenuId(null) }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
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

            {/* Industry category */}
            <div className="px-6 pb-4 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Industry Category</p>
              <p className="text-xs text-slate-400 mb-3">Used to filter peer reviews shown to venue managers. Customers only see overall ratings from venues in the same category.</p>
              <select
                value={industryCategory}
                onChange={e => setIndustryCategory(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#6262bd]"
              >
                <option value="">— Not assigned —</option>
                {industryCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {industryCategories.length === 0 && (
                <p className="text-xs text-slate-400 mt-1.5">No categories defined yet — add them in Platform Settings.</p>
              )}
            </div>

            {/* Trial period */}
            <div className="px-6 pb-4 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Free Trial</p>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Trial ends on
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={trialEndsAt}
                  onChange={e => setTrialEndsAt(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#6262bd]"
                />
                <button
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 14)
                    setTrialEndsAt(d.toISOString().substring(0, 10))
                  }}
                  className="px-3 py-2 text-xs font-medium text-[#6262bd] border-2 border-[#6262bd]/30 rounded-xl hover:bg-[#6262bd]/5 whitespace-nowrap"
                >
                  +14 days
                </button>
                <button
                  onClick={() => setTrialEndsAt('')}
                  className="px-3 py-2 text-xs font-medium text-slate-500 border-2 border-slate-200 rounded-xl hover:bg-slate-50 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
              {trialEndsAt && (
                <p className="text-xs text-slate-400 mt-1.5">
                  {(() => {
                    const days = Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
                    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                    if (days === 0) return 'Expires today'
                    return `${days} day${days === 1 ? '' : 's'} remaining`
                  })()}
                </p>
              )}
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

      {/* Suspend confirmation modal */}
      {suspendPanelOpen && suspendTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSuspendPanelOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Suspend account</h3>
              <p className="text-sm text-slate-500 mb-5">
                Suspending <strong>{suspendTarget.name}</strong> will show them a message and block dashboard access.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Message to show the user <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={suspensionMessage}
                onChange={e => setSuspensionMessage(e.target.value)}
                rows={3}
                placeholder="e.g. Your account has been suspended due to unpaid invoices. Please contact us to resolve this."
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 resize-none mb-5"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setSuspendPanelOpen(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSuspend}
                  disabled={suspending}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors text-sm"
                >
                  {suspending ? 'Suspending…' : 'Confirm suspend'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
