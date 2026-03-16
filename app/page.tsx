'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, Monitor, X, Send, ArrowRight } from 'lucide-react'

// ── Homepage Flameo chat (prompts login) ─────────────────────────────────────
function HomepageChat() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hasTyped, setHasTyped] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('wfa_flameo_intro_home')
    if (!seen) {
      const t = setTimeout(() => setShowIntro(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  function dismissIntro() {
    setShowIntro(false)
    if (typeof window !== 'undefined') localStorage.setItem('wfa_flameo_intro_home', '1')
  }

  function handleOpen() {
    setOpen(v => !v)
    dismissIntro()
  }

  function handleSend() {
    if (!input.trim()) return
    setHasTyped(true)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden" style={{ width: 340, maxHeight: 420 }}>
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shrink-0" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
            <div className="w-9 h-9 rounded-xl bg-white border border-green-200 flex items-center justify-center shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flameo1.png" alt="Flameo" width={28} height={28} style={{ objectFit: 'contain' }} />
            </div>
            <div className="flex-1">
              <div className="text-gray-900 font-semibold text-sm">Flameo</div>
              <div className="text-gray-500 text-xs">Minutes Matter AI assistant</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-4 bg-gray-50 flex flex-col gap-3 overflow-y-auto">
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/flameo1.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 leading-relaxed max-w-[85%]">
                Hi! I'm Flameo, your wildfire safety assistant. I can help with evacuation plans, go-bag tips, and more.
              </div>
            </div>
            {hasTyped && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/flameo1.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
                </div>
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700">
                    To get personalised advice, please log in or create a free account first.
                  </div>
                  <button onClick={() => router.push('/auth/login?role=caregiver')}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors self-start">
                    Log in / Sign up
                  </button>
                </div>
              </div>
            )}
            {!hasTyped && (
              <div className="flex flex-wrap gap-2 mt-1">
                {["What's in a go-bag?", "How do I evacuate with a wheelchair?", "Is my area at risk?"].map(p => (
                  <button key={p} onClick={() => { setInput(p); setHasTyped(true) }}
                    className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors">{p}</button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask Flameo anything…"
                className="flex-1 bg-gray-50 text-gray-900 text-sm rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-green-400 placeholder:text-gray-400" />
              <button onClick={handleSend} className="p-2 bg-green-600 hover:bg-green-700 rounded-xl text-white transition-colors shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 w-16 h-16 rounded-2xl bg-forest-600 hover:bg-forest-700 shadow-xl shadow-forest-600/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Chat with Flameo">
        <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flameo1.png" alt="Flameo" width={40} height={40} style={{ objectFit: 'contain' }} />
        </span>
        <X className={`w-6 h-6 text-white absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      </button>
      {!open && (
        <div className="fixed bottom-[72px] right-3 z-50 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse pointer-events-none" />
      )}
      {showIntro && !open && (
        <div className="fixed bottom-24 right-4 z-50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-56 relative">
            <button onClick={dismissIntro} className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flameo1.png" alt="Flameo" width={32} height={32} style={{ objectFit: 'contain' }} />
              <div className="font-semibold text-gray-900 text-sm">Meet Flameo!</div>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              Your personal wildfire safety assistant. Ask about evacuation routes, go-bags, and alerts.
            </p>
            <button
              onClick={() => { setOpen(true); dismissIntro() }}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
            >
              Chat with Flameo
            </button>
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        </div>
      )}
    </>
  )
}

// ── Phone mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative shrink-0 drop-shadow-2xl" style={{ width: 340 }}>
      {/* Phone shell */}
      <div className="relative bg-[#1c1c1e] rounded-[3rem] shadow-2xl overflow-hidden border-[7px] border-[#2c2c2e]" style={{ height: 700 }}>
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1c1c1e] rounded-full z-10" />
        {/* Screen */}
        <div className="h-full flex flex-col">
          {/* Green gradient header */}
          <div className="px-5 pt-10 pb-5" style={{ background: 'linear-gradient(160deg, #14532d 0%, #16a34a 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-xs">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 border border-white/60 rounded-[2px]"><div className="w-2 h-full bg-green-300 rounded-[1px]" /></div>
              </div>
            </div>
            <div className="text-white/70 text-xs font-semibold tracking-widest mb-1">MINUTES MATTER</div>
            <div className="text-white font-bold text-lg leading-snug mb-1">Active alerts<br/>near you</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              <span className="text-green-200 text-xs">2 fires monitored</span>
            </div>
          </div>
          {/* White content area */}
          <div className="flex-1 bg-[#f0fdf4] px-3 pt-4 pb-3 space-y-2.5 overflow-hidden">
            {/* Alert card */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-red-100">
              <div className="flex items-start justify-between mb-1">
                <span className="text-gray-900 font-semibold text-xs">Mosquito Fire</span>
                <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">ACTIVE</span>
              </div>
              <div className="text-gray-400 text-[10px] mb-2">Placer County, CA · 76,788 ac</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1"><div className="bg-amber-500 h-1 rounded-full" style={{ width: '10%' }} /></div>
                <span className="text-amber-600 text-[10px] font-semibold">10%</span>
              </div>
            </div>
            {/* Flameo card */}
            <div className="bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-green-100 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flameo1.png" alt="Flameo" width={28} height={28} style={{ objectFit: 'contain' }} />
              <div>
                <div className="text-gray-900 font-semibold text-[11px]">Ask Flameo AI</div>
                <div className="text-gray-400 text-[10px]">Evacuation help &amp; routes</div>
              </div>
            </div>
            {/* Check-in button */}
            <div className="bg-green-600 rounded-2xl px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-white font-semibold text-[11px]">Check in safe</div>
                <div className="text-green-200 text-[10px]">Let your family know</div>
              </div>
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
          </div>
          {/* Bottom tab bar */}
          <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex justify-around items-center">
            {['Alerts', 'Map', 'Chat', 'Profile'].map((t, i) => (
              <div key={t} className={`flex flex-col items-center gap-0.5 ${i === 0 ? 'text-green-700' : 'text-gray-300'}`}>
                <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-green-600' : 'bg-transparent'}`} />
                <span className="text-[9px] font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


// ── How It Works ──────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: '01',
    title: 'Signal Detection',
    tag: 'Data Ingestion',
    desc: 'NASA FIRMS and WatchDuty data streams detect fire incidents in real time, before formal evacuation orders are ever issued.',
    detail: 'We ingest satellite thermal anomaly data from NASA FIRMS alongside crowd-sourced incident reports from WatchDuty, giving us the earliest possible signal that a fire is growing.',
    color: '#16a34a',
  },
  {
    num: '02',
    title: 'Gap Analysis',
    tag: 'Intelligence Layer',
    desc: 'We identify where formal evacuation orders are missing despite clear fire signals, closing the critical information gap.',
    detail: 'Across 60,000+ incidents, 99.74% of fires with external detection signals never received a formal order. Our gap analysis flags these silent emergencies immediately.',
    color: '#d97706',
  },
  {
    num: '03',
    title: 'Equity Scoring',
    tag: 'Vulnerability Mapping',
    desc: 'CDC Social Vulnerability Index data identifies which communities are most at risk and least likely to receive timely alerts.',
    detail: 'High-SVI counties experience up to 9× longer delays before evacuation orders. We weight our alert priority by vulnerability score so the most at-risk residents hear first.',
    color: '#dc2626',
  },
  {
    num: '04',
    title: 'Personalized Alerts',
    tag: 'Delivery',
    desc: 'Caregivers receive tailored alerts, accessible evacuation routes, and safe shelter locations in plain, accessible language.',
    detail: 'Alerts are delivered in 30+ languages with mobility-adaptive guidance. Flameo AI helps caregivers plan step-by-step evacuations for elderly relatives or people with disabilities.',
    color: '#2563eb',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="overflow-hidden" style={{ background: '#f0fdf4' }}>
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 min-h-[640px]">

        {/* Left: phone mockup — top half visible, bottom cropped */}
        <div className="relative hidden lg:flex items-start justify-center" style={{ background: 'linear-gradient(160deg, #14532d 0%, #16a34a 100%)' }}>
          <div style={{ paddingTop: 48, overflow: 'hidden', height: 430, width: 340, flexShrink: 0 }}>
            <PhoneMockup />
          </div>
        </div>

        {/* Right: steps */}
        <div className="py-20 px-8 lg:px-14">
          <div className="mb-12">
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-3">How It Works</div>
            <h2 className="font-display font-bold text-gray-900" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
              Four steps to safer evacuations.
            </h2>
          </div>

          <div className="space-y-0">
            {HOW_STEPS.map((step, i) => {
              const isLast = i === HOW_STEPS.length - 1
              return (
                <div key={step.num} className="flex gap-5">
                  {/* Number + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                      {step.num}
                    </div>
                    {!isLast && <div className="w-px flex-1 my-2" style={{ background: '#bbf7d0' }} />}
                  </div>
                  {/* Content */}
                  <div className={`pb-10 ${isLast ? '' : ''}`}>
                    <div className="text-green-600 text-[10px] font-semibold uppercase tracking-widest mb-1">{step.tag}</div>
                    <h3 className="font-display font-bold text-gray-900 text-lg mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-20 border-b border-white/10" style={{ background: 'rgba(10,31,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl tracking-tight">Minutes Matter</span>
          </div>
          <div className="flex-1" />
          <nav className="hidden md:flex items-center gap-8 text-sm text-green-200/70 font-medium">
            <a href="#who" className="hover:text-white transition-colors">Who It's For</a>
            <a href="#mission" className="hover:text-white transition-colors">Our Mission</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/auth/login')}
              className="text-green-200/80 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
              Log in
            </button>
            <button onClick={() => router.push('/auth/login?mode=signup')}
              className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Background forest photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-forest.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(5,20,10,0.82) 0%, rgba(10,31,18,0.70) 50%, rgba(5,20,10,0.60) 100%)' }} />

        {/* Live badge */}
        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-4 w-full">
          <div className="inline-flex items-center gap-2 border border-green-700/50 rounded-full px-3 py-1.5 text-xs text-green-400 font-medium bg-green-950/50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            WiDS Datathon 2026 · California
          </div>
        </div>

        {/* Main content */}
        <div className="relative flex-1 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center lg:items-end gap-12 w-full">
          {/* Left: text */}
          <div className="flex-1 pt-8 lg:pt-0 lg:pb-16">
            <h1 className="leading-none mb-8">
              <span className="block font-display font-bold text-white" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>
                Stay Safe
              </span>
              <span className="block font-display italic text-green-400" style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 1.05 }}>
                From Wildfires
              </span>
              <span className="block text-white/50 font-body font-medium tracking-tight mt-3" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)' }}>
                When minutes matter.
              </span>
            </h1>
            <p className="text-green-200/60 text-lg mb-10 leading-relaxed max-w-lg">
              Equity-driven evacuation intelligence for caregivers, elderly residents, and vulnerable communities.
            </p>
            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] text-gray-900"
                style={{ background: '#e8f5e9' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </button>
              <button onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] text-gray-900"
                style={{ background: '#e8f5e9' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.89-7.43-2.79-2.79L3.18 23.76zM.1 1.22C.04 1.46 0 1.72 0 2v20c0 .28.04.54.1.78l.06.06 11.2-11.2v-.28L.16 1.16.1 1.22zM20.84 10.6l-2.66-1.54-3.14 3.14 3.14 3.14 2.67-1.54c.76-.44.76-1.16-.01-1.2zM4.17.24l12.01 6.93-2.79 2.79L4.17.24z"/>
                </svg>
                Google Play
              </button>
              <button onClick={() => router.push('/auth/login')}
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-xl border border-white/20 transition-all duration-200 hover:scale-[1.02]">
                <Monitor className="w-4 h-4" />
                Use On Web Browser
              </button>
            </div>
          </div>

          {/* Right: phone mockup — flush to bottom of hero */}
          <div className="flex items-start justify-center shrink-0 lg:flex-1 animate-phone-rise" style={{ overflow: 'hidden', alignSelf: 'stretch' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="who" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center">
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-4">Who It's For</div>
            <h2 className="font-display font-bold text-gray-900" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Protecting those who<br />need it most.
            </h2>
          </div>

          {/* Caregiver spotlight */}
          <div className="rounded-3xl overflow-hidden mb-6 grid lg:grid-cols-[1fr_340px]" style={{ background: '#0a1f12', minHeight: 380 }}>
            {/* Text — left */}
            <div className="p-8 lg:p-10 flex flex-col justify-center">
              <div className="text-green-500 text-xs font-semibold uppercase tracking-widest mb-2">Primary Users</div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">Caregivers &amp; Families</h3>
              <p className="text-green-200/70 text-sm leading-relaxed mb-3">When a wildfire breaks out, caregivers managing elderly parents, young children, or family members with disabilities face unique challenges. Standard alerts often arrive too late, use inaccessible language, or fail to account for slower evacuation needs.</p>
              <p className="text-green-200/50 text-sm leading-relaxed mb-7">Minutes Matter gives caregivers personalised, actionable alerts with accessible route guidance, check-in tools, and Flameo — an AI assistant that helps plan evacuations in plain language.</p>
              <button onClick={() => router.push('/auth/login?role=caregiver')} className="self-start flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                Get started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {/* Image — right, tall */}
            <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/caregiver.png" alt="Caregiver supporting an elderly person" className="absolute inset-0 w-full h-full object-cover object-center" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, transparent 60%, #0a1f12 100%)' }} />
            </div>
          </div>

        </div>
      </section>

      {/* ── MISSION ── */}
      <section id="mission" className="py-20" style={{ background: '#f5f0e8' }}>
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <div className="mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9a7a50' }}>Our Mission</div>
            <h2 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: '#2c2416' }}>
              Closing the gap between<br />signal and safety.
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid lg:grid-cols-12 gap-4">

            {/* Problem — left card */}
            <div className="mission-card lg:col-span-5">
              <div className="mc-glow" />
              <div className="mc-inner p-8 border h-full flex flex-col justify-between" style={{ background: '#fdf3ec', borderColor: '#e8c9aa' }}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#b05a2a' }}>The Problem</div>
                  <h3 className="font-display text-xl font-bold mb-4" style={{ color: '#2c2416' }}>Alerts arrive too late — or not at all.</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#7a6050' }}>
                    Across 60,000+ wildfire incidents in California, the vast majority had detectable fire signals but never triggered a formal evacuation order. The most vulnerable communities wait longest.
                  </p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { val: '99.74%', sub: 'fires with no order' },
                    { val: '11.5h', sub: 'median delay' },
                    { val: '9×', sub: 'disparity gap' },
                    { val: '60K+', sub: 'incidents studied' },
                  ].map(s => (
                    <div key={s.sub} className="rounded-2xl p-4" style={{ background: 'rgba(176,90,42,0.07)', border: '1px solid #e8c9aa' }}>
                      <div className="font-display font-bold text-xl" style={{ color: '#b05a2a' }}>{s.val}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9a7060' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Solution */}
            <div className="mission-card lg:col-span-7">
              <div className="mc-glow" style={{ background: 'conic-gradient(from var(--angle, 0deg), #d4a853, #8a6020, #c8903a, #6a4a18, #d4a853)' }} />
              <div className="mc-inner p-8 h-full" style={{ background: 'linear-gradient(135deg, #2c1f0e 0%, #4a3018 100%)' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#c8a97a' }}>What We Built</div>
                <h3 className="font-display font-bold text-white text-xl mb-6">An early-warning platform for those who need it most.</h3>
                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  {[
                    { title: 'Signal Detection', desc: 'NASA FIRMS satellite data and WatchDuty reports surface fire activity before formal orders are issued.' },
                    { title: 'Equity Scoring', desc: 'CDC Social Vulnerability Index weights alerts so high-risk communities hear first, not last.' },
                    { title: 'Caregiver Portal', desc: 'Free, accessible alerts with evacuation routes and Flameo AI — in 30+ languages.' },
                    { title: 'Responder Command', desc: 'ML-powered gap maps and incident intelligence for emergency coordinators.' },
                  ].map(item => (
                    <div key={item.title}>
                      <div className="w-1 h-4 rounded-full mb-2" style={{ background: '#d4a853' }} />
                      <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: '#c8b89a' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['XGBoost · 96% accuracy', 'NASA FIRMS', 'CDC SVI', 'WatchDuty'].map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#c8b89a', border: '1px solid rgba(255,255,255,0.1)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-16 relative overflow-hidden" style={{ minHeight: 520 }}>
        {/* Background design image — fully visible */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/forest-blur-image.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Content bubble */}
        <div className="relative max-w-3xl mx-auto px-6 flex items-center justify-center" style={{ minHeight: 420 }}>
          <div className="w-full rounded-3xl p-10 lg:p-14" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 60px rgba(0,0,0,0.10)' }}>
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-4">About the Project</div>
            <h2 className="font-display font-bold text-gray-900 leading-tight mb-5" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)' }}>
              A WiDS Datathon 2026 submission<br />from California.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-5">
              Minutes Matter started as a research question: why do so many wildfires go unannounced? We dug into the data and found a systemic gap — fire signals exist, but formal alerts rarely follow. The communities hit hardest are also the least likely to be reached in time.
            </p>
            <p className="text-gray-500 leading-relaxed">
              We built this platform to turn that finding into action. It is open to caregivers and evacuees for free, with a mission to make every minute count for the people who need it most.
            </p>
          </div>
        </div>
      </section>

      {/* ── JOIN ── */}
      <section className="relative py-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-forest.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,20,10,0.80)' }} />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="text-green-500 text-xs font-semibold uppercase tracking-widest mb-4">Get Started</div>
          <h2 className="font-display font-bold text-white mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
            Join Minutes Matter
          </h2>
          <p className="text-green-200/60 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Access real-time wildfire intelligence tailored to your role. Free for caregivers and evacuees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push('/auth/login?role=caregiver')}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2">
              <Heart className="w-5 h-5" /> Caregiver / Evacuee
            </button>
            <button onClick={() => router.push('/auth/login?role=emergency_responder')}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" /> Emergency Responder
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6" style={{ background: '#050f08' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Minutes Matter</span>
          </div>
          <p className="text-gray-600 text-xs text-center">WiDS Datathon 2025 · Data: WatchDuty · CDC SVI · NASA FIRMS</p>
          <p className="text-gray-600 text-xs">Not a replacement for official emergency directives.</p>
        </div>
      </footer>

      <HomepageChat />
    </main>
  )
}
