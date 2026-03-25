'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X, ChevronRight, ChevronLeft, Bell, AlertTriangle, Users, Activity, Settings } from 'lucide-react'

const TOUR_KEY = 'wfa_tour_done_v1'
const CARD_W = 300
const CARD_H = 230

interface Step {
  targetId: string | null
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  body: string
  cta: string
}

const STEPS: Step[] = [
  {
    targetId: null,
    icon: Flame,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.15)',
    title: "Hey there! I'm Flameo.",
    body: "I'm your personal wildfire safety assistant. Let me show you around so you're ready when it matters most.",
    cta: "Let's go",
  },
  {
    targetId: 'hub-panel',
    icon: Bell,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    title: 'Your Hub is command central.',
    body: 'This panel shows live fire alerts near you — with evacuation stage, containment %, and what to do right now.',
    cta: 'Next',
  },
  {
    targetId: 'role-switcher',
    icon: Users,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.12)',
    title: 'My Safety vs. Caring For someone.',
    body: 'Toggle between managing your own safety and monitoring someone in your care.',
    cta: 'Next',
  },
  {
    targetId: 'quick-actions',
    icon: AlertTriangle,
    iconColor: '#d97706',
    iconBg: 'rgba(217,119,6,0.12)',
    title: 'Quick Actions.',
    body: 'Jump to Evacuation Map, Check In Safe, Find Shelter, or Fire Alert from these cards.',
    cta: 'Next',
  },
  {
    targetId: 'flameo-fab',
    icon: Activity,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.12)',
    title: 'Ask me anything.',
    body: "Tap this button any time — evacuation routes, shelter info, what to pack, or what's happening near you.",
    cta: 'Next',
  },
  {
    targetId: 'nav-settings',
    icon: Settings,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    title: "One last thing — set up your profile.",
    body: 'Add emergency contacts, medical needs, home address, and your Emergency Card in Settings.',
    cta: "Got it, let's go!",
  },
]

interface CardPos {
  top: number
  left: number
  arrowDir: 'up' | 'down' | 'left' | 'right'
  arrowOffset: number
  spotlightRect: DOMRect
}

function computePos(rect: DOMRect): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 16
  const pad = 12

  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  function clampH(left: number) {
    return Math.max(pad, Math.min(left, vw - CARD_W - pad))
  }
  function clampV(top: number) {
    return Math.max(pad, Math.min(top, vh - CARD_H - pad))
  }

  // Below
  if (rect.bottom + gap + CARD_H < vh - pad) {
    const left = clampH(cx - CARD_W / 2)
    return { top: rect.bottom + gap, left, arrowDir: 'up', arrowOffset: Math.max(20, Math.min(cx - left, CARD_W - 20)), spotlightRect: rect }
  }
  // Above
  if (rect.top - gap - CARD_H > pad) {
    const left = clampH(cx - CARD_W / 2)
    return { top: rect.top - gap - CARD_H, left, arrowDir: 'down', arrowOffset: Math.max(20, Math.min(cx - left, CARD_W - 20)), spotlightRect: rect }
  }
  // Right
  if (rect.right + gap + CARD_W < vw - pad) {
    const top = clampV(cy - CARD_H / 2)
    return { top, left: rect.right + gap, arrowDir: 'left', arrowOffset: Math.max(20, Math.min(cy - top, CARD_H - 20)), spotlightRect: rect }
  }
  // Left
  if (rect.left - gap - CARD_W > pad) {
    const top = clampV(cy - CARD_H / 2)
    return { top, left: rect.left - gap - CARD_W, arrowDir: 'right', arrowOffset: Math.max(20, Math.min(cy - top, CARD_H - 20)), spotlightRect: rect }
  }
  // Fallback: below clamped
  const left = clampH(cx - CARD_W / 2)
  return { top: clampV(rect.bottom + gap), left, arrowDir: 'up', arrowOffset: CARD_W / 2, spotlightRect: rect }
}

export default function DashboardTour() {
  const [stepIdx, setStepIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cardPos, setCardPos] = useState<CardPos | null>(null)

  useEffect(() => {
    setMounted(true)
    if (!localStorage.getItem(TOUR_KEY)) setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible || !mounted) return
    const step = STEPS[stepIdx]
    if (!step.targetId) { setCardPos(null); return }
    const el = document.querySelector(`[data-tour="${step.targetId}"]`)
    if (!el) { setCardPos(null); return }
    setCardPos(computePos(el.getBoundingClientRect()))
  }, [stepIdx, visible, mounted])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx(s => s + 1)
    else dismiss()
  }

  function back() {
    if (stepIdx > 0) setStepIdx(s => s - 1)
  }

  if (!mounted) return null

  const current = STEPS[stepIdx]
  const Icon = current.icon
  const isLast = stepIdx === STEPS.length - 1
  const isCentered = !cardPos

  const arrowStyle = (pos: CardPos): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0, zIndex: 1 }
    switch (pos.arrowDir) {
      case 'up':    return { ...base, top: -7, left: pos.arrowOffset - 7, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '7px solid white' }
      case 'down':  return { ...base, bottom: -7, left: pos.arrowOffset - 7, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid white' }
      case 'left':  return { ...base, left: -7, top: pos.arrowOffset - 7, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '7px solid white' }
      case 'right': return { ...base, right: -7, top: pos.arrowOffset - 7, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '7px solid white' }
    }
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Spotlight: box-shadow cutout around the target element */}
          {cardPos ? (
            <div
              key="spotlight"
              style={{
                position: 'fixed',
                zIndex: 9998,
                top: cardPos.spotlightRect.top - 6,
                left: cardPos.spotlightRect.left - 6,
                width: cardPos.spotlightRect.width + 12,
                height: cardPos.spotlightRect.height + 12,
                borderRadius: 10,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                outline: '2px solid rgba(200,100,50,0.6)',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
              style={{ zIndex: 9998 }}
              onClick={dismiss}
            />
          )}

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={
              isCentered
                ? { position: 'fixed', zIndex: 9999, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: CARD_W }
                : { position: 'fixed', zIndex: 9999, top: cardPos!.top, left: cardPos!.left, width: CARD_W }
            }
          >
            {/* Arrow pointing at target */}
            {cardPos && <div style={arrowStyle(cardPos)} />}

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              {/* Tour header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100" style={{ background: 'rgba(200,100,50,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,100,50,0.15)' }}>
                    <Flame className="w-3.5 h-3.5" style={{ color: '#c86432' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flameo · Quick Tour</span>
                </div>
                <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIdx}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.14 }}
                  className="px-5 pt-5 pb-4"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: current.iconBg }}>
                    <Icon className="w-5 h-5" style={{ color: current.iconColor }} />
                  </div>
                  <h2 className="font-display font-bold text-gray-900 text-lg mb-1.5 leading-snug">{current.title}</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">{current.body}</p>
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStepIdx(i)}
                      className="rounded-full transition-all"
                      style={{ width: i === stepIdx ? 16 : 5, height: 5, background: i === stepIdx ? '#c86432' : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {stepIdx > 0 && (
                    <button onClick={back} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: isLast ? '#16a34a' : 'linear-gradient(135deg, #c86432, #7a2e0e)' }}
                  >
                    {current.cta}
                    {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
