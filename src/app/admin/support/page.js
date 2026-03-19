'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_STYLES = {
  open:        { label: 'Open',        cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700' },
  closed:      { label: 'Closed',      cls: 'bg-slate-100 text-slate-600' },
}

const PRIORITY_STYLES = {
  normal: { label: 'Normal', cls: 'bg-slate-100 text-slate-600' },
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-600' },
}

const CATEGORY_LABELS = {
  billing: 'Billing',
  bug: 'Bug / Issue',
  feature: 'Feature Request',
  other: 'Other',
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Searchable venue dropdown component
function VenueDropdown({ venues, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = venues.find(v => v.id === value)
  const filtered = venues.filter(v =>
    !query || v.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (id) => {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white min-w-[200px] text-left"
      >
        <span className="flex-1 truncate text-slate-700">{selected ? selected.name : 'All Venues'}</span>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search venues…"
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            <button
              onClick={() => select(null)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!value ? 'bg-[#6262bd]/10 text-[#6262bd] font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              All Venues
            </button>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No venues found</div>
            ) : filtered.map(v => (
              <button
                key={v.id}
                onClick={() => select(v.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === v.id ? 'bg-[#6262bd]/10 text-[#6262bd] font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([])
  const [filtered, setFiltered] = useState([])
  const [venues, setVenues] = useState([]) // unique venues that have tickets
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [venueFilter, setVenueFilter] = useState(null)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
    fetchTickets()
  }, [])

  useEffect(() => {
    let result = tickets
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter)
    if (venueFilter) result = result.filter(t => t.restaurant_id === venueFilter)
    setFiltered(result)
  }, [tickets, statusFilter, priorityFilter, venueFilter])

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, restaurants(id, name)')
      .order('updated_at', { ascending: false })
    const rows = data || []
    setTickets(rows)

    // Build unique venues list from tickets
    const seen = new Set()
    const uniqueVenues = []
    rows.forEach(t => {
      if (t.restaurants && !seen.has(t.restaurants.id)) {
        seen.add(t.restaurants.id)
        uniqueVenues.push({ id: t.restaurants.id, name: t.restaurants.name })
      }
    })
    uniqueVenues.sort((a, b) => a.name.localeCompare(b.name))
    setVenues(uniqueVenues)
    setLoading(false)
  }

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setMessagesLoading(true)
    setReplyBody('')
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setMessagesLoading(false)
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return
    await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', selectedTicket.id)
    setSelectedTicket(prev => ({ ...prev, status: newStatus }))
    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
  }

  const handlePriorityChange = async (newPriority) => {
    if (!selectedTicket) return
    await supabase
      .from('support_tickets')
      .update({ priority: newPriority })
      .eq('id', selectedTicket.id)
    setSelectedTicket(prev => ({ ...prev, priority: newPriority }))
    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, priority: newPriority } : t))
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyBody.trim() || !selectedTicket || !user) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'support',
          body: replyBody,
        })
      })
      if (!res.ok) throw new Error('Failed to send reply')
      setReplyBody('')
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      if (selectedTicket.status === 'open') {
        await handleStatusChange('in_progress')
      }
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]" />
      </div>
    )
  }

  // Thread view
  if (selectedTicket) {
    const status = STATUS_STYLES[selectedTicket.status] || STATUS_STYLES.open
    const priority = PRIORITY_STYLES[selectedTicket.priority] || PRIORITY_STYLES.normal
    return (
      <div>
        <button
          onClick={() => { setSelectedTicket(null); fetchTickets() }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back to tickets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-1">{selectedTicket.subject}</h2>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>{priority.label}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
              </div>
            </div>

            <div className="space-y-3">
              {messagesLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd]" /></div>
              ) : messages.map(msg => {
                const isSupport = msg.sender_type === 'support'
                return (
                  <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isSupport
                        ? 'bg-[#6262bd] text-white rounded-br-sm'
                        : 'bg-white border-2 border-slate-100 text-slate-800 rounded-bl-sm'
                    }`}>
                      <div className={`text-xs mb-1 ${isSupport ? 'text-white/70' : 'text-slate-400'}`}>
                        {isSupport ? 'Support Team' : (selectedTicket.restaurants?.name || 'Venue')} · {formatDate(msg.created_at)}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleReply} className="bg-white border-2 border-slate-100 rounded-2xl p-4">
              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Reply as support team..."
                rows={3}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white text-slate-700 placeholder:text-slate-400 resize-none mb-3"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={sending || !replyBody.trim()} className="px-5 py-2 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a5] disabled:opacity-50 transition-colors">
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Ticket Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Venue</label>
                  <p className="text-sm text-slate-800">{selectedTicket.restaurants?.name || selectedTicket.restaurant_id}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Opened</label>
                  <p className="text-sm text-slate-800">{formatDate(selectedTicket.created_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Status</label>
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Priority</label>
                  <select
                    value={selectedTicket.priority}
                    onChange={e => handlePriorityChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-slate-500">Manage venue support requests</p>
        </div>
        <div className="text-sm font-medium text-slate-600">
          {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <VenueDropdown venues={venues} value={venueFilter} onChange={setVenueFilter} />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
        </select>
        {(venueFilter || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <button
            onClick={() => { setVenueFilter(null); setStatusFilter('all'); setPriorityFilter('all') }}
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border-2 border-slate-200 rounded-xl transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-slate-500">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const status = STATUS_STYLES[ticket.status] || STATUS_STYLES.open
            const priority = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.normal
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className="w-full text-left bg-white border-2 border-slate-100 hover:border-[#6262bd] rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 truncate group-hover:text-[#6262bd] transition-colors">{ticket.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                      {ticket.priority === 'urgent' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.cls}`}>{priority.label}</span>
                      )}
                      <span className="text-xs text-slate-400">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                      <span className="text-xs text-slate-500 font-medium">{ticket.restaurants?.name || ticket.restaurant_id}</span>
                      <span className="text-xs text-slate-400">{formatDate(ticket.updated_at)}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-[#6262bd] transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
