'use client';

/**
 * Z-Report (Daily Closeout Report)
 *
 * The Z-Report is the most critical daily report for restaurant managers.
 * It provides a complete snapshot of the day's financial activity including:
 *
 * 1. Sales Summary - Gross sales, discounts, net sales, tax
 * 2. Payment Breakdown - Cash vs card vs split bills
 * 3. Cash Drawer - Opening, expected, actual, variance
 * 4. Tips Summary - Total tips broken down by payment method
 * 5. Voids & Refunds - Items voided before payment, refunds after payment
 * 6. Order Summary - Total orders, dine-in vs takeaway, average order value
 * 7. Staff Summary - Who processed orders and payments
 *
 * This report is designed to be printed or exported as PDF at the end of each day.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function ZReportPage() {
  const t = useTranslations('zReport');
  const printRef = useRef(null);

  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Report data state
  const [reportData, setReportData] = useState({
    // Sales Summary
    grossSales: 0,
    discountTotal: 0,
    netSales: 0,
    taxCollected: 0,

    // Payment Breakdown
    cashTotal: 0,
    cardTotal: 0,
    splitBillsTotal: 0,

    // Cash Drawer
    drawerSession: null,
    cashSalesAndTips: 0,
    cashRefundsTotal: 0,

    // Tips
    totalTips: 0,
    cashTips: 0,
    cardTips: 0,

    // Voids & Refunds
    voidsCount: 0,
    voidsTotal: 0,
    refundsCount: 0,
    refundsTotal: 0,

    // Orders
    totalOrders: 0,
    dineInOrders: 0,
    takeawayOrders: 0,
    avgOrderValue: 0,

    // Staff
    staffSummary: []
  });

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Fetch restaurant on mount
  useEffect(() => {
    fetchRestaurant();
  }, []);

  // Fetch report data when restaurant or date changes
  useEffect(() => {
    if (restaurant?.id) {
      fetchReportData();
    }
  }, [restaurant?.id, selectedDate]);

  /**
   * Fetches the current user's restaurant
   */
  const fetchRestaurant = async () => {
    try {
      // Check for staff session (PIN login)
      const staffSessionData = localStorage.getItem('staff_session');
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData);
        setRestaurant(staffSession.restaurant);
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
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches all data needed for the Z-Report
   * This aggregates data from multiple tables for the selected date
   */
  const fetchReportData = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Define date boundaries for the query
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      // Fetch all orders for the day (paid orders only for financial reports)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (ordersError) throw ordersError;

      // Calculate sales summary from orders
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

      // Staff tracking
      const staffStats = {};

      // Get restaurant's default tax rate for calculating VAT when not stored on order
      const defaultTaxRate = parseFloat(restaurant.menu_sales_tax_rate || 20);

      orders?.forEach(order => {
        // Calculate gross sales (subtotal if available, otherwise total + discount)
        const orderSubtotal = parseFloat(order.subtotal || order.total || 0);
        const orderDiscount = parseFloat(order.discount_total || 0);
        const orderTotal = parseFloat(order.total || 0);
        const orderTip = parseFloat(order.tip_amount || 0);

        // Calculate tax: use stored tax_amount if available, otherwise calculate from total
        // VAT formula: tax = total - (total / (1 + rate/100))
        // This extracts the VAT already included in the price
        let orderTax = parseFloat(order.tax_amount || 0);
        if (orderTax === 0 && orderTotal > 0 && defaultTaxRate > 0) {
          // Calculate VAT included in the total price
          orderTax = orderTotal - (orderTotal / (1 + defaultTaxRate / 100));
        }

        grossSales += orderSubtotal;
        discountTotal += orderDiscount;
        taxCollected += orderTax;
        totalTips += orderTip;

        // Payment method breakdown
        if (order.payment_method === 'cash') {
          cashTotal += orderTotal;
          cashTips += orderTip;
        } else if (order.payment_method === 'card') {
          cardTotal += orderTotal;
          cardTips += orderTip;
        } else if (order.payment_method === 'split') {
          splitBillsTotal += orderTotal;
        }

        // Order type
        if (order.order_type === 'takeaway') {
          takeawayOrders++;
        } else {
          dineInOrders++;
        }

        // Staff tracking
        const staffName = order.payment_taken_by_name || 'Unknown';
        if (!staffStats[staffName]) {
          staffStats[staffName] = {
            name: staffName,
            ordersProcessed: 0,
            paymentsProcessed: 0,
            totalProcessed: 0
          };
        }
        staffStats[staffName].paymentsProcessed++;
        staffStats[staffName].totalProcessed += orderTotal;
      });

      // Net sales = gross - discounts (tax is separate)
      const netSales = grossSales - discountTotal;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? netSales / totalOrders : 0;

      // Fetch cash drawer session for the day
      const { data: drawerSession } = await supabase
        .from('cash_drawer_sessions')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('opened_at', startOfDay)
        .lte('opened_at', endOfDay)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate cash drawer stats
      let cashSalesAndTips = cashTotal + cashTips;

      // Fetch refunds for the day
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (refundsError) {
        console.warn('Error fetching refunds (table may not exist yet):', refundsError);
      }

      const refundsCount = refunds?.length || 0;
      const refundsTotal = refunds?.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0;
      const cashRefundsTotal = refunds?.filter(r => r.refund_method === 'cash')
        .reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0;

      // Fetch voids for the day
      const { data: voids, error: voidsError } = await supabase
        .from('voids')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (voidsError) {
        console.warn('Error fetching voids (table may not exist yet):', voidsError);
      }

      const voidsCount = voids?.length || 0;
      const voidsTotal = voids?.reduce((sum, v) => sum + parseFloat(v.void_amount || 0), 0) || 0;

      // Convert staff stats to array and sort by total processed
      const staffSummary = Object.values(staffStats)
        .sort((a, b) => b.totalProcessed - a.totalProcessed);

      // Update report data state
      setReportData({
        grossSales,
        discountTotal,
        netSales,
        taxCollected,
        cashTotal,
        cardTotal,
        splitBillsTotal,
        drawerSession,
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
   * Formats a number as currency (GBP)
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  /**
   * Formats the selected date for display
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  /**
   * Handles print functionality
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Check if viewing today
   */
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

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
      {/* Header - Hidden when printing */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">
            {t('title') || 'Z-Report'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('subtitle')?.replace('{date}', formatDate(selectedDate)) || `Daily closeout report for ${formatDate(selectedDate)}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd]"
          />

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('printReport') || 'Print Report'}
          </button>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <h2 className="text-xl font-semibold mt-2">Z-REPORT (Daily Closeout)</h2>
          <p className="text-sm mt-1">{formatDate(selectedDate)}</p>
          <p className="text-xs mt-1">Generated: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>

      {/* Loading indicator while fetching data */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading report data...</p>
        </div>
      )}

      {/* Report Content */}
      {!loading && (
        <div ref={printRef} className="space-y-6 print:space-y-4">
          {/* No Data State */}
          {reportData.totalOrders === 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center print:border print:rounded-none">
              <p className="text-slate-600 dark:text-slate-400">
                {t('noData') || 'No data available for this day'}
              </p>
            </div>
          )}

          {/* Sales Summary */}
          {reportData.totalOrders > 0 && (
            <>
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('salesSummary') || 'Sales Summary'}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{t('grossSales') || 'Gross Sales'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(reportData.grossSales)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{t('discounts') || 'Discounts'}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(reportData.discountTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">{t('taxCollected') || 'Tax Collected'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(reportData.taxCollected)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-slate-50 dark:bg-slate-800 px-3 rounded-lg print:bg-gray-100">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t('netSales') || 'Net Sales'}</span>
                    <span className="font-bold text-[#6262bd] text-xl print:text-base">{formatCurrency(reportData.netSales)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('paymentBreakdown') || 'Payment Breakdown'}
                </h2>
                <div className="grid grid-cols-3 gap-4 print:gap-2">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-green-600 dark:text-green-400">{t('cash') || 'Cash'}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 print:text-base">
                      {formatCurrency(reportData.cashTotal)}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t('card') || 'Card'}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 print:text-base">
                      {formatCurrency(reportData.cardTotal)}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-purple-600 dark:text-purple-400">{t('splitBills') || 'Split Bills'}</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400 print:text-base">
                      {formatCurrency(reportData.splitBillsTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cash Drawer */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('cashDrawer') || 'Cash Drawer'}
                </h2>
                {reportData.drawerSession ? (
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{t('openingAmount') || 'Opening Amount'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(reportData.drawerSession.opening_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{t('cashSalesAndTips') || 'Cash Sales + Tips'}</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +{formatCurrency(reportData.cashSalesAndTips)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{t('cashRefunds') || 'Cash Refunds'}</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(reportData.cashRefundsTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">{t('expectedClosing') || 'Expected Closing'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(reportData.drawerSession.expected_amount)}
                      </span>
                    </div>
                    {reportData.drawerSession.status === 'closed' ? (
                      <>
                        <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400">{t('actualClosing') || 'Actual Closing'}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(reportData.drawerSession.closing_amount)}
                          </span>
                        </div>
                        <div className={`flex justify-between py-3 px-3 rounded-lg ${
                          parseFloat(reportData.drawerSession.variance || 0) === 0
                            ? 'bg-slate-50 dark:bg-slate-800'
                            : parseFloat(reportData.drawerSession.variance || 0) > 0
                              ? 'bg-green-50 dark:bg-green-900/30'
                              : 'bg-red-50 dark:bg-red-900/30'
                        } print:bg-gray-100`}>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{t('variance') || 'Variance'}</span>
                          <span className={`font-bold ${
                            parseFloat(reportData.drawerSession.variance || 0) === 0
                              ? 'text-slate-800 dark:text-slate-200'
                              : parseFloat(reportData.drawerSession.variance || 0) > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}>
                            {parseFloat(reportData.drawerSession.variance || 0) > 0 ? '+' : ''}
                            {formatCurrency(reportData.drawerSession.variance)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-3 px-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-center print:bg-gray-100">
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {t('drawerNotClosed') || 'Drawer not closed yet'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 dark:text-slate-400">
                    {t('noDrawerSession') || 'No drawer session for this day'}
                  </div>
                )}
              </div>

              {/* Tips Summary */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('tipsSummary') || 'Tips Summary'}
                </h2>
                <div className="grid grid-cols-3 gap-4 print:gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalTips') || 'Total Tips'}</p>
                    <p className="text-xl font-bold text-[#6262bd] print:text-base">
                      {formatCurrency(reportData.totalTips)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-green-600 dark:text-green-400">{t('cashTips') || 'Cash Tips'}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 print:text-base">
                      {formatCurrency(reportData.cashTips)}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t('cardTips') || 'Card Tips'}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 print:text-base">
                      {formatCurrency(reportData.cardTips)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voids & Refunds */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('voidsAndRefunds') || 'Voids & Refunds'}
                </h2>
                <div className="grid grid-cols-2 gap-4 print:gap-2">
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 print:p-2 print:rounded-none">
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t('totalVoids') || 'Total Voids'}</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 print:text-base">
                      {formatCurrency(reportData.voidsTotal)}
                    </p>
                    <p className="text-xs text-amber-500 mt-1">
                      {reportData.voidsCount} {t('voidItems') || 'void items'}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 print:p-2 print:rounded-none">
                    <p className="text-sm text-red-600 dark:text-red-400">{t('totalRefunds') || 'Total Refunds'}</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400 print:text-base">
                      {formatCurrency(reportData.refundsTotal)}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      {reportData.refundsCount} {t('refundTransactions') || 'refund transactions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                  {t('orderSummary') || 'Order Summary'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalOrders') || 'Total Orders'}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 print:text-xl">
                      {reportData.totalOrders}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('dineIn') || 'Dine-in'}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 print:text-xl">
                      {reportData.dineInOrders}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('takeaway') || 'Takeaway'}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 print:text-xl">
                      {reportData.takeawayOrders}
                    </p>
                  </div>
                  <div className="bg-[#6262bd]/10 dark:bg-[#6262bd]/30 rounded-xl p-4 text-center print:p-2 print:rounded-none">
                    <p className="text-sm text-[#6262bd]">{t('avgOrderValue') || 'Avg Order Value'}</p>
                    <p className="text-2xl font-bold text-[#6262bd] print:text-xl">
                      {formatCurrency(reportData.avgOrderValue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff Summary */}
              {reportData.staffSummary.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 print:border print:rounded-none print:p-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 print:text-base">
                    {t('staffSummary') || 'Staff Summary'}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                          <th className="text-left py-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            Staff
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('paymentsProcessed') || 'Payments Processed'}
                          </th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.staffSummary.map((staff, index) => (
                          <tr key={index} className="border-b border-slate-50 dark:border-slate-800">
                            <td className="py-2 px-3 text-sm text-slate-800 dark:text-slate-200">
                              {staff.name}
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                              {staff.paymentsProcessed}
                            </td>
                            <td className="py-2 px-3 text-sm font-semibold text-[#6262bd] text-right">
                              {formatCurrency(staff.totalProcessed)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Print Footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-black text-center text-xs">
            <p>--- End of Z-Report ---</p>
            <p className="mt-1">Generated by Menu Hub</p>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .dark\\:bg-slate-900,
          .dark\\:bg-slate-800,
          .dark\\:bg-slate-950 {
            background: white !important;
          }
          .dark\\:text-slate-200,
          .dark\\:text-slate-300,
          .dark\\:text-slate-400 {
            color: black !important;
          }
          .dark\\:border-slate-800,
          .dark\\:border-slate-700 {
            border-color: #ccc !important;
          }
        }
      `}</style>
    </div>
  );
}
