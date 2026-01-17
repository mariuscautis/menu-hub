'use client'

import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function TopProductsTable({ data }) {
  const t = useTranslations('analytics')
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <p className="text-slate-400">{t('noData')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('rank')}</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('product')}</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('department')}</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('qtySold')}</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('revenue')}</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('profit')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.menu_item_id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-slate-200 text-slate-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  {index + 1}
                </span>
              </td>
              <td className="py-3 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">{item.menu_item_name}</td>
              <td className="py-3 px-4 text-sm">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item.department === 'bar'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {item.department === 'bar' ? `🍸 ${t('bar')}` : `🍳 ${t('kitchen')}`}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 text-right font-semibold">{item.quantity_sold}</td>
              <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 text-right">
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
