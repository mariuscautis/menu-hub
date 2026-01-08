import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">Menu Hub</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/auth/login" className="text-slate-500 hover:text-slate-700 font-medium">
            Login
          </Link>
          <Link 
            href="/auth/register" 
            className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Coming Soon Section */}
      <main className="max-w-6xl mx-auto px-6">
        <div className="py-32 lg:py-40 text-center">
          <div className="inline-block mb-8 px-5 py-2.5 bg-[#6262bd]/10 rounded-full">
            <span className="text-[#6262bd] text-sm font-semibold">Coming Soon</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-slate-800 mb-8 leading-tight">
            Amazing Stuff
            <span className="block text-[#6262bd]">
              Is Coming Soon
            </span>
          </h1>

          <p className="text-xl lg:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            We're cooking up something special. Stay tuned for a revolutionary dining experience.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#6262bd] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="text-slate-400 font-medium">© 2025 Menu Hub</span>
          </div>
          <div className="flex gap-6 text-slate-400 font-medium">
            <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600">Terms</Link>
            <Link href="/contact" className="hover:text-slate-600">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}