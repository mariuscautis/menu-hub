'use client';

/**
 * Cash Drawer Management Page
 *
 * This page allows restaurant managers to:
 * 1. Open a new cash drawer session with an opening amount
 * 2. View the current session status (cash in drawer, expected amount)
 * 3. Close the drawer with a counted amount and see variance
 * 4. View history of past drawer sessions
 *
 * The cash drawer links to orders and refunds to automatically track
 * expected cash amounts based on cash sales and refunds.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function CashDrawerPage() {
  const t = useTranslations('cashDrawer');

  // Restaurant and user state
  const [restaurant, setRestaurant] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cash drawer state
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    cashSales: 0,
    cashTips: 0,
    cashRefunds: 0,
    expectedAmount: 0
  });

  // Modal states
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch restaurant data on mount
  useEffect(() => {
    fetchRestaurantAndUser();
  }, []);

  // Fetch cash drawer data when restaurant is loaded
  useEffect(() => {
    if (restaurant?.id) {
      fetchCurrentSession();
      fetchSessionHistory();
    }
  }, [restaurant?.id]);

  /**
   * Fetches the current user and their associated restaurant
   * Handles both owner and staff-admin authentication
   */
  const fetchRestaurantAndUser = async () => {
    try {
      // Check for staff session (PIN login)
      const staffSessionData = localStorage.getItem('staff_session');
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData);
        setRestaurant(staffSession.restaurant);
        setCurrentUser({
          name: staffSession.name,
          email: staffSession.email,
          id: staffSession.staff_id
        });
        setLoading(false);
        return;
      }

      // Check for Supabase auth (owner)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch restaurant where user is owner
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedRestaurant) {
        setRestaurant(ownedRestaurant);
        setCurrentUser({
          name: user.email?.split('@')[0] || 'Owner',
          email: user.email,
          id: user.id
        });
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the current open cash drawer session for this restaurant
   * A restaurant can only have one open session at a time (enforced by DB constraint)
   */
  const fetchCurrentSession = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('cash_drawer_sessions')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;

      setCurrentSession(data);

      // If we have an open session, calculate the current stats
      if (data) {
        await calculateSessionStats(data.id, data.opening_amount);
      }
    } catch (error) {
      console.error('Error fetching current session:', error);
    }
  };

  /**
   * Calculates the expected cash drawer amount based on:
   * - Opening amount
   * - Cash sales during the session
   * - Cash tips during the session
   * - Cash refunds during the session (subtracted)
   */
  const calculateSessionStats = async (sessionId, openingAmount) => {
    if (!restaurant?.id || !sessionId) return;

    try {
      // Get cash sales for this drawer session
      // Orders linked to this drawer session with payment_method = 'cash'
      const { data: cashOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total, tip_amount')
        .eq('cash_drawer_session_id', sessionId)
        .eq('payment_method', 'cash')
        .eq('paid', true);

      if (ordersError) throw ordersError;

      // Sum up cash sales and tips
      const cashSales = cashOrders?.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) || 0;
      const cashTips = cashOrders?.reduce((sum, order) => sum + parseFloat(order.tip_amount || 0), 0) || 0;

      // Get cash refunds for this drawer session
      const { data: cashRefunds, error: refundsError } = await supabase
        .from('refunds')
        .select('refund_amount')
        .eq('cash_drawer_session_id', sessionId)
        .eq('refund_method', 'cash');

      if (refundsError) throw refundsError;

      const totalRefunds = cashRefunds?.reduce((sum, refund) => sum + parseFloat(refund.refund_amount || 0), 0) || 0;

      // Calculate expected amount
      const expected = parseFloat(openingAmount) + cashSales + cashTips - totalRefunds;

      setSessionStats({
        cashSales,
        cashTips,
        cashRefunds: totalRefunds,
        expectedAmount: expected
      });
    } catch (error) {
      console.error('Error calculating session stats:', error);
    }
  };

  /**
   * Fetches the history of closed cash drawer sessions
   * Limited to the last 30 sessions for performance
   */
  const fetchSessionHistory = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('cash_drawer_sessions')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSessionHistory(data || []);
    } catch (error) {
      console.error('Error fetching session history:', error);
    }
  };

  /**
   * Opens a new cash drawer session
   * Validates that no session is already open (handled by DB constraint too)
   */
  const handleOpenDrawer = async () => {
    if (!restaurant?.id || !currentUser) return;
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      alert(t('invalidOpeningAmount') || 'Please enter a valid opening amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('cash_drawer_sessions')
        .insert({
          restaurant_id: restaurant.id,
          opened_by_name: currentUser.name,
          opened_by_id: currentUser.id,
          opening_amount: parseFloat(openingAmount),
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        // Check if it's a unique constraint violation (drawer already open)
        if (error.code === '23505') {
          alert(t('drawerAlreadyOpen') || 'A cash drawer is already open. Please close it first.');
        } else {
          throw error;
        }
        return;
      }

      setCurrentSession(data);
      setSessionStats({
        cashSales: 0,
        cashTips: 0,
        cashRefunds: 0,
        expectedAmount: parseFloat(openingAmount)
      });
      setShowOpenModal(false);
      setOpeningAmount('');
    } catch (error) {
      console.error('Error opening drawer:', error);
      alert(t('errorOpening') || 'Failed to open cash drawer');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Closes the current cash drawer session
   * Calculates variance between counted amount and expected amount
   */
  const handleCloseDrawer = async () => {
    if (!currentSession || !currentUser) return;
    if (!closingAmount || parseFloat(closingAmount) < 0) {
      alert(t('invalidClosingAmount') || 'Please enter a valid closing amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the RPC function to close the drawer which calculates variance
      const { data, error } = await supabase.rpc('close_cash_drawer', {
        p_session_id: currentSession.id,
        p_closing_amount: parseFloat(closingAmount),
        p_closed_by_name: currentUser.name,
        p_closed_by_id: currentUser.id,
        p_notes: closeNotes || null
      });

      if (error) throw error;

      // Refresh data
      setCurrentSession(null);
      setSessionStats({
        cashSales: 0,
        cashTips: 0,
        cashRefunds: 0,
        expectedAmount: 0
      });
      fetchSessionHistory();
      setShowCloseModal(false);
      setClosingAmount('');
      setCloseNotes('');

      // Show variance result
      if (data && data[0]) {
        const variance = parseFloat(data[0].variance);
        if (variance !== 0) {
          const varianceText = variance > 0
            ? `+${formatCurrency(variance)} (${t('over') || 'over'})`
            : `${formatCurrency(variance)} (${t('short') || 'short'})`;
          alert(`${t('drawerClosed') || 'Drawer closed successfully!'}\n\n${t('variance') || 'Variance'}: ${varianceText}`);
        } else {
          alert(t('drawerClosedPerfect') || 'Drawer closed successfully! No variance.');
        }
      }
    } catch (error) {
      console.error('Error closing drawer:', error);
      alert(t('errorClosing') || 'Failed to close cash drawer');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Formats a number as currency (GBP)
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  /**
   * Formats a date/time for display
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Formats a date for display (without time)
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * Calculates the duration between two dates
   */
  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end) - new Date(start);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
        </div>
      </div>
    );
  }

  // No restaurant found
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <p className="text-slate-600 dark:text-slate-400">{t('noRestaurant') || 'No restaurant found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {t('title') || 'Cash Drawer'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('subtitle') || 'Manage cash drawer sessions and track variance'}
        </p>
      </div>

      {/* Current Session Card */}
      <div className="mb-8">
        {currentSession ? (
          // Active Session View
          <div className="bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {t('drawerOpen') || 'Drawer Open'}
                </h2>
              </div>
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
              >
                {t('closeDrawer') || 'Close Drawer'}
              </button>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {t('openedBy') || 'Opened By'}
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentSession.opened_by_name}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {t('openedAt') || 'Opened At'}
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateTime(currentSession.opened_at)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {t('openingAmount') || 'Opening Amount'}
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(currentSession.opening_amount)}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                  {t('expectedAmount') || 'Expected Amount'}
                </p>
                <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                  {formatCurrency(sessionStats.expectedAmount)}
                </p>
              </div>
            </div>

            {/* Cash Breakdown */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                {t('cashBreakdown') || 'Cash Breakdown'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">{t('openingFloat') || 'Opening Float'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(currentSession.opening_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-green-600 dark:text-green-400">{t('cashSales') || 'Cash Sales'}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(sessionStats.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400">{t('cashTips') || 'Cash Tips'}</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    +{formatCurrency(sessionStats.cashTips)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-red-600 dark:text-red-400">{t('cashRefunds') || 'Cash Refunds'}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(sessionStats.cashRefunds)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // No Active Session - Open Drawer Prompt
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              {t('noActiveSession') || 'No Active Session'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('noActiveSessionDesc') || 'Start a new cash drawer session to begin tracking cash transactions.'}
            </p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-8 py-4 bg-[#6262bd] hover:bg-[#5252ad] text-white font-semibold rounded-xl transition-colors"
            >
              {t('openDrawer') || 'Open Cash Drawer'}
            </button>
          </div>
        )}
      </div>

      {/* Session History */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
          {t('sessionHistory') || 'Session History'}
        </h2>

        {sessionHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              {t('noHistory') || 'No previous sessions found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('date') || 'Date'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('openedBy') || 'Opened By'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('opening') || 'Opening'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('expected') || 'Expected'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('actual') || 'Actual'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('variance') || 'Variance'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('duration') || 'Duration'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.map((session) => {
                  const variance = parseFloat(session.variance || 0);
                  const varianceClass = variance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : variance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-400';

                  return (
                    <tr key={session.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">
                        {formatDate(session.opened_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {session.opened_by_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                        {formatCurrency(session.opening_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                        {formatCurrency(session.expected_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                        {formatCurrency(session.closing_amount)}
                      </td>
                      <td className={`py-3 px-4 text-sm font-semibold text-right ${varianceClass}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDuration(session.opened_at, session.closed_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Drawer Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {t('openDrawer') || 'Open Cash Drawer'}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('openDrawerDesc') || 'Enter the opening float amount to start a new cash drawer session.'}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('openingAmount') || 'Opening Amount'} *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd]"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {t('openingAmountHint') || 'Count the cash in the drawer and enter the total'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setOpeningAmount('');
                }}
                className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleOpenDrawer}
                disabled={isSubmitting || !openingAmount}
                className="flex-1 px-4 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252ad] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (t('opening') || 'Opening...') : (t('openDrawerBtn') || 'Open Drawer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Drawer Modal */}
      {showCloseModal && currentSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {t('closeDrawer') || 'Close Cash Drawer'}
            </h3>

            {/* Expected Amount Display */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {t('expectedAmount') || 'Expected Amount'}
              </p>
              <p className="text-2xl font-bold text-[#6262bd]">
                {formatCurrency(sessionStats.expectedAmount)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {t('expectedBreakdown') || 'Opening'}: {formatCurrency(currentSession.opening_amount)} +
                {t('sales') || 'Sales'}: {formatCurrency(sessionStats.cashSales)} +
                {t('tips') || 'Tips'}: {formatCurrency(sessionStats.cashTips)} -
                {t('refunds') || 'Refunds'}: {formatCurrency(sessionStats.cashRefunds)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('countedAmount') || 'Counted Amount'} *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd]"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {/* Live variance display */}
              {closingAmount && (
                <div className={`mt-3 p-3 rounded-lg ${
                  parseFloat(closingAmount) - sessionStats.expectedAmount > 0
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : parseFloat(closingAmount) - sessionStats.expectedAmount < 0
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <span className="font-medium">{t('variance') || 'Variance'}: </span>
                  <span className="font-bold">
                    {parseFloat(closingAmount) - sessionStats.expectedAmount > 0 ? '+' : ''}
                    {formatCurrency(parseFloat(closingAmount) - sessionStats.expectedAmount)}
                  </span>
                  {parseFloat(closingAmount) !== sessionStats.expectedAmount && (
                    <span className="text-sm ml-2">
                      ({parseFloat(closingAmount) > sessionStats.expectedAmount
                        ? (t('over') || 'over')
                        : (t('short') || 'short')})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('notes') || 'Notes'} ({t('optional') || 'optional'})
              </label>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd] resize-none"
                rows={2}
                placeholder={t('notesPlaceholder') || 'Add any notes about variance...'}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setClosingAmount('');
                  setCloseNotes('');
                }}
                className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleCloseDrawer}
                disabled={isSubmitting || !closingAmount}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (t('closing') || 'Closing...') : (t('closeDrawerBtn') || 'Close Drawer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
