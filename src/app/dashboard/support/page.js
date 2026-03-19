'use client'

import { useState, useEffect, useRef } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { supabase } from '@/lib/supabase'

const STATUS_STYLES = {
  open:        { label: 'Open',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  closed:      { label: 'Closed',      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
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

export default function SupportPage() {
  const restaurantCtx = useRestaurant()
  const adminSupabase = useAdminSupabase()
  const [restaurant, setRestaurant] = useState(null)
  const [user, setUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'bug', body: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    setRestaurant(restaurantCtx.restaurant)
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
  }, [restaurantCtx])

  useEffect(() => {
    if (!restaurant) return
    fetchTickets()
  }, [restaurant])

  const fetchTickets = async () => {
    const { data } = await adminSupabase
      .from('support_tickets')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('updated_at', { ascending: false })

    if (data) {
      // Fetch unread counts per ticket
      const ticketIds = data.map(t => t.id)
      let unreadMap = {}
      if (ticketIds.length > 0) {
        const { data: unread } = await adminSupabase
          .from('support_messages')
          .select('ticket_id')
          .in('ticket_id', ticketIds)
          .eq('sender_type', 'support')
          .eq('is_read', false)
        if (unread) {
          unread.forEach(m => { unreadMap[m.ticket_id] = (unreadMap[m.ticket_id] || 0) + 1 })
        }
      }
      setTickets(data.map(t => ({ ...t, unreadCount: unreadMap[t.id] || 0 })))
    }
    setLoading(false)
  }

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setMessagesLoading(true)
    setReplyBody('')

    // Fetch messages
    const { data } = await adminSupabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setMessagesLoading(false)

    // Mark admin messages as read
    await adminSupabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticket.id)
      .eq('sender_type', 'support')
      .eq('is_read', false)

    // Update local unread count and notify layout to clear badge immediately
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, unreadCount: 0 } : t))
    window.dispatchEvent(new CustomEvent('support-read'))

    // Subscribe to new messages
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`support-messages-${ticket.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticket.id}`
      }, () => {
        adminSupabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            if (data) setMessages(data)
          })
      })
      .subscribe()
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  const handleNewTicketSubmit = async (e) => {
    e.preventDefault()
    if (!newTicket.subject.trim() || !newTicket.body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          created_by: user?.id,
          subject: newTicket.subject,
          category: newTicket.category,
          body: newTicket.body,
          restaurant_name: restaurant.name,
          user_email: user?.email,
        })
      })
      if (!res.ok) throw new Error('Failed to submit ticket')
      setShowNewTicket(false)
      setNewTicket({ subject: '', category: 'bug', body: '' })
      await fetchTickets()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyBody.trim() || !selectedTicket) return
    setSending(true)
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          sender_id: user?.id,
          sender_type: 'venue',
          body: replyBody,
        })
      })
      if (!res.ok) throw new Error('Failed to send reply')
      setReplyBody('')
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]" />
      </div>
    )
  }

  // Thread view
  if (selectedTicket) {
    const status = STATUS_STYLES[selectedTicket.status] || STATUS_STYLES.open
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => { setSelectedTicket(null); fetchTickets() }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Back to tickets
          </button>

          {/* Ticket header */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{selectedTicket.subject}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
                  <span className="text-xs text-slate-400">{formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 mb-4">
            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd]" />
              </div>
            ) : messages.map(msg => {
              const isVenue = msg.sender_type === 'venue'
              return (
                <div key={msg.id} className={`flex ${isVenue ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isVenue
                      ? 'bg-[#6262bd] text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}>
                    <div className={`text-xs mb-1 ${isVenue ? 'text-white/70' : 'text-slate-400'}`}>
                      {isVenue ? 'You' : 'Support Team'} · {formatDate(msg.created_at)}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply form — only if not closed/resolved */}
          {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
            <form onSubmit={handleReply} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none mb-3"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !replyBody.trim()}
                  className="px-5 py-2 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a5] disabled:opacity-50 transition-colors"
                >
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 text-sm text-slate-400">This ticket is {selectedTicket.status}. Open a new ticket if you need further help.</div>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">Support</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Get help from our team</p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a5] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            New Ticket
          </button>
        </div>

        {/* New ticket form */}
        {showNewTicket && (
          <div className="bg-white dark:bg-slate-900 border-2 border-[#6262bd]/30 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">New Support Ticket</h2>
            <form onSubmit={handleNewTicketSubmit} className="space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={e => setNewTicket(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <option value="bug">Bug / Issue</option>
                    <option value="billing">Billing</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    required
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  value={newTicket.body}
                  onChange={e => setNewTicket(p => ({ ...p, body: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowNewTicket(false); setError(null) }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a5] disabled:opacity-50 transition-colors">
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tickets list */}
        {tickets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6262bd]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6262bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">No support tickets yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Submit a ticket and our team will get back to you.</p>
            <button onClick={() => setShowNewTicket(true)} className="px-4 py-2 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a5] transition-colors">
              Open your first ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const status = STATUS_STYLES[ticket.status] || STATUS_STYLES.open
              return (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className="w-full text-left bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-[#6262bd] dark:hover:border-[#6262bd] rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#6262bd] transition-colors">{ticket.subject}</span>
                        {ticket.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-2 h-2 bg-[#6262bd] rounded-full" title="Unread reply" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                        <span className="text-xs text-slate-400">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                        <span className="text-xs text-slate-400">{formatDate(ticket.updated_at)}</span>
                      </div>
                    </div>
                    {ticket.unreadCount > 0 && (
                      <span className="flex-shrink-0 bg-[#6262bd] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {ticket.unreadCount} new
                      </span>
                    )}
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-[#6262bd] transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
