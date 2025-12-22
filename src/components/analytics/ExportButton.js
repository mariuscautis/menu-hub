'use client'

export default function ExportButton({ overview, salesTrends, topProducts, dateRange }) {
  const exportToCSV = () => {
    if (!salesTrends || salesTrends.length === 0) {
      alert('No data to export')
      return
    }

    // Prepare CSV content
    let csvContent = 'data:text/csv;charset=utf-8,'

    // Add header with summary
    csvContent += `Analytics Report\n`
    csvContent += `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n`
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`

    // Add overview section
    if (overview) {
      csvContent += `OVERVIEW\n`
      csvContent += `Total Revenue,$${parseFloat(overview.total_revenue || 0).toFixed(2)}\n`
      csvContent += `Total Orders,${overview.total_orders || 0}\n`
      csvContent += `Average Order Value,$${parseFloat(overview.average_order_value || 0).toFixed(2)}\n`
      csvContent += `Total Profit,$${parseFloat(overview.total_profit || 0).toFixed(2)}\n`
      csvContent += `Profit Margin,${parseFloat(overview.profit_margin_percent || 0).toFixed(1)}%\n\n`
    }

    // Add sales trends section
    csvContent += `SALES TRENDS\n`
    csvContent += `Date,Revenue,Orders,Items Sold,Profit,Avg Order Value\n`
    salesTrends.forEach(day => {
      csvContent += `${day.date},`
      csvContent += `${parseFloat(day.total_revenue || 0).toFixed(2)},`
      csvContent += `${day.total_orders || 0},`
      csvContent += `${day.total_items_sold || 0},`
      csvContent += `${parseFloat(day.total_profit || 0).toFixed(2)},`
      csvContent += `${parseFloat(day.average_order_value || 0).toFixed(2)}\n`
    })

    // Add top products section
    if (topProducts && topProducts.length > 0) {
      csvContent += `\nTOP PRODUCTS\n`
      csvContent += `Rank,Product,Category,Quantity Sold,Revenue,Profit\n`
      topProducts.forEach((product, index) => {
        csvContent += `${index + 1},`
        csvContent += `"${product.menu_item_name}",`
        csvContent += `"${product.category_name || 'N/A'}",`
        csvContent += `${product.quantity_sold},`
        csvContent += `${parseFloat(product.revenue || 0).toFixed(2)},`
        csvContent += `${parseFloat(product.profit || 0).toFixed(2)}\n`
      })
    }

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `analytics_${dateRange.startDate}_to_${dateRange.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
      </svg>
      Export CSV
    </button>
  )
}
