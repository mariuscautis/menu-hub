'use client';

/**
 * Weekly Summary Report
 *
 * Provides a week-by-week view of restaurant performance including:
 * - Total revenue with comparison to previous week
 * - Daily breakdown of sales and orders
 * - Busiest day identification
 * - Labor cost percentage (if labor data available)
 * - Discounts and refunds summary
 *
 * Designed for weekly planning meetings and performance tracking.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function WeeklyReportPage() {
  const t = useTranslations('weeklyReport');

  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Week selection (Monday of the week)
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    // Get Monday of current week
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  // Report data
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    previousWeekRevenue: 0,
    percentageChange: 0,
    totalOrders: 0,
    totalDiscounts: 0,
    totalRefunds: 0,
    totalTaxCollected: 0,
    totalMaterialCosts: 0,
    avgOrderValue: 0,
    busiestDay: null,
    dailyBreakdown: [],
    laborCost: 0,
    laborPercent: 0
  });

  // Day names for display
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Fetch restaurant on mount
  useEffect(() => {
    fetchRestaurant();
  }, []);

  // Fetch report data when restaurant or week changes
  useEffect(() => {
    if (restaurant?.id) {
      fetchReportData();
    }
  }, [restaurant?.id, selectedWeekStart]);

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
   * Fetches report data for the selected week and previous week
   */
  const fetchReportData = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Calculate week boundaries
      const weekStart = new Date(selectedWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Previous week
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

      // Fetch orders for selected week
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', `${weekEnd.toISOString().split('T')[0]}T23:59:59.999Z`);

      if (error) throw error;

      // Fetch order_items with menu_items for cost calculation (separate query to avoid join issues)
      let orderItemsMap = {};
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        try {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, quantity, menu_item_id')
            .in('order_id', orderIds);

          // Get unique menu item IDs
          const menuItemIds = [...new Set((orderItems || []).map(oi => oi.menu_item_id).filter(Boolean))];

          // Fetch menu items with base_cost
          let menuItemsMap = {};
          if (menuItemIds.length > 0) {
            const { data: menuItems } = await supabase
              .from('menu_items')
              .select('id, base_cost')
              .in('id', menuItemIds);

            (menuItems || []).forEach(mi => {
              menuItemsMap[mi.id] = mi;
            });
          }

          // Build order items map with costs
          (orderItems || []).forEach(oi => {
            if (!orderItemsMap[oi.order_id]) {
              orderItemsMap[oi.order_id] = [];
            }
            orderItemsMap[oi.order_id].push({
              ...oi,
              menu_items: menuItemsMap[oi.menu_item_id] || null
            });
          });
        } catch (e) {
          console.warn('Could not fetch order items for cost calculation:', e);
        }
      }

      // Get restaurant's default tax rate for calculating VAT
      const defaultTaxRate = parseFloat(restaurant.menu_sales_tax_rate || 20);

      // Fetch orders for previous week (for comparison)
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', prevWeekStart.toISOString())
        .lte('created_at', `${prevWeekEnd.toISOString().split('T')[0]}T23:59:59.999Z`);

      // Initialize daily breakdown
      const dailyData = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = {
          date: dateStr,
          dayName: dayNames[i],
          revenue: 0,
          orders: 0,
          discounts: 0,
          avgOrder: 0
        };
      }

      // Process orders
      let totalRevenue = 0;
      let totalOrders = 0;
      let totalDiscounts = 0;
      let totalTaxCollected = 0;
      let totalMaterialCosts = 0;

      orders?.forEach(order => {
        const orderDate = order.created_at.split('T')[0];
        const orderTotal = parseFloat(order.total || 0);
        const orderDiscount = parseFloat(order.discount_total || 0);

        // Calculate tax from order if available, otherwise estimate from total
        let orderTax = parseFloat(order.tax_amount || 0);
        if (orderTax === 0 && orderTotal > 0 && defaultTaxRate > 0) {
          orderTax = orderTotal - (orderTotal / (1 + defaultTaxRate / 100));
        }

        // Calculate material costs from order items (COGS)
        let orderMaterialCost = 0;
        const orderItems = orderItemsMap[order.id] || [];
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

        if (dailyData[orderDate]) {
          dailyData[orderDate].revenue += orderTotal;
          dailyData[orderDate].orders++;
          dailyData[orderDate].discounts += orderDiscount;
        }
      });

      // Calculate daily averages
      const dailyBreakdown = Object.values(dailyData).map(day => ({
        ...day,
        avgOrder: day.orders > 0 ? day.revenue / day.orders : 0
      }));

      // Find busiest day
      const busiestDay = dailyBreakdown.reduce((max, day) =>
        day.revenue > (max?.revenue || 0) ? day : max, null
      );

      // Previous week revenue
      const previousWeekRevenue = prevOrders?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0;

      // Calculate percentage change
      const percentageChange = previousWeekRevenue > 0
        ? ((totalRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
        : 0;

      // Fetch refunds for the week
      let totalRefunds = 0;
      try {
        const { data: refunds } = await supabase
          .from('refunds')
          .select('refund_amount')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', `${weekEnd.toISOString().split('T')[0]}T23:59:59.999Z`);

        totalRefunds = refunds?.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0) || 0;
      } catch (e) {
        console.warn('Could not fetch refunds:', e);
      }

      // Fetch labor cost (from attendance)
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
          .gte('clock_in', weekStart.toISOString())
          .lte('clock_in', `${weekEnd.toISOString().split('T')[0]}T23:59:59.999Z`)
          .not('clock_out', 'is', null);

        attendance?.forEach(record => {
          if (record.clock_in && record.clock_out) {
            const clockIn = new Date(record.clock_in);
            const clockOut = new Date(record.clock_out);
            let hours = (clockOut - clockIn) / (1000 * 60 * 60);

            // Subtract break time
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

      const laborPercent = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0;

      setReportData({
        totalRevenue,
        previousWeekRevenue,
        percentageChange,
        totalOrders,
        totalDiscounts,
        totalRefunds,
        totalTaxCollected,
        totalMaterialCosts,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        busiestDay,
        dailyBreakdown,
        laborCost,
        laborPercent
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = () => {
    const current = new Date(selectedWeekStart);
    current.setDate(current.getDate() - 7);
    setSelectedWeekStart(current.toISOString().split('T')[0]);
  };

  /**
   * Navigate to next week
   */
  const goToNextWeek = () => {
    const current = new Date(selectedWeekStart);
    current.setDate(current.getDate() + 7);
    // Don't allow future weeks
    const today = new Date();
    if (current <= today) {
      setSelectedWeekStart(current.toISOString().split('T')[0]);
    }
  };

  /**
   * Go to current week
   */
  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setSelectedWeekStart(monday.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getWeekEndDate = () => {
    const end = new Date(selectedWeekStart);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  // Check if this is the current week
  const isCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0] === selectedWeekStart;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {t('title') || 'Weekly Summary'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('subtitle')?.replace('{startDate}', formatDate(selectedWeekStart)).replace('{endDate}', formatDate(getWeekEndDate())) ||
            `Performance overview for ${formatDate(selectedWeekStart)} - ${formatDate(getWeekEndDate())}`}
        </p>
      </div>

      {/* Week Navigation */}
      <div className="mb-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="text-center">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {formatDate(selectedWeekStart)} - {formatDate(getWeekEndDate())}
          </p>
          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="text-sm text-[#6262bd] hover:underline mt-1"
            >
              Go to current week
            </button>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          disabled={isCurrentWeek()}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
            isCurrentWeek()
              ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          Next
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
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">{t('noData') || 'No data available for this week'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('totalRevenue') || 'Total Revenue'}</p>
              <p className="text-2xl font-bold text-[#6262bd]">{formatCurrency(reportData.totalRevenue)}</p>
              {reportData.percentageChange !== 0 && (
                <p className={`text-sm mt-1 ${reportData.percentageChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportData.percentageChange > 0 ? '+' : ''}{reportData.percentageChange.toFixed(1)}% vs last week
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('totalOrders') || 'Total Orders'}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{reportData.totalOrders}</p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(reportData.avgOrderValue)} avg
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('busiestDay') || 'Busiest Day'}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {reportData.busiestDay?.dayName || '-'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(reportData.busiestDay?.revenue || 0)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('laborPercent') || 'Labor %'}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {reportData.laborPercent.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {formatCurrency(reportData.laborCost)} total
              </p>
            </div>
          </div>

          {/* Secondary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Tax Collected</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(reportData.totalTaxCollected)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {reportData.totalRevenue > 0 ? ((reportData.totalTaxCollected / reportData.totalRevenue) * 100).toFixed(1) : 0}% of revenue
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Material Costs</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(reportData.totalMaterialCosts)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {reportData.totalRevenue > 0 ? ((reportData.totalMaterialCosts / reportData.totalRevenue) * 100).toFixed(1) : 0}% of revenue
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Discounts Given</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(reportData.totalDiscounts)}
              </p>
              {reportData.totalRevenue > 0 && reportData.totalDiscounts > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  {((reportData.totalDiscounts / (reportData.totalRevenue + reportData.totalDiscounts)) * 100).toFixed(1)}% of gross
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Refunds</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(reportData.totalRefunds)}
              </p>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              {t('dailyBreakdown') || 'Daily Breakdown'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{t('day') || 'Day'}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{t('revenue') || 'Revenue'}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{t('orders') || 'Orders'}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{t('avgOrder') || 'Avg Order'}</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{t('discounts') || 'Discounts'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.dailyBreakdown.map((day, index) => (
                    <tr
                      key={day.date}
                      className={`border-b border-slate-50 dark:border-slate-800 ${
                        day === reportData.busiestDay ? 'bg-green-50 dark:bg-green-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {day.dayName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(day.date)}
                          </span>
                          {day === reportData.busiestDay && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                              Busiest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#6262bd] text-right">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-right">
                        {day.orders}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-right">
                        {formatCurrency(day.avgOrder)}
                      </td>
                      <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400 text-right">
                        {day.discounts > 0 ? `-${formatCurrency(day.discounts)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                    <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">Total</td>
                    <td className="py-3 px-4 text-sm text-[#6262bd] text-right">
                      {formatCurrency(reportData.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                      {reportData.totalOrders}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200 text-right">
                      {formatCurrency(reportData.avgOrderValue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400 text-right">
                      -{formatCurrency(reportData.totalDiscounts)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Week Comparison */}
          {reportData.previousWeekRevenue > 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
                Week-over-Week Comparison
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Last Week</p>
                  <p className="text-xl font-bold text-slate-600 dark:text-slate-400">
                    {formatCurrency(reportData.previousWeekRevenue)}
                  </p>
                </div>
                <div className="bg-[#6262bd]/10 dark:bg-[#6262bd]/30 rounded-xl p-4">
                  <p className="text-sm text-[#6262bd] mb-1">This Week</p>
                  <p className="text-xl font-bold text-[#6262bd]">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                </div>
              </div>
              <div className={`mt-4 p-4 rounded-xl ${
                reportData.percentageChange > 0
                  ? 'bg-green-50 dark:bg-green-900/30'
                  : reportData.percentageChange < 0
                    ? 'bg-red-50 dark:bg-red-900/30'
                    : 'bg-slate-50 dark:bg-slate-800'
              }`}>
                <p className={`text-center font-bold ${
                  reportData.percentageChange > 0
                    ? 'text-green-600 dark:text-green-400'
                    : reportData.percentageChange < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {reportData.percentageChange > 0 ? '↑' : reportData.percentageChange < 0 ? '↓' : '→'}
                  {' '}{Math.abs(reportData.percentageChange).toFixed(1)}%
                  {reportData.percentageChange > 0 ? ' growth' : reportData.percentageChange < 0 ? ' decline' : ' no change'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
