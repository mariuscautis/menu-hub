import Link from 'next/link'

export default function Pending() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">Menu Hub</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Account Pending</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Your staff account is waiting for approval from the restaurant manager. You'll be able to access the dashboard once approved.
          </p>

          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
            <p className="text-slate-600 text-sm">
              Please contact your manager if you need immediate access.
            </p>
          </div>

          <Link href="/auth/login" className="text-[#6262bd] font-medium hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}