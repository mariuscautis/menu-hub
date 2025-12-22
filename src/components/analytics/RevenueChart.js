'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RevenueChart({ data, groupBy = 'day' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
        <p className="text-slate-400">No data available</p>
      </div>
    )
  }

  // Format date based on groupBy
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    if (groupBy === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (groupBy === 'week') {
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else if (groupBy === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    return dateString
  }

  const chartData = data.map(item => ({
    date: formatDate(item.date),
    revenue: parseFloat(item.total_revenue || 0),
    profit: parseFloat(item.total_profit || 0),
    orders: parseInt(item.total_orders || 0)
  }))

  return (
    <div className="w-full" style={{ height: '320px' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'orders') return [value, 'Orders']
              return [`$${parseFloat(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#6262bd"
            strokeWidth={2}
            dot={{ fill: '#6262bd', r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Profit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
