'use client'

import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function TemplateSelector({ selectedTemplate, onSelectTemplate }) {
  const t = useTranslations('taxInvoicing')

  const templates = [
    {
      id: 'classic',
      name: t('templateClassicName'),
      description: t('templateClassicDescription'),
      features: [t('templateClassicFeature1'), t('templateClassicFeature2'), t('templateClassicFeature3'), t('templateClassicFeature4')],
      preview: (
        <div className="w-full h-48 bg-white border-2 border-slate-200 rounded-lg p-4 overflow-hidden">
          <div className="border-b-2 border-[#6262bd] pb-2 mb-3">
            <div className="text-center text-xl font-bold text-[#6262bd]">{t('previewInvoice')}</div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{t('previewInvoiceNumber')} INV-2025-001</span>
              <span>{t('previewDate')} 13 Dec 2025</span>
            </div>
          </div>
          <div className="flex justify-between text-xs mb-3">
            <div>
              <div className="font-bold text-xs mb-1">{t('previewFrom')}</div>
              <div className="text-slate-700">{t('previewYourRestaurant')}</div>
            </div>
            <div>
              <div className="font-bold text-xs mb-1">{t('previewBillTo')}</div>
              <div className="text-slate-700">{t('previewClientName')}</div>
            </div>
          </div>
          <div className="bg-[#6262bd] text-white text-xs px-2 py-1 flex justify-between">
            <span>{t('previewDescription')}</span>
            <span>{t('previewTotal')}</span>
          </div>
          <div className="bg-slate-50 text-xs px-2 py-1 flex justify-between">
            <span>{t('previewItem1')}</span>
            <span>{t('previewItem1Price')}</span>
          </div>
        </div>
      )
    },
    {
      id: 'modern-minimal',
      name: t('templateModernName'),
      description: t('templateModernDescription'),
      features: [t('templateModernFeature1'), t('templateModernFeature2'), t('templateModernFeature3'), t('templateModernFeature4')],
      preview: (
        <div className="w-full h-48 bg-white border border-slate-200 rounded-lg p-5 overflow-hidden">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <div className="text-lg tracking-wider text-slate-800">{t('previewInvoice')}</div>
            <div className="flex justify-between text-xs text-slate-400 mt-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">{t('previewInvoiceNumberAlt')}</div>
                <div className="text-slate-600">INV-2025-001</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">{t('previewDate')}</div>
                <div className="text-slate-600">13 Dec 2025</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs mb-3">
            <div>
              <div className="text-xs text-slate-400 mb-2 tracking-wide">{t('previewFrom')}</div>
              <div className="text-slate-700 font-semibold">{t('previewYourRestaurant')}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-2 tracking-wide">{t('previewBillTo')}</div>
              <div className="text-slate-700 font-semibold">{t('previewClientName')}</div>
            </div>
          </div>
          <div className="border-b border-slate-200 pb-2 mb-2 flex justify-between text-xs text-slate-400">
            <span>{t('previewDescription')}</span>
            <span>{t('previewTotal')}</span>
          </div>
          <div className="text-xs flex justify-between py-2 text-slate-600">
            <span>{t('previewItem1')}</span>
            <span>{t('previewItem1Price')}</span>
          </div>
        </div>
      )
    },
    {
      id: 'bold-colorful',
      name: t('templateBoldName'),
      description: t('templateBoldDescription'),
      features: [t('templateBoldFeature1'), t('templateBoldFeature2'), t('templateBoldFeature3'), t('templateBoldFeature4')],
      preview: (
        <div className="w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#6262bd] text-white p-3">
            <div className="text-2xl font-bold mb-2">{t('previewInvoice')}</div>
            <div className="flex justify-between text-xs">
              <div className="bg-white/10 px-2 py-1 rounded">
                <div className="text-indigo-200 text-xs">{t('previewInvoiceNumberAlt')}</div>
                <div className="font-bold">INV-2025-001</div>
              </div>
              <div className="bg-white/10 px-2 py-1 rounded">
                <div className="text-indigo-200 text-xs">{t('previewDate')}</div>
                <div className="font-bold">13 Dec 2025</div>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between text-xs mb-2">
              <div className="bg-slate-50 p-2 border-l-2 border-[#6262bd] flex-1 mr-2">
                <div className="text-[#6262bd] font-bold mb-1">{t('previewFrom')}</div>
                <div className="text-slate-700 font-semibold">{t('previewYourRestaurant')}</div>
              </div>
              <div className="bg-slate-50 p-2 border-l-2 border-[#6262bd] flex-1">
                <div className="text-[#6262bd] font-bold mb-1">{t('previewBillTo')}</div>
                <div className="text-slate-700 font-semibold">{t('previewClientName')}</div>
              </div>
            </div>
            <div className="bg-indigo-600 text-white text-xs px-2 py-1 flex justify-between mt-2">
              <span>{t('previewDescription')}</span>
              <span>{t('previewTotal')}</span>
            </div>
            <div className="text-xs px-2 py-1 flex justify-between">
              <span className="font-bold">{t('previewItem1')}</span>
              <span className="font-bold">{t('previewItem1Price')}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'compact-detailed',
      name: t('templateCompactName'),
      description: t('templateCompactDescription'),
      features: [t('templateCompactFeature1'), t('templateCompactFeature2'), t('templateCompactFeature3'), t('templateCompactFeature4')],
      preview: (
        <div className="w-full h-48 bg-white border-2 border-slate-200 rounded-lg p-3 overflow-hidden">
          <div className="border-b border-slate-700 pb-1 mb-2">
            <div className="text-base font-bold text-slate-800">{t('previewInvoice')}</div>
            <div className="flex justify-between text-xs text-slate-500">
              <div className="flex gap-2">
                <span><b>{t('previewNo')}</b> INV-2025-001</span>
                <span><b>{t('previewDate')}</b> 13 Dec 2025</span>
              </div>
              <span className="text-green-600 font-bold">{t('previewPaid')}</span>
            </div>
          </div>
          <div className="flex gap-2 text-xs mb-2">
            <div className="flex-1">
              <div className="font-bold text-xs mb-1">{t('previewFrom')}</div>
              <div className="text-slate-700 text-xs leading-tight">
                <div className="font-semibold">{t('previewYourRestaurant')}</div>
                <div>{t('previewAddress1')}</div>
                <div>{t('previewCity1')}</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-xs mb-1">{t('previewBillTo')}</div>
              <div className="text-slate-700 text-xs leading-tight">
                <div className="font-semibold">{t('previewClientName')}</div>
                <div>{t('previewAddress2')}</div>
                <div>{t('previewCity2')}</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 text-white text-xs px-2 py-1 flex justify-between">
            <span>{t('previewDescription').toUpperCase()}</span>
            <span>{t('previewTotal').toUpperCase()}</span>
          </div>
          <div className="text-xs px-2 py-1 flex justify-between border-b border-slate-200">
            <span>{t('previewItem1')}</span>
            <span>{t('previewItem1Price')}</span>
          </div>
          <div className="bg-slate-50 text-xs px-2 py-1 flex justify-between border-b border-slate-200">
            <span>{t('previewItem2')}</span>
            <span>{t('previewItem2Price')}</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-700 mb-2">{t('templateSectionTitle')}</h3>
        <p className="text-sm text-slate-500">
          {t('templateSectionDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`group relative bg-white border-2 rounded-xl p-4 text-left transition-all hover:shadow-lg ${
              selectedTemplate === template.id
                ? 'border-[#6262bd] shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Selected indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-3 right-3 bg-[#6262bd] text-white rounded-full p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Template name and description */}
            <div className="mb-3">
              <h4 className={`font-bold text-base mb-1 ${
                selectedTemplate === template.id ? 'text-[#6262bd]' : 'text-slate-700'
              }`}>
                {template.name}
              </h4>
              <p className="text-xs text-slate-500 mb-2">
                {template.description}
              </p>
            </div>

            {/* Preview */}
            <div className="mb-3 transform transition-transform group-hover:scale-[1.02]">
              {template.preview}
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-1.5">
              {template.features.map((feature, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded-full ${
                    selectedTemplate === template.id
                      ? 'bg-[#6262bd]/10 text-[#6262bd]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Selection prompt */}
            <div className={`mt-3 pt-3 border-t ${
              selectedTemplate === template.id ? 'border-[#6262bd]/20' : 'border-slate-100'
            }`}>
              <div className={`text-sm font-medium ${
                selectedTemplate === template.id ? 'text-[#6262bd]' : 'text-slate-400'
              }`}>
                {selectedTemplate === template.id ? t('currentlySelected') : t('clickToSelect')}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
