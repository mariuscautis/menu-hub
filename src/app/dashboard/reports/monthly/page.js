'use client';

/**
 * Monthly Summary Report
 *
 * Provides a monthly overview of restaurant performance including:
 * - Total revenue with month-over-month comparison
 * - Simple P&L view (revenue - costs = profit)
 * - Weekly breakdown within the month
 * - Profit margin calculation
 *
 * Designed for monthly reviews and financial planning.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import InfoTooltip from '@/components/InfoTooltip';
import { useCurrency } from '@/lib/CurrencyContext';

import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { reportsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'

export default function MonthlyReportPage() {
  useModuleGuard('reports')
  const t = useTranslations('monthlyReport');
  const tg = useTranslations('guide');
  const { currencySymbol, formatCurrency } = useCurrency();
  const restaurantCtx = useRestaurant();

  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Month selection (YYYY-MM format)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Report data
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    previousMonthRevenue: 0,
    percentageChange: 0,
    totalCosts: 0,
    grossProfit: 0,
    profitMargin: 0,
    totalOrders: 0,
    totalDiscounts: 0,
    totalTaxCollected: 0,
    totalMaterialCosts: 0,
    laborCost: 0,
    weeklyBreakdown: []
  });

  // Set restaurant from context
  useEffect(() => {
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant);
      setLoading(false);
    }
  }, [restaurantCtx]);

  // Fetch report data when restaurant or month changes
  useEffect(() => {
    if (restaurant?.id) {
      fetchReportData();
    }
  }, [restaurant?.id, selectedMonth]);

  const fetchReportData = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0); // Last day of month

      // Previous month
      const prevMonthStart = new Date(year, month - 2, 1);
      const prevMonthEnd = new Date(year, month - 1, 0);

      // Fetch orders for selected month
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', `${monthEnd.toISOString().split('T')[0]}T23:59:59.999Z`);

      if (error) throw error;

      // Fetch order_items with menu_items for cost and tax calculation
      let orderItemsMap = {};
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        try {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, quantity, menu_item_id, price_at_time')
            .in('order_id', orderIds);

          // Get unique menu item IDs
          const menuItemIds = [...new Set((orderItems || []).map(oi => oi.menu_item_id).filter(Boolean))];

          // Fetch menu items with base_cost and sales tax category
          let menuItemsMap = {};
          if (menuItemIds.length > 0) {
            const { data: menuItems } = await supabase
              .from('menu_items')
              .select('id, base_cost, sales_tax_category_id')
              .in('id', menuItemIds);

            // Fetch tax category rates
            const taxCatIds = [...new Set((menuItems || []).map(mi => mi.sales_tax_category_id).filter(Boolean))];
            let taxCatRateMap = {};
            if (taxCatIds.length > 0) {
              const { data: taxCats } = await supabase
                .from('menu_sales_tax_categories')
                .select('id, rate')
                .in('id', taxCatIds);
              (taxCats || []).forEach(tc => { taxCatRateMap[tc.id] = parseFloat(tc.rate); });
            }

            (menuItems || []).forEach(mi => {
              menuItemsMap[mi.id] = {
                ...mi,
                taxRate: mi.sales_tax_category_id ? (taxCatRateMap[mi.sales_tax_category_id] || 0) : 0,
              };
            });
          }

          // Build order items map with costs and per-item tax
          (orderItems || []).forEach(oi => {
            if (!orderItemsMap[oi.order_id]) {
              orderItemsMap[oi.order_id] = [];
            }
            const mi = menuItemsMap[oi.menu_item_id] || null;
            const taxRate = mi?.taxRate || 0;
            const lineTotal = parseFloat(oi.price_at_time || 0) * (oi.quantity || 0);
            const taxLine = taxRate > 0 ? lineTotal - lineTotal / (1 + taxRate / 100) : 0;
            orderItemsMap[oi.order_id].push({
              ...oi,
              menu_items: mi,
              taxLine,
            });
          });
        } catch (e) {
          console.warn('Could not fetch order items for cost calculation:', e);
        }
      }

      // Fetch previous month orders
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', prevMonthStart.toISOString())
        .lte('created_at', `${prevMonthEnd.toISOString().split('T')[0]}T23:59:59.999Z`);

      // Calculate totals
      let totalRevenue = 0;
      let totalOrders = 0;
      let totalDiscounts = 0;
      let totalTaxCollected = 0;
      let totalMaterialCosts = 0;

      // Weekly breakdown initialization
      const weeklyData = {};

      orders?.forEach(order => {
        const orderTotal = parseFloat(order.total || 0);
        const orderDiscount = parseFloat(order.discount_total || 0);
        const orderDate = new Date(order.created_at);

        // Calculate tax from per-item rates (accurate, matches Sales & Tax Balance report)
        const orderItems = orderItemsMap[order.id] || [];
        const orderTax = orderItems.reduce((s, item) => s + (item.taxLine || 0), 0);

        // Calculate material costs from order items (COGS - Cost of Goods Sold)
        let orderMaterialCost = 0;
        orderItems.forEach(item => {
          const baseCost = parseFloat(item.menu_items?.base_cost || 0);
          const quantity = parseInt(item.quantity || 1);
          orderMaterialCost += baseCost * quantity;
        });

        totalRevenue += orderTotal;
        totalOrders++;
        totalDiscounts += orderDiscount;
        totalTaxCollected += orderTax;
        totalMaterialCosts += orderMaterialCost;

        // Determine week number within month
        const dayOfMonth = orderDate.getDate();
        const weekNum = Math.ceil(dayOfMonth / 7);
        const weekKey = `Week ${weekNum}`;

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            week: weekKey,
            revenue: 0,
            orders: 0,
            costs: 0,
            profit: 0
          };
        }
        weeklyData[weekKey].revenue += orderTotal;
        weeklyData[weekKey].orders++;
        weeklyData[weekKey].costs += orderMaterialCost;
      });

      // Previous month revenue
      const previousMonthRevenue = prevOrders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0;

      // Calculate percentage change
      const percentageChange = previousMonthRevenue > 0
        ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

      // Total costs includes material costs from recipes
      let totalCosts = totalMaterialCosts;

      // Also add purchasing invoices if available (overhead costs)
      try {
        const { data: invoices } = await supabase
          .from('purchasing_invoices')
          .select('total_amount')
          .eq('restaurant_id', restaurant.id)
          .gte('invoice_date', monthStart.toISOString().split('T')[0])
          .lte('invoice_date', monthEnd.toISOString().split('T')[0]);

        totalCosts += invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0;
      } catch (e) {
        console.warn('Could not fetch invoices:', e);
      }

      // Fetch labor cost
      let laborCost = 0;
      try {
        const { data: attendance } = await supabase
          .from('attendance')
          .select(`
            clock_in,
            clock_out,
            break_start,
            break_end,
            staff:staff_id (hourly_rate)
          `)
          .eq('restaurant_id', restaurant.id)
          .gte('clock_in', monthStart.toISOString())
          .lte('clock_in', `${monthEnd.toISOString().split('T')[0]}T23:59:59.999Z`)
          .not('clock_out', 'is', null);

        attendance?.forEach(record => {
          if (record.clock_in && record.clock_out) {
            const clockIn = new Date(record.clock_in);
            const clockOut = new Date(record.clock_out);
            let hours = (clockOut - clockIn) / (1000 * 60 * 60);

            if (record.break_start && record.break_end) {
              const breakStart = new Date(record.break_start);
              const breakEnd = new Date(record.break_end);
              hours -= (breakEnd - breakStart) / (1000 * 60 * 60);
            }

            const hourlyRate = record.staff?.hourly_rate || 12;
            laborCost += hours * hourlyRate;
          }
        });
      } catch (e) {
        console.warn('Could not fetch labor data:', e);
      }

      // Add labor to total costs
      totalCosts += laborCost;

      // Calculate profit
      const grossProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Finalize weekly breakdown - add labor costs proportionally
      const weeklyBreakdown = Object.values(weeklyData).sort((a, b) => {
        const weekA = parseInt(a.week.split(' ')[1]);
        const weekB = parseInt(b.week.split(' ')[1]);
        return weekA - weekB;
      });

      // Add proportional labor costs to weekly material costs
      if (laborCost > 0 && totalOrders > 0) {
        weeklyBreakdown.forEach(week => {
          const proportion = week.orders / totalOrders;
          week.costs += laborCost * proportion;
        });
      }

      // Calculate profit for each week
      weeklyBreakdown.forEach(week => {
        week.profit = week.revenue - week.costs;
      });

      setReportData({
        totalRevenue,
        previousMonthRevenue,
        percentageChange,
        totalCosts,
        grossProfit,
        profitMargin,
        totalOrders,
        totalDiscounts,
        totalTaxCollected,
        totalMaterialCosts,
        laborCost,
        weeklyBreakdown
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (selectedMonth < currentYearMonth) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
    }
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return selectedMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  // Loading state
  if (loading && !restaurant) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
        </div>
      </div>
    );
  }

  // No restaurant
  if (!restaurant) {
    return (
      <div className="min-h-screen p-8">
        <p className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">No restaurant found</p>
      </div>
    );
  }

  return (
    <OfflinePageGuard>
    <div className="min-h-screen p-4 md:p-8">
      <PageTabs tabs={reportsTabs} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-2 flex items-center gap-2">
          {t('title') || 'Monthly Summary'}
          <InfoTooltip text={tg('reports_monthly_desc')} />
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
          {t('subtitle')?.replace('{month}', formatMonth(selectedMonth)) ||
            `Performance overview for ${formatMonth(selectedMonth)}`}
        </p>
      </div>

      {/* Month Navigation */}
      <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700 rounded-sm text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('previous') || 'Previous'}
        </button>

        <p className="font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
          {formatMonth(selectedMonth)}
        </p>

        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth()}
          className={`px-4 py-2 rounded-sm flex items-center gap-2 transition-colors ${
            isCurrentMonth()
              ? 'bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              : 'bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300'
          }`}
        >
          {t('next') || 'Next'}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
        </div>
      ) : reportData.totalOrders === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{t('noData') || 'No data available for this month'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* P&L Summary */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-6">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-4">
              {t('profitAndLoss') || 'Profit & Loss Summary'}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{t('totalRevenue') || 'Total Revenue'}</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(reportData.totalRevenue)}
                </span>
              </div>
              {reportData.totalDiscounts > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{t('totalDiscounts') || 'Total Discounts'}</span>
                  <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    -{formatCurrency(reportData.totalDiscounts)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{t('totalCosts') || 'Total Costs'}</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  -{formatCurrency(reportData.totalCosts)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800 px-4 rounded-sm">
                <div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('grossProfit') || 'Gross Profit'}</span>
                  <span className={`ml-3 text-sm px-2 py-0.5 rounded ${
                    reportData.profitMargin >= 0
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {reportData.profitMargin.toFixed(1)}% {t('margin') || 'margin'}
                  </span>
                </div>
                <span className={`text-2xl font-bold ${
                  reportData.grossProfit >= 0
                    ? 'text-[#6262bd]'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(reportData.grossProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('totalRevenue') || 'Total Revenue'}</p>
              <p className="text-xl font-bold text-[#6262bd]">{formatCurrency(reportData.totalRevenue)}</p>
              {reportData.percentageChange !== 0 && (
                <p className={`text-sm mt-1 ${reportData.percentageChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportData.percentageChange > 0 ? '+' : ''}{reportData.percentageChange.toFixed(1)}% vs last month
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('totalOrders') || 'Total Orders'}</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{reportData.totalOrders}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('discountsGiven') || 'Discounts Given'}</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(reportData.totalDiscounts)}
              </p>
              {reportData.totalRevenue > 0 && reportData.totalDiscounts > 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {((reportData.totalDiscounts / (reportData.totalRevenue + reportData.totalDiscounts)) * 100).toFixed(1)}% {t('ofGross') || 'of gross'}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('materialCosts') || 'Material Costs'}</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(reportData.totalMaterialCosts)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {reportData.totalRevenue > 0 ? ((reportData.totalMaterialCosts / reportData.totalRevenue) * 100).toFixed(1) : 0}% {t('ofRevenue') || 'of revenue'}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('laborCost') || 'Labor Cost'}</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(reportData.laborCost)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {reportData.totalRevenue > 0 ? ((reportData.laborCost / reportData.totalRevenue) * 100).toFixed(1) : 0}% {t('ofRevenue') || 'of revenue'}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('taxCollected') || 'Tax Collected'}</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(reportData.totalTaxCollected)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {reportData.totalRevenue > 0 ? ((reportData.totalTaxCollected / reportData.totalRevenue) * 100).toFixed(1) : 0}% {t('ofRevenue') || 'of revenue'}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('profitMargin') || 'Profit Margin'}</p>
              <p className={`text-xl font-bold ${
                reportData.profitMargin >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {reportData.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Weekly Breakdown */}
          {reportData.weeklyBreakdown.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-4">
                {t('weeklyBreakdown') || 'Weekly Breakdown'}
              </h2>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[380px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{t('week') || 'Week'}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{t('revenue') || 'Revenue'}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{t('costs') || 'Costs'}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{t('profit') || 'Profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.weeklyBreakdown.map((week) => (
                      <tr key={week.week} className="border-b border-zinc-100 dark:border-zinc-800/50 dark:border-zinc-800">
                        <td className="py-3 px-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
                          {t('week') || 'Week'} {week.week.split(' ')[1]}
                          <span className="text-zinc-500 dark:text-zinc-400 ml-2">({week.orders} {t('orders') || 'orders'})</span>
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                          {formatCurrency(week.revenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400 text-right">
                          -{formatCurrency(week.costs)}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${
                          week.profit >= 0 ? 'text-[#6262bd]' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(week.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 font-bold">
                      <td className="py-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('total') || 'Total'}</td>
                      <td className="py-3 px-4 text-sm text-green-600 dark:text-green-400 text-right">
                        {formatCurrency(reportData.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400 text-right">
                        -{formatCurrency(reportData.totalCosts)}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right ${
                        reportData.grossProfit >= 0 ? 'text-[#6262bd]' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(reportData.grossProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Month Comparison */}
          {reportData.previousMonthRevenue > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-6">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-4">
                {t('monthOverMonth') || 'Month-over-Month Revenue'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800 rounded-sm p-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('lastMonth') || 'Last Month'}</p>
                  <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                    {formatCurrency(reportData.previousMonthRevenue)}
                  </p>
                </div>
                <div className="bg-[#6262bd]/10 dark:bg-[#6262bd]/30 rounded-sm p-4">
                  <p className="text-sm text-[#6262bd] mb-1">{t('thisMonth') || 'This Month'}</p>
                  <p className="text-xl font-bold text-[#6262bd]">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </OfflinePageGuard>
  );
}
