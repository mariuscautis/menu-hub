'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'

export default function StaffManagementPage() {
  return (
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
              <Link href="/home#features" className="inline-flex items-center space-x-2 text-[#6262bd] hover:underline mb-6">
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
                Manage your entire team from one place. Create rotas, schedule shifts, track clock-ins, handle vacation requests, and assign departments — all in one powerful platform.
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

            {/* Hero Illustration */}
            <div className="relative">
              <svg viewBox="0 0 500 450" className="w-full h-auto">
                <defs>
                  <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                  </filter>
                  <linearGradient id="staffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Main rota calendar */}
                <g transform="translate(50, 30)">
                  <rect x="0" y="0" width="400" height="300" rx="20" fill="white" filter="url(#shadow1)" />

                  {/* Calendar header */}
                  <rect x="0" y="0" width="400" height="55" rx="20" fill="url(#staffGradient)" />
                  <rect x="0" y="40" width="400" height="15" fill="url(#staffGradient)" />
                  <text x="200" y="35" fontSize="16" fill="white" textAnchor="middle" fontWeight="bold">Staff Rota - Week of Feb 24</text>

                  {/* Day columns */}
                  <g transform="translate(85, 70)">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <text key={i} x={i * 45} y="0" fontSize="10" fill="#64748b" textAnchor="middle" fontWeight="bold">{day}</text>
                    ))}
                  </g>

                  {/* Staff avatars column */}
                  <g transform="translate(30, 95)">
                    <circle cx="0" cy="15" r="14" fill="#dbeafe" />
                    <text x="0" y="19" fontSize="12" textAnchor="middle">👩</text>
                    <text x="0" y="38" fontSize="8" fill="#64748b" textAnchor="middle">Sarah</text>

                    <circle cx="0" cy="80" r="14" fill="#fef3c7" />
                    <text x="0" y="84" fontSize="12" textAnchor="middle">👨</text>
                    <text x="0" y="103" fontSize="8" fill="#64748b" textAnchor="middle">Mike</text>

                    <circle cx="0" cy="145" r="14" fill="#dcfce7" />
                    <text x="0" y="149" fontSize="12" textAnchor="middle">👩</text>
                    <text x="0" y="168" fontSize="8" fill="#64748b" textAnchor="middle">Lisa</text>

                    <circle cx="0" cy="210" r="14" fill="#fce7f3" />
                    <text x="0" y="214" fontSize="12" textAnchor="middle">👨</text>
                    <text x="0" y="233" fontSize="8" fill="#64748b" textAnchor="middle">James</text>
                  </g>

                  {/* Shift blocks - Row 1 (Sarah) */}
                  <g transform="translate(65, 90)">
                    <rect x="0" y="0" width="40" height="25" rx="4" fill="#3b82f6" />
                    <text x="20" y="16" fontSize="8" fill="white" textAnchor="middle">9-5</text>
                    <rect x="45" y="0" width="40" height="25" rx="4" fill="#3b82f6" />
                    <text x="65" y="16" fontSize="8" fill="white" textAnchor="middle">9-5</text>
                    <rect x="90" y="0" width="40" height="25" rx="4" fill="#3b82f6" />
                    <text x="110" y="16" fontSize="8" fill="white" textAnchor="middle">9-5</text>
                    <rect x="225" y="0" width="40" height="25" rx="4" fill="#3b82f6" />
                    <text x="245" y="16" fontSize="8" fill="white" textAnchor="middle">12-8</text>
                    <rect x="270" y="0" width="40" height="25" rx="4" fill="#3b82f6" />
                    <text x="290" y="16" fontSize="8" fill="white" textAnchor="middle">12-8</text>
                  </g>

                  {/* Shift blocks - Row 2 (Mike) */}
                  <g transform="translate(65, 155)">
                    <rect x="45" y="0" width="40" height="25" rx="4" fill="#f59e0b" />
                    <text x="65" y="16" fontSize="8" fill="white" textAnchor="middle">6-2</text>
                    <rect x="90" y="0" width="40" height="25" rx="4" fill="#f59e0b" />
                    <text x="110" y="16" fontSize="8" fill="white" textAnchor="middle">6-2</text>
                    <rect x="135" y="0" width="40" height="25" rx="4" fill="#f59e0b" />
                    <text x="155" y="16" fontSize="8" fill="white" textAnchor="middle">6-2</text>
                    <rect x="180" y="0" width="40" height="25" rx="4" fill="#f59e0b" />
                    <text x="200" y="16" fontSize="8" fill="white" textAnchor="middle">6-2</text>
                  </g>

                  {/* Shift blocks - Row 3 (Lisa) */}
                  <g transform="translate(65, 220)">
                    <rect x="0" y="0" width="40" height="25" rx="4" fill="#22c55e" />
                    <text x="20" y="16" fontSize="8" fill="white" textAnchor="middle">2-10</text>
                    <rect x="135" y="0" width="40" height="25" rx="4" fill="#22c55e" />
                    <text x="155" y="16" fontSize="8" fill="white" textAnchor="middle">2-10</text>
                    <rect x="225" y="0" width="40" height="25" rx="4" fill="#22c55e" />
                    <text x="245" y="16" fontSize="8" fill="white" textAnchor="middle">2-10</text>
                    <rect x="270" y="0" width="40" height="25" rx="4" fill="#22c55e" />
                    <text x="290" y="16" fontSize="8" fill="white" textAnchor="middle">2-10</text>
                  </g>
                </g>

                {/* Clock in status card */}
                <g transform="translate(320, 350)">
                  <rect x="0" y="0" width="130" height="80" rx="12" fill="white" filter="url(#shadow1)" />
                  <rect x="10" y="10" width="110" height="25" rx="6" fill="#f0fdf4" />
                  <circle cx="25" cy="22" r="8" fill="#22c55e" />
                  <text x="25" y="26" fontSize="10" fill="white" textAnchor="middle">✓</text>
                  <text x="75" y="26" fontSize="10" fill="#16a34a" fontWeight="bold">Clocked In</text>
                  <text x="65" y="52" fontSize="11" fill="#1e293b" textAnchor="middle" fontWeight="bold">Sarah M.</text>
                  <text x="65" y="68" fontSize="9" fill="#64748b" textAnchor="middle">3h 24m today</text>
                </g>

                {/* Leave request notification */}
                <g transform="translate(50, 350)">
                  <rect x="0" y="0" width="130" height="80" rx="12" fill="white" filter="url(#shadow1)" />
                  <circle cx="20" cy="20" r="10" fill="#fef3c7" />
                  <text x="20" y="24" fontSize="12" textAnchor="middle">📅</text>
                  <text x="80" y="24" fontSize="10" fill="#1e293b" fontWeight="bold">Leave Request</text>
                  <text x="65" y="42" fontSize="9" fill="#64748b" textAnchor="middle">Mike - Feb 28-Mar 2</text>
                  <rect x="15" y="52" width="45" height="20" rx="4" fill="#22c55e" />
                  <text x="37" y="65" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Approve</text>
                  <rect x="70" y="52" width="45" height="20" rx="4" fill="#ef4444" />
                  <text x="92" y="65" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Decline</text>
                </g>
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
              From scheduling to time tracking, handle all your staff management needs in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📅',
                title: 'Rota & Scheduling',
                description: 'Create and manage weekly rotas with an intuitive drag-and-drop calendar. Set shift times, roles, and departments for each team member.',
                color: 'bg-blue-500/10 text-blue-600',
              },
              {
                icon: '⏰',
                title: 'Clock In/Out',
                description: 'Track attendance with digital clock-in and clock-out. Staff can clock in via their devices, and managers see real-time attendance.',
                color: 'bg-green-500/10 text-green-600',
              },
              {
                icon: '🏖️',
                title: 'Vacation & Leave',
                description: 'Handle time-off requests, track holiday entitlements, manage sick leave, and approve or decline requests with one click.',
                color: 'bg-amber-500/10 text-amber-600',
              },
              {
                icon: '🏢',
                title: 'Department Management',
                description: 'Organize staff into departments (Kitchen, Bar, Floor, etc.) with custom permissions and role-based access control.',
                color: 'bg-purple-500/10 text-purple-600',
              },
              {
                icon: '📊',
                title: 'Hours & Analytics',
                description: 'Track total hours worked, overtime, and labor costs. Generate reports to optimize scheduling and control expenses.',
                color: 'bg-cyan-500/10 text-cyan-600',
              },
              {
                icon: '🔔',
                title: 'Shift Notifications',
                description: 'Automatic SMS and email reminders for upcoming shifts. Staff never miss a shift with timely notifications.',
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
              How Staff Management Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Get your team organized in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Add Your Team',
                description: 'Create staff profiles with roles, departments, and contact details. Set up their holiday entitlements and availability.',
              },
              {
                step: '2',
                title: 'Build Your Rota',
                description: 'Drag and drop shifts onto the calendar. Assign times, roles, and departments. Publish when ready.',
              },
              {
                step: '3',
                title: 'Staff Check In',
                description: 'Team members clock in and out via their devices. Track breaks and total hours automatically.',
              },
              {
                step: '4',
                title: 'Manage & Report',
                description: 'Approve leave requests, review attendance, and generate reports for payroll and optimization.',
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
              Why Restaurants Love Our Staff Management
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Save hours every week and keep your team happy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { stat: '5+ hrs', label: 'Saved weekly on scheduling' },
              { stat: '98%', label: 'Shift attendance rate' },
              { stat: '60%', label: 'Faster leave approvals' },
              { stat: '100%', label: 'Digital time tracking' },
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
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Staff Self-Service Portal
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Your team gets their own dashboard to manage their work life. Less admin for you, more autonomy for them.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: '📱',
                    title: 'View Their Schedule',
                    description: 'Staff see their upcoming shifts, breaks, and total hours at a glance.',
                  },
                  {
                    icon: '✋',
                    title: 'Request Time Off',
                    description: 'Submit holiday or sick leave requests that go straight to managers for approval.',
                  },
                  {
                    icon: '🔄',
                    title: 'Swap Shifts',
                    description: 'Request shift swaps with colleagues, subject to manager approval.',
                  },
                  {
                    icon: '📈',
                    title: 'Track Their Hours',
                    description: 'View work history, total hours, and remaining holiday entitlement.',
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
            <div className="relative">
              <svg viewBox="0 0 400 450" className="w-full h-auto">
                <defs>
                  <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.1" />
                  </filter>
                </defs>

                {/* Phone frame */}
                <g transform="translate(100, 20)">
                  <rect x="0" y="0" width="200" height="410" rx="30" fill="#1e293b" filter="url(#shadow2)" />
                  <rect x="10" y="15" width="180" height="380" rx="22" fill="#f8fafc" />

                  {/* Header */}
                  <rect x="20" y="30" width="160" height="50" rx="10" fill="#0891b2" />
                  <circle cx="50" cy="55" r="15" fill="white" opacity="0.2" />
                  <text x="50" y="60" fontSize="16" textAnchor="middle">👩</text>
                  <text x="115" y="50" fontSize="12" fill="white" fontWeight="bold">My Rota</text>
                  <text x="115" y="65" fontSize="9" fill="white" opacity="0.8">Sarah Mitchell</text>

                  {/* Stats cards */}
                  <g transform="translate(20, 95)">
                    <rect x="0" y="0" width="75" height="50" rx="8" fill="#f0fdf4" />
                    <text x="37" y="22" fontSize="16" fill="#16a34a" textAnchor="middle" fontWeight="bold">32h</text>
                    <text x="37" y="38" fontSize="8" fill="#64748b" textAnchor="middle">This Week</text>

                    <rect x="85" y="0" width="75" height="50" rx="8" fill="#ede9fe" />
                    <text x="122" y="22" fontSize="16" fill="#6262bd" textAnchor="middle" fontWeight="bold">18</text>
                    <text x="122" y="38" fontSize="8" fill="#64748b" textAnchor="middle">Days Left</text>
                  </g>

                  {/* Next shift card */}
                  <g transform="translate(20, 160)">
                    <rect x="0" y="0" width="160" height="70" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="10" y="20" fontSize="9" fill="#64748b">NEXT SHIFT</text>
                    <text x="10" y="38" fontSize="12" fill="#1e293b" fontWeight="bold">Monday, Feb 24</text>
                    <text x="10" y="55" fontSize="11" fill="#0891b2">9:00 AM - 5:00 PM</text>
                    <rect x="110" y="35" width="40" height="22" rx="4" fill="#dbeafe" />
                    <text x="130" y="50" fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">Kitchen</text>
                  </g>

                  {/* Quick actions */}
                  <g transform="translate(20, 245)">
                    <text x="0" y="15" fontSize="10" fill="#64748b" fontWeight="bold">QUICK ACTIONS</text>

                    <rect x="0" y="25" width="160" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="15" y="50" fontSize="16">⏰</text>
                    <text x="40" y="50" fontSize="11" fill="#1e293b">Clock In</text>
                    <circle cx="145" cy="45" r="10" fill="#22c55e" />
                    <text x="145" y="49" fontSize="12" fill="white" textAnchor="middle">→</text>

                    <rect x="0" y="75" width="160" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="15" y="100" fontSize="16">🏖️</text>
                    <text x="40" y="100" fontSize="11" fill="#1e293b">Request Time Off</text>

                    <rect x="0" y="125" width="160" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="15" y="150" fontSize="16">📋</text>
                    <text x="40" y="150" fontSize="11" fill="#1e293b">View Full Schedule</text>
                  </g>

                  {/* Home indicator */}
                  <rect x="75" y="400" width="50" height="5" rx="2.5" fill="#cbd5e1" />
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
            Join hundreds of restaurants saving time and keeping their teams organized with Veno App.
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
            No credit card required. 1 month free trial.
          </p>
        </div>
      </section>
    </ServicePageLayout>
  )
}
