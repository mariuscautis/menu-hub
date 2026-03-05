'use client'

import { useState, useRef } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'

// --- CSV helpers ---

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = splitCSVLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim() })
    return obj
  })
  return { headers, rows }
}

function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// --- Templates ---

const MENU_TEMPLATE = `name,price,category,department,description,available
"Margherita Pizza",12.50,"Pizzas","kitchen","Classic tomato and mozzarella",true
"Espresso",2.00,"Hot Drinks","bar","Short and strong",true
"Grilled Salmon",18.00,"Mains","kitchen","Served with seasonal vegetables",true`

const STOCK_TEMPLATE = `name,brand,category,base_unit,cost_per_base_unit,current_stock
"Olive Oil","Bertolli","kitchen","ml",0.008,5000
"House Red Wine","","bar","ml",0.005,12000
"Chicken Breast","","kitchen","grams",0.012,3000`

// --- Validation ---

function validateMenuRows(rows) {
  return rows.map((row, i) => {
    const errors = []
    if (!row.name) errors.push('Missing name')
    const price = parseFloat(row.price)
    if (isNaN(price) || price < 0) errors.push('Invalid price')
    return { ...row, _rowNum: i + 2, _errors: errors, _valid: errors.length === 0 }
  })
}

function validateStockRows(rows) {
  return rows.map((row, i) => {
    const errors = []
    if (!row.name) errors.push('Missing name')
    if (row.cost_per_base_unit && isNaN(parseFloat(row.cost_per_base_unit))) errors.push('Invalid cost')
    if (row.current_stock && isNaN(parseFloat(row.current_stock))) errors.push('Invalid stock quantity')
    return { ...row, _rowNum: i + 2, _errors: errors, _valid: errors.length === 0 }
  })
}

// --- Main component ---

