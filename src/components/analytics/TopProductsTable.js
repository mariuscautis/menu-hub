'use client'

export default function TopProductsTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
        <p className="text-slate-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rank</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty Sold</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Revenue</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Profit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.menu_item_id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 text-sm text-slate-600">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-slate-200 text-slate-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  {index + 1}
                </span>
              </td>
              <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.menu_item_name}</td>
              <td className="py-3 px-4 text-sm">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item.department === 'bar'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {item.department === 'bar' ? '🍸 Bar' : '🍳 Kitchen'}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-700 text-right font-semibold">{item.quantity_sold}</td>
              <td className="py-3 px-4 text-sm text-slate-700 text-right">
                ${parseFloat(item.revenue || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-sm text-right">
                <span className={parseFloat(item.profit || 0) >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  ${parseFloat(item.profit || 0).toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
