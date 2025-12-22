'use client'

import Link from 'next/link'

export default function StaffLoginRedirect() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100 px-6 py-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-slate-700">Menu Hub</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Staff Login Moved</h1>
              <p className="text-slate-600">
                Staff login is now restaurant-specific for improved security.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 mb-3">
                <strong>How to login:</strong>
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Get your restaurant's staff login URL from your manager</li>
                <li>The URL will look like: <code className="bg-blue-100 px-1 rounded">menuhub.com/r/restaurant-name/auth/staff-login</code></li>
                <li>Bookmark that URL for easy access</li>
              </ol>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                <svg className="w-4 h-4 inline-block mr-1 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                This change improves security by requiring both a restaurant password and your personal PIN code.
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">Are you a restaurant owner?</p>
              <Link
                href="/auth/login"
                className="text-[#6262bd] font-medium hover:underline"
              >
                Owner Login →
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-500 text-sm hover:text-slate-700">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
