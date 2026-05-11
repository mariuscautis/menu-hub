'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import { useCurrency } from '@/lib/CurrencyContext';
import { useModuleGuard } from '@/hooks/useModuleGuard';
import PageTabs from '@/components/PageTabs';
import { reportsTabs } from '@/components/PageTabsConfig';
import OfflinePageGuard from '@/components/OfflinePageGuard';
import InfoTooltip from '@/components/InfoTooltip';

// Each preset returns [fromDateStr, toDateStr] as YYYY-MM-DD
const PRESETS = [
  {
    key: 'thisMonth',
    labelKey: 'presetThisMonth',
    getValue: () => {
      const today = new Date();
      const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      return [start, today.toISOString().split('T')[0]];
    },
  },
  {
    key: 'today',
    labelKey: 'presetToday',
    getValue: () => {
      const d = new Date().toISOString().split('T')[0];
      return [d, d];
    },
  },
  {
    key: 'yesterday',
    labelKey: 'presetYesterday',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().split('T')[0];
      return [s, s];
    },
  },
  {
    key: 'thisWeek',
    labelKey: 'presetThisWeek',
    getValue: () => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(today);
      mon.setDate(diff);
      return [mon.toISOString().split('T')[0], today.toISOString().split('T')[0]];
    },
  },
  {
    key: 'lastWeek',
    labelKey: 'presetLastWeek',
    getValue: () => {
      const today = new Date();
      const day = today.getDay();
      const thisMon = new Date(today);
      thisMon.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      const lastMon = new Date(thisMon);
      lastMon.setDate(lastMon.getDate() - 7);
      const lastSun = new Date(thisMon);
      lastSun.setDate(lastSun.getDate() - 1);
      return [lastMon.toISOString().split('T')[0], lastSun.toISOString().split('T')[0]];
    },
  },
  {
    key: 'lastMonth',
    labelKey: 'presetLastMonth',
    getValue: () => {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
    },
  },
  { key: 'custom', labelKey: 'presetCustom', getValue: null },
];

