'use client';

/**
 * X-Report (Shift Report)
 *
 * The X-Report is similar to the Z-Report but designed for mid-shift checks.
 * Key differences from Z-Report:
 * - Shows data from the start of the current cash drawer session
 * - Can be run multiple times without closing the day
 * - Displays "as of" timestamp to indicate it's a snapshot
 * - Requires an open cash drawer session to function
 *
 * Use cases:
 * - Shift handover (checking what happened during previous shift)
 * - Mid-day cash checks
 * - Real-time monitoring of sales
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function XReportPage() {
  const t = useTranslations('xReport');
  const tZ = useTranslations('zReport'); // Reuse Z-Report translations for common terms

  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Current drawer session
  const [currentSession, setCurrentSession] = useState(null);

  // Report data (same structure as Z-Report)
  const [reportData, setReportData] = useState({
    grossSales: 0,
    discountTotal: 0,
    netSales: 0,
    taxCollected: 0,
    cashTotal: 0,
    cardTotal: 0,
    splitBillsTotal: 0,
    cashSalesAndTips: 0,
    cashRefundsTotal: 0,
    totalTips: 0,
    cashTips: 0,
    cardTips: 0,
    voidsCount: 0,
    voidsTotal: 0,
    refundsCount: 0,
    refundsTotal: 0,
    totalOrders: 0,
    dineInOrders: 0,
    takeawayOrders: 0,
    avgOrderValue: 0,
    staffSummary: []
  });

  // Fetch restaurant on mount
  useEffect(() => {
    fetchRestaurant();
  }, []);

  // Fetch data when restaurant is loaded
  useEffect(() => {
    if (restaurant?.id) {
      fetchCurrentSession();
    }
  }, [restaurant?.id]);

  // Fetch report data when session changes
  useEffect(() => {
    if (currentSession) {
      fetchReportData();
    }
  }, [currentSession, lastRefresh]);

  /**
   * Fetches the current user's restaurant
   */
  const fetchRestaurant = async () => {
    try {
      const staffSessionData = localStorage.getItem('staff_session');
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData);
        setRestaurant(staffSession.restaurant);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedRestaurant) {
        setRestaurant(ownedRestaurant);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the current open cash drawer session
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
    } catch (error) {
      console.error('Error fetching current session:', error);
    }
  };

  /**
   * Fetches report data for the current session
   * Only includes orders since the drawer was opened
   */
  const fetchReportData = async () => {
    if (!restaurant?.id || !currentSession) return;

    setLoading(true);
    try {
      // Get orders since drawer was opened
      const sessionStart = currentSession.opened_at;

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', sessionStart);

      if (ordersError) throw ordersError;

      // Calculate all metrics (same logic as Z-Report)
      let grossSales = 0;
      let discountTotal = 0;
      let taxCollected = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let splitBillsTotal = 0;
      let totalTips = 0;
      let cashTips = 0;
      let cardTips = 0;
      let dineInOrders = 0;
      let takeawayOrders = 0;
      const staffStats = {};

      orders?.forEach(order => {
        const orderSubtotal = parseFloat(order.subtotal || order.total || 0);
        const orderDiscount = parseFloat(order.discount_total || 0);
        const orderTax = parseFloat(order.tax_amount || 0);
        const orderTotal = parseFloat(order.total || 0);
        const orderTip = parseFloat(order.tip_amount || 0);

        grossSales += orderSubtotal;
        discountTotal += orderDiscount;
        taxCollected += orderTax;
        totalTips += orderTip;

        if (order.payment_method === 'cash') {
          cashTotal += orderTotal;
          cashTips += orderTip;
        } else if (order.payment_method === 'card') {
          cardTotal += orderTotal;
          cardTips += orderTip;
        } else if (order.payment_method === 'split') {
          splitBillsTotal += orderTotal;
        }

        if (order.order_type === 'takeaway') {
          takeawayOrders++;
        } else {
          dineInOrders++;
        }

        const staffName = order.payment_taken_by_name || 'Unknown';
        if (!staffStats[staffName]) {
          staffStats[staffName] = {
            name: staffName,
            paymentsProcessed: 0,
            totalProcessed: 0
          };
        }
        staffStats[staffName].paymentsProcessed++;
        staffStats[staffName].totalProcessed += orderTotal;
      });

      const netSales = grossSales - discountTotal;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? netSales / totalOrders : 0;
      const cashSalesAndTips = cashTotal + cashTips;

      // Fetch refunds for this session
      const { data: refunds } = await supabase
        .from('refunds')
        .select('*')
        .eq('cash_drawer_session_id', currentSession.id);

      const refundsCount = refunds?.length || 0;
      const refundsTotal = refunds?.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0;
      const cashRefundsTotal = refunds?.filter(r => r.refund_method === 'cash')
        .reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0;

      // Fetch voids for this session
      const { data: voids } = await supabase
        .from('voids')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', sessionStart);

      const voidsCount = voids?.length || 0;
      const voidsTotal = voids?.reduce((sum, v) => sum + parseFloat(v.void_amount || 0), 0) || 0;

      const staffSummary = Object.values(staffStats).sort((a, b) => b.totalProcessed - a.totalProcessed);

      setReportData({
        grossSales,
        discountTotal,
        netSales,
        taxCollected,
        cashTotal,
        cardTotal,
        splitBillsTotal,
        cashSalesAndTips,
        cashRefundsTotal,
        totalTips,
        cashTips,
        cardTips,
        voidsCount,
        voidsTotal,
        refundsCount,
        refundsTotal,
        totalOrders,
        dineInOrders,
        takeawayOrders,
        avgOrderValue,
        staffSummary
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refreshes the report data
   */
  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading && !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
        </div>
      </div>
    );
  }

  // No restaurant
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <p className="text-slate-600 dark:text-slate-400">No restaurant found</p>
      </div>
    );
  }

  // No active session
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('title') || 'X-Report'}
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t('noActiveSession') || 'No active cash drawer session'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t('openDrawerFirst') || 'Open a cash drawer to start tracking shift data'}
          </p>
          <Link
            href="/dashboard/cash-drawer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('goToCashDrawer') || 'Go to Cash Drawer'}
          </Link>
        </div>
      </div>
    );
  }

  // Calculate expected drawer amount
  const expectedDrawer = parseFloat(currentSession.opening_amount) +
    reportData.cashSalesAndTips -
    reportData.cashRefundsTotal;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">
            {t('title') || 'X-Report'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('subtitle')?.replace('{time}', formatTime(lastRefresh)) || `Current shift report as of ${formatTime(lastRefresh)}`}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('refreshData') || 'Refresh Data'}
        </button>
      </div>

      {/* Shift Status Banner */}
      <div className="mb-6 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <p className="font-semibold text-green-700 dark:text-green-300">
              {t('shiftInProgress') || 'Shift in Progress'}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Started by {currentSession.opened_by_name} at {formatDateTime(currentSession.opened_at)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-green-600 dark:text-green-400">{t('currentStatus') || 'Current status - drawer still open'}</p>
          <p className="text-xs text-green-500">{t('runMultipleTimes') || 'This report can be run multiple times without closing the day'}</p>
        </div>
      </div>

      {/* Report Content - Reusing Z-Report structure */}
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tZ('netSales') || 'Net Sales'}</p>
            <p className="text-2xl font-bold text-[#6262bd]">{formatCurrency(reportData.netSales)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tZ('totalOrders') || 'Total Orders'}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{reportData.totalOrders}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tZ('totalTips') || 'Total Tips'}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(reportData.totalTips)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Expected in Drawer</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(expectedDrawer)}</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
            {tZ('paymentBreakdown') || 'Payment Breakdown'}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-green-600 dark:text-green-400">{tZ('cash') || 'Cash'}</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(reportData.cashTotal)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400">{tZ('card') || 'Card'}</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(reportData.cardTotal)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-purple-600 dark:text-purple-400">{tZ('splitBills') || 'Split Bills'}</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(reportData.splitBillsTotal)}</p>
            </div>
          </div>
        </div>

        {/* Cash Drawer Status */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
            {tZ('cashDrawer') || 'Cash Drawer'}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{tZ('openingAmount') || 'Opening Amount'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(currentSession.opening_amount)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{tZ('cashSalesAndTips') || 'Cash Sales + Tips'}</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                +{formatCurrency(reportData.cashSalesAndTips)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{tZ('cashRefunds') || 'Cash Refunds'}</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(reportData.cashRefundsTotal)}
              </span>
            </div>
            <div className="flex justify-between py-3 bg-amber-50 dark:bg-amber-900/30 px-3 rounded-lg">
              <span className="font-bold text-amber-700 dark:text-amber-300">Expected in Drawer</span>
              <span className="font-bold text-amber-700 dark:text-amber-300 text-xl">
                {formatCurrency(expectedDrawer)}
              </span>
            </div>
          </div>
        </div>

        {/* Voids & Refunds */}
        {(reportData.voidsCount > 0 || reportData.refundsCount > 0) && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              {tZ('voidsAndRefunds') || 'Voids & Refunds'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">{tZ('totalVoids') || 'Total Voids'}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(reportData.voidsTotal)}
                </p>
                <p className="text-xs text-amber-500 mt-1">{reportData.voidsCount} items</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{tZ('totalRefunds') || 'Total Refunds'}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(reportData.refundsTotal)}
                </p>
                <p className="text-xs text-red-500 mt-1">{reportData.refundsCount} transactions</p>
              </div>
            </div>
          </div>
        )}

        {/* Staff Summary */}
        {reportData.staffSummary.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              {tZ('staffSummary') || 'Staff Summary'}
            </h2>
            <div className="space-y-2">
              {reportData.staffSummary.map((staff, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{staff.name}</span>
                  <div className="text-right">
                    <span className="font-bold text-[#6262bd]">{formatCurrency(staff.totalProcessed)}</span>
                    <span className="text-sm text-slate-500 ml-2">({staff.paymentsProcessed} payments)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
