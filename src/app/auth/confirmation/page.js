import Link from 'next/link'

export default function Confirmation() {
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
          <div className="w-16 h-16 bg-[#6262bd]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Check your email</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            We've sent a confirmation link to your email address. Click the link to verify your account and get started.
          </p>

          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
            <p className="text-slate-600 text-sm">
              Didn't receive the email? Check your spam folder or{' '}
              <button className="text-[#6262bd] font-medium hover:underline">
                resend confirmation
              </button>
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