export default function CashDrawerReportPage() {
  useModuleGuard('reports');
  const t = useTranslations('cashDrawerReport');
  const tg = useTranslations('guide');
  const { formatCurrency } = useCurrency();
  const restaurantCtx = useRestaurant();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default to This Month
  const [activePreset, setActivePreset] = useState('thisMonth');
  const defaultDates = PRESETS[0].getValue();
  const [fromDate, setFromDate] = useState(defaultDates[0]);
  const [toDate, setToDate] = useState(defaultDates[1]);

  const [staffFilter, setStaffFilter] = useState('all');

  // All closed sessions for the date range (unfiltered by staff)
  const [allSessions, setAllSessions] = useState([]);

  // Derived from allSessions after applying staffFilter
  const [filteredSessions, setFilteredSessions] = useState([]);

  // Unique staff names from allSessions
  const [staffNames, setStaffNames] = useState([]);

  useEffect(() => {
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant);
    }
  }, [restaurantCtx]);

  // Re-derive staff list and filtered sessions whenever raw data or filter changes
  useEffect(() => {
    const names = [...new Set(allSessions.map((s) => s.opened_by_name).filter(Boolean))].sort();
    setStaffNames(names);
    setFilteredSessions(
      staffFilter === 'all' ? allSessions : allSessions.filter((s) => s.opened_by_name === staffFilter)
    );
  }, [allSessions, staffFilter]);

  const fetchSessions = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_drawer_sessions')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'closed')
        .gte('opened_at', `${fromDate}T00:00:00.000Z`)
        .lte('opened_at', `${toDate}T23:59:59.999Z`)
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setAllSessions(data || []);
    } catch (err) {
      console.error('Error fetching cash drawer sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) fetchSessions();
  }, [restaurant?.id, fromDate, toDate]);

  const handlePreset = (preset) => {
    if (preset.key === 'custom') {
      setActivePreset('custom');
      return;
    }
    const [from, to] = preset.getValue();
    setActivePreset(preset.key);
    setFromDate(from);
    setToDate(to);
  };

  // Aggregate summary stats from filteredSessions
  const summary = filteredSessions.reduce(
    (acc, s) => {
      const variance = parseFloat(s.variance || 0);
      acc.totalSessions += 1;
      acc.totalCashHandled += parseFloat(s.expected_amount || 0);
      acc.netVariance += variance;
      if (variance > 0) acc.totalOver += variance;
      if (variance < 0) acc.totalShort += variance;
      return acc;
    },
    { totalSessions: 0, totalCashHandled: 0, netVariance: 0, totalOver: 0, totalShort: 0 }
  );

  // Per-staff breakdown grouped by opened_by_name
  const staffBreakdown = Object.values(
    filteredSessions.reduce((acc, s) => {
      const name = s.opened_by_name || 'Unknown';
      if (!acc[name]) acc[name] = { name, sessions: 0, totalCashHandled: 0, totalVariance: 0 };
      acc[name].sessions += 1;
      acc[name].totalCashHandled += parseFloat(s.expected_amount || 0);
      acc[name].totalVariance += parseFloat(s.variance || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.sessions - a.sessions);

  const formatDateTime = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end) - new Date(start);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const varianceClass = (v) => {
    const n = parseFloat(v || 0);
    if (n > 0) return 'text-green-600 dark:text-green-400';
    if (n < 0) return 'text-red-600 dark:text-red-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const varianceLabel = (v) => {
    const n = parseFloat(v || 0);
    return `${n > 0 ? '+' : ''}${formatCurrency(n)}`;
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen p-8">
        <p className="text-zinc-600 dark:text-zinc-400">{t('noRestaurant')}</p>
      </div>
    );
  }

  return (
    <OfflinePageGuard>
      <div className="min-h-screen p-4 md:p-8">
        <PageTabs tabs={reportsTabs} />

        {/* Header */}
        <div className="mb-8 mt-6">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
            {t('title')}
            <InfoTooltip text={tg('cash_drawer_desc')} />
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 mb-6">
          {/* Preset pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePreset(preset)}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                  activePreset === preset.key
                    ? 'bg-[#6262bd] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>

          {/* Date inputs + staff filter */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('from')}</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setActivePreset('custom'); }}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm focus:outline-none focus:border-[#6262bd]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('to')}</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setActivePreset('custom'); }}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm focus:outline-none focus:border-[#6262bd]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('filterByStaff')}</label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm focus:outline-none focus:border-[#6262bd]"
              >
                <option value="all">{t('allStaff')}</option>
                {staffNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-10 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">{t('noSessions')}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('totalSessions')}</p>
                <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{summary.totalSessions}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('totalCashHandled')}</p>
                <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.totalCashHandled)}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{t('totalVariance')}</p>
                <p className={`text-2xl font-bold ${varianceClass(summary.netVariance)}`}>
                  {varianceLabel(summary.netVariance)}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-sm p-4">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('totalOver')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{formatCurrency(summary.totalOver)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-sm p-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">{t('totalShort')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalShort)}</p>
              </div>
            </div>

            {/* Per-Staff Breakdown */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">{t('staffBreakdown')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('staffMember')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('sessions')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('totalCashHandled')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('totalVariance')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('avgVariance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffBreakdown.map((row) => (
                      <tr key={row.name} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">{row.name}</td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400 text-right">{row.sessions}</td>
                        <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 text-right">{formatCurrency(row.totalCashHandled)}</td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${varianceClass(row.totalVariance)}`}>
                          {varianceLabel(row.totalVariance)}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${varianceClass(row.totalVariance / row.sessions)}`}>
                          {varianceLabel(row.totalVariance / row.sessions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Full Session History */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">{t('sessionHistory')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('date')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('openedBy')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('closedBy')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('opening')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('expected')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('actual')}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('variance')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('duration')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr key={session.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {formatDateTime(session.opened_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">{session.opened_by_name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">{session.closed_by_name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 text-right">
                          {formatCurrency(session.opening_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 text-right">
                          {formatCurrency(session.expected_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 text-right">
                          {formatCurrency(session.closing_amount)}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${varianceClass(session.variance)}`}>
                          {varianceLabel(session.variance)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDuration(session.opened_at, session.closed_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                          {session.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </OfflinePageGuard>
  );
}
