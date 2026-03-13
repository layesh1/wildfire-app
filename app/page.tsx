'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, BarChart3, Monitor, Bell, Map, X, Send, ChevronDown } from 'lucide-react'

// ── Mini homepage chat (prompts login) ──────────────────────────────────────
function HomepageChat() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hasTyped, setHasTyped] = useState(false)

  function handleSend() {
    if (!input.trim()) return
    setHasTyped(true)
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden" style={{ width: 340, maxHeight: 420 }}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shrink-0" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' }}>
            <div className="w-9 h-9 rounded-xl bg-white border border-green-200 flex items-center justify-center shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flameo.png" alt="Flameo" width={28} height={28} style={{ objectFit: 'contain' }} />
            </div>
            <div className="flex-1">
              <div className="text-gray-900 font-semibold text-sm">Flameo</div>
              <div className="text-gray-500 text-xs">Minutes Matter AI assistant</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 bg-gray-50 flex flex-col gap-3 overflow-y-auto">
            {/* Flameo intro bubble */}
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/flameo.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700 leading-relaxed max-w-[85%]">
                Hi! I'm Flameo, your wildfire safety assistant. I can help with evacuation plans, go-bag tips, and more.
              </div>
            </div>

            {hasTyped && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/flameo.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
                </div>
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-700">
                    To get personalised advice, please log in or create a free account first.
                  </div>
                  <button
                    onClick={() => router.push('/auth/login?role=caregiver')}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors self-start"
                  >
                    Log in / Sign up
                  </button>
                </div>
              </div>
            )}

            {!hasTyped && (
              <div className="flex flex-wrap gap-2 mt-1">
                {["What's in a go-bag?", "How do I evacuate with a wheelchair?", "Is my area at risk?"].map(p => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); setHasTyped(true) }}
                    className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-50 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask Flameo anything…"
                className="flex-1 bg-gray-50 text-gray-900 text-sm rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-green-400 placeholder:text-gray-400"
              />
              <button
                onClick={handleSend}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-xl text-white transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        title="Chat with Flameo"
      >
        <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flameo.png" alt="Flameo" width={36} height={36} style={{ objectFit: 'contain' }} />
        </span>
        <X className={`w-5 h-5 text-blue-500 absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      </button>

      {/* Notification dot */}
      {!open && (
        <div className="fixed bottom-[62px] right-3 z-50 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse pointer-events-none" />
      )}
    </>
  )
}

// ── Elderly silhouette SVG ───────────────────────────────────────────────────
function ElderlyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="40" cy="16" r="12" fill="currentColor" opacity="0.15" />
      {/* Body */}
      <path d="M26 40 Q40 32 54 40 L58 75 Q50 78 40 78 Q30 78 22 75 Z" fill="currentColor" opacity="0.12" />
      {/* Left arm with cane */}
      <path d="M26 42 L18 62 L16 80 L20 80 L22 65 L28 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.2" />
      {/* Right arm */}
      <path d="M54 42 L60 58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.15" />
      {/* Legs */}
      <path d="M32 76 L28 100 L34 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.15" />
      <path d="M48 76 L50 100 L44 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.15" />
      {/* Cane bottom */}
      <path d="M16 80 Q14 88 18 90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.2" />
    </svg>
  )
}

const stats = [
  { value: '62,696', label: 'Fire incidents analyzed', sub: '2021–2025' },
  { value: '11.5h', label: 'Median evacuation delay', sub: 'across all counties' },
  { value: '99.74%', label: 'Fires w/ no formal order', sub: 'despite external signals' },
  { value: '9×', label: 'State disparity gap', sub: 'fastest vs slowest' },
]

const whoFor = [
  {
    icon: Heart,
    title: 'Caregivers',
    desc: 'Managing the safety of elderly parents, children, or loved ones with mobility challenges during a wildfire event.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  {
    icon: Shield,
    title: 'Emergency Responders',
    desc: 'Fire departments and emergency management teams who need real-time signal gap data and ML-powered spread predictions.',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  {
    icon: BarChart3,
    title: 'Data Analysts & Researchers',
    desc: 'Academics and policy teams studying equity gaps in wildfire evacuation using 62,696 real incidents with SVI cross-analysis.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
]

const howSteps = [
  { num: '01', title: 'Signal Detection', desc: 'NASA FIRMS and WatchDuty data streams detect fire incidents in real time.' },
  { num: '02', title: 'Gap Analysis', desc: 'We identify where formal evacuation orders are missing despite clear fire signals.' },
  { num: '03', title: 'Equity Scoring', desc: 'CDC SVI data highlights which communities are most vulnerable and underserved.' },
  { num: '04', title: 'Personalized Alerts', desc: 'Caregivers receive tailored alerts, evacuation routes, and safe shelter locations.' },
]

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* Navbar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center">
              <Flame className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-display font-bold text-gray-900 text-lg">Minutes Matter</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
            <a href="#about" className="hover:text-gray-900 transition-colors">About</a>
            <a href="#who" className="hover:text-gray-900 transition-colors">Who It's For</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How It Works</a>
          </nav>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Join
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 40%, #f0f9ff 100%)' }}>
        {/* Background leaf/nature pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaves" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="8" fill="#16a34a" />
              <circle cx="60" cy="60" r="5" fill="#16a34a" />
              <circle cx="60" cy="20" r="3" fill="#16a34a" />
              <circle cx="20" cy="60" r="4" fill="#16a34a" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaves)" />
        </svg>

        {/* Elderly silhouette in background */}
        <ElderlyIcon className="absolute right-[12%] bottom-0 h-64 text-green-600 opacity-10 pointer-events-none hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-16">
          {/* Left: text + buttons */}
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-green-200 rounded-full px-3 py-1.5 text-xs text-green-700 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              WiDS Datathon 2025 · California
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Stay Safe From<br />
              <span style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Wildfires</span><br />
              When Seconds Count
            </h1>
            <p className="text-gray-600 text-lg mb-10 leading-relaxed">
              Minutes Matter delivers equity-driven evacuation intelligence to caregivers, elderly residents, and vulnerable communities — because when wildfires strike, every second counts.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </button>
              <button
                onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.89-7.43-2.79-2.79L3.18 23.76zM.1 1.22C.04 1.46 0 1.72 0 2v20c0 .28.04.54.1.78l.06.06 11.2-11.2v-.28L.16 1.16.1 1.22zM20.84 10.6l-2.66-1.54-3.14 3.14 3.14 3.14 2.67-1.54c.76-.44.76-1.16-.01-1.2zM4.17.24l12.01 6.93-2.79 2.79L4.17.24z"/>
                </svg>
                Google Play
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="flex items-center gap-2.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-5 py-3 rounded-xl border border-gray-300 transition-all duration-200 hover:scale-[1.02]"
              >
                <Monitor className="w-5 h-5 text-gray-600" />
                Use On Web Browser
              </button>
            </div>
          </div>

          {/* Right: phone + laptop mockup */}
          <div className="relative flex-shrink-0 flex items-end gap-4">
            {/* Laptop mockup */}
            <div className="hidden md:block">
              {/* Screen */}
              <div className="w-72 bg-gray-800 rounded-t-xl border-4 border-gray-700 shadow-2xl overflow-hidden" style={{ height: 180 }}>
                <div className="h-4 bg-gray-700 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <div className="bg-white h-full flex flex-col">
                  {/* Dashboard header */}
                  <div className="bg-green-700 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-bold">MINUTES MATTER</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                      <span className="text-green-200 text-xs">Live</span>
                    </div>
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar strip */}
                    <div className="w-10 bg-gray-50 border-r border-gray-100 flex flex-col items-center py-2 gap-2">
                      {[Bell, Map, Shield, BarChart3].map((Icon, i) => (
                        <div key={i} className={`w-6 h-6 rounded flex items-center justify-center ${i === 0 ? 'bg-green-100' : ''}`}>
                          <Icon className={`w-3 h-3 ${i === 0 ? 'text-green-700' : 'text-gray-300'}`} />
                        </div>
                      ))}
                    </div>
                    {/* Content */}
                    <div className="flex-1 p-2 space-y-1.5">
                      <div className="text-gray-700 text-xs font-semibold">Active Alerts</div>
                      {['Mosquito Fire · Placer Co.', 'Oak Fire · Mariposa Co.'].map(name => (
                        <div key={name} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded px-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{name}</span>
                        </div>
                      ))}
                      <div className="bg-green-50 border border-green-100 rounded px-2 py-1">
                        <div className="text-xs text-green-700 font-medium">Flameo AI ready</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Laptop base */}
              <div className="w-80 h-4 bg-gray-700 rounded-b-sm mx-auto -mt-0.5" />
              <div className="w-72 h-2 bg-gray-600 rounded-b-xl mx-auto" />
            </div>

            {/* Phone mockup */}
            <div className="relative z-10 w-52 bg-gray-900 rounded-[2.5rem] border-4 border-gray-700 shadow-2xl overflow-hidden" style={{ height: 440 }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full z-10" />
              <div className="h-full bg-white flex flex-col">
                <div className="bg-green-700 px-3 pt-7 pb-2">
                  <div className="text-white text-xs font-bold tracking-wider mb-0.5">MINUTES MATTER</div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-200 text-xs">My Alerts</span>
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">2</span>
                  </div>
                </div>
                <div className="flex-1 bg-emerald-50 relative overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs><pattern id="grid2" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="#16a34a" strokeWidth="0.5"/></pattern></defs>
                    <rect width="100%" height="100%" fill="url(#grid2)" />
                  </svg>
                  <div className="absolute top-6 left-10 w-7 h-7 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div className="absolute top-14 right-8 w-5 h-5 rounded-full bg-orange-500/30 border-2 border-orange-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  </div>
                  <div className="absolute bottom-10 left-2 right-2 bg-white rounded-xl shadow-lg p-2 border border-gray-100">
                    <div className="font-bold text-gray-900 text-xs mb-0.5">Mosquito Fire</div>
                    <div className="text-gray-500 text-xs">Placer County, CA</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-500">76,788 acres</span>
                      <span className="text-xs text-amber-600 font-medium">10%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border-t border-gray-100 px-3 py-2 flex justify-around">
                  {['Alerts', 'Map', 'Chat'].map((item, i) => (
                    <div key={item} className="flex flex-col items-center gap-0.5">
                      <div className={`w-4 h-1 rounded-full ${i === 0 ? 'bg-green-600' : 'bg-gray-200'}`} />
                      <span className={`text-xs ${i === 0 ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center pb-8">
          <ChevronDown className="w-6 h-6 text-gray-300 animate-bounce" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-gray-900 py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
              <div className="text-gray-600 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About the Project */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="text-green-600 text-sm font-semibold uppercase tracking-wide mb-3">About the Project</div>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-6">Built for equity. Powered by data.</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Minutes Matter was built for the WiDS Datathon 2025 to address a critical failure in wildfire response: evacuation alerts consistently miss the communities that need them most.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                Using the WatchDuty dataset of 62,696 fire incidents (2021–2025) cross-referenced with the CDC Social Vulnerability Index, we found that <strong className="text-gray-900">99.74% of fires with external detection signals never received a formal evacuation order</strong> — with median delays of 11.5 hours.
              </p>
              <p className="text-gray-600 leading-relaxed">
                For elderly residents, people with disabilities, and non-English speakers, these delays can be fatal. Minutes Matter closes that gap with real-time signal analysis, ML-powered predictions, and accessible alerts.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['WatchDuty Dataset', 'CDC Social Vulnerability Index', 'NASA FIRMS', 'XGBoost · Random Forest'].map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '62,696', label: 'Total incidents', color: 'text-green-700' },
                { value: '108', label: 'With formal orders', color: 'text-red-600' },
                { value: '41,906', label: 'Fires with signals', color: 'text-amber-600' },
                { value: '11.5h', label: 'Median delay', color: 'text-blue-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
                  <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section id="who" className="py-24" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-green-600 text-sm font-semibold uppercase tracking-wide mb-3">Who It's For</div>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">Protecting those who need it most</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Designed with caregivers and vulnerable community members at the centre.
            </p>
          </div>

          {/* Caregiver spotlight */}
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 mb-8 flex flex-col md:flex-row items-center gap-10">
            <div className="relative flex-shrink-0 w-40 h-40 rounded-2xl overflow-hidden bg-green-50 border border-green-100 flex items-center justify-center">
              {/* Stylised elderly + caregiver illustration using CSS */}
              <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Elderly person */}
                <circle cx="42" cy="28" r="14" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
                <path d="M28 52 Q42 42 56 52 L60 85 Q50 90 42 90 Q34 90 24 85 Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
                <path d="M28 55 L20 72 L18 92 L24 92 L26 76 L32 60" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 92 Q16 100 20 102" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <path d="M56 55 L62 68" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M34 88 L30 108 L36 108" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M50 88 L52 108 L46 108" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                {/* Caregiver / helper figure */}
                <circle cx="82" cy="30" r="11" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
                <path d="M70 52 Q82 44 94 52 L96 80 Q88 84 82 84 Q76 84 68 80 Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" />
                {/* Connecting hand / care gesture */}
                <path d="M62 65 Q72 58 70 70" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Heart */}
                <path d="M58 42 Q62 36 66 42 Q70 48 58 55 Q46 48 50 42 Q54 36 58 42Z" fill="#fca5a5" opacity="0.7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-green-700 text-sm font-semibold mb-2">Primary Users</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">Caregivers & Families</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When a wildfire breaks out, caregivers managing elderly parents, young children, or family members with disabilities face unique challenges. Standard alerts often arrive too late, use inaccessible language, or fail to account for slower evacuation needs.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Minutes Matter gives caregivers personalised, actionable alerts with accessible route guidance, check-in tools, and Flameo — an AI assistant that helps plan evacuations in plain language.
              </p>
            </div>
          </div>

          {/* Other user types */}
          <div className="grid md:grid-cols-3 gap-6">
            {whoFor.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div key={title} className={`bg-white rounded-2xl border ${border} p-6 shadow-sm`}>
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-green-400 text-sm font-semibold uppercase tracking-wide mb-3">Get Started</div>
          <h2 className="font-display text-4xl font-bold text-white mb-4">Join Minutes Matter</h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Access real-time wildfire intelligence tailored to your role. Free for caregivers and evacuees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/login?role=caregiver')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" /> Caregiver / Evacuee
            </button>
            <button
              onClick={() => router.push('/auth/login?role=emergency_responder')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" /> Emergency Responder
            </button>
            <button
              onClick={() => router.push('/auth/login?role=data_analyst')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-5 h-5" /> Data Analyst
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-green-600 text-sm font-semibold uppercase tracking-wide mb-3">How It Works</div>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">Four steps to safer evacuations</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From raw fire data to a personalised alert in your hands — here's how Minutes Matter works.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howSteps.map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 h-full">
                  <div className="font-display text-4xl font-bold text-green-100 mb-4">{num}</div>
                  <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-8 px-6">
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

      {/* Homepage Flameo chat */}
      <HomepageChat />
    </main>
  )
}
