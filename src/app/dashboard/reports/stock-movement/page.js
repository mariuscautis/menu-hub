'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/lib/RestaurantContext';
import { useCurrency } from '@/lib/CurrencyContext';

// Quick-pick presets
const PRESETS = [
  { key: 'Today', labelKey: 'presetToday', getValue: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
  { key: 'Yesterday', labelKey: 'presetYesterday', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split('T')[0]; return [s, s]; } },
  { key: 'This Week', labelKey: 'presetThisWeek', getValue: () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today); mon.setDate(diff);
    return [mon.toISOString().split('T')[0], new Date().toISOString().split('T')[0]];
  }},
  { key: 'Last Week', labelKey: 'presetLastWeek', getValue: () => {
    const today = new Date();
    const day = today.getDay();
    const thisMon = new Date(today); thisMon.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
    const lastMon = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7);
    const lastSun = new Date(thisMon); lastSun.setDate(lastSun.getDate() - 1);
    return [lastMon.toISOString().split('T')[0], lastSun.toISOString().split('T')[0]];
  }},
  { key: 'This Month', labelKey: 'presetThisMonth', getValue: () => {
    const today = new Date();
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    return [start, today.toISOString().split('T')[0]];
  }},
  { key: 'Last Month', labelKey: 'presetLastMonth', getValue: () => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return [first.toISOString().split('T')[0], last.toISOString().split('T')[0]];
  }},
];

