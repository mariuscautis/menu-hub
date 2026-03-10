'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useCurrency } from '@/lib/CurrencyContext';

// Quick-pick presets
const PRESETS = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
  { label: 'Yesterday', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split('T')[0]; return [s, s]; } },
  { label: 'This Week', getValue: () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today); mon.setDate(diff);
    return [mon.toISOString().split('T')[0], new Date().toISOString().split('T')[0]];
  }},
  { label: 'Last Week', getValue: () => {
    const today = new Date();
    const day = today.getDay();
    const thisMon = new Date(today); thisMon.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
    const lastMon = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7);
    const lastSun = new Date(thisMon); lastSun.setDate(lastSun.getDate() - 1);
    return [lastMon.toISOString().split('T')[0], lastSun.toISOString().split('T')[0]];
  }},
  { label: 'This Month', getValue: () => {
    const today = new Date();
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    return [start, today.toISOString().split('T')[0]];
  }},
  { label: 'Last Month', getValue: () => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
  }},
];

import { useModuleGuard } from '@/hooks/useModuleGuard'

export default function SalesBalanceReport() {
  useModuleGuard('reports')
  const { formatCurrency } = useCurrency();
  const restaurantCtx = useRestaurant();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState('This Month');

  const [expandedItems, setExpandedItems] = useState({});
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (restaurantCtx?.restaurant) {
      setRestaurant(restaurantCtx.restaurant);
      setInitialLoad(false);
    }
  }, [restaurantCtx]);

  const applyPreset = (preset) => {
    const [s, e] = preset.getValue();
    setStartDate(s);
    setEndDate(e);
    setActivePreset(preset.label);
  };

  const fetchReport = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      // 1. Fetch paid orders in range
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total, subtotal, tax_amount, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', `${startDate}T00:00:00.000Z`)
        .lte('created_at', `${endDate}T23:59:59.999Z`);
      if (ordersErr) throw ordersErr;
      if (!orders || orders.length === 0) { setReportData({ orders: [], products: [], summary: null }); setLoading(false); return; }

      const orderIds = orders.map(o => o.id);

      // 2. Fetch order items for those orders
      const { data: orderItems, error: oiErr } = await supabase
        .from('order_items')
        .select('id, order_id, menu_item_id, quantity, price_at_time')
        .in('order_id', orderIds);
      if (oiErr) throw oiErr;

      // 3. Collect unique menu item IDs
      const menuItemIds = [...new Set((orderItems || []).map(oi => oi.menu_item_id).filter(Boolean))];

      // 4. Fetch menu items (name, price)
      let menuItemMap = {};
      if (menuItemIds.length > 0) {
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('id, name, price, sales_tax_category_id')
          .in('id', menuItemIds);
        for (const mi of (menuItems || [])) menuItemMap[mi.id] = mi;
      }

      // 5. Fetch sales_tax_categories for this restaurant to get rates
      const { data: taxCats } = await supabase
        .from('menu_sales_tax_categories')
        .select('id, name, rate')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);
      const taxCatMap = {};
      for (const tc of (taxCats || [])) taxCatMap[tc.id] = tc;

      // 6. Fetch recipe ingredients for those menu items
      let ingredientsMap = {}; // menuItemId -> [{stock_product_id, quantity_needed}]
      if (menuItemIds.length > 0) {
        const { data: ingredients } = await supabase
          .from('menu_item_ingredients')
          .select('menu_item_id, stock_product_id, quantity_needed')
          .in('menu_item_id', menuItemIds);
        for (const ing of (ingredients || [])) {
          if (!ingredientsMap[ing.menu_item_id]) ingredientsMap[ing.menu_item_id] = [];
          ingredientsMap[ing.menu_item_id].push(ing);
        }
      }

      // 7. Fetch stock products for ingredient details (name, cost, tax)
      const stockProductIds = [...new Set(
        Object.values(ingredientsMap).flat().map(i => i.stock_product_id).filter(Boolean)
      )];
      let stockProductMap = {};
      if (stockProductIds.length > 0) {
        const { data: stockProducts } = await supabase
          .from('stock_products')
          .select('id, name, cost_per_base_unit, base_unit, tax_category_id')
          .in('id', stockProductIds);
        for (const sp of (stockProducts || [])) stockProductMap[sp.id] = sp;
      }

      // 8. Fetch product tax categories (for stock purchase tax)
      const stockTaxIds = [...new Set(
        Object.values(stockProductMap).map(sp => sp.tax_category_id).filter(Boolean)
      )];
      let stockTaxMap = {};
      if (stockTaxIds.length > 0) {
        const { data: stockTaxCats } = await supabase
          .from('product_tax_categories')
          .select('id, name, rate')
          .in('id', stockTaxIds);
        for (const tc of (stockTaxCats || [])) stockTaxMap[tc.id] = tc;
      }

      // 9. Aggregate product sales
      const productSales = {}; // menuItemId -> { name, qty, revenue, taxRate, taxName, taxCollected, netRevenue, ingredients }
      for (const oi of (orderItems || [])) {
        if (!oi.menu_item_id) continue;
        const mi = menuItemMap[oi.menu_item_id];
        const miName = mi?.name || 'Unknown Item';
        const qty = oi.quantity || 0;
        const priceInclTax = parseFloat(oi.price_at_time || mi?.price || 0);
        const lineTotal = priceInclTax * qty;

        // Get tax rate for this menu item
        const taxCatId = mi?.sales_tax_category_id;
        const taxCat = taxCatId ? taxCatMap[taxCatId] : null;
        const taxRate = taxCat ? parseFloat(taxCat.rate) : 0;
        const taxName = taxCat ? taxCat.name : null;
        const taxMultiplier = 1 + taxRate / 100;
        const netLine = lineTotal / taxMultiplier;
        const taxLine = lineTotal - netLine;

        if (!productSales[oi.menu_item_id]) {
          productSales[oi.menu_item_id] = {
            id: oi.menu_item_id,
            name: miName,
            qty: 0,
            revenue: 0,
            taxRate,
            taxName,
            taxCollected: 0,
            netRevenue: 0,
            ingredientCost: 0,
            ingredientTaxPaid: 0,
          };
        }
        productSales[oi.menu_item_id].qty += qty;
        productSales[oi.menu_item_id].revenue += lineTotal;
        productSales[oi.menu_item_id].taxCollected += taxLine;
        productSales[oi.menu_item_id].netRevenue += netLine;

        // Recipe ingredient costs for this sale
        const ings = ingredientsMap[oi.menu_item_id] || [];
        for (const ing of ings) {
          const sp = stockProductMap[ing.stock_product_id];
          if (!sp) continue;
          const ingCost = ing.quantity_needed * (sp.cost_per_base_unit || 0);
          const ingTaxCat = sp.tax_category_id ? stockTaxMap[sp.tax_category_id] : null;
          const ingTaxRate = ingTaxCat ? parseFloat(ingTaxCat.rate) : 0;
          const ingTaxPaid = ingCost * (ingTaxRate / 100);
          productSales[oi.menu_item_id].ingredientCost += ingCost * qty;
          productSales[oi.menu_item_id].ingredientTaxPaid += ingTaxPaid * qty;
        }
      }

      // 10. Build ingredients details per product (per unit, for display)
      const productIngredients = {}; // menuItemId -> [{name, qtyNeeded, unit, costPerUnit, taxRate, taxPaidPerUnit}]
      for (const menuItemId of menuItemIds) {
        const ings = ingredientsMap[menuItemId] || [];
        productIngredients[menuItemId] = ings.map(ing => {
          const sp = stockProductMap[ing.stock_product_id];
          const ingTaxCat = sp?.tax_category_id ? stockTaxMap[sp.tax_category_id] : null;
          const ingTaxRate = ingTaxCat ? parseFloat(ingTaxCat.rate) : 0;
          const ingCostPerUnit = ing.quantity_needed * (sp?.cost_per_base_unit || 0);
          const ingTaxPerUnit = ingCostPerUnit * (ingTaxRate / 100);
          return {
            name: sp?.name || 'Unknown',
            qtyNeeded: ing.quantity_needed,
            unit: sp?.base_unit || '',
            unitCost: ingCostPerUnit,
            taxRate: ingTaxRate,
            taxName: ingTaxCat?.name || null,
            taxPaidPerUnit: ingTaxPerUnit,
          };
        });
      }

      // 11. Summary totals
      const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
      const totalTaxCollected = Object.values(productSales).reduce((s, p) => s + p.taxCollected, 0);
      const totalNetRevenue = Object.values(productSales).reduce((s, p) => s + p.netRevenue, 0);
      const totalIngredientCost = Object.values(productSales).reduce((s, p) => s + p.ingredientCost, 0);
      const totalIngredientTaxPaid = Object.values(productSales).reduce((s, p) => s + p.ingredientTaxPaid, 0);

      const sortedProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

      setReportData({
        orders,
        products: sortedProducts,
        productIngredients,
        summary: {
          orderCount: orders.length,
          totalRevenue,
          totalTaxCollected,
          totalNetRevenue,
          totalIngredientCost,
          totalIngredientTaxPaid,
          grossProfit: totalNetRevenue - totalIngredientCost,
        }
      });
    } catch (err) {
      console.error('Sales balance report error:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, startDate, endDate]);

  useEffect(() => {
    if (restaurant?.id) fetchReport();
  }, [fetchReport]);

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const handleExportCSV = () => {
    if (!reportData?.products?.length) return;
    const rows = [
      ['Sales & Tax Balance Report'],
      [`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`Restaurant: ${restaurant?.name || ''}`],
      [''],
      ['Product', 'Qty Sold', 'Revenue (incl. tax)', 'Tax Rate', 'Tax Collected', 'Net Revenue', 'Ingredient Cost', 'Purchase Tax Paid', 'Gross Profit'],
      ...reportData.products.map(p => [
        p.name, p.qty, p.revenue.toFixed(2),
        p.taxRate ? `${p.taxName || 'Tax'} ${p.taxRate}%` : '0%',
        p.taxCollected.toFixed(2), p.netRevenue.toFixed(2),
        p.ingredientCost.toFixed(2), p.ingredientTaxPaid.toFixed(2),
        (p.netRevenue - p.ingredientCost).toFixed(2)
      ]),
      [''],
      ['TOTAL', reportData.summary.orderCount + ' orders', reportData.summary.totalRevenue.toFixed(2),
       '', reportData.summary.totalTaxCollected.toFixed(2), reportData.summary.totalNetRevenue.toFixed(2),
       reportData.summary.totalIngredientCost.toFixed(2), reportData.summary.totalIngredientTaxPaid.toFixed(2),
       reportData.summary.grossProfit.toFixed(2)],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-balance-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!reportData?.products?.length) return;
    const s = reportData.summary;
    const generated = new Date().toLocaleString('en-GB');
    const period = `${formatDate(startDate)} – ${formatDate(endDate)}`;

    const productRows = reportData.products.map(p => {
      const profit = p.netRevenue - p.ingredientCost;
      return `<tr>
        <td>${p.name}</td>
        <td class="center">${p.qty}</td>
        <td class="right">${formatCurrency(p.revenue)}</td>
        <td class="center">${p.taxRate > 0 ? `${p.taxName || 'Tax'} ${p.taxRate}%` : '—'}</td>
        <td class="right">${p.taxRate > 0 ? formatCurrency(p.taxCollected) : '—'}</td>
        <td class="right">${formatCurrency(p.netRevenue)}</td>
        <td class="right">${p.ingredientCost > 0 ? formatCurrency(p.ingredientCost) : '—'}</td>
        <td class="right ${profit >= 0 ? 'positive' : 'negative'}">${p.ingredientCost > 0 ? formatCurrency(profit) : '—'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales &amp; Tax Balance – ${restaurant?.name} – ${startDate} to ${endDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 36px; }
    .header { text-align: center; border-bottom: 3px solid #6262bd; padding-bottom: 18px; margin-bottom: 28px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #6262bd; letter-spacing: 1px; }
    .header h2 { font-size: 14px; font-weight: 600; margin-top: 4px; }
    .header p { font-size: 11px; color: #666; margin-top: 3px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .summary-card .value { font-size: 16px; font-weight: 700; }
    .tax-box { border: 1px solid #fcd34d; border-radius: 8px; background: #fffbeb; padding: 14px; margin-bottom: 24px; }
    .tax-box h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; margin-bottom: 10px; }
    .tax-box-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .tax-box-item .label { font-size: 10px; color: #92400e; margin-bottom: 3px; }
    .tax-box-item .value { font-size: 15px; font-weight: 700; color: #78350f; }
    .tax-box-item:last-child { border-left: 2px solid #fcd34d; padding-left: 10px; }
    .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .section-title { background: #6262bd; color: #fff; font-weight: 700; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 7px 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead td { background: #f8fafc; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr.total-row { background: #f5f5ff; font-weight: 700; border-top: 2px solid #6262bd; }
    td { padding: 8px 10px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .positive { color: #059669; font-weight: 700; }
    .negative { color: #dc2626; font-weight: 700; }
    .footer { text-align: center; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${restaurant?.name || 'Restaurant'}</h1>
    <h2>Sales &amp; Tax Balance Report</h2>
    <p>${period}</p>
    <p>Generated: ${generated}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Revenue</div>
      <div class="value" style="color:#1f2937">${formatCurrency(s.totalRevenue)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">${s.orderCount} orders</div>
    </div>
    <div class="summary-card">
      <div class="label">Tax Collected</div>
      <div class="value" style="color:#d97706">${formatCurrency(s.totalTaxCollected)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">from customers</div>
    </div>
    <div class="summary-card">
      <div class="label">Purchase Tax Paid</div>
      <div class="value" style="color:#ea580c">${formatCurrency(s.totalIngredientTaxPaid)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">on ingredients used</div>
    </div>
    <div class="summary-card" style="border-color:${s.grossProfit >= 0 ? '#bbf7d0' : '#fecaca'}; background:${s.grossProfit >= 0 ? '#f0fdf4' : '#fef2f2'}">
      <div class="label" style="color:${s.grossProfit >= 0 ? '#166534' : '#991b1b'}">Gross Profit</div>
      <div class="value ${s.grossProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.grossProfit)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">net rev. − ingredients</div>
    </div>
  </div>

  <div class="tax-box">
    <h3>Tax Balance Summary</h3>
    <div class="tax-box-grid">
      <div class="tax-box-item">
        <div class="label">Tax collected from sales</div>
        <div class="value">${formatCurrency(s.totalTaxCollected)}</div>
      </div>
      <div class="tax-box-item">
        <div class="label">Purchase tax paid (inputs)</div>
        <div class="value">− ${formatCurrency(s.totalIngredientTaxPaid)}</div>
      </div>
      <div class="tax-box-item">
        <div class="label">Net tax payable</div>
        <div class="value">${formatCurrency(s.totalTaxCollected - s.totalIngredientTaxPaid)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Product Breakdown</div>
    <table>
      <thead>
        <tr>
          <td>Product</td>
          <td class="center">Qty</td>
          <td class="right">Revenue</td>
          <td class="center">Tax Rate</td>
          <td class="right">Tax Collected</td>
          <td class="right">Net Revenue</td>
          <td class="right">Ingr. Cost</td>
          <td class="right">Gross Profit</td>
        </tr>
      </thead>
      <tbody>
        ${productRows}
        <tr class="total-row">
          <td>TOTAL (${s.orderCount} orders)</td>
          <td class="center">${reportData.products.reduce((a, p) => a + p.qty, 0)}</td>
          <td class="right">${formatCurrency(s.totalRevenue)}</td>
          <td></td>
          <td class="right" style="color:#d97706">${formatCurrency(s.totalTaxCollected)}</td>
          <td class="right">${formatCurrency(s.totalNetRevenue)}</td>
          <td class="right">${formatCurrency(s.totalIngredientCost)}</td>
          <td class="right ${s.grossProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.grossProfit)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>* Tax-inclusive pricing: tax back-calculated from sale price. Ingredient costs use current stock cost × recipe quantity.</p>
    <p style="margin-top:4px">--- Generated by VenoApp ---</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-1">
          Sales & Tax Balance Report
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Products sold, recipe costs, and tax collected vs. purchase tax paid
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
          Time Frame
        </h2>
        {/* Quick picks */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === p.label
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setActivePreset('Custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === 'Custom'
                ? 'bg-[#6262bd] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Custom
          </button>
        </div>
        {/* Date inputs */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setActivePreset('Custom'); }}
              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => { setEndDate(e.target.value); setActivePreset('Custom'); }}
              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-xl transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Loading overlay for report refresh */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6262bd]"></div>
        </div>
      )}

      {/* Results */}
      {!loading && reportData && (
        <>
          {/* No data */}
          {reportData.products.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400">No sales found for this period.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(reportData.summary.totalRevenue)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{reportData.summary.orderCount} orders</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tax Collected (Sales)</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(reportData.summary.totalTaxCollected)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">From customers</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Purchase Tax Paid</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(reportData.summary.totalIngredientTaxPaid)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">On ingredients used</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border-2 ${reportData.summary.grossProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <p className={`text-xs mb-1 ${reportData.summary.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Gross Profit</p>
                  <p className={`text-xl font-bold ${reportData.summary.grossProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{formatCurrency(reportData.summary.grossProfit)}</p>
                  <p className={`text-xs mt-0.5 ${reportData.summary.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Net rev. minus ingredients</p>
                </div>
              </div>

              {/* Tax Balance Box */}
              <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                  Tax Balance Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-0.5">Tax collected from sales</p>
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{formatCurrency(reportData.summary.totalTaxCollected)}</p>
                  </div>
                  <div>
                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-0.5">Purchase tax paid (inputs)</p>
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-200">− {formatCurrency(reportData.summary.totalIngredientTaxPaid)}</p>
                  </div>
                  <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-4">
                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-0.5">Net tax payable</p>
                    <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                      {formatCurrency(reportData.summary.totalTaxCollected - reportData.summary.totalIngredientTaxPaid)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                  * Net tax payable = tax collected on sales minus tax paid on recipe ingredients. Consult your accountant for official VAT/tax returns.
                </p>
              </div>

              {/* Products Table */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Product Breakdown
                    <span className="ml-2 text-sm font-normal text-slate-400">({reportData.products.length} items — click to expand recipe)</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      CSV
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border-2 border-[#6262bd]/40 text-[#6262bd] rounded-xl hover:bg-[#6262bd]/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </button>
                  </div>
                </div>

                {/* Table header */}
                <div className="hidden md:grid grid-cols-9 gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <div className="col-span-2">Product</div>
                  <div className="text-right">Qty</div>
                  <div className="text-right">Revenue</div>
                  <div className="text-right">Tax Rate</div>
                  <div className="text-right">Tax Collected</div>
                  <div className="text-right">Net Revenue</div>
                  <div className="text-right">Ingr. Cost</div>
                  <div className="text-right">Gross Profit</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.products.map(product => {
                    const grossProfit = product.netRevenue - product.ingredientCost;
                    const hasRecipe = (reportData.productIngredients[product.id] || []).length > 0;
                    const isExpanded = expandedItems[product.id];

                    return (
                      <div key={product.id}>
                        {/* Product row */}
                        <div
                          className={`px-5 py-3.5 md:grid md:grid-cols-9 md:gap-2 flex flex-col gap-2 ${hasRecipe ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''} transition-colors`}
                          onClick={() => hasRecipe && toggleExpand(product.id)}
                        >
                          <div className="col-span-2 flex items-center gap-2">
                            {hasRecipe && (
                              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                            {!hasRecipe && <span className="w-3.5 flex-shrink-0" />}
                            <div>
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{product.name}</span>
                              {hasRecipe && <span className="ml-1 text-xs text-slate-400">(recipe)</span>}
                            </div>
                          </div>
                          <div className="md:text-right text-sm text-slate-700 dark:text-slate-300 font-semibold md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Qty</span>{product.qty}
                          </div>
                          <div className="md:text-right text-sm text-slate-700 dark:text-slate-300 md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Revenue</span>{formatCurrency(product.revenue)}
                          </div>
                          <div className="md:text-right text-sm md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Tax Rate</span>
                            {product.taxRate > 0 ? (
                              <span className="text-amber-600 text-xs font-medium">{product.taxName || 'Tax'} {product.taxRate}%</span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                          <div className="md:text-right text-sm text-amber-600 md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Tax Collected</span>{product.taxRate > 0 ? formatCurrency(product.taxCollected) : <span className="text-slate-400">—</span>}
                          </div>
                          <div className="md:text-right text-sm text-slate-600 dark:text-slate-400 md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Net Revenue</span>{formatCurrency(product.netRevenue)}
                          </div>
                          <div className="md:text-right text-sm text-slate-600 dark:text-slate-400 md:block flex justify-between">
                            <span className="md:hidden text-xs text-slate-400">Ingr. Cost</span>
                            {hasRecipe ? formatCurrency(product.ingredientCost) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </div>
                          <div className={`md:text-right text-sm font-semibold md:block flex justify-between ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className="md:hidden text-xs text-slate-400">Gross Profit</span>
                            {hasRecipe ? formatCurrency(grossProfit) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </div>
                        </div>

                        {/* Recipe ingredients expanded */}
                        {isExpanded && hasRecipe && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 px-10 py-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                              Recipe — per unit sold × {product.qty} units
                            </p>
                            <div className="space-y-1.5">
                              {reportData.productIngredients[product.id].map((ing, i) => (
                                <div key={i} className="grid grid-cols-5 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <div className="col-span-2 font-medium text-slate-700 dark:text-slate-300">{ing.name}</div>
                                  <div className="text-right">{ing.qtyNeeded} {ing.unit}</div>
                                  <div className="text-right">
                                    {formatCurrency(ing.unitCost)} per unit
                                    {ing.taxRate > 0 && <span className="ml-1 text-orange-500">+ {ing.taxName || 'tax'} {ing.taxRate}%</span>}
                                  </div>
                                  <div className="text-right font-medium">
                                    Total cost: {formatCurrency(ing.unitCost * product.qty)}
                                    {ing.taxRate > 0 && <span className="text-orange-500 ml-1">(tax: {formatCurrency(ing.taxPaidPerUnit * product.qty)})</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-5 gap-2 text-xs font-semibold">
                              <div className="col-span-2 text-slate-600 dark:text-slate-400">Totals for {product.name}</div>
                              <div></div>
                              <div className="text-right text-slate-600 dark:text-slate-400">Ingredient cost</div>
                              <div className="text-right">
                                {formatCurrency(product.ingredientCost)}
                                {product.ingredientTaxPaid > 0 && <span className="text-orange-500 ml-1">(purchase tax: {formatCurrency(product.ingredientTaxPaid)})</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Table footer */}
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700 hidden md:grid grid-cols-9 gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <div className="col-span-2">Total ({reportData.summary.orderCount} orders)</div>
                  <div className="text-right">{reportData.products.reduce((s, p) => s + p.qty, 0)}</div>
                  <div className="text-right">{formatCurrency(reportData.summary.totalRevenue)}</div>
                  <div></div>
                  <div className="text-right text-amber-600">{formatCurrency(reportData.summary.totalTaxCollected)}</div>
                  <div className="text-right">{formatCurrency(reportData.summary.totalNetRevenue)}</div>
                  <div className="text-right">{formatCurrency(reportData.summary.totalIngredientCost)}</div>
                  <div className={`text-right ${reportData.summary.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(reportData.summary.grossProfit)}
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 flex gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>About this report:</strong> Revenue and taxes use tax-inclusive pricing (tax back-calculated from sale price).
                    Ingredient costs use current stock cost-per-unit × quantity needed per recipe. Items without a recipe show no ingredient cost.
                    This report is an estimate — reconcile with your accountant for official tax filings.
                  </span>
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
