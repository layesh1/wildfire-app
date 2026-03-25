'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X, ChevronRight, ChevronLeft, Bell, Map, AlertTriangle, Users, Activity, Settings } from 'lucide-react'

const TOUR_KEY = 'wfa_tour_done_v1'

const STEPS = [
  {
    icon: Flame,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.15)',
    title: "Hey there! I'm Flameo.",
    body: "I'm your personal wildfire safety assistant. Let me show you around so you're ready when it matters most.",
    cta: "Let's go",
  },
  {
    icon: Bell,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    title: 'Your Hub is command central.',
    body: 'The center panel shows live fire alerts near you — with evacuation stage, containment status, and what to do right now.',
    cta: 'Next',
  },
  {
    icon: Users,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.12)',
    title: 'My Safety vs. Caring For someone.',
    body: 'Use the switcher at the top of the sidebar to toggle between managing your own safety and monitoring someone in your care.',
    cta: 'Next',
  },
  {
    icon: AlertTriangle,
    iconColor: '#d97706',
    iconBg: 'rgba(217,119,6,0.12)',
    title: 'Early Fire Alert.',
    body: "99.7% of fires never get a formal evacuation order. Early Fire Alert tracks nearby fires before officials act — so you're never caught off guard.",
    cta: 'Next',
  },
  {
    icon: Map,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    title: 'Evacuation Map.',
    body: 'See active fires, evacuation zones, and nearby shelters on a live map. Your location and your person\'s location are both shown.',
    cta: 'Next',
  },
  {
    icon: Activity,
    iconColor: '#c86432',
    iconBg: 'rgba(200,100,50,0.12)',
    title: 'Ask me anything.',
    body: "Tap the Flameo button (bottom right) any time you need help — evacuation routes, shelter info, what to pack, or what's happening near you.",
    cta: 'Next',
  },
  {
    icon: Settings,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    title: "One last thing — set up your profile.",
    body: 'Head to Settings to add your emergency contacts, medical needs, home address, and cognitive care notes. Your Emergency Card lives there too.',
    cta: "Got it, let's go!",
  },
]

export default function DashboardTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!mounted) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              {/* Flameo branding bar */}
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
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="px-6 pt-6 pb-5"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: current.iconBg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: current.iconColor }} />
                  </div>
                  <h2 className="font-display font-bold text-gray-900 text-xl mb-2 leading-snug">{current.title}</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">{current.body}</p>
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="px-6 pb-5 flex items-center justify-between">
                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === step ? 18 : 6,
                        height: 6,
                        background: i === step ? '#c86432' : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>

                {/* Nav buttons */}
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button
                      onClick={back}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
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
