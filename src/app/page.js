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

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6">
        <div className="py-20 lg:py-28 text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-[#6262bd]/10 rounded-full">
            <span className="text-[#6262bd] text-sm font-semibold">✨ No app download required</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
            QR Menus That
            <span className="block text-[#6262bd]">
              Delight Customers
            </span>
          </h1>
          
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transform your restaurant with contactless ordering. Customers scan, browse, and order from their table in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/auth/register"
              className="w-full sm:w-auto bg-[#6262bd] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#5252a3]"
            >
              Start Free Trial
            </Link>
            <Link 
              href="#demo"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 px-8 py-4 rounded-xl text-lg font-medium border-2 border-slate-200 hover:border-slate-300 bg-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="pb-20 lg:pb-28">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-[#6262bd]/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[#6262bd]/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Instant QR Ordering</h3>
              <p className="text-slate-500 leading-relaxed">Generate unique QR codes for each table. Customers scan and start ordering in seconds.</p>
            </div>
            
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-[#6262bd]/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.045 7.401c.378-.378.586-.88.586-1.414s-.208-1.036-.586-1.414l-1.586-1.586c-.378-.378-.88-.586-1.414-.586s-1.036.208-1.414.586L4 13.585V18h4.414L19.045 7.401zm-3-3l1.586 1.586-2 2-1.586-1.586 2-2zM6 16v-1.586l8.041-8.04 1.586 1.586L7.586 16H6z"/>
                  <path d="M4 20h16v2H4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Easy Menu Builder</h3>
              <p className="text-slate-500 leading-relaxed">Add dishes, set prices, upload photos. Update your menu anytime with zero tech skills.</p>
            </div>
            
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-[#6262bd]/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2.051V11h8.949c-.47-4.717-4.232-8.479-8.949-8.949zm4.969 17.953c2.189-1.637 3.694-4.14 3.98-7.004H14v8.004h.009c1.411-.012 2.76-.358 3.96-1zm-6.96 1.935V14H3.05c.47 4.717 4.232 8.479 8.949 8.949V21.94zm0-19.878C6.282 2.521 2.521 6.282 2.051 11H11V2.061z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Real-time Dashboard</h3>
              <p className="text-slate-500 leading-relaxed">Orders appear instantly on your dashboard. Track, manage, and complete orders with one click.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="pb-20 lg:pb-28">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-10 lg:p-14">
            <div className="grid sm:grid-cols-3 gap-10 text-center">
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-[#6262bd] mb-2">30%</div>
                <p className="text-slate-500 font-medium">Faster table turnover</p>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-slate-600 mb-2">2 min</div>
                <p className="text-slate-500 font-medium">Setup time</p>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold text-slate-600 mb-2">£0</div>
                <p className="text-slate-500 font-medium">To get started</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="pb-20 lg:pb-28 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-700 mb-6">Ready to modernise your restaurant?</h2>
          <p className="text-slate-500 mb-8 max-w-xl mx-auto text-lg">Join hundreds of restaurants already using Menu Hub to streamline their ordering.</p>
          <Link 
            href="/auth/register"
            className="inline-block bg-[#6262bd] text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-[#5252a3]"
          >
            Create Your Free Menu
          </Link>
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