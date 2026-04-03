'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRestaurant } from '@/lib/RestaurantContext'

const DEPARTMENT_OPTIONS = [
  { value: 'kitchen', label: '🍳 Kitchen' },
  { value: 'bar',     label: '🍸 Bar' },
  { value: 'universal', label: '🌐 Universal' },
]

function PrinterIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  )
}

export default function PrintersPage() {
  const restaurantCtx = useRestaurant()
  const restaurant = restaurantCtx?.restaurant

  const [printers, setPrinters] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state for adding a new printer
  const [newName, setNewName] = useState('')
  const [newDepartment, setNewDepartment] = useState('kitchen')
  const [showAddForm, setShowAddForm] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDepartment, setEditDepartment] = useState('')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!restaurant?.id) return
    fetchPrinters()
  }, [restaurant])

  async function fetchPrinters() {
    setLoading(true)
    const res = await fetch(`/api/printers?restaurant_id=${restaurant.id}`)
    const data = await res.json()
    setPrinters(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/printers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurant.id, name: newName.trim(), department: newDepartment }),
    })
    if (res.ok) {
      setNewName('')
      setNewDepartment('kitchen')
      setShowAddForm(false)
      await fetchPrinters()
      showToast('Printer added')
    } else {
      showToast('Failed to add printer', 'error')
    }
    setSaving(false)
  }

  async function handleSaveEdit(id) {
    setSaving(true)
    const res = await fetch('/api/printers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName.trim(), department: editDepartment }),
    })
    if (res.ok) {
      setEditingId(null)
      await fetchPrinters()
      showToast('Printer updated')
    } else {
      showToast('Failed to update printer', 'error')
    }
    setSaving(false)
  }

  async function handleToggleActive(printer) {
    await fetch('/api/printers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: printer.id, is_active: !printer.is_active }),
    })
    await fetchPrinters()
  }

  async function handleDelete(id) {
    if (!confirm('Remove this printer? Any pending print jobs will also be deleted.')) return
    const res = await fetch(`/api/printers?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchPrinters()
      showToast('Printer removed')
    } else {
      showToast('Failed to remove printer', 'error')
    }
  }

  function startEdit(printer) {
    setEditingId(printer.id)
    setEditName(printer.name)
    setEditDepartment(printer.department)
  }

  const cloudprntUrl = (printerId) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/cloudprnt/${printerId}`
      : `/api/cloudprnt/${printerId}`

  const deptLabel = (val) => DEPARTMENT_OPTIONS.find(d => d.value === val)?.label || val

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard/settings"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Printers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage Star CloudPRNT kitchen and bar printers
            </p>
          </div>
        </div>

        {/* How it works callout */}
        <div className="bg-[#6262bd]/8 dark:bg-[#6262bd]/15 border border-[#6262bd]/20 rounded-2xl p-4 mb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-[#6262bd] mb-1 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            How to connect a Star printer
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <li>Add a printer below and copy its CloudPRNT URL</li>
            <li>On the printer's web settings page, go to <strong>CloudPRNT</strong></li>
            <li>Enable CloudPRNT and paste the URL as the <strong>Server URL</strong></li>
            <li>Set the polling interval to <strong>3–5 seconds</strong></li>
            <li>Save — the printer will start polling and tickets will print automatically</li>
          </ol>
        </div>

        {/* Printer list */}
        {loading ? (
          <div className="text-slate-400 text-sm py-8 text-center">Loading printers…</div>
        ) : (
          <div className="space-y-3 mb-4">
            {printers.length === 0 && !showAddForm && (
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <PrinterIcon className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">No printers added yet</p>
              </div>
            )}

            {printers.map(printer => (
              <div
                key={printer.id}
                className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 transition-colors ${
                  printer.is_active
                    ? 'border-slate-100 dark:border-slate-700'
                    : 'border-slate-100 dark:border-slate-700 opacity-60'
                }`}
              >
                {editingId === printer.id ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Printer name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                    />
                    <select
                      value={editDepartment}
                      onChange={e => setEditDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
                    >
                      {DEPARTMENT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(printer.id)}
                        disabled={saving || !editName.trim()}
                        className="flex-1 py-2 rounded-xl bg-[#6262bd] hover:bg-[#5151a8] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display row ── */
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          printer.is_active
                            ? 'bg-[#6262bd]/10 dark:bg-[#6262bd]/20'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          <PrinterIcon className={`w-5 h-5 ${printer.is_active ? 'text-[#6262bd]' : 'text-slate-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{printer.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{deptLabel(printer.department)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Active toggle */}
                        <button
                          onClick={() => handleToggleActive(printer)}
                          title={printer.is_active ? 'Disable printer' : 'Enable printer'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            printer.is_active ? 'bg-[#6262bd]' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            printer.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                        <button
                          onClick={() => startEdit(printer)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(printer.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* CloudPRNT URL */}
                    <div className="mt-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate flex-1 select-all">
                        {cloudprntUrl(printer.id)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cloudprntUrl(printer.id))
                          showToast('URL copied')
                        }}
                        className="text-slate-400 hover:text-[#6262bd] transition-colors flex-shrink-0"
                        title="Copy URL"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add printer form */}
        {showAddForm ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-[#6262bd]/30 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">New printer</p>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Kitchen Printer"
              autoFocus
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
            />
            <select
              value={newDepartment}
              onChange={e => setNewDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6262bd]"
            >
              {DEPARTMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#6262bd] hover:bg-[#5151a8] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add printer'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); setNewDepartment('kitchen') }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#6262bd] hover:text-[#6262bd] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add printer
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-[#6262bd]'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
