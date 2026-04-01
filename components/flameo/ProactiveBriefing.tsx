'use client'

import Link from 'next/link'
import { X, Map, Bell, CheckCircle, Settings, AlertTriangle } from 'lucide-react'
import { FlameoFormattedText } from '@/components/flameo/FlameoFormattedText'

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
        className="rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/90 text-slate-900 shadow-md shrink-0"
        role="region"
        aria-label="Flameo safety briefing"
      >
        <div className="relative p-3 pr-9">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 rounded-md p-1 text-slate-500 hover:text-slate-800 hover:bg-amber-100/80 transition-colors"
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
              className="shrink-0 rounded-lg border border-amber-200 bg-white object-contain shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-amber-800 text-[10px] font-bold uppercase tracking-widest">Flameo</span>
                {hasNearbyFires && mode === 'briefing' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-800 border border-red-200">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Nearby
                  </span>
                )}
              </div>
              {mode === 'loading' && (
                <div className="mt-2 space-y-1.5 animate-pulse" aria-busy="true">
                  <div className="h-2.5 bg-amber-100 rounded w-full" />
                  <div className="h-2.5 bg-amber-50 rounded w-4/5" />
                  <p className="text-amber-800/80 text-[10px] mt-1">Preparing briefing…</p>
                </div>
              )}
              {mode === 'address' && (
                <p className="mt-1.5 text-xs font-semibold leading-snug text-slate-800">{addressMessage}</p>
              )}
              {mode === 'briefing' && briefingText && (
                <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                  <FlameoFormattedText text={briefingText} />
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {hasNearbyFires && (
                  <Link
                    href={mapHref}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500 shadow-sm"
                  >
                    <Map className="w-3 h-3" />
                    Map
                  </Link>
                )}
                <Link
                  href={checkinHref}
                  className="inline-flex items-center gap-1 rounded-md border-2 border-amber-500 bg-white px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-50 shadow-sm"
                >
                  <CheckCircle className="w-3 h-3" />
                  Check-in
                </Link>
                <Link
                  href={settingsHref}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-amber-50"
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
      className="w-full shrink-0 border-b-2 border-amber-300/90 bg-gradient-to-r from-white via-orange-50/90 to-amber-50 text-slate-900 shadow-lg"
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
            className="shrink-0 rounded-xl border-2 border-amber-200 bg-white object-contain shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-800 text-xs font-bold uppercase tracking-widest">Flameo</span>
              {hasNearbyFires && mode === 'briefing' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-800">
                  <AlertTriangle className="w-3 h-3" />
                  Activity nearby
                </span>
              )}
            </div>

            {mode === 'loading' && (
              <div className="mt-3 space-y-2 animate-pulse" aria-busy="true">
                <div className="h-4 bg-amber-100 rounded w-full max-w-xl" />
                <div className="h-4 bg-amber-50 rounded w-full max-w-lg" />
                <div className="h-4 bg-orange-50 rounded w-2/3 max-w-md" />
                <p className="text-amber-900/70 text-sm mt-2">Preparing your safety briefing…</p>
              </div>
            )}

            {mode === 'address' && (
              <p className="mt-2 text-lg md:text-xl font-semibold leading-snug text-slate-900">
                {addressMessage}
              </p>
            )}

            {mode === 'briefing' && briefingText && (
              <p className="mt-2 text-lg md:text-xl font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                <FlameoFormattedText text={briefingText} />
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {hasNearbyFires && (
                <Link
                  href={mapHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors shadow-sm"
                >
                  <Map className="w-4 h-4" />
                  Evacuation map
                </Link>
              )}
              <Link
                href={checkinHref}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50 transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Check-in
              </Link>
              <Link
                href={alertsHref}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-amber-50 transition-colors"
              >
                <Bell className="w-4 h-4" />
                My alerts
              </Link>
              <Link
                href={settingsHref}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-slate-800 hover:bg-amber-100/80 transition-colors"
            aria-label="Dismiss briefing"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
