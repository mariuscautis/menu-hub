'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function StaffManagementPage() {
  const seo = useSeoSettings('services_staff_management', {
    title: 'Staff Management Made Simple — Veno App',
    description: 'Schedule shifts, track work history, manage time-off requests, and keep your team organised — all from one easy-to-use dashboard.',
  })
  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    <ServicePageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link href="/#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Features</span>
              </Link>

              <div className="inline-block px-4 py-1.5 bg-cyan-500/10 rounded-full text-cyan-600 text-sm font-semibold mb-4">
                Complete Workforce Solution
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Staff Management Made Simple
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Manage your entire team from one place. Build rotas, track clock-ins and clock-outs, handle leave requests, and give each staff member their own self-service portal — all without the paperwork.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/register"
                  className="bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center"
                >
                  Contact Sales
                </Link>
              </div>
            </div>

            {/* Hero Illustration — rota view */}
            <div className="relative flex justify-center">
              <svg viewBox="0 0 480 400" className="w-full h-auto drop-shadow-xl">
                <defs>
                  <filter id="sm-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.14" />
                  </filter>
                  <linearGradient id="sm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Main rota card */}
                <rect x="10" y="10" width="460" height="280" rx="16" fill="white" filter="url(#sm-shadow)" />
                <rect x="10" y="10" width="460" height="46" rx="16" fill="url(#sm-grad)" />
                <rect x="10" y="40" width="460" height="16" fill="url(#sm-grad)" />
                <text x="240" y="38" fontSize="13" fill="white" textAnchor="middle" fontWeight="bold">Staff Rota — Week of 24 Feb</text>

                {/* Day headers — 7 cols from x=80, spacing=54 */}
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
                  <text key={d} x={104 + i * 54} y="72" fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="bold">{d}</text>
                ))}

                {/* Row 1 — Sarah */}
                <circle cx="38" cy="99" r="13" fill="#dbeafe" />
                <text x="38" y="104" fontSize="12" textAnchor="middle">👩</text>
                <text x="38" y="120" fontSize="7" fill="#64748b" textAnchor="middle">Sarah</text>
                <rect x="78"  y="88" width="46" height="22" rx="4" fill="#3b82f6" /><text x="101" y="103" fontSize="8" fill="white" textAnchor="middle">9–5</text>
                <rect x="132" y="88" width="46" height="22" rx="4" fill="#3b82f6" /><text x="155" y="103" fontSize="8" fill="white" textAnchor="middle">9–5</text>
                <rect x="186" y="88" width="46" height="22" rx="4" fill="#3b82f6" /><text x="209" y="103" fontSize="8" fill="white" textAnchor="middle">9–5</text>
                <rect x="348" y="88" width="46" height="22" rx="4" fill="#3b82f6" /><text x="371" y="103" fontSize="8" fill="white" textAnchor="middle">12–8</text>
                <rect x="402" y="88" width="46" height="22" rx="4" fill="#3b82f6" /><text x="425" y="103" fontSize="8" fill="white" textAnchor="middle">12–8</text>

                {/* Row 2 — Mike */}
                <circle cx="38" cy="155" r="13" fill="#fef3c7" />
                <text x="38" y="160" fontSize="12" textAnchor="middle">👨</text>
                <text x="38" y="176" fontSize="7" fill="#64748b" textAnchor="middle">Mike</text>
                <rect x="132" y="144" width="46" height="22" rx="4" fill="#f59e0b" /><text x="155" y="159" fontSize="8" fill="white" textAnchor="middle">6–2</text>
                <rect x="186" y="144" width="46" height="22" rx="4" fill="#f59e0b" /><text x="209" y="159" fontSize="8" fill="white" textAnchor="middle">6–2</text>
                <rect x="240" y="144" width="46" height="22" rx="4" fill="#f59e0b" /><text x="263" y="159" fontSize="8" fill="white" textAnchor="middle">6–2</text>
                <rect x="294" y="144" width="46" height="22" rx="4" fill="#f59e0b" /><text x="317" y="159" fontSize="8" fill="white" textAnchor="middle">6–2</text>

                {/* Row 3 — Lisa */}
                <circle cx="38" cy="211" r="13" fill="#dcfce7" />
                <text x="38" y="216" fontSize="12" textAnchor="middle">👩</text>
                <text x="38" y="232" fontSize="7" fill="#64748b" textAnchor="middle">Lisa</text>
                <rect x="78"  y="200" width="46" height="22" rx="4" fill="#22c55e" /><text x="101" y="215" fontSize="8" fill="white" textAnchor="middle">2–10</text>
                <rect x="240" y="200" width="46" height="22" rx="4" fill="#22c55e" /><text x="263" y="215" fontSize="8" fill="white" textAnchor="middle">2–10</text>
                <rect x="348" y="200" width="46" height="22" rx="4" fill="#22c55e" /><text x="371" y="215" fontSize="8" fill="white" textAnchor="middle">2–10</text>
                <rect x="402" y="200" width="46" height="22" rx="4" fill="#22c55e" /><text x="425" y="215" fontSize="8" fill="white" textAnchor="middle">2–10</text>

                {/* Row 4 — James */}
                <circle cx="38" cy="267" r="13" fill="#fce7f3" />
                <text x="38" y="272" fontSize="12" textAnchor="middle">👨</text>
                <text x="38" y="288" fontSize="7" fill="#64748b" textAnchor="middle">James</text>
                <rect x="78"  y="256" width="46" height="22" rx="4" fill="#8b5cf6" /><text x="101" y="271" fontSize="8" fill="white" textAnchor="middle">10–6</text>
                <rect x="132" y="256" width="46" height="22" rx="4" fill="#8b5cf6" /><text x="155" y="271" fontSize="8" fill="white" textAnchor="middle">10–6</text>
                <rect x="294" y="256" width="46" height="22" rx="4" fill="#8b5cf6" /><text x="317" y="271" fontSize="8" fill="white" textAnchor="middle">10–6</text>
                <rect x="402" y="256" width="46" height="22" rx="4" fill="#8b5cf6" /><text x="425" y="271" fontSize="8" fill="white" textAnchor="middle">10–6</text>

                {/* Clocked-in badge */}
                <rect x="10" y="302" width="148" height="70" rx="12" fill="white" filter="url(#sm-shadow)" />
                <rect x="20" y="312" width="128" height="24" rx="6" fill="#f0fdf4" />
                <circle cx="36" cy="324" r="8" fill="#22c55e" />
                <text x="36" y="328" fontSize="9" fill="white" textAnchor="middle">✓</text>
                <text x="90" y="328" fontSize="9" fill="#16a34a" textAnchor="middle" fontWeight="bold">Clocked In</text>
                <text x="84" y="351" fontSize="10" fill="#1e293b" textAnchor="middle" fontWeight="bold">Sarah M.</text>
                <text x="84" y="364" fontSize="8" fill="#64748b" textAnchor="middle">3h 24m today</text>

                {/* Leave request badge */}
                <rect x="322" y="302" width="148" height="86" rx="12" fill="white" filter="url(#sm-shadow)" />
                <circle cx="342" cy="322" r="10" fill="#fef3c7" />
                <text x="342" y="326" fontSize="12" textAnchor="middle">📅</text>
                <text x="410" y="320" fontSize="9" fill="#1e293b" textAnchor="middle" fontWeight="bold">Leave Request</text>
                <text x="396" y="334" fontSize="8" fill="#64748b" textAnchor="middle">Mike · Feb 28–Mar 2</text>
                <rect x="332" y="346" width="56" height="20" rx="5" fill="#22c55e" />
                <text x="360" y="359" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Approve</text>
                <rect x="396" y="346" width="56" height="20" rx="5" fill="#ef4444" />
                <text x="424" y="359" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Decline</text>

                {/* Hours stat badge */}
                <rect x="174" y="302" width="130" height="70" rx="12" fill="url(#sm-grad)" filter="url(#sm-shadow)" />
                <text x="239" y="328" fontSize="22" fill="white" textAnchor="middle" fontWeight="bold">156h</text>
                <text x="239" y="344" fontSize="8" fill="white" opacity="0.85" textAnchor="middle">Total hours this week</text>
                <text x="239" y="360" fontSize="8" fill="white" opacity="0.7" textAnchor="middle">4 staff · 3 departments</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Manage Your Team
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              From rota building to time tracking, handle all your workforce needs without spreadsheets or paperwork.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📅',
                title: 'Rota & Scheduling',
                description: 'Build weekly rotas with ease. Assign shifts, set times, and allocate staff to departments. Publish rotas so your team can see their schedule instantly.',
                color: 'bg-blue-500/10 text-blue-600',
              },
              {
                icon: '⏰',
                title: 'Clock In / Clock Out',
                description: 'Staff clock in and out digitally from any device. Managers see who is on site in real time, and hours are logged automatically — no timesheets needed.',
                color: 'bg-green-500/10 text-green-600',
              },
              {
                icon: '🏖️',
                title: 'Leave & Holiday Management',
                description: 'Staff submit time-off requests directly from their portal. Managers approve or decline with one click. Holiday entitlements are tracked and updated automatically.',
                color: 'bg-amber-500/10 text-amber-600',
              },
              {
                icon: '🏢',
                title: 'Departments & Roles',
                description: 'Organise your team into departments — Kitchen, Bar, Floor, Management — and assign roles with the right access level for each. Staff only see what they need to.',
                color: 'bg-purple-500/10 text-purple-600',
              },
              {
                icon: '📊',
                title: 'Hours & Attendance Reports',
                description: 'See total hours worked per staff member, spot attendance patterns, and export data to help with payroll. Know your labour costs at a glance.',
                color: 'bg-cyan-500/10 text-cyan-600',
              },
              {
                icon: '📱',
                title: 'Staff Self-Service Portal',
                description: 'Every team member gets their own login. They can view their rota, check remaining holiday, submit leave requests, and track their hours — all from their phone.',
                color: 'bg-pink-500/10 text-pink-600',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center text-2xl mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Get your team organised in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Add Your Team',
                description: 'Create a profile for each staff member — name, role, department, and holiday entitlement. They get their own login straight away.',
              },
              {
                step: '2',
                title: 'Build the Rota',
                description: 'Set shifts for the week, assign departments, and publish. Staff are notified and can view their schedule immediately.',
              },
              {
                step: '3',
                title: 'Track Attendance',
                description: 'Staff clock in and out from any device. Hours are recorded automatically, and you see who is on site at all times.',
              },
              {
                step: '4',
                title: 'Review & Report',
                description: 'Approve leave requests, check hours worked, and review attendance history. Export reports for payroll whenever you need them.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-cyan-500 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Less Admin. Better Teams.
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Stop spending hours on rotas and chasing timesheets. Let Veno App handle it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { stat: '5+ hrs', label: 'Saved weekly on scheduling' },
              { stat: '100%', label: 'Digital time tracking' },
              { stat: '1 click', label: 'Leave approvals' },
              { stat: 'Real-time', label: 'Attendance visibility' },
            ].map((item, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">{item.stat}</div>
                <div className="text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staff Portal Features */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 bg-cyan-500/10 rounded-full text-cyan-600 text-sm font-semibold mb-4">
                Staff Portal
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Your Team's Own Dashboard
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Every staff member gets a personal login. They manage their own work life — less back-and-forth for you, more ownership for them.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: '📆',
                    title: 'View Their Rota',
                    description: 'Staff see their upcoming shifts and total hours for the week as soon as the rota is published.',
                  },
                  {
                    icon: '⏱️',
                    title: 'Clock In & Out',
                    description: 'One tap to start or end a shift, from any device. No paper, no manual timesheets.',
                  },
                  {
                    icon: '✋',
                    title: 'Request Time Off',
                    description: 'Submit holiday or sick leave requests that go straight to the manager for approval.',
                  },
                  {
                    icon: '📈',
                    title: 'Track Hours & Holiday',
                    description: 'View hours worked, remaining holiday entitlement, and full attendance history at any time.',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Portal Illustration */}
            <div className="relative flex justify-center">
              <svg viewBox="0 0 360 500" className="w-full max-w-xs h-auto drop-shadow-xl">
                <defs>
                  <filter id="sm-shadow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.15" />
                  </filter>
                  <linearGradient id="sm-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                  <clipPath id="portal-screen">
                    <rect x="68" y="28" width="224" height="434" rx="18" />
                  </clipPath>
                </defs>

                {/* Phone shell */}
                <rect x="56" y="12" width="248" height="464" rx="30" fill="#1e293b" filter="url(#sm-shadow2)" />
                <rect x="68" y="28" width="224" height="434" rx="18" fill="#f8fafc" />
                {/* Notch */}
                <rect x="144" y="28" width="72" height="16" rx="8" fill="#1e293b" />

                <g clipPath="url(#portal-screen)">
                  {/* Header */}
                  <rect x="68" y="44" width="224" height="64" fill="url(#sm-grad2)" />
                  <circle cx="100" cy="72" r="18" fill="white" opacity="0.2" />
                  <text x="100" y="78" fontSize="18" textAnchor="middle">👩</text>
                  <text x="198" y="65" fontSize="11" fill="white" fontWeight="bold" textAnchor="middle">My Rota</text>
                  <text x="198" y="80" fontSize="8" fill="white" opacity="0.8" textAnchor="middle">Sarah Mitchell · Kitchen</text>
                  <text x="198" y="96" fontSize="8" fill="white" opacity="0.6" textAnchor="middle">Mon 24 Feb</text>

                  {/* Stats row */}
                  <rect x="78" y="120" width="96" height="52" rx="8" fill="#f0fdf4" />
                  <text x="126" y="144" fontSize="20" fill="#16a34a" textAnchor="middle" fontWeight="bold">32h</text>
                  <text x="126" y="160" fontSize="8" fill="#64748b" textAnchor="middle">This Week</text>

                  <rect x="186" y="120" width="96" height="52" rx="8" fill="#ede9fe" />
                  <text x="234" y="144" fontSize="20" fill="#6262bd" textAnchor="middle" fontWeight="bold">18</text>
                  <text x="234" y="160" fontSize="8" fill="#64748b" textAnchor="middle">Days Holiday</text>

                  {/* Next shift card */}
                  <rect x="78" y="184" width="204" height="68" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="90" y="202" fontSize="8" fill="#94a3b8" fontWeight="bold">NEXT SHIFT</text>
                  <text x="90" y="220" fontSize="11" fill="#1e293b" fontWeight="bold">Monday, 24 Feb</text>
                  <text x="90" y="236" fontSize="10" fill="#0891b2">9:00 AM – 5:00 PM</text>
                  <rect x="212" y="214" width="60" height="20" rx="5" fill="#dbeafe" />
                  <text x="242" y="228" fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">Kitchen</text>

                  {/* Quick actions */}
                  <text x="78" y="273" fontSize="9" fill="#94a3b8" fontWeight="bold">QUICK ACTIONS</text>

                  <rect x="78" y="282" width="204" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="100" y="307" fontSize="14">⏰</text>
                  <text x="122" y="307" fontSize="10" fill="#1e293b">Clock In</text>
                  <circle cx="264" cy="302" r="10" fill="#22c55e" />
                  <text x="264" y="307" fontSize="10" fill="white" textAnchor="middle">→</text>

                  <rect x="78" y="330" width="204" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="100" y="355" fontSize="14">🏖️</text>
                  <text x="122" y="355" fontSize="10" fill="#1e293b">Request Time Off</text>

                  <rect x="78" y="378" width="204" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="100" y="403" fontSize="14">📋</text>
                  <text x="122" y="403" fontSize="10" fill="#1e293b">View Full Schedule</text>

                  <rect x="78" y="426" width="204" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="100" y="451" fontSize="14">📊</text>
                  <text x="122" y="451" fontSize="10" fill="#1e293b">My Hours History</text>

                  {/* Home indicator */}
                  <rect x="148" y="452" width="64" height="4" rx="2" fill="#cbd5e1" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Staff Management?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Say goodbye to paper rotas and manual timesheets. Get your whole team organised with Veno App.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto border-2 border-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all text-center"
            >
              Book a Demo
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            No credit card required. 2 weeks free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
    </>
  )
}
