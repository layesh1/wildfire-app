'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Heart, Monitor, X, Send, ArrowRight, Home as HomeIcon, User, TreePine, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'
import { LiquidMetalFab } from '@/components/ui/liquid-metal-button'
import { useScroll } from '@/components/ui/use-scroll'

// ── Phone mockup ──────────────────────────────────────────────────────────────
function PhoneTilt({ crop = true, scale = 1 }: { crop?: boolean; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const [tiltY, setTiltY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const rect = ref.current!.getBoundingClientRect()
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
      setTiltY(dx * 12)
    })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTiltY(0) }}
      style={{ perspective: 800, flexShrink: 0 }}
    >
      <div
        className="phone-shine"
        style={{
          overflow: 'hidden',
          width: 340 * scale,
          ...(crop ? { height: 513 * scale, marginLeft: -80 * scale, borderRadius: '2.75rem 2.75rem 0 0' } : { borderRadius: '2.75rem' }),
          transform: `rotateY(${tiltY}deg) scale(${isHovered ? 1.03 : 1})`,
          transition: isHovered ? 'transform 0.08s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          willChange: 'transform',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/phone.png" alt="Minutes Matter app" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}

// ── Hero cycling word ─────────────────────────────────────────────────────────
function HeroCyclingWord() {
  const words = useMemo(() => ['counts.', 'saves.', 'matters.'], [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index === words.length - 1) return
    const id = setTimeout(() => setIndex(i => i + 1), 2000)
    return () => clearTimeout(id)
  }, [index, words])

  return (
    <span
      className="block font-display italic text-green-400 relative overflow-hidden"
      style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 1.2, height: 'clamp(3rem, 8.5vw, 6.6rem)' }}
    >
      {words.map((word, i) => (
        <motion.span
          key={word}
          className="absolute inset-0 flex items-center"
          initial={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          animate={
            index === i
              ? { y: 0, opacity: 1 }
              : { y: index > i ? -60 : 60, opacity: 0 }
          }
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

// ── Homepage Flameo chat (prompts login) ─────────────────────────────────────
const HP_FIRE_COLORS = [
  [180, 180, 180],
  [180, 180, 180],
  [180, 180, 180],
  [180, 180, 180],
  [255, 100,  15],
]

function HomepageFabSmoke({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<{ x: number; y: number; size: number; speedX: number; speedY: number; life: number; initialSize: number; color: number[] }[]>([])
  const rafRef = useRef<number>(0)
  const activeRef = useRef(active)
  const frameRef = useRef(0)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = 160; canvas.height = 400
    const cx = 80, cy = 395 // canvas bottom = icon centre, cy near canvas bottom

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frameRef.current++
      if (activeRef.current && frameRef.current % 3 === 0) {
        const size = Math.random() * 5 + 2
        const color = HP_FIRE_COLORS[Math.floor(Math.random() * HP_FIRE_COLORS.length)]
        particlesRef.current.push({
          x: cx + (Math.random() * 20 - 10),
          y: cy + (Math.random() * 10 - 5),
          size, initialSize: size, color,
          speedX: Math.random() * 2 - 1,
          speedY: -Math.random() * 2.5 - 0.8,
          life: 100,
        })
      }
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.size > 0)
      for (const p of particlesRef.current) {
        p.x += p.speedX; p.y += p.speedY; p.life -= 1.0
        p.size = Math.max(0, p.initialSize * (p.life / 100))
        if (p.size > 0) {
          const [r, g, b] = p.color
          ctx.fillStyle = `rgba(${r},${g},${b},${(p.life / 100) * 0.85})`
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} className="pointer-events-none" style={{
      position: 'absolute', width: 160, height: 400,
      bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1,
    }} />
  )
}

function HomepageChat() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hasTyped, setHasTyped] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [fabHovered, setFabHovered] = useState(false)

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
        <div className="fixed bottom-24 right-4 z-50 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden" style={{ width: 340, maxHeight: 420 }}>
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
      <div className="fixed bottom-4 right-4 z-50 w-16 h-16">
        {!open && <HomepageFabSmoke active={fabHovered} />}
        <LiquidMetalFab
          onClick={handleOpen}
          onMouseEnter={() => setFabHovered(true)}
          onMouseLeave={() => setFabHovered(false)}
          title="Chat with Flameo"
          aria-label="Chat with Flameo"
          style={{ position: 'absolute', inset: 0, zIndex: 2 }}
        >
          <span className={`transition-all duration-200 ${open ? 'scale-75 opacity-0 absolute' : 'scale-100 opacity-100'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flameo1.png" alt="Flameo" width={46} height={46} style={{ objectFit: 'contain' }} />
          </span>
          <X className={`w-6 h-6 text-white absolute transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
        </LiquidMetalFab>
      </div>
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


// ── How It Works ──────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    num: '1',
    title: 'Signal Detection',
    tag: 'Data Ingestion',
    desc: 'NASA FIRMS and WatchDuty data streams detect fire incidents in real time, before formal evacuation orders are ever issued.',
    detail: 'We ingest satellite thermal anomaly data from NASA FIRMS alongside crowd-sourced incident reports from WatchDuty, giving us the earliest possible signal that a fire is growing.',
    color: '#16a34a',
  },
  {
    num: '2',
    title: 'Gap Analysis',
    tag: 'Intelligence Layer',
    desc: 'We identify where formal evacuation orders are missing despite clear fire signals, closing the critical information gap.',
    detail: 'Across 60,000+ incidents, 99.74% of fires with external detection signals never received a formal order. Our gap analysis flags these silent emergencies immediately.',
    color: '#d97706',
  },
  {
    num: '3',
    title: 'Equity Scoring',
    tag: 'Vulnerability Mapping',
    desc: 'CDC Social Vulnerability Index data identifies which communities are most at risk and least likely to receive timely alerts.',
    detail: 'High-SVI counties experience up to 9× longer delays before evacuation orders. We weight our alert priority by vulnerability score so the most at-risk residents hear first.',
    color: '#dc2626',
  },
  {
    num: '4',
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

        {/* Left: phone mockup — full, 3D tilt on hover */}
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
          <PhoneTilt crop={false} />
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
                    <div className="w-9 h-9 rounded-xl border-2 border-green-200 bg-white flex items-center justify-center font-display font-bold text-base text-green-700 shrink-0">
                      {step.num}
                    </div>
                    {!isLast && <div className="w-px flex-1 my-2 border-l border-dashed border-green-200" />}
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
  const scrolled = useScroll(60)

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* ── NAVBAR (fixed, overlays hero) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 pt-7 pointer-events-none">
        <header
          className="pointer-events-auto max-w-5xl mx-auto flex items-center gap-6 rounded-full border transition-all duration-300 ease-out"
          style={{
            background: scrolled ? 'rgba(10,31,18,0.88)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: scrolled
              ? '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 2px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
            borderColor: scrolled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
            padding: scrolled ? '8px 16px' : '12px 20px',
          }}
        >
          <span className="font-display font-bold text-white tracking-tight transition-all duration-300" style={{ fontSize: scrolled ? '1rem' : '1.125rem' }}>
            Minutes Matter
          </span>
          <div className="flex-1" />
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <a href="#who" className="text-green-100/70 hover:text-white hover:bg-white/10 transition-colors px-3.5 py-1.5 rounded-full">Who It's For</a>
            <a href="#mission" className="text-green-100/70 hover:text-white hover:bg-white/10 transition-colors px-3.5 py-1.5 rounded-full">Our Mission</a>
            <a href="/about" className="text-green-100/70 hover:text-white hover:bg-white/10 transition-colors px-3.5 py-1.5 rounded-full">About</a>
            <a href="#how" className="text-green-100/70 hover:text-white hover:bg-white/10 transition-colors px-3.5 py-1.5 rounded-full">How It Works</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/auth/login')}
              className="text-green-200/80 hover:text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">
              Log in
            </button>
            <button onClick={() => router.push('/auth/login?mode=signup')}
              className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors">
              Sign up
            </button>
          </div>
        </header>
      </div>

      {/* ── HERO ── */}
      <section className="relative flex flex-col overflow-hidden" style={{ minHeight: 'calc(100vh - 76px)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-forest.jpg" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(5,20,10,0.82) 0%, rgba(10,31,18,0.70) 50%, rgba(5,20,10,0.60) 100%)' }} />


        {/* Live badge — pushed down to clear the fixed nav */}

        {/* Main content */}
        <div className="relative flex-1 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center lg:items-end gap-12 w-full">
          {/* Left: text */}
          <div className="flex-1 pt-8 lg:pt-0 lg:pb-16">
            <h1 className="leading-none mb-8">
              <span className="block font-display font-bold text-white" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>
                Every minute
              </span>
              <HeroCyclingWord />
              <span className="block text-white/50 font-body font-medium tracking-tight mt-3" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)' }}>
                For the people you love.
              </span>
            </h1>
            <p className="text-green-200/60 text-lg mb-10 leading-relaxed max-w-lg">
              Real-time wildfire alerts for caregivers, elderly residents, and communities that need them most — before it's too late.
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

          {/* Right: phone mockup — 3D tilt on hover */}
          <div className="flex items-start justify-center shrink-0 lg:flex-1 animate-phone-rise">
            <PhoneTilt scale={1.08} />
          </div>
        </div>

      </section>

      {/* ── House & tree icon divider (same as above Who It's For) ── */}
      {(() => {
        const slots = ['h','t','h','h','t','f','h','t','h','h','t','p','t','h','h','t','h']
        return (
          <div className="bg-white flex items-center justify-center gap-2 pt-8 pb-8 overflow-hidden">
            {slots.map((type, i) => {
              const base = "shrink-0 cursor-pointer transition-all duration-200 hover:scale-125 w-7 h-7"
              if (type === 'f') return <Flame key={i} className={`${base} text-orange-500 hover:text-orange-400`} />
              if (type === 'p') return <User key={i} className={`${base} text-green-600 hover:text-green-400`} />
              if (type === 't') return <TreePine key={i} className={`${base} text-green-600 hover:text-green-400`} />
              return <HomeIcon key={i} className={`${base} text-green-800 hover:text-green-500`} />
            })}
          </div>
        )
      })()}

      {/* ── PEACE OF MIND ── */}
      <section className="pt-24 pb-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-5">For Caregivers Everywhere</div>
          <h2 className="font-display font-bold text-gray-900 leading-tight mb-6" style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}>
            Know they're safe.<br />
            <span className="italic" style={{ color: '#16a34a' }}>From anywhere.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto mb-14">
            Whether you're across the street or across the country, Minutes Matter keeps you connected to the people you care for — so you can breathe easier, no matter what's burning.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                ),
                title: 'Alerts Before Orders',
                desc: 'Get notified the moment satellite data detects a fire — before official evacuations are even called.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ),
                title: 'Safe Check-Ins',
                desc: 'Your loved one taps once to confirm they are safe. You see it instantly, wherever you are.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7"/></svg>
                ),
                title: 'Accessible Routes',
                desc: 'Evacuation guidance adapted for elderly or disabled family members, in plain language and 30+ languages.',
              },
            ].map(item => (
              <div key={item.title} className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-gray-100 bg-gray-50 hover:border-green-200 hover:bg-green-50/40 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-700">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-gray-900 text-base">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      {(() => {
        // h=house, t=tree, f=fire, p=person
        const slots = ['h','t','h','h','t','f','h','t','h','h','t','p','t','h','h','t','h']
        return (
          <div className="bg-white flex items-center justify-center gap-2 pt-8 pb-8 overflow-hidden">
            {slots.map((type, i) => {
              const base = "shrink-0 cursor-pointer transition-all duration-200 hover:scale-125 w-7 h-7"
              if (type === 'f') return <Flame key={i} className={`${base} text-orange-500 hover:text-orange-400`} />
              if (type === 'p') return <User key={i} className={`${base} text-green-600 hover:text-green-400`} />
              if (type === 't') return <TreePine key={i} className={`${base} text-green-600 hover:text-green-400`} />
              return <HomeIcon key={i} className={`${base} text-green-800 hover:text-green-500`} />
            })}
          </div>
        )
      })()}

      {/* ── WHO IT'S FOR ── */}
      <section id="who" className="pt-12 pb-28 bg-white">
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


      {/* ── JOIN ── */}
      <section className="relative py-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-forest.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,20,10,0.72)' }} />
        {/* WebGL smoke */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.45, mixBlendMode: 'screen' }}>
          <SmokeBackground smokeColor="#4a7c3f" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="text-green-500 text-xs font-semibold uppercase tracking-widest mb-4">Get Started</div>
          <h2 className="font-display font-bold text-white mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
            Join Minutes Matter
          </h2>
          <p className="text-green-200/60 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Access real-time wildfire intelligence tailored to your role. Free for caregivers and evacuees.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mt-4">
            {/* Caregiver card — featured */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: -16, opacity: 1, scale: 1.03 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, type: 'spring', stiffness: 90, damping: 26, delay: 0.15 }}
              onClick={() => router.push('/auth/login?mode=signup&role=caregiver')}
              className="role-card role-card--green text-left px-7 py-7 w-full sm:w-80 cursor-pointer z-10 relative"
            >
              {/* Featured badge */}
              <div className="absolute top-0 right-0 bg-green-500 py-0.5 px-3 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <Heart className="w-3 h-3 text-white fill-current" />
                <span className="text-white text-xs font-semibold">Free Access</span>
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-1">Caregiver / Evacuee</p>
                <p className="font-display font-bold text-white text-3xl mb-1">Free</p>
                <p className="text-green-200/50 text-xs mb-5">always free for those who need it most</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {[
                    'Real-time wildfire alerts near you',
                    'Evacuation route guidance',
                    'Go-bag & prep checklists',
                    'Flameo AI assistant',
                    '30+ language support',
                    'Accessible for elderly & caregivers',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-green-100/80">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <hr className="border-white/10 mb-5" />
                <button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  Get started free <ArrowRight className="w-4 h-4" />
                </button>
                <p className="mt-3 text-green-200/40 text-xs text-center">No account required to browse alerts</p>
              </div>
            </motion.div>

            {/* Responder card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1, scale: 0.96 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, type: 'spring', stiffness: 90, damping: 26, delay: 0.3 }}
              onClick={() => router.push('/auth/login?mode=signup&role=emergency_responder')}
              className="role-card role-card--white text-left px-7 py-7 w-full sm:w-80 cursor-pointer mt-5 sm:mt-0"
            >
              <div className="relative z-10 flex flex-col h-full">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Emergency Responder</p>
                <p className="font-display font-bold text-white text-3xl mb-1">Org Access</p>
                <p className="text-white/30 text-xs mb-5">invite code required from your organization</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {[
                    'ML-powered signal gap maps',
                    'Incident command dashboard',
                    'Equity-weighted alert tools',
                    'CDC SVI risk overlays',
                    'Resource deployment tracking',
                    'Multi-agency coordination view',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <Check className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <hr className="border-white/10 mb-5" />
                <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm backdrop-blur-sm">
                  Request access <ArrowRight className="w-4 h-4" />
                </button>
                <p className="mt-3 text-white/25 text-xs text-center">Contact your emergency coordinator for an invite</p>
              </div>
            </motion.div>
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
          <p className="text-gray-600 text-xs text-center">WiDS Datathon 2026 · Data: WatchDuty · CDC SVI · NASA FIRMS</p>
          <p className="text-gray-600 text-xs">Not a replacement for official emergency directives.</p>
        </div>
      </footer>

      <HomepageChat />
    </main>
  )
}
