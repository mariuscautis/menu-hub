'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const initUser = async () => {
      // Check staff PIN session first
      const staffSessionData = localStorage.getItem('staff_session');
      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData);
          if (staffSession.id) {
            setUserId(staffSession.id);
            return;
          }
        } catch {}
      }
      // Fall back to Supabase auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId]);

  // Real-time subscription + 30s poll fallback
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    pollRef.current = setInterval(() => fetchNotifications(), 30000);

    return () => {
      channel.unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId]);

  // Refresh when dropdown is opened
  useEffect(() => {
    if (showDropdown && userId) fetchNotifications();
  }, [showDropdown]);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/notifications?user_id=${userId}&limit=20`);
      const result = await response.json();
      if (!response.ok) return;
      const data = result.notifications || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch {}
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, read: true })
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, read: true })
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'shift_published': return '📅';
      case 'request_approved': return '✅';
      case 'request_rejected': return '❌';
      case 'shift_assigned': return '👤';
      case 'new_request': return '📋';
      case 'shift_reminder': return '⏰';
      default: return '🔔';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (!userId) return null;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 dark:hover:text-zinc-200 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && createPortal(
        <>
          {/* Dark backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/50"
            onClick={() => setShowDropdown(false)}
          />

          {/* Modal — centered on all screen sizes */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md flex flex-col bg-white dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 shadow-2xl max-h-[80vh] pointer-events-auto">

            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 dark:text-zinc-100">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead}
                    className="text-xs text-[#6262bd] hover:text-[#4f4fa3] font-semibold px-2 py-1 rounded-sm hover:bg-[#6262bd]/10 transition-colors">
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Close notifications"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd] mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-300">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      className={`px-5 py-4 flex gap-3 cursor-pointer transition-colors active:scale-[0.99] ${
                        !notification.read
                          ? 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40'
                          : 'hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="text-xl flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug break-words ${
                          !notification.read
                            ? 'font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-100'
                            : 'text-zinc-700 dark:text-zinc-300 dark:text-zinc-300'
                        }`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5 leading-snug break-words">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#6262bd] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
