'use client'

import Link from 'next/link'
import { useState } from 'react'
import PlatformLogo from '@/components/PlatformLogo'
import SiteFooter from '@/components/SiteFooter'

export default function ServicePageLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <PlatformLogo size="md" stacked={false} />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="/#features" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/about" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Contact
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/auth/login" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-[#6262bd] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] transition-colors shadow-lg shadow-[#6262bd]/20"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-4 py-6 space-y-4">
              <Link href="/#features" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link href="/pricing" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
              <Link href="/about" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="/contact" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <Link href="/auth/login" className="block w-full text-center px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300">
                  Login
                </Link>
                <Link href="/auth/register" className="block w-full text-center px-4 py-3 bg-[#6262bd] text-white rounded-xl font-medium">
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      <SiteFooter />
    </div>
  )
}
