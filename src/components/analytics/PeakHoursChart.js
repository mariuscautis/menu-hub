'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PeakHoursChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
        <p className="text-slate-400">No data available</p>
      </div>
    )
  }

  const chartData = data.map(item => ({
    hour: item.hour_label || `${String(item.hour).padStart(2, '0')}:00`,
    orders: parseFloat(item.avg_orders || 0),
    revenue: parseFloat(item.avg_revenue || 0)
  }))

  return (
    <div className="w-full" style={{ height: '320px' }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="hour"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            label={{ value: 'Avg Orders', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            label={{ value: 'Avg Revenue', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'orders') return [parseFloat(value).toFixed(1), 'Avg Orders']
              return [`$${parseFloat(value).toFixed(2)}`, 'Avg Revenue']
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            yAxisId="left"
            dataKey="orders"
            fill="#6262bd"
            radius={[4, 4, 0, 0]}
            name="orders"
          />
          <Bar
            yAxisId="right"
            dataKey="revenue"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="revenue"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
