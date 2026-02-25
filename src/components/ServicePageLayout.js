'use client'

import Link from 'next/link'
import { useState } from 'react'
import PlatformLogo from '@/components/PlatformLogo'

export default function ServicePageLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link href="/home" className="flex items-center">
              <PlatformLogo size="md" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="/home#features" className="text-slate-600 dark:text-slate-300 hover:text-[#6262bd] dark:hover:text-[#8585d0] font-medium transition-colors">
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
              <Link href="/home#features" className="block px-3 py-2 text-slate-600 dark:text-slate-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</Link>
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

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
              <Link href="/home" className="flex items-center mb-6">
                <PlatformLogo size="md" darkMode={true} />
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                The complete restaurant management platform. Simplify operations, delight customers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/services/qr-menu" className="hover:text-white transition-colors">QR Menu</Link></li>
                <li><Link href="/services/table-ordering" className="hover:text-white transition-colors">Table Ordering</Link></li>
                <li><Link href="/services/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link href="/services/reservations" className="hover:text-white transition-colors">Reservations</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">System Status</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Veno App. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="https://linkedin.com" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </Link>
              <Link href="https://facebook.com" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