export default function DataMigration() {
  const t = useTranslations('dataMigration')
  const restaurantCtx = useRestaurant()
  const restaurant = restaurantCtx?.restaurant

  const [importType, setImportType] = useState(null) // 'menu' | 'stock'
  const [step, setStep] = useState(1) // 1=choose, 2=upload+preview, 3=results
  const [parsedRows, setParsedRows] = useState([])
  const [mode, setMode] = useState('skip') // 'skip' | 'overwrite'
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [exportingType, setExportingType] = useState(null)
  const fileInputRef = useRef(null)

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          {t('accessDenied')}
        </div>
      </div>
    )
  }

  const validRows = parsedRows.filter(r => r._valid)
  const errorRows = parsedRows.filter(r => !r._valid)

  function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      alert(t('csvOnly'))
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { rows } = parseCSV(e.target.result)
      const validated = importType === 'menu' ? validateMenuRows(rows) : validateStockRows(rows)
      setParsedRows(validated)
      setStep(2)
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0])
  }

  async function handleExport(type) {
    setExportingType(type)
    try {
      const endpoint = type === 'menu'
        ? `/api/export/menu-items?restaurantId=${restaurant.id}`
        : `/api/export/stock-products?restaurantId=${restaurant.id}`

      const res = await fetch(endpoint)
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || t('exportFailed'))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'menu' ? 'menu-items-export.csv' : 'stock-products-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(t('exportFailedRetry'))
    } finally {
      setExportingType(null)
    }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const endpoint = importType === 'menu'
        ? '/api/import/menu-items'
        : '/api/import/stock-products'

      const payload = importType === 'menu'
        ? { restaurantId: restaurant.id, items: validRows, mode }
        : { restaurantId: restaurant.id, products: validRows, mode }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (!res.ok) {
        setResults({ success: false, error: data.error || t('importFailed') })
      } else {
        setResults({ success: true, ...data })
      }
      setStep(3)
    } catch (err) {
      setResults({ success: false, error: t('networkError') })
      setStep(3)
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setImportType(null)
    setStep(1)
    setParsedRows([])
    setResults(null)
    setFileName(null)
    setMode('skip')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
        <p className="text-slate-500">{t('subtitle')}</p>
      </div>

      {/* Step 1 — Choose what to import */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 mb-1">{t('chooseType')}</h2>
            <p className="text-sm text-slate-500 mb-6">{t('chooseTypeDesc')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setImportType('menu')}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  importType === 'menu'
                    ? 'border-[#6262bd] bg-[#6262bd]/5'
                    : 'border-slate-200 hover:border-[#6262bd]/40'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${importType === 'menu' ? 'bg-[#6262bd]' : 'bg-slate-100'}`}>
                    <svg className={`w-5 h-5 ${importType === 'menu' ? 'text-white' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{t('menuItems')}</div>
                    <div className="text-xs text-slate-500">name, price, category, department</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{t('menuItemsDesc')}</p>
              </button>

              <button
                onClick={() => setImportType('stock')}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  importType === 'stock'
                    ? 'border-[#6262bd] bg-[#6262bd]/5'
                    : 'border-slate-200 hover:border-[#6262bd]/40'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${importType === 'stock' ? 'bg-[#6262bd]' : 'bg-slate-100'}`}>
                    <svg className={`w-5 h-5 ${importType === 'stock' ? 'text-white' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-2.18c.07-.44.18-.86.18-1.3C18 2.12 15.88 0 13.3 0c-1.48 0-2.67.73-3.43 1.84L9 3.4l-.87-1.56C7.43.73 6.24 0 4.76 0 2.18 0 0 2.12 0 4.7c0 .44.11.86.18 1.3H0v2h20V6zm-7.7-4c1.02 0 1.8.8 1.8 1.7S13.32 5.4 12.3 5.4H9.5l2.35-3.14C12.1 2.1 12.18 2 12.3 2zM4.7 2c.12 0 .2.1.45.26L7.5 5.4H4.7C3.68 5.4 2.9 4.6 2.9 3.7S3.68 2 4.7 2zM2 20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10H2v10zm9-7h2v2h-2v-2zm0 4h2v2h-2v-2zM5 13h2v2H5v-2zm0 4h2v2H5v-2zm10-4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{t('stockProducts')}</div>
                    <div className="text-xs text-slate-500">name, brand, category, unit, cost</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{t('stockProductsDesc')}</p>
              </button>
            </div>
          </div>

          {importType && (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-700">
                  {t('step1Title')}
                </h2>
                <span className="text-xs bg-[#6262bd]/10 text-[#6262bd] font-medium px-3 py-1 rounded-full">
                  {importType === 'menu' ? t('menuItems') : t('stockProducts')}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {t('step1Desc')} {importType === 'menu' ? t('step1DescMenu') : t('step1DescStock')}
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 overflow-x-auto">
                <code className="text-xs text-slate-600 whitespace-pre">
                  {importType === 'menu'
                    ? 'name, price, category, department, description, available'
                    : 'name, brand, category, base_unit, cost_per_base_unit, current_stock'}
                </code>
              </div>

              <div className="space-y-2 mb-6 text-sm text-slate-600">
                {importType === 'menu' ? (
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>name</strong> — {t('required')}</li>
                    <li><strong>price</strong> — {t('menuPriceDesc')}</li>
                    <li><strong>category</strong> — {t('menuCategoryDesc')}</li>
                    <li><strong>department</strong> — {t('menuDepartmentDesc')}</li>
                    <li><strong>description</strong> — {t('optional')}</li>
                    <li><strong>available</strong> — {t('menuAvailableDesc')}</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>name</strong> — {t('required')}</li>
                    <li><strong>brand</strong> — {t('optional')}</li>
                    <li><strong>category</strong> — {t('stockCategoryDesc')}</li>
                    <li><strong>base_unit</strong> — {t('stockBaseUnitDesc')}</li>
                    <li><strong>cost_per_base_unit</strong> — {t('stockCostDesc')}</li>
                    <li><strong>current_stock</strong> — {t('stockCurrentDesc')}</li>
                  </ul>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => downloadCSV(
                    importType === 'menu' ? 'menu-items-template.csv' : 'stock-products-template.csv',
                    importType === 'menu' ? MENU_TEMPLATE : STOCK_TEMPLATE
                  )}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  {t('downloadTemplate')}
                </button>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-slate-700 mb-3">{t('step2Title')}</h3>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-[#6262bd] bg-[#6262bd]/5' : 'border-slate-200 hover:border-[#6262bd]/40 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                  </svg>
                  <p className="text-slate-500 font-medium">{t('dragDrop')}</p>
                  <p className="text-slate-400 text-sm mt-1">{t('orClick')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Preview & confirm */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-700">{t('previewTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {fileName} — {t('rowsParsed').replace('{n}', parsedRows.length)}
                </p>
              </div>
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 underline">
                {t('startOver')}
              </button>
            </div>

            {/* Summary pills */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-700">{t('readyToImport').replace('{n}', validRows.length)}</span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-700">{t('rowsWithErrors').replace('{n}', errorRows.length)}</span>
                </div>
              )}
            </div>

            {/* Duplicate handling */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm font-medium text-slate-700 mb-3">{t('duplicateHandling')}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="skip"
                    checked={mode === 'skip'}
                    onChange={() => setMode('skip')}
                    className="text-[#6262bd] focus:ring-[#6262bd]"
                  />
                  <span className="text-sm text-slate-700">{t('skipDuplicate')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="overwrite"
                    checked={mode === 'overwrite'}
                    onChange={() => setMode('overwrite')}
                    className="text-[#6262bd] focus:ring-[#6262bd]"
                  />
                  <span className="text-sm text-slate-700">{t('importAnyway')}</span>
                </label>
              </div>
            </div>

            {/* Error rows */}
            {errorRows.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-red-600 mb-2">{t('errorRowsTitle')}</h3>
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-red-700 font-medium">{t('colRow')}</th>
                        <th className="text-left px-4 py-2 text-red-700 font-medium">{t('colName')}</th>
                        <th className="text-left px-4 py-2 text-red-700 font-medium">{t('colError')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorRows.map((row, i) => (
                        <tr key={i} className="border-t border-red-50">
                          <td className="px-4 py-2 text-slate-500">{row._rowNum}</td>
                          <td className="px-4 py-2 text-slate-700">{row.name || '—'}</td>
                          <td className="px-4 py-2 text-red-600">{row._errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Valid rows preview */}
            {validRows.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-700 mb-2">
                  {t('rowsToImport')}{validRows.length > 5 ? ` (${t('showingFirst5').replace('{n}', validRows.length)})` : ''}
                </h3>
                <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {importType === 'menu' ? (
                          <>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colName')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colPrice')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colCategory')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colDepartment')}</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colName')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colBrand')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colCategory')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colUnit')}</th>
                            <th className="text-left px-4 py-2 text-slate-600 font-medium">{t('colCost')}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-slate-50">
                          {importType === 'menu' ? (
                            <>
                              <td className="px-4 py-2 text-slate-800 font-medium">{row.name}</td>
                              <td className="px-4 py-2 text-slate-600">{row.price}</td>
                              <td className="px-4 py-2 text-slate-600">{row.category || '—'}</td>
                              <td className="px-4 py-2 text-slate-600">{row.department || 'kitchen'}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2 text-slate-800 font-medium">{row.name}</td>
                              <td className="px-4 py-2 text-slate-600">{row.brand || '—'}</td>
                              <td className="px-4 py-2 text-slate-600">{row.category || 'kitchen'}</td>
                              <td className="px-4 py-2 text-slate-600">{row.base_unit || 'unit'}</td>
                              <td className="px-4 py-2 text-slate-600">{row.cost_per_base_unit || '—'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {validRows.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700 text-sm">
                {t('noValidRows')}
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {importing
                  ? t('importing')
                  : t('importBtn').replace('{n}', validRows.length).replace('{type}', importType === 'menu' ? t('menuItems') : t('stockProducts'))}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Results */}
      {step === 3 && results && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            {results.success ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{t('importComplete')}</h2>
                    <p className="text-sm text-slate-500">{t('importCompleteDesc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-700">{results.imported}</div>
                    <div className="text-sm text-green-600 mt-1">{t('imported')}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-slate-500">{results.skipped}</div>
                    <div className="text-sm text-slate-500 mt-1">{t('skipped')}</div>
                  </div>
                  {results.errors?.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{results.errors.length}</div>
                      <div className="text-sm text-red-500 mt-1">{t('errors')}</div>
                    </div>
                  )}
                </div>

                {results.skippedNames?.length > 0 && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-2">{t('skippedAlreadyExist')}</p>
                    <p className="text-sm text-slate-500">{results.skippedNames.join(', ')}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <a
                    href={importType === 'menu' ? '/dashboard/menu' : '/dashboard/stock'}
                    className="flex-1 text-center bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-all"
                  >
                    {t('view')} {importType === 'menu' ? t('menuItems') : t('stockProducts')}
                  </a>
                  <button
                    onClick={reset}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    {t('importMore')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{t('importFailed')}</h2>
                    <p className="text-sm text-red-600">{results.error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-all"
                >
                  {t('tryAgain')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Export section */}
      {step === 1 && (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mt-6">
          <h2 className="text-lg font-bold text-slate-700 mb-1">{t('exportTitle')}</h2>
          <p className="text-sm text-slate-500 mb-5">{t('exportDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleExport('menu')}
              disabled={exportingType !== null}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#6262bd]/40 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  {exportingType === 'menu' ? t('exporting') : t('exportMenuItems')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">name, price, category, department, description</div>
              </div>
            </button>

            <button
              onClick={() => handleExport('stock')}
              disabled={exportingType !== null}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#6262bd]/40 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  {exportingType === 'stock' ? t('exporting') : t('exportStockProducts')}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">name, brand, category, base_unit, cost, stock</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Info box */}
      {step === 1 && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 mt-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">{t('infoTitle')}</h3>
              <p className="text-sm text-blue-800">
                {t('infoDesc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
