'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Flame, AlertTriangle, MessageCircle, MapPin } from 'lucide-react'
import type { HouseholdPin } from '@/lib/responder-household'
import type { FlameoContext } from '@/lib/flameo-context-types'
import type { FlameoCommandContext, PriorityAssignment } from '@/lib/flameo-command-types'
import { assembleFlameoCommandContext } from '@/lib/flameo-command'

type Props = {
  householdPins: HouseholdPin[]
  mapCenter: [number, number]
  fireContext: FlameoContext | null
  demoMode: boolean
  briefingRefreshKey: number
  onViewOnMap: (lat: number, lng: number) => void
}

const DEFAULT_FIRE: FlameoCommandContext['fire_context'] = {
  nearest_fire_miles: null,
  wind_dir: null,
  wind_mph: null,
  fire_risk: 'Unknown',
}

function actionBadgeClass(action: PriorityAssignment['action_required']): string {
  switch (action) {
    case 'EMS':
      return 'bg-red-950/80 text-red-200 border-red-700/60'
    case 'TRANSPORT':
      return 'bg-orange-950/70 text-orange-200 border-orange-700/50'
    case 'CHECK':
      return 'bg-yellow-950/60 text-yellow-100 border-yellow-700/50'
    case 'CLEAR':
    default:
      return 'bg-emerald-950/70 text-emerald-200 border-emerald-700/50'
  }
}

function relMinutesAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (!Number.isFinite(m) || m < 0) return 'recently'
  if (m === 0) return 'just now'
  if (m === 1) return '1 min ago'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h === 1 ? '1 hr ago' : `${h} hr ago`
}

function recentEvacuationRows(pins: HouseholdPin[], limit: number) {
  type Row = { name: string; address: string; at: string }
  const rows: Row[] = []
  for (const h of pins) {
    for (const m of h.members) {
      if (m.home_evacuation_status !== 'evacuated') continue
      const at = m.home_status_updated_at
      if (!at) continue
      rows.push({ name: m.name, address: h.address, at })
    }
  }
  rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return rows.slice(0, limit)
}

function completionBarColor(rate: number): string {
  if (rate < 50) return 'bg-signal-danger'
  if (rate <= 80) return 'bg-signal-warn'
  return 'bg-signal-safe'
}

function openFlameoChat() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('wfa-flameo-open'))
}

