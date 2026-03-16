'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Confirmation() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resendLoading, setResendLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState(null) // 'sent' | 'error'

  const handleResend = async () => {
    if (!email) return
    setResendLoading(true)
    setResendStatus(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      setResendStatus(error ? 'error' : 'sent')
    } catch {
      setResendStatus('error')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">Veno App</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">

          {/* Icon */}
          <div className="w-20 h-20 bg-[#6262bd]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#6262bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-3">Check your inbox</h1>
          <p className="text-slate-500 mb-2 leading-relaxed">
            We've sent a confirmation link to
          </p>
          {email && (
            <p className="font-semibold text-slate-800 mb-4">{email}</p>
          )}
          <p className="text-slate-500 mb-8 leading-relaxed">
            Click the link in that email to verify your account and access your dashboard. It should arrive within a minute.
          </p>

          {/* Checklist */}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6 text-left space-y-3">
            {[
              'Check your spam or junk folder',
              'Make sure you used the right email address',
              'The link expires after 24 hours',
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#6262bd]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[#6262bd]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-slate-600">{tip}</p>
              </div>
            ))}
          </div>

          {/* Resend */}
          {resendStatus === 'sent' ? (
            <p className="text-emerald-600 font-medium text-sm mb-6">Email resent — check your inbox again.</p>
          ) : resendStatus === 'error' ? (
            <p className="text-red-500 text-sm mb-6">Something went wrong. Please try again or contact support.</p>
          ) : (
            <p className="text-slate-500 text-sm mb-6">
              Didn't receive it?{' '}
              {email ? (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-[#6262bd] font-medium hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Resending…' : 'Resend confirmation email'}
                </button>
              ) : (
                <Link href="/auth/register" className="text-[#6262bd] font-medium hover:underline">
                  Go back to sign up
                </Link>
              )}
            </p>
          )}

          <Link href="/auth/login" className="text-slate-400 text-sm hover:text-slate-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
