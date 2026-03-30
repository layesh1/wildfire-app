'use client'

import Link from 'next/link'
import { X, Map, Bell, CheckCircle, Settings, AlertTriangle } from 'lucide-react'

export type ProactiveBriefingMode = 'hidden' | 'loading' | 'address' | 'briefing'

type Props = {
  mode: ProactiveBriefingMode
  /** Shown when mode === 'address' */
  addressMessage?: string
  /** AI or template briefing */
  briefingText?: string | null
  hasNearbyFires: boolean
  mapHref: string
  checkinHref: string
  alertsHref: string
  settingsHref: string
  onDismiss: () => void
  /** `panel` = compact card for My alerts column; `banner` = full-width top strip */
  variant?: 'banner' | 'panel'
}

export default function ProactiveBriefing({
  mode,
  addressMessage = 'Add your address in Settings to get personalized fire alerts.',
  briefingText,
  hasNearbyFires,
  mapHref,
  checkinHref,
  alertsHref,
  settingsHref,
  onDismiss,
  variant = 'banner',
}: Props) {
  if (mode === 'hidden') return null

  if (variant === 'panel') {
    return (
      <div
        className="rounded-xl border-2 border-amber-600/70 bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#1a0f0a] text-white shadow-md shrink-0"
        role="region"
        aria-label="Flameo safety briefing"
      >
        <div className="relative p-3 pr-9">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 rounded-md p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss briefing"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-2.5 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flameo1.png"
              alt=""
              width={40}
              height={40}
              className="shrink-0 rounded-lg border border-amber-500/50 bg-black/30 object-contain"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Flameo</span>
                {hasNearbyFires && mode === 'briefing' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Nearby
                  </span>
                )}
              </div>
              {mode === 'loading' && (
                <div className="mt-2 space-y-1.5 animate-pulse" aria-busy="true">
                  <div className="h-2.5 bg-white/20 rounded w-full" />
                  <div className="h-2.5 bg-white/15 rounded w-4/5" />
                  <p className="text-amber-200/80 text-[10px] mt-1">Preparing briefing…</p>
                </div>
              )}
              {mode === 'address' && (
                <p className="mt-1.5 text-xs font-semibold leading-snug text-white/95">{addressMessage}</p>
              )}
              {mode === 'briefing' && briefingText && (
                <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-white/90 whitespace-pre-wrap">
                  {briefingText}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {hasNearbyFires && (
                  <Link
                    href={mapHref}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500"
                  >
                    <Map className="w-3 h-3" />
                    Map
                  </Link>
                )}
                <Link
                  href={checkinHref}
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/25"
                >
                  <CheckCircle className="w-3 h-3" />
                  Check-in
                </Link>
                <Link
                  href={settingsHref}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-amber-100 hover:text-white"
                >
                  <Settings className="w-3 h-3" />
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full shrink-0 border-b-2 border-amber-600/80 bg-gradient-to-r from-[#1a0f0a] via-[#2d1810] to-[#1a0f0a] text-white shadow-lg"
      role="region"
      aria-label="Flameo safety briefing"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 md:px-6">
        <div className="flex gap-4 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flameo1.png"
            alt=""
            width={56}
            height={56}
            className="shrink-0 rounded-xl border-2 border-amber-500/50 bg-black/30 object-contain"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Flameo</span>
              {hasNearbyFires && mode === 'briefing' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-0.5 text-xs font-bold text-white">
                  <AlertTriangle className="w-3 h-3" />
                  Activity nearby
                </span>
              )}
            </div>

            {mode === 'loading' && (
              <div className="mt-3 space-y-2 animate-pulse" aria-busy="true">
                <div className="h-4 bg-white/20 rounded w-full max-w-xl" />
                <div className="h-4 bg-white/15 rounded w-full max-w-lg" />
                <div className="h-4 bg-white/10 rounded w-2/3 max-w-md" />
                <p className="text-amber-200/80 text-sm mt-2">Preparing your safety briefing…</p>
              </div>
            )}

            {mode === 'address' && (
              <p className="mt-2 text-lg md:text-xl font-semibold leading-snug text-white">
                {addressMessage}
              </p>
            )}

            {mode === 'briefing' && briefingText && (
              <p className="mt-2 text-lg md:text-xl font-medium leading-relaxed text-white/95 whitespace-pre-wrap">
                {briefingText}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {hasNearbyFires && (
                <Link
                  href={mapHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors"
                >
                  <Map className="w-4 h-4" />
                  Evacuation map
                </Link>
              )}
              <Link
                href={checkinHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Check-in
              </Link>
              <Link
                href={alertsHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors"
              >
                <Bell className="w-4 h-4" />
                My alerts
              </Link>
              <Link
                href={settingsHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-amber-100 hover:text-white"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss briefing"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
