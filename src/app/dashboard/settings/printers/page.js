'use client'

import { useState, useEffect } from 'react'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { useVenoBridge } from '@/hooks/useVenoBridge'

const RECEIPT_TRIGGER = 'receipt'

export default function PrintersSettings() {
  const restaurantCtx  = useRestaurant()
  const restaurant     = restaurantCtx?.restaurant
  const isOwnerOrAdmin = restaurantCtx?.userType === 'owner' || restaurantCtx?.userType === 'staff-admin'
  const supabase       = useAdminSupabase()
  const { isConnected, setPrinters } = useVenoBridge(restaurant)

  const [printers, setPrintersState]   = useState([])
  const [departments, setDepartments]  = useState([])
  const [loading, setLoading]          = useState(true)
  const [saving, setSaving]            = useState(false)
  const [showForm, setShowForm]        = useState(false)
  const [editingId, setEditingId]      = useState(null)
  const [notification, setNotification] = useState(null)
  const [form, setForm] = useState({
    name: '',
    connection_type: 'wifi',
    ip_address: '',
    port: 9100,
    bt_address: '',
    departments: [],
    is_active: true,
  })

  const showNotif = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    if (!restaurant?.id) return
    fetchData()
  }, [restaurant?.id])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: printersData }, { data: deptData }] = await Promise.all([
      supabase.from('printers').select('*').eq('restaurant_id', restaurant.id).order('created_at'),
      supabase.from('department_permissions').select('department_name').eq('restaurant_id', restaurant.id).order('department_name'),
    ])
    setPrintersState(printersData || [])
    setDepartments(deptData?.map(d => d.department_name) || ['kitchen', 'bar'])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ name: '', connection_type: 'wifi', ip_address: '', port: 9100, bt_address: '', departments: [], is_active: true })
    setEditingId(null)
    setShowForm(false)
  }

  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (printer) => {
    setForm({
      name: printer.name || '',
      connection_type: printer.connection_type || 'wifi',
      ip_address: printer.ip_address || '',
      port: printer.port || 9100,
      bt_address: printer.bt_address || '',
      departments: printer.departments || [],
      is_active: printer.is_active !== false,
    })
    setEditingId(printer.id)
    setShowForm(true)
  }

  const toggleDept = (dept) => {
    setForm(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept],
    }))
  }

  const savePrinter = async () => {
    if (!form.name.trim()) { showNotif('error', 'Printer name is required'); return }
    if (form.departments.length === 0) { showNotif('error', 'Assign at least one department or Receipt'); return }
    if (form.connection_type === 'wifi' && !form.ip_address.trim()) { showNotif('error', 'IP address is required for WiFi printers'); return }
    if (form.connection_type === 'bluetooth' && !form.bt_address.trim()) { showNotif('error', 'Bluetooth address is required'); return }

    setSaving(true)
    const payload = {
      restaurant_id: restaurant.id,
      name: form.name.trim(),
      department: form.departments[0],
      connection_type: form.connection_type,
      ip_address: form.connection_type === 'wifi' ? form.ip_address.trim() : null,
      port: form.connection_type === 'wifi' ? (parseInt(form.port) || 9100) : null,
      bt_address: form.connection_type === 'bluetooth' ? form.bt_address.trim() : null,
      departments: form.departments,
      is_active: form.is_active,
    }

    let error
    if (editingId) {
      ;({ error } = await supabase.from('printers').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('printers').insert(payload))
    }

    if (error) {
      showNotif('error', 'Failed to save printer: ' + error.message)
      setSaving(false)
      return
    }

    await fetchData()
    const { data: all } = await supabase.from('printers').select('*').eq('restaurant_id', restaurant.id)
    setPrinters(all || [])

    showNotif('success', editingId ? 'Printer updated' : 'Printer added')
    resetForm()
    setSaving(false)
  }

  const deletePrinter = async (id) => {
    if (!confirm('Delete this printer?')) return
    await supabase.from('printers').delete().eq('id', id)
    await fetchData()
    const { data: all } = await supabase.from('printers').select('*').eq('restaurant_id', restaurant.id)
    setPrinters(all || [])
    showNotif('success', 'Printer deleted')
  }

  const toggleActive = async (printer) => {
    const newValue = !printer.is_active
    setPrintersState(prev => prev.map(p => p.id === printer.id ? { ...p, is_active: newValue } : p))
    await supabase.from('printers').update({ is_active: newValue }).eq('id', printer.id)
    const { data: all } = await supabase.from('printers').select('*').eq('restaurant_id', restaurant.id)
    setPrinters(all || [])
    setPrintersState(all || [])
  }

  const deptLabel = (dept) => dept === RECEIPT_TRIGGER ? 'Receipt (on payment)' : dept.charAt(0).toUpperCase() + dept.slice(1)

  const allTriggers = [RECEIPT_TRIGGER, ...departments]

  return (
    <OfflinePageGuard>
      <div className="overflow-x-hidden">
        {isOwnerOrAdmin && <PageTabs tabs={settingsTabs} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Printers
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Configure thermal printers for kitchen tickets, bar tickets, and payment receipts.
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
          isConnected
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          {isConnected ? 'Veno Bridge connected' : 'Veno Bridge not connected'}
        </div>

        {notification && (
          <div className={`mb-4 p-3 rounded-sm text-sm ${
            notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
          }`}>
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="text-zinc-400 text-sm">Loading printers…</div>
        ) : (
          <div className="space-y-4">
            {printers.length === 0 && !showForm && (
              <div className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-sm text-center">
                <p className="text-zinc-400 text-sm mb-3">No printers configured yet.</p>
                <button onClick={openAdd} className="px-4 py-2 bg-[#6262bd] text-white text-sm font-medium rounded-sm hover:bg-indigo-600 transition-colors">
                  Add your first printer
                </button>
              </div>
            )}

            {printers.map(printer => (
              <div key={printer.id} className={`p-4 rounded-sm border-2 ${printer.is_active ? 'border-slate-100 dark:border-slate-700' : 'border-dashed border-zinc-200 dark:border-zinc-700 opacity-60'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{printer.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        printer.connection_type === 'wifi'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {printer.connection_type === 'wifi' ? `WiFi ${printer.ip_address}:${printer.port || 9100}` : `Bluetooth ${printer.bt_address}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(printer.departments || []).map(dept => (
                        <span key={dept} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium">
                          {deptLabel(dept)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(printer)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${printer.is_active ? 'bg-[#6262bd]' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                      title={printer.is_active ? 'Disable' : 'Enable'}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${printer.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => openEdit(printer)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deletePrinter(printer.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {showForm && (
              <div className="p-5 border-2 border-[#6262bd]/40 dark:border-[#6262bd]/30 rounded-sm bg-indigo-50/30 dark:bg-indigo-900/10">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                  {editingId ? 'Edit Printer' : 'Add Printer'}
                </h3>
                <div className="space-y-4">

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Printer Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Kitchen Printer"
                      className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Connection Type</label>
                    <div className="flex gap-3">
                      {['wifi', 'bluetooth'].map(ct => (
                        <button
                          key={ct}
                          onClick={() => setForm(f => ({ ...f, connection_type: ct }))}
                          className={`px-4 py-2 text-sm rounded-sm border-2 font-medium transition-colors ${
                            form.connection_type === ct
                              ? 'border-[#6262bd] bg-[#6262bd] text-white'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-[#6262bd]/50'
                          }`}
                        >
                          {ct === 'wifi' ? 'WiFi' : 'Bluetooth'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.connection_type === 'wifi' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">IP Address</label>
                        <input
                          type="text"
                          value={form.ip_address}
                          onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
                          placeholder="192.168.1.50"
                          className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Port</label>
                        <input
                          type="number"
                          value={form.port}
                          onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                        />
                      </div>
                    </div>
                  )}

                  {form.connection_type === 'bluetooth' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Bluetooth Address</label>
                      <input
                        type="text"
                        value={form.bt_address}
                        onChange={e => setForm(f => ({ ...f, bt_address: e.target.value }))}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Triggers — what does this printer handle?</label>
                    <div className="flex flex-wrap gap-2">
                      {allTriggers.map(trigger => (
                        <button
                          key={trigger}
                          onClick={() => toggleDept(trigger)}
                          className={`px-3 py-1.5 text-xs rounded-full border-2 font-medium transition-colors ${
                            form.departments.includes(trigger)
                              ? 'border-[#6262bd] bg-[#6262bd] text-white'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-[#6262bd]/50'
                          }`}
                        >
                          {deptLabel(trigger)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5">
                      "Receipt (on payment)" prints the bill when a table pays. Department triggers print order tickets when items are sent to that station.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={savePrinter}
                      disabled={saving}
                      className="px-4 py-2 bg-[#6262bd] text-white text-sm font-medium rounded-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : editingId ? 'Update Printer' : 'Add Printer'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {printers.length > 0 && !showForm && (
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-sm text-sm text-zinc-500 dark:text-zinc-400 hover:border-[#6262bd]/50 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors w-full justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Printer
              </button>
            )}
          </div>
        )}
      </div>
    </OfflinePageGuard>
  )
}
