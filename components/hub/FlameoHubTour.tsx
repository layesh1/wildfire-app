'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_KEY = 'flameo_tour_seen'

type Step = {
  title: string
  body: string
  target: string
}

const STEPS: Step[] = [
  {
    title: 'My Hub',
    body: 'This is your hub. Your personal fire situation room — updated automatically.',
    target: '[data-hub-tour="map"]',
  },
  {
    title: 'My Alerts (Situation Room)',
    body: 'Flameo monitors fires near your home and work addresses and alerts you here automatically.',
    target: '[data-hub-tour="alerts"]',
  },
  {
    title: 'My People',
    body: "Add family or anyone you're watching out for. You'll see their safety status here.",
    target: '[data-hub-tour="people"]',
  },
  {
    title: 'Check In',
    body: "Update your evacuation status so your family and responders know you're safe.",
    target: '[data-hub-tour="checkin"]',
  },
  {
    title: 'Ask Flameo',
    body: 'Ask Flameo anything about the fire, evacuation routes, or what to do next.',
    target: '[data-hub-tour="flameo-ai"]',
  },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function FlameoHubTour({ active }: { active: boolean }) {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [cardPos, setCardPos] = useState<{ left: number; top: number }>({ left: 16, top: 80 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === 'true') return
    } catch {
      /* ignore */
    }
    setRunning(true)
  }, [active])

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* ignore */
    }
    setRunning(false)
  }, [])

  const updateLayout = useCallback(() => {
    if (!running) return
    const sel = STEPS[step].target
    const el = document.querySelector(sel) as HTMLElement | null
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardW = Math.min(340, vw - 32)
    const cardH = 200

    if (el && el.offsetParent !== null) {
      const r = el.getBoundingClientRect()
      setBox({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })
      let left = clamp(r.left, 16, vw - cardW - 16)
      let top = r.bottom + 12
      if (top + cardH > vh - 16) {
        top = clamp(r.top - cardH - 12, 16, vh - cardH - 16)
      }
      if (top < 16) top = 16
      setCardPos({ left, top })
    } else {
      setBox(null)
      setCardPos({ left: (vw - cardW) / 2, top: clamp(vh * 0.22, 16, vh - cardH - 16) })
    }
  }, [running, step])

  useLayoutEffect(() => {
    updateLayout()
    const t = window.setTimeout(updateLayout, 320)
    return () => window.clearTimeout(t)
  }, [updateLayout])

  useEffect(() => {
    if (!running) return
    window.addEventListener('resize', updateLayout)
    const ro = () => updateLayout()
    window.addEventListener('scroll', ro, true)
    return () => {
      window.removeEventListener('resize', updateLayout)
      window.removeEventListener('scroll', ro, true)
    }
  }, [running, updateLayout])

  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finish()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const list = [...focusables].filter(n => !n.hasAttribute('disabled'))
        if (list.length === 0) return
        const i = list.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey) {
          if (i <= 0) {
            e.preventDefault()
            list[list.length - 1]?.focus()
          }
        } else if (i === list.length - 1 || i === -1) {
          e.preventDefault()
          list[0]?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, finish])

  useEffect(() => {
    if (!running) return
    const id = window.requestAnimationFrame(() => nextBtnRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [running, step])

  const onNext = () => {
    if (step >= STEPS.length - 1) finish()
    else setStep(s => s + 1)
  }

  if (!running || typeof document === 'undefined') return null

  const s = STEPS[step]
  const last = step === STEPS.length - 1

  const overlayMask =
    box && box.width > 0 && box.height > 0
      ? {
          background: `radial-gradient(ellipse ${Math.max(box.width * 1.15, 120)}px ${Math.max(box.height * 1.15, 100)}px at ${box.left + box.width / 2}px ${box.top + box.height / 2}px, transparent 0%, transparent 52%, rgba(15, 23, 42, 0.62) 100%)`,
        }
      : { background: 'rgba(15, 23, 42, 0.55)' }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[10050] pointer-events-auto" style={overlayMask} aria-hidden onClick={finish} />
      {box && box.width > 0 && box.height > 0 && (
        <div
          className="fixed z-[10051] pointer-events-none rounded-xl border-2 border-amber-400/95 shadow-[0_0_0_3px_rgba(251,191,36,0.25)] transition-all duration-200"
          style={{
            left: box.left - 3,
            top: box.top - 3,
            width: box.width + 6,
            height: box.height + 6,
          }}
          aria-hidden
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flameo-tour-title"
        aria-describedby="flameo-tour-body"
        className="fixed z-[10052] w-[min(92vw,340px)] rounded-xl border border-amber-200/90 bg-white p-4 shadow-2xl outline-none ring-2 ring-amber-400/30"
        style={{ left: cardPos.left, top: cardPos.top }}
        onClick={e => e.stopPropagation()}
      >
        <div id="flameo-tour-title" className="font-display text-base font-bold text-slate-900">
          {s.title}
        </div>
        <p id="flameo-tour-body" className="mt-2 text-sm leading-snug text-slate-600">
          {s.body}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            ref={nextBtnRef}
            type="button"
            onClick={onNext}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {last ? "Got it — let's go" : 'Next'}
          </button>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            Skip tour
          </button>
        </div>
        <div className="mt-2 text-[11px] text-slate-400" aria-live="polite">
          Step {step + 1} of {STEPS.length} · Esc to dismiss
        </div>
      </div>
    </>,
    document.body
  )
}
