'use client'

import Link from 'next/link'
import ServicePageLayout from '@/components/ServicePageLayout'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function AboutPage() {
  const seo = useSeoSettings('about', {
    title: 'About Us — Veno App',
    description: 'Learn about the team behind Veno App and our mission to simplify restaurant management for independent venues everywhere.',
  })
  return (
    <>
    {seo.title && <title>{seo.title}</title>}
    {seo.description && <meta name="description" content={seo.description} />}
    {/* Open Graph */}
    {seo.title && <meta property="og:title" content={seo.title} />}
    {seo.description && <meta property="og:description" content={seo.description} />}
    <meta property="og:type" content="website" />
    {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
    {/* Twitter / X */}
    <meta name="twitter:card" content={seo.ogImage ? "summary_large_image" : "summary"} />
    {seo.title && <meta name="twitter:title" content={seo.title} />}
    {seo.description && <meta name="twitter:description" content={seo.description} />}
    {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
    <ServicePageLayout>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6262bd]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 bg-[#6262bd]/10 rounded-full text-[#6262bd] text-sm font-semibold mb-6">
                About Veno App
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                Built for venue owners.<br/>
                <span style={{background:'linear-gradient(90deg,#6262bd,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Not accountants.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                We believe running a venue should be about creating memorable experiences — not wrestling with outdated tools, scattered platforms, or mounting admin costs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register" className="bg-[#6262bd] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] transition-all shadow-lg text-center">
                  Start Free Trial
                </Link>
                <Link href="/contact" className="border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-semibold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center">
                  Get in Touch
                </Link>
              </div>
            </div>

            {/* Hero dashboard preview */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl" style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)'}}>
                <svg viewBox="0 0 480 340" className="w-full" style={{display:'block'}}>
                  <defs>
                    <clipPath id="ab-hero-clip">
                      <rect x="0" y="0" width="480" height="340"/>
                    </clipPath>
                  </defs>
                  {/* Sidebar */}
                  <rect x="0" y="0" width="110" height="340" fill="#6262bd"/>
                  <rect x="16" y="24" width="78" height="28" rx="8" fill="white" fillOpacity="0.15"/>
                  <text x="55" y="43" fill="white" fontSize="11" fontWeight="700" textAnchor="middle">Veno App</text>
                  {/* Nav items */}
                  {[['Dashboard',60],['Orders',90],['Reservations',120],['Menu',150],['Staff',180],['Analytics',210]].map(([label,y])=>(
                    <g key={label}>
                      <rect x="12" y={y-2} width="86" height="22" rx="6" fill={label==='Dashboard'?'white':'transparent'} fillOpacity={label==='Dashboard'?'0.2':'0'}/>
                      <text x="22" y={y+13} fill="white" fontSize="9" fontWeight={label==='Dashboard'?'700':'400'} fillOpacity={label==='Dashboard'?'1':'0.7'}>{label}</text>
                    </g>
                  ))}

                  {/* Main area */}
                  <rect x="110" y="0" width="370" height="340" fill="#f8fafc"/>
                  {/* Top bar */}
                  <rect x="110" y="0" width="370" height="44" fill="white"/>
                  <text x="130" y="28" fill="#1e293b" fontSize="13" fontWeight="700">Good morning, Marco 👋</text>
                  <rect x="400" y="10" width="68" height="24" rx="8" fill="#6262bd"/>
                  <text x="434" y="27" fill="white" fontSize="9" fontWeight="600" textAnchor="middle">+ New Order</text>

                  {/* Stat cards row */}
                  {[
                    {label:'Today\'s Revenue',val:'€1,248',color:'#6262bd',x:122},
                    {label:'Orders',val:'34',color:'#10b981',x:242},
                    {label:'Reservations',val:'12',color:'#f59e0b',x:362},
                  ].map(({label,val,color,x})=>(
                    <g key={label}>
                      <rect x={x} y="56" width="108" height="56" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                      <text x={x+10} y="74" fill="#94a3b8" fontSize="8">{label}</text>
                      <text x={x+10} y="96" fill={color} fontSize="18" fontWeight="800">{val}</text>
                    </g>
                  ))}

                  {/* Chart area */}
                  <rect x="122" y="124" width="220" height="130" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  <text x="134" y="142" fill="#1e293b" fontSize="9" fontWeight="600">Revenue — last 7 days</text>
                  {/* bars */}
                  {[[0,'#6262bd',72],[1,'#8b8bd8',58],[2,'#6262bd',90],[3,'#8b8bd8',65],[4,'#6262bd',100],[5,'#8b8bd8',80],[6,'#6262bd',88]].map(([i,c,h])=>(
                    <rect key={i} x={136+i*26} y={238-h} width="18" height={h} rx="4" fill={c} fillOpacity="0.85"/>
                  ))}
                  {/* x labels */}
                  {['M','T','W','T','F','S','S'].map((d,i)=>(
                    <text key={i} x={145+i*26} y={250} fill="#94a3b8" fontSize="7" textAnchor="middle">{d}</text>
                  ))}

                  {/* Right mini card — live orders */}
                  <rect x="354" y="124" width="116" height="130" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  <text x="366" y="142" fill="#1e293b" fontSize="9" fontWeight="600">Live Orders</text>
                  {[
                    {t:'Table 4','i':'Pasta x2','s':'#10b981','sl':'Ready'},
                    {t:'Table 7','i':'Pizza x1','s':'#f59e0b','sl':'Cooking'},
                    {t:'Table 2','i':'Salad x3','s':'#6262bd','sl':'New'},
                  ].map(({t,i,s,sl},idx)=>(
                    <g key={t}>
                      <rect x="362" y={152+idx*30} width="100" height="24" rx="6" fill="#f8fafc"/>
                      <text x="370" y={165+idx*30} fill="#374151" fontSize="8" fontWeight="600">{t}</text>
                      <text x="370" y={173+idx*30} fill="#9ca3af" fontSize="7">{i}</text>
                      <rect x="420" y={155+idx*30} width="36" height="14" rx="4" fill={s} fillOpacity="0.15"/>
                      <text x="438" y={165+idx*30} fill={s} fontSize="7" fontWeight="600" textAnchor="middle">{sl}</text>
                    </g>
                  ))}

                  {/* Bottom strip */}
                  <rect x="122" y="264" width="348" height="60" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  <text x="134" y="282" fill="#1e293b" fontSize="9" fontWeight="600">Upcoming Reservations</text>
                  {[
                    {name:'Anna K.',time:'19:00',pax:'2'},
                    {name:'Marco B.',time:'19:30',pax:'4'},
                    {name:'Sarah M.',time:'20:00',pax:'6'},
                  ].map(({name,time,pax},i)=>(
                    <g key={name}>
                      <text x={134+i*116} y="300" fill="#374151" fontSize="8" fontWeight="600">{name}</text>
                      <text x={134+i*116} y="311" fill="#9ca3af" fontSize="7">{time} · {pax} guests</text>
                    </g>
                  ))}
                </svg>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Everything in one place</p>
                  <p className="text-xs text-slate-500">No more juggling platforms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Before / After illustration */}
            <div className="space-y-4">
              {/* Before card */}
              <div className="rounded-2xl border-2 border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">✕</span>
                  <span className="text-sm font-bold text-red-500 uppercase tracking-wide">Before Veno App</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['Printing menus','Manual orders','Paper rotas','Separate POS','No analytics','Phone bookings'].map(item=>(
                    <div key={item} className="bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-red-700 dark:text-red-400 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Arrow */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"/>
                <div className="w-10 h-10 rounded-full bg-[#6262bd] flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 20 20" className="w-5 h-5" fill="white"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L7.707 7.707A1 1 0 016.293 6.293l3-3A1 1 0 0110 3z" clipRule="evenodd" transform="rotate(180 10 10)"/></svg>
                </div>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"/>
              </div>
              {/* After card */}
              <div className="rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">✓</span>
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">With Veno App</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['QR menus','Table ordering','Staff portal','Live analytics','Online bookings','One dashboard'].map(item=>(
                    <div key={item} className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  Veno App was born from a simple observation: venue owners spend countless hours on tasks that technology should handle effortlessly. We saw passionate restaurateurs, cafe owners, and hospitality professionals struggling with outdated systems, juggling multiple platforms, and watching their margins shrink under mounting operational costs.
                </p>
                <p>
                  We knew there had to be a better way. So we built a platform that brings everything together — menus, orders, staff, analytics, and bookings — all under one roof, designed specifically for the real challenges of running a venue.
                </p>
                <p>
                  Today, Veno App helps venues of all sizes streamline their operations, reduce costs, and focus on what truly matters: delivering exceptional experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">Our Mission</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              To empower venue owners with technology that simplifies operations, reduces costs, and helps them deliver exceptional customer experiences — so they can focus on their passion, not paperwork.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                color:'#6262bd', bg:'#f5f3ff',
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
                title: 'Simplify Operations',
                description: 'Replace complex, disconnected tools with one intuitive platform. From digital menus to live analytics — everything works together.',
                stat: '80%', statLabel: 'less admin time',
              },
              {
                color:'#10b981', bg:'#ecfdf5',
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                title: 'Cut Costs',
                description: 'Eliminate printing expenses, reduce operational overhead, and increase table efficiency — all while improving your bottom line.',
                stat: '50%', statLabel: 'average cost reduction',
              },
              {
                color:'#f59e0b', bg:'#fffbeb',
                icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                title: 'Delight Customers',
                description: 'Provide seamless, modern experiences — from instant QR menus to effortless table ordering and real-time bookings.',
                stat: '2×', statLabel: 'faster table turnover',
              },
            ].map((item,i)=>(
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="h-2" style={{background:item.color}}/>
                <div className="p-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:item.color}}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">{item.description}</p>
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{background:item.bg}}>
                    <span className="text-2xl font-black" style={{color:item.color}}>{item.stat}</span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.statLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">What We Stand For</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">Our values guide every decision we make — from the features we build to the way we support our customers.</p>
              <div className="space-y-6">
                {[
                  {num:'01', title:'Simplicity First', desc:'Technology should make life easier, not harder. Every feature is designed so anyone can use it — no learning curve, no manual needed.'},
                  {num:'02', title:'Customer Obsessed', desc:'Your success is our success. We listen to venue owners, understand their challenges, and build solutions that make a real difference day to day.'},
                  {num:'03', title:'Continuous Innovation', desc:'The hospitality industry evolves, and so do we. We constantly improve the platform to stay ahead and deliver what venues actually need.'},
                  {num:'04', title:'Transparent Partnership', desc:'No hidden fees, no locked contracts, no surprises. Honest, straightforward relationships built on trust — that\'s the only way we operate.'},
                ].map(({num,title,desc})=>(
                  <div key={num} className="flex gap-5 items-start">
                    <span className="text-3xl font-black text-slate-200 dark:text-slate-700 leading-none w-10 shrink-0">{num}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual panel */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl" style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)'}}>
              <svg viewBox="0 0 400 420" className="w-full" style={{display:'block'}}>
                <defs>
                  <clipPath id="ab-val-clip">
                    <rect x="0" y="0" width="400" height="420"/>
                  </clipPath>
                </defs>
                {/* Header */}
                <rect x="0" y="0" width="400" height="56" fill="#6262bd"/>
                <text x="24" y="34" fill="white" fontSize="14" fontWeight="700">Veno App — Venue Dashboard</text>
                <circle cx="360" cy="28" r="8" fill="white" fillOpacity="0.2"/>
                <circle cx="380" cy="28" r="8" fill="white" fillOpacity="0.2"/>

                {/* Setup checklist */}
                <rect x="20" y="72" width="360" height="320" rx="12" fill="white"/>
                <text x="36" y="96" fill="#1e293b" fontSize="11" fontWeight="700">Getting started checklist</text>
                <text x="36" y="111" fill="#94a3b8" fontSize="8">Complete these steps to get your venue live</text>

                {[
                  {label:'Add your menu items',done:true,sub:'12 items across 3 categories'},
                  {label:'Set up QR codes',done:true,sub:'2 tables configured'},
                  {label:'Invite your staff',done:true,sub:'3 team members added'},
                  {label:'Configure reservations',done:false,sub:'Takes about 2 minutes'},
                  {label:'Connect your analytics',done:false,sub:'See real-time insights'},
                ].map(({label,done,sub},i)=>(
                  <g key={label}>
                    <rect x="28" y={124+i*50} width="344" height="38" rx="8" fill={done?'#f0fdf4':'#f8fafc'} stroke={done?'#bbf7d0':'#e2e8f0'} strokeWidth="1"/>
                    <circle cx="50" cy={143+i*50} r="10" fill={done?'#10b981':'#e2e8f0'}/>
                    {done && <text x="50" y={147+i*50} fill="white" fontSize="9" fontWeight="800" textAnchor="middle">✓</text>}
                    <text x="68" y={139+i*50} fill={done?'#15803d':'#374151'} fontSize="9" fontWeight="600">{label}</text>
                    <text x="68" y={151+i*50} fill="#94a3b8" fontSize="8">{sub}</text>
                    {!done && (
                      <>
                        <rect x="318" y={132+i*50} width="46" height="20" rx="6" fill="#6262bd"/>
                        <text x="341" y={146+i*50} fill="white" fontSize="8" fontWeight="600" textAnchor="middle">Set up</text>
                      </>
                    )}
                  </g>
                ))}

                {/* Progress bar */}
                <rect x="28" y="380" width="344" height="8" rx="4" fill="#e2e8f0"/>
                <rect x="28" y="380" width="206" height="8" rx="4" fill="#6262bd"/>
                <text x="28" y="400" fill="#94a3b8" fontSize="8">60% complete — you're almost there!</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Venues Choose Veno App</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Built by people who understand hospitality — not just software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {[
              {value:'50%', label:'Average cost reduction', color:'#6262bd', bg:'#f5f3ff'},
              {value:'2×', label:'Faster table turnover', color:'#10b981', bg:'#ecfdf5'},
              {value:'24/7', label:'Platform availability', color:'#f59e0b', bg:'#fffbeb'},
              {value:'5 min', label:'Average setup time', color:'#3b82f6', bg:'#eff6ff'},
            ].map(({value,label,color,bg})=>(
              <div key={label} className="rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="text-4xl font-black mb-2" style={{color}}>{value}</div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {title:'Works on any device', desc:'No new hardware needed. Veno App runs on the phones, tablets, and laptops your team already uses.'},
              {title:'Set up in minutes', desc:'No lengthy onboarding, no IT department required. Most venues are up and running the same day they sign up.'},
              {title:'Grows with you', desc:'From a single café to multiple venues — Veno App scales to match your business as it grows.'},
            ].map(({title,desc})=>(
              <div key={title} className="flex gap-4 items-start bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-[#6262bd]/10 flex items-center justify-center">
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="#6262bd"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#6262bd] to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Transform Your Venue?</h2>
          <p className="text-xl text-white/80 mb-10">
            Join venue owners who have simplified their operations and boosted their business with Veno App.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="w-full sm:w-auto bg-white text-[#6262bd] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all">
              Start Your Free Trial
            </Link>
            <Link href="/contact" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all">
              Contact Our Team
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">No credit card required. 2 weeks free trial.</p>
        </div>
      </section>

    </ServicePageLayout>
    </>
  )
}
