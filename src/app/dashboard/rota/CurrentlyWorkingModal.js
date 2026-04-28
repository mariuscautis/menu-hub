'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function CurrentlyWorkingModal({ restaurant, onClose }) {
  const t = useTranslations('rota.currentlyWorkingModal');
  const [activeStaff, setActiveStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockingOut, setClockingOut] = useState(null);
  const [now, setNow] = useState(new Date());

  // Live clock tick
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    fetchActiveStaff();
    const interval = setInterval(fetchActiveStaff, 30000);
    return () => clearInterval(interval);
  }, [restaurant]);

  const fetchActiveStaff = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({ restaurant_id: restaurant.id, date_from: today, date_to: today });
      const response = await fetch(`/api/rota/attendance?${params}`);
      const result = await response.json();
      if (result.attendance) {
        const todayAttendance = result.attendance.filter(att => att.shift && att.clock_in && att.shift.date === today);
        const sorted = todayAttendance.sort((a, b) => {
          if (!a.clock_out && b.clock_out) return -1;
          if (a.clock_out && !b.clock_out) return 1;
          return new Date(a.clock_in) - new Date(b.clock_in);
        });
        setActiveStaff(sorted);
      }
    } catch (error) {
      console.error('Error fetching active staff:', error);
    }
    setLoading(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeFromString = (ts) => ts ? ts.substring(0, 5) : '—';

  const calculateDuration = (clockIn, clockOut) => {
    if (!clockIn) return '0h 0m';
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : now;
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleManualClockOut = async (attendance) => {
    if (!confirm(t('confirmClockOut').replace('{name}', attendance.staff?.name))) return;
    setClockingOut(attendance.id);
    try {
      const response = await fetch('/api/rota/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: attendance.id, clock_out: new Date().toISOString() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to clock out');
      await fetchActiveStaff();
    } catch (error) {
      alert(t('errorClockOut').replace('{message}', error.message));
    }
    setClockingOut(null);
  };

  const getStatus = (att) => {
    if (att.clock_out) return { label: t('statusCompleted'), color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400', dot: 'bg-slate-400' };
    if (att.break_start && !att.break_end) return { label: t('statusOnBreak'), color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' };
    return { label: t('statusWorking'), color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' };
  };

  const working = activeStaff.filter(a => !a.clock_out);
  const onBreak = activeStaff.filter(a => a.break_start && !a.break_end && !a.clock_out);
  const completed = activeStaff.filter(a => a.clock_out);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-sm w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('title')}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">{t('subtitle')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xl font-bold transition-colors">×</button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex-shrink-0">
          {[
            { label: 'Currently working', value: working.length - onBreak.length, color: 'text-green-600', bg: 'bg-white dark:bg-zinc-800' },
            { label: 'On break', value: onBreak.length, color: 'text-amber-600', bg: 'bg-white dark:bg-zinc-800' },
            { label: 'Completed today', value: completed.length, color: 'text-zinc-600 dark:text-zinc-400 dark:text-zinc-400', bg: 'bg-white dark:bg-zinc-800' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} px-6 py-3 flex items-center gap-3`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('loading')}</p>
            </div>
          ) : activeStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
              <div className="text-5xl mb-4">👥</div>
              <p className="font-medium text-zinc-600 dark:text-zinc-400 text-lg">{t('noRecordsTitle')}</p>
              <p className="text-sm mt-2 text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('noRecordsSubtitle')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeStaff.map((att) => {
                const status = getStatus(att);
                const isActive = !att.clock_out;
                const duration = calculateDuration(att.clock_in, att.clock_out);

                return (
                  <div
                    key={att.id}
                    className={`flex items-center gap-4 px-5 py-4 rounded-sm border-2 transition-colors ${
                      isActive
                        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${isActive ? 'bg-green-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
                      {att.staff?.name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{att.staff?.name || t('unknown')}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1`}></span>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5 capitalize">
                        {att.shift?.role_required || att.staff?.role || t('na')}
                        {(att.staff?.department || att.shift?.department) && ` · ${att.staff?.department || att.shift?.department}`}
                      </p>
                    </div>

                    {/* Times */}
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Clocked in</p>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{formatTime(att.clock_in)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Clocked out</p>
                        <p className={`font-semibold ${att.clock_out ? 'text-zinc-700 dark:text-zinc-300 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 italic text-xs'}`}>
                          {att.clock_out ? formatTime(att.clock_out) : 'Still working'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Sched. end</p>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{formatTimeFromString(att.shift?.shift_end)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">Duration</p>
                        <p className={`font-semibold ${isActive ? 'text-green-600' : 'text-zinc-600 dark:text-zinc-400 dark:text-zinc-400'}`}>{duration}</p>
                      </div>
                    </div>

                    {/* Clock out button */}
                    <div className="flex-shrink-0">
                      {!att.clock_out && (
                        <button
                          onClick={() => handleManualClockOut(att)}
                          disabled={clockingOut === att.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-sm hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {clockingOut === att.id ? t('clockingOut') : t('clockOut')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500">Auto-refreshes every 30s</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 rounded-sm hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors font-medium">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
