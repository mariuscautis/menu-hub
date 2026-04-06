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

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import InfoTooltip from '@/components/InfoTooltip';
import { useCurrency } from '@/lib/CurrencyContext';

import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { reportsNavTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'

export default function ZReportPage() {
  useModuleGuard('reports')
  const t = useTranslations('zReport');
  const tg = useTranslations('guide');
  const { currencySymbol, formatCurrency } = useCurrency();
  const restaurantCtx = useRestaurant();
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

  // Fetch restaurant from context
  useEffect(() => {
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant);
      setLoading(false);
    }
  }, [restaurantCtx]);

  // Fetch report data when restaurant or date changes
  useEffect(() => {
    if (restaurant?.id) {
      fetchReportData();
    }
  }, [restaurant?.id, selectedDate]);

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

      // Fetch order items for accurate per-item tax calculation
      const orderIds = (orders || []).map(o => o.id);
      let orderItemsByOrderId = {};
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, menu_item_id, quantity, price_at_time')
          .in('order_id', orderIds);

        // Fetch menu items with their tax category
        const menuItemIds = [...new Set((orderItems || []).map(oi => oi.menu_item_id).filter(Boolean))];
        let menuItemTaxMap = {}; // menuItemId -> taxRate
        if (menuItemIds.length > 0) {
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('id, sales_tax_category_id')
            .in('id', menuItemIds);

          const taxCatIds = [...new Set((menuItems || []).map(mi => mi.sales_tax_category_id).filter(Boolean))];
          let taxCatRateMap = {}; // taxCatId -> rate
          if (taxCatIds.length > 0) {
            const { data: taxCats } = await supabase
              .from('menu_sales_tax_categories')
              .select('id, rate')
              .in('id', taxCatIds);
            for (const tc of (taxCats || [])) taxCatRateMap[tc.id] = parseFloat(tc.rate);
          }

          for (const mi of (menuItems || [])) {
            menuItemTaxMap[mi.id] = mi.sales_tax_category_id ? (taxCatRateMap[mi.sales_tax_category_id] || 0) : 0;
          }
        }

        // Group order items by order, and pre-calculate tax per item
        for (const oi of (orderItems || [])) {
          if (!orderItemsByOrderId[oi.order_id]) orderItemsByOrderId[oi.order_id] = [];
          const taxRate = menuItemTaxMap[oi.menu_item_id] || 0;
          const lineTotal = parseFloat(oi.price_at_time || 0) * (oi.quantity || 0);
          const taxLine = taxRate > 0 ? lineTotal - lineTotal / (1 + taxRate / 100) : 0;
          orderItemsByOrderId[oi.order_id].push({ taxLine });
        }
      }

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

      orders?.forEach(order => {
        // Calculate gross sales (subtotal if available, otherwise total + discount)
        const orderSubtotal = parseFloat(order.subtotal || order.total || 0);
        const orderDiscount = parseFloat(order.discount_total || 0);
        const orderTotal = parseFloat(order.total || 0);
        const orderTip = parseFloat(order.tip_amount || 0);

        // Calculate tax from per-item rates (accurate, matches Sales & Tax Balance report)
        const orderTax = (orderItemsByOrderId[order.id] || []).reduce((s, item) => s + item.taxLine, 0);

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
   * Opens a formatted PDF-ready report in a new tab for print-to-PDF
   */
  const handleExportPDF = () => {
    const date = formatDate(selectedDate);
    const generated = new Date().toLocaleString('en-GB');

    const staffRows = reportData.staffSummary.map(staff => `
      <tr>
        <td>${staff.name}</td>
        <td class="center">${staff.paymentsProcessed}</td>
        <td class="right">${currencySymbol}${staff.totalProcessed.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Z-Report – ${restaurant.name} – ${selectedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 40px; }
          .header { text-align: center; border-bottom: 3px solid #6262bd; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 22px; font-weight: 700; color: #6262bd; letter-spacing: 1px; }
          .header h2 { font-size: 16px; font-weight: 600; margin-top: 4px; }
          .header p { font-size: 12px; color: #666; margin-top: 4px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .section.full { grid-column: 1 / -1; }
          .section-title { background: #6262bd; color: #fff; font-weight: 700; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 8px 14px; }
          .section table { width: 100%; border-collapse: collapse; }
          .section table tr { border-bottom: 1px solid #f1f5f9; }
          .section table tr:last-child { border-bottom: none; }
          .section table td { padding: 9px 14px; }
          .section table td.right { text-align: right; font-weight: 600; }
          .section table td.center { text-align: center; }
          .section table thead td { font-weight: 700; font-size: 11px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
          .highlight { background: #f5f5ff; }
          .highlight td { font-weight: 700 !important; font-size: 14px !important; color: #6262bd !important; }
          .negative { color: #dc2626 !important; }
          .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${restaurant.name}</h1>
          <h2>Z-Report &mdash; Daily Closeout</h2>
          <p>${date}</p>
          <p>Generated: ${generated}</p>
        </div>

        <div class="grid">
          <div class="section">
            <div class="section-title">Sales Summary</div>
            <table>
              <tr><td>Gross Sales</td><td class="right">${currencySymbol}${reportData.grossSales.toFixed(2)}</td></tr>
              <tr><td>Discounts</td><td class="right negative">-${currencySymbol}${reportData.discountTotal.toFixed(2)}</td></tr>
              <tr><td>Tax Collected</td><td class="right">${currencySymbol}${reportData.taxCollected.toFixed(2)}</td></tr>
              <tr class="highlight"><td>Net Sales</td><td class="right">${currencySymbol}${reportData.netSales.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Payment Breakdown</div>
            <table>
              <tr><td>Cash</td><td class="right">${currencySymbol}${reportData.cashTotal.toFixed(2)}</td></tr>
              <tr><td>Card</td><td class="right">${currencySymbol}${reportData.cardTotal.toFixed(2)}</td></tr>
              <tr><td>Split Bills</td><td class="right">${currencySymbol}${reportData.splitBillsTotal.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Tips Summary</div>
            <table>
              <tr><td>Total Tips</td><td class="right">${currencySymbol}${reportData.totalTips.toFixed(2)}</td></tr>
              <tr><td>Cash Tips</td><td class="right">${currencySymbol}${reportData.cashTips.toFixed(2)}</td></tr>
              <tr><td>Card Tips</td><td class="right">${currencySymbol}${reportData.cardTips.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Voids &amp; Refunds</div>
            <table>
              <tr><td>Total Voids (${reportData.voidsCount} items)</td><td class="right negative">${currencySymbol}${reportData.voidsTotal.toFixed(2)}</td></tr>
              <tr><td>Total Refunds (${reportData.refundsCount} transactions)</td><td class="right negative">${currencySymbol}${reportData.refundsTotal.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Order Summary</div>
            <table>
              <tr><td>Total Orders</td><td class="right">${reportData.totalOrders}</td></tr>
              <tr><td>Dine-in</td><td class="right">${reportData.dineInOrders}</td></tr>
              <tr><td>Takeaway</td><td class="right">${reportData.takeawayOrders}</td></tr>
              <tr><td>Avg Order Value</td><td class="right">${currencySymbol}${reportData.avgOrderValue.toFixed(2)}</td></tr>
            </table>
          </div>

          ${reportData.staffSummary.length > 0 ? `
          <div class="section full">
            <div class="section-title">Staff Summary</div>
            <table>
              <thead><tr><td>Staff Member</td><td class="center">Payments Processed</td><td class="right">Total</td></tr></thead>
              ${staffRows}
            </table>
          </div>` : ''}
        </div>

        <div class="footer">
          <p>--- End of Z-Report &mdash; Generated by VenoApp ---</p>
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
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
    <OfflinePageGuard>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <PageTabs tabs={reportsNavTabs} />
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {t('title') || 'Z-Report'}
            <InfoTooltip text={tg('zreport_desc')} />
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

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="px-6 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
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
        <div className="space-y-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:gap-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:gap-2">
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

        </div>
      )}
    </div>
    </OfflinePageGuard>
  );
}
