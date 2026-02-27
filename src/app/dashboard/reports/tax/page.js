'use client';

/**
 * Tax Report
 *
 * Provides a tax summary for accounting and filing purposes:
 * - Total tax collected by rate (0%, 5%, 20%)
 * - Date range selection for flexible reporting
 * - Export to CSV for accountants
 *
 * Note: This report uses tax_amount from orders if available,
 * otherwise estimates based on standard UK VAT rates.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function TaxReportPage() {
  const t = useTranslations('taxReport');

  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date range selection
  const [startDate, setStartDate] = useState(() => {
    // Default to start of current month
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Report data
  const [reportData, setReportData] = useState({
    totalTaxCollected: 0,
    taxBreakdown: [],
    totalSales: 0,
    orderCount: 0
  });

  // Fetch restaurant on mount
  useEffect(() => {
    fetchRestaurant();
  }, []);

  // Auto-fetch report when restaurant or dates change
  useEffect(() => {
    if (restaurant?.id) {
      fetchReportData();
    }
  }, [restaurant?.id, startDate, endDate]);

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
   * Fetches tax report data for the selected date range
   */
  const fetchReportData = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      // Fetch orders for date range
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, tax_amount, subtotal')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`);

      if (error) throw error;

      // Get restaurant's default tax rate for calculating VAT when not stored
      const defaultTaxRate = parseFloat(restaurant.menu_sales_tax_rate || 20);

      // Calculate tax totals
      let totalTax = 0;
      let totalSales = 0;
      let standardRateAmount = 0;
      let standardRateTax = 0;

      orders?.forEach(order => {
        const orderTotal = parseFloat(order.total || 0);
        const orderSubtotal = parseFloat(order.subtotal || order.total || 0);

        // Calculate tax: use stored tax_amount if available, otherwise calculate from total
        let orderTax = parseFloat(order.tax_amount || 0);
        if (orderTax === 0 && orderTotal > 0 && defaultTaxRate > 0) {
          // Calculate VAT included in the total price
          orderTax = orderTotal - (orderTotal / (1 + defaultTaxRate / 100));
        }

        totalSales += orderTotal;
        totalTax += orderTax;

        // Track amounts for standard rate
        if (orderTax > 0) {
          standardRateAmount += orderSubtotal;
          standardRateTax += orderTax;
        }
      });

      // Build tax breakdown
      const taxBreakdown = [];

      if (standardRateTax > 0) {
        taxBreakdown.push({
          rate: `${defaultTaxRate}%`,
          name: `${restaurant.menu_sales_tax_name || 'VAT'} (${defaultTaxRate}%)`,
          taxableAmount: standardRateAmount,
          taxCollected: standardRateTax
        });
      }

      // If no breakdown but we have sales, show calculated total
      if (taxBreakdown.length === 0 && totalSales > 0) {
        taxBreakdown.push({
          rate: `${defaultTaxRate}%`,
          name: `${restaurant.menu_sales_tax_name || 'VAT'} (${defaultTaxRate}%)`,
          taxableAmount: totalSales,
          taxCollected: totalTax
        });
      }

      setReportData({
        totalTaxCollected: totalTax,
        taxBreakdown,
        totalSales,
        orderCount: orders?.length || 0
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the Generate Report button click
   */
  const handleGenerateReport = () => {
    fetchReportData();
  };

  /**
   * Exports the report data to CSV
   */
  const handleExportCSV = () => {
    // Build CSV content
    const headers = ['Tax Rate', 'Taxable Amount', 'Tax Collected'];
    const rows = reportData.taxBreakdown.map(row => [
      row.name,
      row.taxableAmount.toFixed(2),
      row.taxCollected.toFixed(2)
    ]);

    // Add total row
    rows.push(['TOTAL', reportData.totalSales.toFixed(2), reportData.totalTaxCollected.toFixed(2)]);

    // Create CSV string
    const csvContent = [
      `Tax Report - ${restaurant?.name || 'Restaurant'}`,
      `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tax-report-${startDate}-to-${endDate}.csv`;
    link.click();
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
      month: 'short',
      year: 'numeric'
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {t('title') || 'Tax Report'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('subtitle') || 'Tax summary for selected period'}
        </p>
      </div>

      {/* Date Range & Actions */}
      <div className="mb-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          {t('dateRange') || 'Date Range'}
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('startDate') || 'Start Date'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('endDate') || 'End Date'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-6 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : (t('generateReport') || 'Generate Report')}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData.orderCount > 0 && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {t('taxBreakdown') || 'Tax Breakdown by Rate'}
              </h2>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('exportCSV') || 'Export CSV'}
              </button>
            </div>

            {reportData.taxBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('taxRate') || 'Tax Rate'}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('taxableAmount') || 'Taxable Amount'}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('taxCollected') || 'Tax Collected'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.taxBreakdown.map((row, index) => (
                      <tr key={index} className="border-b border-slate-50 dark:border-slate-800">
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {row.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-right">
                          {formatCurrency(row.taxableAmount)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#6262bd] text-right">
                          {formatCurrency(row.taxCollected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {t('totalTaxCollected') || 'Total Tax Collected'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-right font-semibold">
                        {formatCurrency(reportData.totalSales)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-xl font-bold text-[#6262bd]">
                          {formatCurrency(reportData.totalTaxCollected)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">
                  {t('noData') || 'No tax data available for this period'}
                </p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Sales</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(reportData.totalSales)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Orders</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {reportData.orderCount}
              </p>
            </div>
            <div className="bg-[#6262bd]/10 dark:bg-[#6262bd]/30 rounded-2xl p-4 text-center">
              <p className="text-sm text-[#6262bd]">Tax Collected</p>
              <p className="text-xl font-bold text-[#6262bd]">
                {formatCurrency(reportData.totalTaxCollected)}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Note for Accountants
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  This report shows tax collected based on order data. For accurate VAT returns,
                  please reconcile with your accounting system and verify tax categories are correctly
                  applied to all menu items.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {reportData.orderCount === 0 && !loading && (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            Select a date range and click "Generate Report" to view tax data
          </p>
          <p className="text-sm text-slate-500">
            The report will show tax breakdown by rate for the selected period
          </p>
        </div>
      )}
    </div>
  );
}
