'use client'

const templates = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional business invoice with clean table design and professional layout',
    features: ['Centered title', 'Clean borders', 'Alternating row colors', 'Professional appearance'],
    preview: (
      <div className="w-full h-48 bg-white border-2 border-slate-200 rounded-lg p-4 overflow-hidden">
        <div className="border-b-2 border-[#6262bd] pb-2 mb-3">
          <div className="text-center text-xl font-bold text-[#6262bd]">INVOICE</div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Invoice #: INV-2025-001</span>
            <span>Date: 13 Dec 2025</span>
          </div>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <div>
            <div className="font-bold text-xs mb-1">FROM</div>
            <div className="text-slate-700">Your Restaurant</div>
          </div>
          <div>
            <div className="font-bold text-xs mb-1">BILL TO</div>
            <div className="text-slate-700">Client Name</div>
          </div>
        </div>
        <div className="bg-[#6262bd] text-white text-xs px-2 py-1 flex justify-between">
          <span>Description</span>
          <span>Total</span>
        </div>
        <div className="bg-slate-50 text-xs px-2 py-1 flex justify-between">
          <span>Item 1</span>
          <span>$10.00</span>
        </div>
      </div>
    )
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Sleek minimalist design with lots of white space and subtle borders',
    features: ['Clean typography', 'Generous spacing', 'Subtle colors', 'Contemporary look'],
    preview: (
      <div className="w-full h-48 bg-white border border-slate-200 rounded-lg p-5 overflow-hidden">
        <div className="border-b border-slate-200 pb-3 mb-4">
          <div className="text-lg tracking-wider text-slate-800">INVOICE</div>
          <div className="flex justify-between text-xs text-slate-400 mt-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Invoice Number</div>
              <div className="text-slate-600">INV-2025-001</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <div className="text-slate-600">13 Dec 2025</div>
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs mb-3">
          <div>
            <div className="text-xs text-slate-400 mb-2 tracking-wide">FROM</div>
            <div className="text-slate-700 font-semibold">Your Restaurant</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-2 tracking-wide">BILL TO</div>
            <div className="text-slate-700 font-semibold">Client Name</div>
          </div>
        </div>
        <div className="border-b border-slate-200 pb-2 mb-2 flex justify-between text-xs text-slate-400">
          <span>Description</span>
          <span>Total</span>
        </div>
        <div className="text-xs flex justify-between py-2 text-slate-600">
          <span>Item 1</span>
          <span>$10.00</span>
        </div>
      </div>
    )
  },
  {
    id: 'bold-colorful',
    name: 'Bold & Colorful',
    description: 'Vibrant header with brand colors and eye-catching design',
    features: ['Colorful header', 'Visual accents', 'Bold typography', 'Brand-forward'],
    preview: (
      <div className="w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#6262bd] text-white p-3">
          <div className="text-2xl font-bold mb-2">INVOICE</div>
          <div className="flex justify-between text-xs">
            <div className="bg-white/10 px-2 py-1 rounded">
              <div className="text-indigo-200 text-xs">Invoice Number</div>
              <div className="font-bold">INV-2025-001</div>
            </div>
            <div className="bg-white/10 px-2 py-1 rounded">
              <div className="text-indigo-200 text-xs">Date</div>
              <div className="font-bold">13 Dec 2025</div>
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex justify-between text-xs mb-2">
            <div className="bg-slate-50 p-2 border-l-2 border-[#6262bd] flex-1 mr-2">
              <div className="text-[#6262bd] font-bold mb-1">FROM</div>
              <div className="text-slate-700 font-semibold">Your Restaurant</div>
            </div>
            <div className="bg-slate-50 p-2 border-l-2 border-[#6262bd] flex-1">
              <div className="text-[#6262bd] font-bold mb-1">BILL TO</div>
              <div className="text-slate-700 font-semibold">Client Name</div>
            </div>
          </div>
          <div className="bg-indigo-600 text-white text-xs px-2 py-1 flex justify-between mt-2">
            <span>Description</span>
            <span>Total</span>
          </div>
          <div className="text-xs px-2 py-1 flex justify-between">
            <span className="font-bold">Item 1</span>
            <span className="font-bold">$10.00</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'compact-detailed',
    name: 'Compact & Detailed',
    description: 'Dense layout with smaller fonts to fit more information',
    features: ['Space-efficient', 'Detailed view', 'Tight spacing', 'Maximum content'],
    preview: (
      <div className="w-full h-48 bg-white border-2 border-slate-200 rounded-lg p-3 overflow-hidden">
        <div className="border-b border-slate-700 pb-1 mb-2">
          <div className="text-base font-bold text-slate-800">INVOICE</div>
          <div className="flex justify-between text-xs text-slate-500">
            <div className="flex gap-2">
              <span><b>No:</b> INV-2025-001</span>
              <span><b>Date:</b> 13 Dec 2025</span>
            </div>
            <span className="text-green-600 font-bold">PAID</span>
          </div>
        </div>
        <div className="flex gap-2 text-xs mb-2">
          <div className="flex-1">
            <div className="font-bold text-xs mb-1">FROM</div>
            <div className="text-slate-700 text-xs leading-tight">
              <div className="font-semibold">Your Restaurant</div>
              <div>123 Main Street</div>
              <div>City, 12345</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-bold text-xs mb-1">BILL TO</div>
            <div className="text-slate-700 text-xs leading-tight">
              <div className="font-semibold">Client Name</div>
              <div>456 Client Ave</div>
              <div>Town, 67890</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 text-white text-xs px-2 py-1 flex justify-between">
          <span>DESCRIPTION</span>
          <span>TOTAL</span>
        </div>
        <div className="text-xs px-2 py-1 flex justify-between border-b border-slate-200">
          <span>Item 1</span>
          <span>$10.00</span>
        </div>
        <div className="bg-slate-50 text-xs px-2 py-1 flex justify-between border-b border-slate-200">
          <span>Item 2</span>
          <span>$15.00</span>
        </div>
      </div>
    )
  }
];

export default function TemplateSelector({ selectedTemplate, onSelectTemplate }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-700 mb-2">Invoice Template</h3>
        <p className="text-sm text-slate-500">
          Choose a template design for your invoices. This will apply to all generated invoices.
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
                {selectedTemplate === template.id ? 'Currently Selected' : 'Click to Select'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
