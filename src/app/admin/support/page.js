'use client'

import { useState, useEffect } from 'react'
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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
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
    setFiltered(result)
  }, [tickets, statusFilter, priorityFilter])

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, restaurants(id, name)')
      .order('updated_at', { ascending: false })
    setTickets(data || [])
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

    // Mark venue messages as read (from admin's perspective — optional, not used for admin badge)
    // We update support messages is_read when venue reads them, not here
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
      // Refetch messages
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      // Auto set to in_progress if still open
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
      <div className="flex gap-3 mb-6 flex-wrap">
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
