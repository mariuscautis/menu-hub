'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#6262bd', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
        <p className="text-slate-400">No data available</p>
      </div>
    )
  }

  // Support department, category, and product data
  const chartData = data.map(item => ({
    name: item.department || item.category_name || item.menu_item_name || 'Unknown',
    value: parseFloat(item.revenue || item.total_revenue || 0),
    quantity: parseInt(item.quantity_sold || item.total_quantity || 0)
  })).filter(item => item.value > 0)

  // Capitalize department names for display
  const formattedData = chartData.map(item => ({
    ...item,
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1)
  }))

  return (
    <div className="w-full" style={{ height: '320px' }}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            formatter={(value, name, props) => {
              if (name === 'value') {
                return [`$${parseFloat(value).toFixed(2)}`, 'Revenue']
              }
              return [value, name]
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
