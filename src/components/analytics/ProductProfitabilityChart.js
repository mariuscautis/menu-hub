'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

export default function ProductProfitabilityChart({ data }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(3)

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
        <p className="text-slate-400">No profitability data available</p>
      </div>
    )
  }

  // Filter data based on search query
  const filteredData = data.filter(item =>
    item.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get items to display
  const displayedData = filteredData.slice(0, displayCount)
  const hasMore = filteredData.length > displayCount

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-4 border-2 border-slate-200 rounded-xl shadow-lg">
          <p className="font-semibold text-slate-800 mb-2">{item.menu_item_name}</p>
          <p className="text-sm text-green-600">
            Revenue: £{item.revenue.toFixed(2)}
          </p>
          <p className="text-sm text-amber-600">
            Cost: £{item.cost.toFixed(2)}
          </p>
          <p className="text-sm text-[#6262bd] font-semibold">
            Profit: £{item.profit.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Margin: {item.profit_margin.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + 3, filteredData.length))
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setDisplayCount(3) // Reset display count on search
          }}
          placeholder="Search products..."
          className="w-full px-4 py-2 pl-10 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center h-32 bg-slate-50 rounded-xl">
          <p className="text-slate-400">No products found matching "{searchQuery}"</p>
        </div>
      ) : (
        <>
          {/* Product Cards with Horizontal Bars */}
          <div className="space-y-4">
            {displayedData.map((item, index) => (
              <div key={index} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">{item.menu_item_name}</h4>
                  <span className="text-sm font-medium text-[#6262bd]">
                    {item.profit_margin.toFixed(1)}% margin
                  </span>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="space-y-2">
                  {/* Revenue Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Revenue</span>
                      <span className="font-semibold">£{item.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${Math.min((item.revenue / Math.max(...displayedData.map(d => d.revenue))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Cost Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Cost</span>
                      <span className="font-semibold">£{item.cost.toFixed(2)}</span>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${Math.min((item.cost / Math.max(...displayedData.map(d => d.revenue))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Profit Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Profit</span>
                      <span className="font-semibold">£{item.profit.toFixed(2)}</span>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-[#6262bd] transition-all duration-500"
                        style={{
                          width: `${Math.min((item.profit / Math.max(...displayedData.map(d => d.revenue))) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="mt-3 pt-3 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
                  <span>Qty Sold: {item.quantity_sold}</span>
                  <span>Profit/Unit: £{(item.profit / item.quantity_sold).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {hasMore && (
            <button
              onClick={handleShowMore}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors border-2 border-slate-200"
            >
              Show More ({filteredData.length - displayCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}
