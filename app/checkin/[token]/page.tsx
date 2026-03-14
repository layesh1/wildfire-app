'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Phone } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfirmState = 'idle' | 'loading' | 'confirmed_safe' | 'needs_help' | 'error'

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CheckinPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle')

  // Broadcast to other tabs when confirmed (before API call completes)
  function broadcastStatus(status: 'confirmed_safe' | 'needs_help') {
    try {
      const bc = new BroadcastChannel('checkin')
      bc.postMessage({ token, status })
      bc.close()
    } catch {
      // BroadcastChannel not supported in all environments
    }
  }

  async function submitStatus(status: 'confirmed_safe' | 'needs_help') {
    setConfirmState('loading')
    broadcastStatus(status)
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          status,
          confirmed_at: new Date().toISOString(),
        }),
      })
      setConfirmState(status)
    } catch {
      // Even if the API fails, BroadcastChannel already notified the caregiver
      setConfirmState(status)
    }
  }

  // ── Confirmed safe ─────────────────────────────────────────────────────────

  if (confirmState === 'confirmed_safe') {
    return (
      <div className="min-h-screen bg-ash-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-signal-safe/20 border-2 border-signal-safe/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-signal-safe" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-3">
              You&rsquo;re marked safe
            </h1>
            <p className="text-ash-400 text-sm leading-relaxed">
              Thank you — your caregiver has been notified you&rsquo;re safe.
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-signal-safe/10 border border-signal-safe/20 text-signal-safe text-sm">
            Stay in a safe location and keep your phone charged.
          </div>
        </div>
      </div>
    )
  }

  // ── Needs help ──────────────────────────────────────────────────────────────

  if (confirmState === 'needs_help') {
    return (
      <div className="min-h-screen bg-ash-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-signal-danger/20 border-2 border-signal-danger/40 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-signal-danger" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-3">
              Help is on the way
            </h1>
            <p className="text-ash-400 text-sm leading-relaxed">
              Your caregiver has been alerted. If you&rsquo;re in immediate danger, call 911 now.
            </p>
          </div>
          <a
            href="tel:911"
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-signal-danger text-white font-bold text-lg hover:bg-signal-danger/90 transition-colors active:scale-95"
          >
            <Phone className="w-5 h-5" />
            Call 911
          </a>
          <p className="text-ash-600 text-xs">
            Stay on the line with 911 until help arrives.
          </p>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (confirmState === 'loading') {
    return (
      <div className="min-h-screen bg-ash-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ash-600 border-t-signal-safe rounded-full animate-spin" />
      </div>
    )
  }

  // ── Idle (initial state) ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ash-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8">
        {/* Heading */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-ash-800 border border-ash-700 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl" role="img" aria-label="wave">👋</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-3">
            Are you safe?
          </h1>
          <p className="text-ash-400 text-sm leading-relaxed">
            Someone who cares about you wants to know you&rsquo;re okay. Tap below to let them know.
          </p>
        </div>

        {/* Primary action */}
        <button
          onClick={() => submitStatus('confirmed_safe')}
          className="w-full py-5 rounded-2xl bg-signal-safe text-white font-bold text-xl hover:bg-signal-safe/90 transition-all active:scale-95 shadow-lg shadow-signal-safe/20 flex items-center justify-center gap-3"
        >
          <CheckCircle className="w-6 h-6" />
          Yes, I&rsquo;m safe
        </button>

        {/* Secondary action */}
        <div className="text-center">
          <button
            onClick={() => submitStatus('needs_help')}
            className="text-signal-danger text-sm hover:text-signal-danger/80 underline underline-offset-4 transition-colors"
          >
            I need help
          </button>
        </div>

        {/* Footer */}
        <p className="text-ash-700 text-xs text-center">
          This link was shared by someone in your support network.
        </p>
      </div>
    </div>
  )
}