export default function FlameoCommandRoom({
  householdPins,
  mapCenter,
  fireContext: _fireContext,
  demoMode,
  briefingRefreshKey,
  onViewOnMap,
}: Props) {
  const [firePart, setFirePart] = useState(DEFAULT_FIRE)
  const [briefing, setBriefing] = useState('')
  const [briefingFallback, setBriefingFallback] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingAt, setBriefingAt] = useState<Date | null>(null)
  const [briefingManualTick, setBriefingManualTick] = useState(0)

  const commandContext: FlameoCommandContext = useMemo(
    () =>
      assembleFlameoCommandContext(householdPins, {
        nearest_fire_miles: firePart.nearest_fire_miles,
        wind_dir: firePart.wind_dir,
        wind_mph: firePart.wind_mph,
        fire_risk: firePart.fire_risk,
      }),
    [householdPins, firePart]
  )

  const loadFireFromApi = useCallback(async () => {
    const [lat, lng] = mapCenter
    const q = `lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    try {
      const res = await fetch(`/api/flameo/command-context?${q}`)
      if (!res.ok) return
      const j = (await res.json()) as FlameoCommandContext
      if (j.fire_context) setFirePart(j.fire_context)
    } catch {
      /* ignore */
    }
  }, [mapCenter])

  useEffect(() => {
    void loadFireFromApi()
  }, [loadFireFromApi, briefingRefreshKey])

  useEffect(() => {
    const id = window.setInterval(() => void loadFireFromApi(), 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [loadFireFromApi])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setBriefingLoading(true)
      try {
        const res = await fetch('/api/flameo/command-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandContext }),
        })
        const j = (await res.json()) as { briefing?: string; fallback?: boolean }
        if (!cancelled && res.ok) {
          setBriefing(typeof j.briefing === 'string' ? j.briefing : '')
          setBriefingFallback(!!j.fallback)
          setBriefingAt(new Date())
        }
      } catch {
        if (!cancelled) setBriefing('')
      } finally {
        if (!cancelled) setBriefingLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [briefingRefreshKey, briefingManualTick, commandContext])

  const s = commandContext.incident_summary
  const topFive = commandContext.priority_assignments.slice(0, 5)
  const recentDone = recentEvacuationRows(householdPins, 5)

  return (
    <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-ash-800 bg-ash-900 text-left">
      {/* Section 1 — Incident overview */}
      <div className="px-4 py-3 border-b border-ash-800">
        <div className="flex items-center gap-2 text-signal-danger text-[10px] font-bold uppercase tracking-widest mb-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Incident status
        </div>
        <div className="text-white text-sm font-semibold">
          {s.total_households} households in zone
        </div>
        <div className="text-ash-400 text-xs mt-1">
          {s.completion_rate}% evacuated ({s.evacuated} of {s.total_people} people)
        </div>
        <div className="mt-2 h-2 rounded-full bg-ash-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completionBarColor(s.completion_rate)}`}
            style={{ width: `${Math.min(100, Math.max(0, s.completion_rate))}%` }}
          />
        </div>
        {demoMode && (
          <p className="text-amber-400/90 text-[10px] mt-2 font-medium">Demo households — live opt-ins will replace when available.</p>
        )}
      </div>

      {/* Section 2 — Briefing */}
      <div className="px-4 py-3 border-b border-ash-800">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-ember-400 text-[10px] font-bold uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 shrink-0" />
            Flameo command
          </div>
          <button
            type="button"
            onClick={() => setBriefingManualTick(t => t + 1)}
            disabled={briefingLoading}
            className="inline-flex items-center gap-1 rounded-md border border-ash-700 px-2 py-1 text-[10px] font-semibold text-ash-300 hover:text-white hover:border-ash-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${briefingLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {briefingLoading ? (
          <div className="space-y-2" aria-busy="true">
            <div className="h-3 w-[92%] max-w-[280px] animate-pulse rounded bg-ash-800" />
            <div className="h-3 w-full max-w-[300px] animate-pulse rounded bg-ash-800" />
            <div className="h-3 w-4/5 max-w-[240px] animate-pulse rounded bg-ash-800" />
          </div>
        ) : (
          <div className="text-ash-200 text-xs leading-relaxed whitespace-pre-wrap">{briefing}</div>
        )}
        {briefingFallback && !briefingLoading && (
          <p className="text-ash-500 text-[10px] mt-2">Template / offline briefing (model unavailable).</p>
        )}
        {briefingAt && !briefingLoading && (
          <p className="text-ash-600 text-[10px] mt-2">
            Last updated {briefingAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Section 3 — Priority assignments */}
      <div className="px-4 py-3 border-b border-ash-800">
        <div className="text-ash-500 text-[10px] font-bold uppercase tracking-wider mb-2">Priority assignments</div>
        {topFive.length === 0 ? (
          <p className="text-ash-500 text-xs">No CRITICAL / HIGH households in queue.</p>
        ) : (
          <ul className="space-y-3">
            {topFive.map(a => (
              <li key={`${a.rank}-${a.address}`} className="rounded-lg border border-ash-800 bg-ash-800/30 p-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-white text-xs font-bold min-w-0">
                    {a.rank}. {a.address}
                  </div>
                  <span
                    className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${actionBadgeClass(a.action_required)}`}
                  >
                    {a.action_required}
                  </span>
                </div>
                <div className="text-ash-400 text-[10px] mt-1">
                  {a.people_count} people · {a.cannot_evacuate_count} need help
                </div>
                {(a.mobility_flags.length > 0 || a.medical_flags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {a.mobility_flags.map(t => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-ash-800 text-ash-200 border border-ash-700"
                      >
                        {t}
                      </span>
                    ))}
                    {a.medical_flags.map(t => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-200 border border-blue-900/50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-ash-300 text-[10px] mt-2 leading-snug">&quot;{a.reason}&quot;</p>
                <button
                  type="button"
                  onClick={() => onViewOnMap(a.lat, a.lng)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-signal-info hover:text-white"
                >
                  <MapPin className="w-3 h-3" />
                  View on Map →
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 4 — Zone progress / recent */}
      <div className="px-4 py-3 border-b border-ash-800">
        <div className="text-ash-500 text-[10px] font-bold uppercase tracking-wider mb-2">Zone progress</div>
        <p className="text-ash-500 text-[10px] mb-2">Recently marked evacuated (by check-in time)</p>
        {recentDone.length === 0 ? (
          <p className="text-ash-600 text-xs">No recent evacuated timestamps in view.</p>
        ) : (
          <ul className="space-y-2">
            {recentDone.map((r, i) => (
              <li key={`${r.name}-${r.at}-${i}`} className="text-[11px] text-ash-300 leading-snug">
                <span className="text-white font-medium">{r.name}</span>
                <span className="text-ash-500"> — </span>
                <span className="text-ash-400">{r.address}</span>
                <span className="text-signal-safe"> — Evacuated ✓</span>
                <span className="text-ash-600"> — {relMinutesAgo(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 5 — Ask */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={openFlameoChat}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-ember-500/40 bg-ember-500/10 py-2.5 text-sm font-semibold text-ember-200 hover:bg-ember-500/20 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Ask Flameo anything →
        </button>
        <p className="text-ash-600 text-[9px] mt-2 text-center">
          Opens Flameo chat (responder mode) from the hub.
        </p>
      </div>
    </div>
  )
}