import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { reportsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'

export default function StockMovementReport() {
  useModuleGuard('reports')
  const t = useTranslations('stockMovement')
  const tg = useTranslations('guide');
  const { formatCurrency, currencySymbol } = useCurrency();
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

  // Toggle between food (kitchen) and inventory (bar/other)
  const [stockTypeFilter, setStockTypeFilter] = useState('all'); // 'all', 'kitchen', 'bar'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'used-desc', 'cost-desc'
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
    setActivePreset(preset.key);
  };

  const fetchReport = useCallback(async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const start = `${startDate}T00:00:00.000Z`;
      const end = `${endDate}T23:59:59.999Z`;

      // 1. All stock products for this restaurant
      const { data: stockProducts, error: spErr } = await supabase
        .from('stock_products')
        .select('id, name, category, base_unit, input_unit_type, units_to_base_multiplier, current_stock, cost_per_base_unit')
        .eq('restaurant_id', restaurant.id)
        .order('name');
      if (spErr) throw new Error('stock_products: ' + (spErr.message || JSON.stringify(spErr)));

      const stockProductIds = (stockProducts || []).map(sp => sp.id);
      if (stockProductIds.length === 0) {
        setReportData({ items: [], summary: { totalPurchased: 0, totalUsedRecipe: 0, totalLost: 0, totalCostIn: 0 } });
        setLoading(false);
        return;
      }

      // 2. Stock entries (purchases only — positive qty) in date range
      const { data: stockEntries, error: seErr } = await supabase
        .from('stock_entries')
        .select('product_id, quantity, unit_used, purchase_price, created_at')
        .eq('restaurant_id', restaurant.id)
        .in('product_id', stockProductIds)
        .gt('quantity', 0)
        .gte('created_at', start)
        .lte('created_at', end);
      if (seErr) throw new Error('stock_entries: ' + (seErr.message || JSON.stringify(seErr)));

      // 3. Stock product losses (dedicated table, separate from purchase entries)
      const { data: stockLosses } = await supabase
        .from('stock_product_losses')
        .select('product_id, quantity, unit_used, reason, notes, created_at')
        .eq('restaurant_id', restaurant.id)
        .in('product_id', stockProductIds)
        .gte('created_at', start)
        .lte('created_at', end);

      // 4. Sold order items in date range (to compute recipe usage)
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('paid', true)
        .gte('created_at', start)
        .lte('created_at', end);
      const orderIds = (orders || []).map(o => o.id);

      let recipeUsage = {}; // stockProductId -> { qtyUsed, value, usedIn: {menuItemName -> qty} }
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('menu_item_id, quantity')
          .in('order_id', orderIds);

        if (orderItems && orderItems.length > 0) {
          // Aggregate sold qty per menu item
          const soldQtyByItem = {};
          for (const oi of orderItems) {
            soldQtyByItem[oi.menu_item_id] = (soldQtyByItem[oi.menu_item_id] || 0) + (oi.quantity || 0);
          }
          const soldMenuItemIds = Object.keys(soldQtyByItem);

          // Fetch recipe ingredients for those menu items
          if (soldMenuItemIds.length > 0) {
            const { data: ingredients } = await supabase
              .from('menu_item_ingredients')
              .select('menu_item_id, stock_product_id, quantity_needed')
              .in('menu_item_id', soldMenuItemIds)
              .in('stock_product_id', stockProductIds);

            // Fetch menu item names
            const { data: menuItemNames } = await supabase
              .from('menu_items')
              .select('id, name')
              .in('id', soldMenuItemIds);
            const miNameMap = {};
            for (const mi of (menuItemNames || [])) miNameMap[mi.id] = mi.name;

            // Compute usage
            for (const ing of (ingredients || [])) {
              const soldQty = soldQtyByItem[ing.menu_item_id] || 0;
              const totalIngUsed = ing.quantity_needed * soldQty;
              const sp = (stockProducts || []).find(p => p.id === ing.stock_product_id);
              const costUsed = totalIngUsed * (sp?.cost_per_base_unit || 0);
              if (!recipeUsage[ing.stock_product_id]) {
                recipeUsage[ing.stock_product_id] = { qtyUsed: 0, value: 0, usedIn: {} };
              }
              recipeUsage[ing.stock_product_id].qtyUsed += totalIngUsed;
              recipeUsage[ing.stock_product_id].value += costUsed;
              const miName = miNameMap[ing.menu_item_id] || 'Unknown dish';
              recipeUsage[ing.stock_product_id].usedIn[miName] =
                (recipeUsage[ing.stock_product_id].usedIn[miName] || 0) + totalIngUsed;
            }
          }
        }
      }

      // Build a lookup for multipliers
      const multiplierByProduct = {};
      const inputUnitByProduct = {};
      for (const sp of (stockProducts || [])) {
        multiplierByProduct[sp.id] = parseFloat(sp.units_to_base_multiplier || 1);
        inputUnitByProduct[sp.id] = sp.input_unit_type;
      }

      // 5. Aggregate purchases from stock_entries (all positive)
      const purchasedByProduct = {}; // productId -> { inputQty, baseQty, cost, entries }
      for (const entry of (stockEntries || [])) {
        const pid = entry.product_id;
        const multiplier = multiplierByProduct[pid] || 1;
        const rawQty = parseFloat(entry.quantity || 0);
        if (rawQty > 0) {
          if (!purchasedByProduct[pid]) {
            purchasedByProduct[pid] = { inputQty: 0, baseQty: 0, cost: 0, entries: [] };
          }
          purchasedByProduct[pid].inputQty += rawQty;
          purchasedByProduct[pid].baseQty += rawQty * multiplier;
          purchasedByProduct[pid].cost += parseFloat(entry.purchase_price || 0);
          purchasedByProduct[pid].entries.push(entry);
        }
      }

      // 6. Aggregate losses from stock_product_losses table
      const directLossByProduct = {}; // productId -> { inputQty, baseQty, entries }
      for (const loss of (stockLosses || [])) {
        const pid = loss.product_id;
        const multiplier = multiplierByProduct[pid] || 1;
        const inputQty = parseFloat(loss.quantity || 0);
        if (inputQty > 0) {
          if (!directLossByProduct[pid]) {
            directLossByProduct[pid] = { inputQty: 0, baseQty: 0, entries: [] };
          }
          directLossByProduct[pid].inputQty += inputQty;
          directLossByProduct[pid].baseQty += inputQty * multiplier;
          directLossByProduct[pid].entries.push(loss);
        }
      }

      // 7. Build report items
      const items = (stockProducts || []).map(sp => {
        const purchased = purchasedByProduct[sp.id];
        const recipe = recipeUsage[sp.id];
        const directLoss = directLossByProduct[sp.id];

        const multiplier = parseFloat(sp.units_to_base_multiplier || 1);
        // purchasedBaseQty: total quantity purchased in base units (positive entries only)
        const purchasedBaseQty = purchased ? purchased.baseQty : 0;
        // purchasedInputQty: total quantity in input units (for display in Purchased column)
        const purchasedInputQty = purchased ? purchased.inputQty : 0;
        const purchasedCost = purchased ? purchased.cost : 0;
        const recipeUsedQty = recipe?.qtyUsed || 0;
        const recipeUsedValue = recipe?.value || 0;
        const lostBaseQty = directLoss?.baseQty || 0;
        const lostInputQty = directLoss?.inputQty || 0;
        const currentQty = parseFloat(sp.current_stock || 0);
        const costPerUnit = parseFloat(sp.cost_per_base_unit || 0);
        const totalUsed = recipeUsedQty + lostBaseQty;
        // Opening qty estimate: current + used - purchased (all in base units)
        const openingQty = Math.max(0, currentQty + totalUsed - purchasedBaseQty);
        const totalCurrentValue = currentQty * costPerUnit;

        return {
          id: sp.id,
          name: sp.name,
          category: sp.category,
          baseUnit: sp.base_unit,
          inputUnit: sp.input_unit_type,
          multiplier,
          costPerUnit,
          openingQty,
          purchasedBaseQty,
          purchasedInputQty,
          purchasedCost,
          recipeUsedQty,
          recipeUsedValue,
          lostQty: lostBaseQty,
          lostInputQty,
          totalUsed,
          currentQty,
          totalCurrentValue,
          usedIn: recipe?.usedIn || {},
          lossEntries: directLoss?.entries || [],
          purchaseEntries: (purchasedByProduct[sp.id]?.entries || []).filter(e => parseFloat(e.quantity) > 0),
        };
      });

      // 8. Summary
      const summary = {
        totalProducts: items.length,
        totalPurchasedQty: items.reduce((s, i) => s + i.purchasedBaseQty, 0),
        totalPurchasedCost: items.reduce((s, i) => s + i.purchasedCost, 0),
        totalRecipeUsedValue: items.reduce((s, i) => s + i.recipeUsedValue, 0),
        totalCurrentValue: items.reduce((s, i) => s + i.totalCurrentValue, 0),
        totalLostQty: items.reduce((s, i) => s + i.lostQty, 0),
      };

      setReportData({ items, summary });
    } catch (err) {
      console.error('Stock movement report error:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, startDate, endDate]);

  useEffect(() => {
    if (restaurant?.id) fetchReport();
  }, [fetchReport]);

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatQty = (qty, unit) => `${Number(qty).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${unit || ''}`.trim();
  // Cost per unit needs more decimals for small values (e.g. £0.0009/g)
  const formatCostPerUnit = (cost) => `${currencySymbol}${cost < 0.1 ? cost.toFixed(4) : cost.toFixed(2)}`;
  const singularUnit = (unit) => unit === 'grams' ? 'gram' : unit;

  const filteredItems = (reportData?.items || []).filter(item => {
    if (stockTypeFilter === 'all') return true;
    return item.category === stockTypeFilter;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'used-desc') return b.totalUsed - a.totalUsed;
    if (sortBy === 'cost-desc') return b.totalCurrentValue - a.totalCurrentValue;
    return 0;
  });

  const handleExportCSV = () => {
    if (!filteredItems.length) return;
    const rows = [
      ['Stock Movement Report'],
      [`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`Restaurant: ${restaurant?.name || ''}`],
      [''],
      ['Product', 'Category', 'Unit', 'Cost/Unit', 'Opening Qty', 'Purchased', 'Used in Recipes', 'Lost/Adjusted', 'Closing Qty', 'Stock Value'],
      ...filteredItems.map(i => [
        i.name, i.category, i.inputUnit,
        i.costPerUnit < 0.1 ? i.costPerUnit.toFixed(4) : i.costPerUnit.toFixed(2),
        (i.openingQty / i.multiplier).toFixed(2),
        i.purchasedInputQty.toFixed(2),
        (i.recipeUsedQty / i.multiplier).toFixed(2),
        (i.lostInputQty).toFixed(2),
        (i.currentQty / i.multiplier).toFixed(2),
        i.totalCurrentValue.toFixed(2)
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-movement-${startDate}-to-${endDate}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!filteredItems.length) return;
    const s = reportData.summary;
    const generated = new Date().toLocaleString('en-GB');
    const period = `${formatDate(startDate)} – ${formatDate(endDate)}`;

    const productRows = filteredItems.map(item => `<tr>
      <td><strong>${item.name}</strong><br/><span style="font-size:10px;color:#64748b">${item.category || ''}</span></td>
      <td class="center">${item.inputUnit || ''}</td>
      <td class="right">${formatCostPerUnit(item.costPerUnit * item.multiplier)}/${item.inputUnit}</td>
      <td class="right">${(item.openingQty / item.multiplier).toFixed(2)} ${item.inputUnit}</td>
      <td class="right" style="color:#2563eb">${item.purchasedInputQty > 0 ? '+' + Number(item.purchasedInputQty).toFixed(2) + ' ' + item.inputUnit : '—'}</td>
      <td class="right" style="color:#d97706">${item.recipeUsedQty > 0 ? (item.recipeUsedQty / item.multiplier).toFixed(2) + ' ' + item.inputUnit : '—'}</td>
      <td class="right" style="color:#dc2626">${item.lostQty > 0 ? (item.lostInputQty).toFixed(2) + ' ' + item.inputUnit : '—'}</td>
      <td class="right"><strong>${(item.currentQty / item.multiplier).toFixed(2)} ${item.inputUnit}</strong></td>
      <td class="right" style="color:#059669"><strong>${formatCurrency(item.totalCurrentValue)}</strong></td>
    </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stock Movement – ${restaurant?.name} – ${startDate} to ${endDate}</title>
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
    .section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .section-title { background: #6262bd; color: #fff; font-weight: 700; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 7px 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead td { background: #f8fafc; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr.total-row { background: #f5f5ff; font-weight: 700; border-top: 2px solid #6262bd; }
    td { padding: 8px 10px; vertical-align: top; }
    .right { text-align: right; }
    .center { text-align: center; }
    .footer { text-align: center; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${restaurant?.name || 'Restaurant'}</h1>
    <h2>Stock Movement Report</h2>
    <p>${period}${stockTypeFilter !== 'all' ? ' · ' + (stockTypeFilter === 'kitchen' ? 'Kitchen / Food' : 'Bar / Beverage') : ''}</p>
    <p>Generated: ${generated}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Stock Items</div>
      <div class="value" style="color:#1f2937">${s.totalProducts}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">tracked products</div>
    </div>
    <div class="summary-card">
      <div class="label">Purchased</div>
      <div class="value" style="color:#2563eb">${formatCurrency(s.totalPurchasedCost)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">total spend</div>
    </div>
    <div class="summary-card">
      <div class="label">Used in Recipes</div>
      <div class="value" style="color:#d97706">${formatCurrency(s.totalRecipeUsedValue)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">ingredient cost of sales</div>
    </div>
    <div class="summary-card" style="border-color:#bbf7d0;background:#f0fdf4">
      <div class="label" style="color:#166534">Current Stock Value</div>
      <div class="value" style="color:#059669">${formatCurrency(s.totalCurrentValue)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">at current unit cost</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Stock Movement Breakdown</div>
    <table>
      <thead>
        <tr>
          <td>Product</td>
          <td class="center">Unit</td>
          <td class="right">Cost/Unit</td>
          <td class="right">Opening</td>
          <td class="right">Purchased</td>
          <td class="right">Used</td>
          <td class="right">Lost/Adj.</td>
          <td class="right">Closing</td>
          <td class="right">Stock Value</td>
        </tr>
      </thead>
      <tbody>
        ${productRows}
        <tr class="total-row">
          <td colspan="4">TOTAL (${s.totalProducts} products)</td>
          <td class="right" style="color:#2563eb">${formatCurrency(s.totalPurchasedCost)}</td>
          <td class="right" style="color:#d97706">${formatCurrency(s.totalRecipeUsedValue)}</td>
          <td></td>
          <td></td>
          <td class="right" style="color:#059669">${formatCurrency(s.totalCurrentValue)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>* Opening qty is estimated from current stock + usage - purchases in period. Closing qty reflects live stock level.</p>
    <p style="margin-top:4px">--- Generated by VenoApp ---</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
      </div>
    );
  }

  return (
    <OfflinePageGuard>
    <div className="min-h-screen p-4 md:p-8">
      <PageTabs tabs={reportsTabs} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 mb-1 flex items-center gap-2">
          {t('title')}
          <InfoTooltip text={tg('reports_stock_movement_desc')} />
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-sm">
          {t('subtitle')}
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-5">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-3 uppercase tracking-wide">
          {t('timeFrame')}
        </h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                activePreset === p.key
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700'
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
          <button
            onClick={() => setActivePreset('Custom')}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              activePreset === 'Custom'
                ? 'bg-[#6262bd] text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-700'
            }`}
          >
            {t('presetCustom')}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('from')}</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setActivePreset('Custom'); }}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 text-sm focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('to')}</label>
            <input
              type="date"
              value={endDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => { setEndDate(e.target.value); setActivePreset('Custom'); }}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 text-sm focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto px-5 py-2 bg-[#6262bd] hover:bg-[#5252ad] text-white font-medium rounded-sm transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {loading ? t('loading') : t('generateReport')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('totalStockItems')}</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{reportData.summary.totalProducts}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('activeProducts')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('purchasedPeriod')}</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(reportData.summary.totalPurchasedCost)}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('totalPurchaseCost')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('usedInRecipes')}</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(reportData.summary.totalRecipeUsedValue)}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('ingredientCostOfSales')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('currentStockValue')}</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(reportData.summary.totalCurrentValue)}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('atCurrentUnitCost')}</p>
            </div>
          </div>

          {/* Filter + Sort bar */}
          <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
            {/* Category toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-1">
              {[
                { value: 'all', labelKey: 'allStock' },
                { value: 'kitchen', labelKey: 'kitchenFood' },
                { value: 'bar', labelKey: 'barBeverage' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStockTypeFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                    stockTypeFilter === opt.value
                      ? 'bg-[#6262bd] text-white'
                      : 'text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('sortBy')}</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 focus:outline-none focus:border-[#6262bd]"
                >
                  <option value="name">{t('sortName')}</option>
                  <option value="used-desc">{t('sortMostUsed')}</option>
                  <option value="cost-desc">{t('sortHighestValue')}</option>
                </select>
              </div>
              {/* Export */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 rounded-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border-2 border-[#6262bd]/40 text-[#6262bd] rounded-sm hover:bg-[#6262bd]/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm p-10 text-center">
              <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('noStockItems')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 rounded-sm overflow-hidden">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-10 gap-2 px-5 py-3 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 uppercase tracking-wide">
                <div className="col-span-2">{t('product')}</div>
                <div className="text-right">{t('costUnit')}</div>
                <div className="text-right">{t('opening')}</div>
                <div className="text-right text-blue-600">{t('purchased')}</div>
                <div className="text-right text-amber-600">{t('usedRecipe')}</div>
                <div className="text-right text-red-500">{t('lostAdj')}</div>
                <div className="text-right">{t('closing')}</div>
                <div className="text-right">{t('stockValue')}</div>
                <div className="text-right">{t('details')}</div>
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 dark:divide-slate-800">
                {filteredItems.map(item => {
                  const isExpanded = expandedItems[item.id];
                  const hasDetails = Object.keys(item.usedIn).length > 0 || item.lossEntries.length > 0 || item.purchaseEntries.length > 0;
                  const isLow = item.currentQty < 50 && item.currentQty > 0; // rough low stock indicator
                  const isEmpty = item.currentQty <= 0;

                  return (
                    <div key={item.id}>
                      {/* Main row */}
                      <div
                        className={`px-5 py-3.5 lg:grid lg:grid-cols-10 lg:gap-2 flex flex-col gap-2 ${hasDetails ? 'cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/40' : ''} transition-colors`}
                        onClick={() => hasDetails && toggleExpand(item.id)}
                      >
                        {/* Name + category */}
                        <div className="col-span-2 flex items-start gap-2">
                          {hasDetails && (
                            <svg className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 mt-0.5 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          {!hasDetails && <span className="w-3.5 flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 text-sm">{item.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${item.category === 'kitchen' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                              {item.category}
                            </span>
                          </div>
                        </div>

                        {/* Cost per unit */}
                        <div className="lg:text-right text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 lg:block flex justify-between items-center">
                          <span className="lg:hidden text-zinc-400 dark:text-zinc-500">{t('costUnit')}</span>
                          <span>{item.currentQty > 0 ? `${formatCostPerUnit(item.costPerUnit * item.multiplier)}/${item.inputUnit}` : '—'}</span>
                        </div>

                        {/* Opening qty */}
                        <div className="lg:text-right text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 lg:block flex justify-between">
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('opening')}</span>
                          <span>{formatQty(item.openingQty / item.multiplier, item.inputUnit)}</span>
                        </div>

                        {/* Purchased — show in input units (e.g. kg, pieces) */}
                        <div className="lg:text-right text-sm text-blue-600 lg:block flex justify-between">
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('purchased')}</span>
                          <span>{item.purchasedInputQty > 0 ? `+${formatQty(item.purchasedInputQty, item.inputUnit)}` : '—'}</span>
                        </div>

                        {/* Used in recipe */}
                        <div className="lg:text-right text-sm text-amber-600 lg:block flex justify-between">
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('usedRecipe')}</span>
                          <span>{item.recipeUsedQty > 0 ? `−${formatQty(item.recipeUsedQty / item.multiplier, item.inputUnit)}` : '—'}</span>
                        </div>

                        {/* Lost / adjusted */}
                        <div className="lg:text-right text-sm text-red-500 lg:block flex justify-between">
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('lostAdj')}</span>
                          <span>{item.lostQty > 0 ? `−${formatQty(item.lostInputQty, item.inputUnit)}` : '—'}</span>
                        </div>

                        {/* Closing / current */}
                        <div className={`lg:text-right text-sm font-semibold lg:block flex justify-between ${isEmpty ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-zinc-700 dark:text-zinc-300 dark:text-zinc-300'}`}>
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('closing')}</span>
                          <span className="flex items-center lg:justify-end gap-1">
                            {formatQty(item.currentQty / item.multiplier, item.inputUnit)}
                            {isEmpty && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-1 rounded">out</span>}
                            {isLow && !isEmpty && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1 rounded">low</span>}
                          </span>
                        </div>

                        {/* Stock value */}
                        <div className="lg:text-right text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 lg:block flex justify-between">
                          <span className="lg:hidden text-xs text-zinc-400 dark:text-zinc-500">{t('stockValue')}</span>
                          <span>{item.currentQty > 0 ? formatCurrency(item.totalCurrentValue) : '—'}</span>
                        </div>

                        {/* Details indicator */}
                        <div className="hidden lg:flex lg:justify-end items-center">
                          {hasDetails && (
                            <span className="text-xs text-[#6262bd] font-medium">
                              {isExpanded ? t('hide') : t('details')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && hasDetails && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 px-10 py-4 space-y-4">
                          {/* Used in recipes */}
                          {Object.keys(item.usedIn).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                                {t('usedInRecipesSection')}
                              </p>
                              <div className="space-y-1">
                                {Object.entries(item.usedIn).sort((a, b) => b[1] - a[1]).map(([dish, qty]) => (
                                  <div key={dish} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                                    <span>{dish}</span>
                                    <span className="font-medium">{formatQty(qty / item.multiplier, item.inputUnit)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 pt-1 border-t border-zinc-200 dark:border-zinc-700 dark:border-zinc-700">
                                  <span>{t('totalRecipeUsage')}</span>
                                  <span>{formatQty(item.recipeUsedQty / item.multiplier, item.inputUnit)} ({formatCurrency(item.recipeUsedValue)})</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Purchases */}
                          {item.purchaseEntries.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">
                                {t('purchasesInPeriod')}
                              </p>
                              <div className="space-y-1">
                                {item.purchaseEntries.map((entry, i) => (
                                  <div key={i} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                                    <span>{formatDate(entry.created_at)}</span>
                                    <span className="font-medium text-blue-600">+{formatQty(parseFloat(entry.quantity), entry.unit_used || item.inputUnit)} ({formatCurrency(parseFloat(entry.purchase_price || 0))})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Direct losses/adjustments */}
                          {item.lossEntries.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                                {t('directAdjustments')}
                              </p>
                              <div className="space-y-1">
                                {item.lossEntries.map((entry, i) => (
                                  <div key={i} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                                    <span>{formatDate(entry.created_at)}</span>
                                    <span className="font-medium text-red-500">{formatQty(Math.abs(parseFloat(entry.quantity)), entry.unit_used || item.inputUnit)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Table footer */}
              <div className="hidden lg:grid grid-cols-10 gap-2 px-5 py-4 bg-zinc-50 dark:bg-zinc-900 dark:bg-zinc-800/50 border-t-2 border-zinc-200 dark:border-zinc-700 dark:border-zinc-700 text-sm font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
                <div className="col-span-2">{filteredItems.length} {t('products')}</div>
                <div></div>
                <div></div>
                <div className="text-right text-blue-600">{formatCurrency(filteredItems.reduce((s, i) => s + i.purchasedCost, 0))}</div>
                <div className="text-right text-amber-600">{formatCurrency(filteredItems.reduce((s, i) => s + i.recipeUsedValue, 0))}</div>
                <div className="text-right text-red-500">{formatCurrency(filteredItems.reduce((s, i) => s + i.lostQty * i.costPerUnit, 0))} {t('lost')}</div>
                <div></div>
                <div className="text-right text-emerald-600">{formatCurrency(filteredItems.reduce((s, i) => s + i.totalCurrentValue, 0))}</div>
                <div></div>
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 flex gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('infoNote')}</span>
            </p>
          </div>
        </>
      )}
    </div>
    </OfflinePageGuard>
  );
}
