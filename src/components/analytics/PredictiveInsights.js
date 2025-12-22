'use client'

// Updated component with improved readability
export default function PredictiveInsights({ salesTrends, topProducts }) {
  if (!salesTrends || salesTrends.length === 0) {
    return null
  }

  // Calculate growth trend (last 7 days vs previous 7 days)
  const calculateGrowthTrend = () => {
    if (salesTrends.length < 14) return null

    const lastWeek = salesTrends.slice(-7)
    const previousWeek = salesTrends.slice(-14, -7)

    const lastWeekRevenue = lastWeek.reduce((sum, day) => sum + parseFloat(day.total_revenue || 0), 0)
    const previousWeekRevenue = previousWeek.reduce((sum, day) => sum + parseFloat(day.total_revenue || 0), 0)

    if (previousWeekRevenue === 0) return null

    const growth = ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100

    return {
      growth: growth.toFixed(1),
      lastWeekRevenue,
      previousWeekRevenue,
      isPositive: growth > 0
    }
  }

  // Predict next week revenue based on average growth
  const predictNextWeek = () => {
    if (salesTrends.length < 7) return null

    const lastWeek = salesTrends.slice(-7)
    const avgDailyRevenue = lastWeek.reduce((sum, day) => sum + parseFloat(day.total_revenue || 0), 0) / 7

    // Simple linear prediction: next week revenue = avg daily * 7
    const predicted = avgDailyRevenue * 7

    return predicted.toFixed(2)
  }

  // Find best performing day of week
  const findBestDay = () => {
    if (salesTrends.length < 7) return null

    const dayTotals = {}

    salesTrends.forEach(day => {
      const date = new Date(day.date)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

      if (!dayTotals[dayName]) {
        dayTotals[dayName] = { revenue: 0, count: 0 }
      }

      dayTotals[dayName].revenue += parseFloat(day.total_revenue || 0)
      dayTotals[dayName].count++
    })

    let bestDay = null
    let highestAvg = 0

    Object.entries(dayTotals).forEach(([day, data]) => {
      const avg = data.revenue / data.count
      if (avg > highestAvg) {
        highestAvg = avg
        bestDay = day
      }
    })

    return { day: bestDay, avgRevenue: highestAvg.toFixed(2) }
  }

  // Calculate average order value trend
  const getAOVTrend = () => {
    if (salesTrends.length < 2) return null

    const recent = salesTrends.slice(-7)
    const avgAOV = recent.reduce((sum, day) => {
      const aov = day.total_orders > 0 ? parseFloat(day.total_revenue || 0) / day.total_orders : 0
      return sum + aov
    }, 0) / recent.length

    return avgAOV.toFixed(2)
  }

  const growthTrend = calculateGrowthTrend()
  const nextWeekPrediction = predictNextWeek()
  const bestDay = findBestDay()
  const aovTrend = getAOVTrend()

  return (
    <div className="bg-white border-2 border-[#6262bd] rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h2 className="text-xl font-bold text-slate-800">Predictive Insights</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {growthTrend && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium mb-1">Week-over-Week Growth</p>
            <p className={`text-2xl font-bold ${growthTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {growthTrend.isPositive ? '+' : ''}{growthTrend.growth}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ${growthTrend.lastWeekRevenue.toFixed(0)} vs ${growthTrend.previousWeekRevenue.toFixed(0)}
            </p>
          </div>
        )}

        {nextWeekPrediction && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium mb-1">Next Week Forecast</p>
            <p className="text-2xl font-bold text-[#6262bd]">
              ${nextWeekPrediction}
            </p>
            <p className="text-xs text-slate-500 mt-1">Based on 7-day average</p>
          </div>
        )}

        {bestDay && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium mb-1">Best Performing Day</p>
            <p className="text-2xl font-bold text-[#6262bd]">{bestDay.day}</p>
            <p className="text-xs text-slate-500 mt-1">Avg ${bestDay.avgRevenue} revenue</p>
          </div>
        )}

        {aovTrend && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-slate-600 text-sm font-medium mb-1">Avg Order Value</p>
            <p className="text-2xl font-bold text-[#6262bd]">${aovTrend}</p>
            <p className="text-xs text-slate-500 mt-1">Last 7 days average</p>
          </div>
        )}
      </div>

      {topProducts && topProducts.length > 0 && (
        <div className="mt-4 bg-gradient-to-br from-[#6262bd] to-[#5252a3] rounded-xl p-4 text-white">
          <p className="text-white text-sm font-medium mb-2">Recommended Action</p>
          <p className="text-white text-sm">
            <strong>{topProducts[0].menu_item_name}</strong> is your top seller.
            Consider promoting similar items or creating bundle offers to increase sales.
          </p>
        </div>
      )}
    </div>
  )
}
