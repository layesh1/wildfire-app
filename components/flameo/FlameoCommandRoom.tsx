'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, AlertTriangle, MapPin, Copy, Users } from 'lucide-react'
import type { HouseholdPin } from '@/lib/responder-household'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import type { FirefighterPin } from '@/lib/firefighter-pin'
import type { FlameoContext } from '@/lib/flameo-context-types'
import type { FlameoCommandContext, PriorityAssignment } from '@/lib/flameo-command-types'
import {
  assembleFlameoCommandContext,
  filterHouseholdsForIncidentBriefing,
  splitFlameoCommandBriefing,
} from '@/lib/flameo-command'

type Props = {
  householdPins: HouseholdPin[]
  firefighterPins?: FirefighterPin[]
  /** Station roster size (includes members not yet reporting GPS). */
  rosterFieldUnitTotal?: number
  mapCenter: [number, number]
  /** NIFC points shown on the hub map (same radius filter). Briefing only includes households near these fires + map center. */
  nifcFiresInZone?: NifcFire[]
  /** Miles from map center for operational zone (default 50). */
  zoneMiles?: number
  fireContext: FlameoContext | null
  briefingRefreshKey: number
  onViewOnMap: (lat: number, lng: number) => void
  /** Station / base address for Google Maps driving directions to priority sites. */
  directionsOrigin?: string | null
}

const DEFAULT_FIRE: FlameoCommandContext['fire_context'] = {
  nearest_fire_miles: null,
  wind_dir: null,
  wind_mph: null,
  fire_risk: 'Unknown',
}

const panel =
  'rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800'
const sectionHead =
  'text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'

/** Matches Flameo Situation Room hero; readable in light and dark. */
const flameoActivePanel =
  'rounded-xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-amber-100/80 to-orange-50 p-3 shadow-md text-amber-950 dark:border-amber-900/35 dark:from-amber-950 dark:via-amber-900 dark:to-amber-950 dark:text-amber-50'
const flameoActiveHead =
  'text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200/95'

function actionBadgeClass(action: PriorityAssignment['action_required']): string {
  switch (action) {
    case 'EMS':
      return 'border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-200'
    case 'TRANSPORT':
      return 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-200'
    case 'CHECK':
      return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100'
    case 'CLEAR':
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200'
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

function completionBarTone(rate: number): string {
  if (rate < 50) return 'bg-red-500 dark:bg-red-600'
  if (rate <= 80) return 'bg-amber-500 dark:bg-amber-600'
  return 'bg-emerald-500 dark:bg-emerald-600'
}

type StationRosterSnippet = {
  station: {
    id: string
    station_name: string
    is_commander: boolean
  } | null
  active_invite: {
    code: string
    expires_at: string | null
  } | null
}

function expiresInLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry set'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return 'Unknown'
  if (ms <= 0) return 'Expired'
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (d <= 1) return 'Expires in 1 day'
  return `Expires in ${d} days`
}

function openFlameoChat() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('wfa-flameo-open'))
}

const DEFAULT_ZONE_MI = 50
const FIRE_PROXIMITY_AT_RISK_MI = 42

export default function FlameoCommandRoom({
  householdPins,
  firefighterPins = [],
  rosterFieldUnitTotal = 0,
  mapCenter,
  nifcFiresInZone = [],
  zoneMiles = DEFAULT_ZONE_MI,
  fireContext: _fireContext,
  briefingRefreshKey,
  onViewOnMap,
  directionsOrigin = null,
}: Props) {
  const [firePart, setFirePart] = useState(DEFAULT_FIRE)
  const [briefing, setBriefing] = useState('')
  const [briefingFallback, setBriefingFallback] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(true)
  const [briefingAt, setBriefingAt] = useState<Date | null>(null)
  const [briefingManualTick, setBriefingManualTick] = useState(0)

  const [roster, setRoster] = useState<StationRosterSnippet | null>(null)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [copyOk, setCopyOk] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [briefingTab, setBriefingTab] = useState<'situation' | 'priorities'>('situation')

  const householdPinsForBriefing = useMemo(
    () =>
      filterHouseholdsForIncidentBriefing(
        householdPins,
        mapCenter,
        zoneMiles,
        nifcFiresInZone,
        FIRE_PROXIMITY_AT_RISK_MI
      ),
    [householdPins, mapCenter, zoneMiles, nifcFiresInZone]
  )

  const commandContext: FlameoCommandContext = useMemo(
    () =>
      assembleFlameoCommandContext(
        householdPinsForBriefing,
        {
          nearest_fire_miles: firePart.nearest_fire_miles,
          wind_dir: firePart.wind_dir,
          wind_mph: firePart.wind_mph,
          fire_risk: firePart.fire_risk,
        },
        firefighterPins,
        rosterFieldUnitTotal
      ),
    [householdPinsForBriefing, firePart, firefighterPins, rosterFieldUnitTotal]
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

  const loadStationRoster = useCallback(async () => {
    setRosterError(null)
    try {
      const res = await fetch('/api/station/roster')
      const j = (await res.json().catch(() => ({}))) as StationRosterSnippet & { error?: string; code?: string }
      if (!res.ok) {
        setRoster(null)
        setRosterError(
          typeof j.error === 'string'
            ? j.error
            : 'Could not load station.'
        )
        return
      }
      setRoster(j as StationRosterSnippet)
    } catch {
      setRoster(null)
      setRosterError('Could not load station.')
    } finally {
      setRosterLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStationRoster()
  }, [loadStationRoster])

  useEffect(() => {
    const onRefresh = () => void loadStationRoster()
    window.addEventListener('wfa-responder-station-refresh', onRefresh)
    return () => window.removeEventListener('wfa-responder-station-refresh', onRefresh)
  }, [loadStationRoster])

  const regenerateInvite = async () => {
    setRegenBusy(true)
    setRosterError(null)
    try {
      const res = await fetch('/api/station/invite/regenerate', { method: 'POST' })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setRosterError(typeof j.error === 'string' ? j.error : 'Could not issue code')
        return
      }
      await loadStationRoster()
      window.dispatchEvent(new Event('wfa-responder-station-refresh'))
    } catch {
      setRosterError('Could not issue code')
    } finally {
      setRegenBusy(false)
    }
  }

  const copyInviteCode = async () => {
    const code = roster?.active_invite?.code
    if (!code || typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(code)
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2000)
    } catch {
      setRosterError('Could not copy to clipboard')
    }
  }

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

  useEffect(() => {
    setBriefingTab('situation')
  }, [briefing])

  const { overview: briefingOverview, priorities: briefingPriorities } = useMemo(
    () => splitFlameoCommandBriefing(briefing),
    [briefing]
  )
  const showBriefingTabs = briefingPriorities.length > 0

  const s = commandContext.incident_summary
  const fc = commandContext.fire_context
  const topFive = commandContext.priority_assignments.slice(0, 5)
  const recentDone = recentEvacuationRows(householdPinsForBriefing, 5)

  const showCommandAlert =
    householdPinsForBriefing.length > 0 || fc.nearest_fire_miles != null || s.needs_help > 0
  const weatherBits = [
    fc.wind_mph != null && fc.wind_mph > 0 ? `${fc.wind_mph} mph` : null,
    fc.wind_dir?.trim() ? `from the ${fc.wind_dir}` : null,
    fc.fire_risk && fc.fire_risk !== 'Unknown' ? `Fire risk: ${fc.fire_risk}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col space-y-3 p-2.5 sm:p-3 text-left">
      {showCommandAlert && (
        <div className="overflow-hidden rounded-xl border-2 border-red-600 shadow-md dark:border-red-500">
          <div className="bg-red-700 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-red-800">
            Alert
          </div>
          <div className="border-t border-red-700/30 bg-red-50 px-2.5 py-2 dark:border-red-900/50 dark:bg-red-950/95">
            {fc.nearest_fire_miles != null ? (
              <p className="text-sm font-bold leading-snug text-red-900 dark:text-red-100">
                Nearest wildfire: ~{fc.nearest_fire_miles.toFixed(1)} mi from command map center
              </p>
            ) : (
              <p className="text-xs font-semibold leading-snug text-red-900 dark:text-red-200">
                Nearest fire distance not loaded — refresh or confirm station / map center.
              </p>
            )}
            {weatherBits.length > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-red-800 dark:text-red-200/95">
                {weatherBits.join(' · ')}
              </p>
            )}
            {s.needs_help > 0 && (
              <p className="mt-2 text-xs font-bold leading-snug text-red-900 dark:text-red-100">
                <span className="text-red-950 dark:text-red-50">{s.needs_help}</span>{' '}
                {s.needs_help === 1 ? 'person needs' : 'people need'} immediate evacuation assistance
                (cannot evacuate) — dispatch now.
              </p>
            )}
          </div>
        </div>
      )}

      <div className={flameoActivePanel}>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <div className={flameoActiveHead}>Flameo · Command briefing</div>
          <button
            type="button"
            onClick={() => setBriefingManualTick(t => t + 1)}
            disabled={briefingLoading}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-400/80 bg-white/90 px-2 py-1 text-[10px] font-semibold text-amber-950 shadow-sm hover:bg-white disabled:opacity-50 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/55"
          >
            <RefreshCw className={`h-3 w-3 ${briefingLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div
          className="max-h-96 min-h-0 overflow-y-auto overscroll-contain pr-1"
          aria-label="Command briefing text"
        >
          {briefingLoading ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-3.5 w-[92%] max-w-[280px] animate-pulse rounded bg-amber-200/70 dark:bg-amber-900/50" />
              <div className="h-3.5 w-full max-w-[300px] animate-pulse rounded bg-amber-200/70 dark:bg-amber-900/50" />
              <div className="h-3.5 w-4/5 max-w-[240px] animate-pulse rounded bg-amber-200/70 dark:bg-amber-900/50" />
            </div>
          ) : showBriefingTabs ? (
            <div>
              <div
                className="mb-2 flex gap-1 rounded-lg border border-amber-300/60 bg-amber-100/50 p-0.5 dark:border-amber-800/50 dark:bg-amber-950/40"
                role="tablist"
                aria-label="Briefing sections"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={briefingTab === 'situation'}
                  id="flameo-command-tab-situation"
                  aria-controls="flameo-command-panel-situation"
                  onClick={() => setBriefingTab('situation')}
                  className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
                    briefingTab === 'situation'
                      ? 'bg-white text-amber-950 shadow-sm dark:bg-amber-900/80 dark:text-amber-50'
                      : 'text-amber-900/80 hover:bg-amber-50/80 dark:text-amber-200/80 dark:hover:bg-amber-900/30'
                  }`}
                >
                  Situation
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={briefingTab === 'priorities'}
                  id="flameo-command-tab-priorities"
                  aria-controls="flameo-command-panel-priorities"
                  onClick={() => setBriefingTab('priorities')}
                  className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-sm font-bold transition-colors ${
                    briefingTab === 'priorities'
                      ? 'bg-white text-amber-950 shadow-sm dark:bg-amber-900/80 dark:text-amber-50'
                      : 'text-amber-900/80 hover:bg-amber-50/80 dark:text-amber-200/80 dark:hover:bg-amber-900/30'
                  }`}
                >
                  Priority assignments
                </button>
              </div>
              {briefingTab === 'situation' ? (
                <div
                  role="tabpanel"
                  id="flameo-command-panel-situation"
                  aria-labelledby="flameo-command-tab-situation"
                  className="whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/90"
                >
                  {briefingOverview}
                </div>
              ) : (
                <div
                  role="tabpanel"
                  id="flameo-command-panel-priorities"
                  aria-labelledby="flameo-command-tab-priorities"
                  className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-amber-950 dark:text-amber-50"
                >
                  {briefingPriorities}
                </div>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/90">
              {briefingOverview}
            </div>
          )}
          {briefingFallback && !briefingLoading && (
            <p className="mt-2 text-xs text-amber-900/85 dark:text-amber-400/90">
              Template / offline briefing (model unavailable).
            </p>
          )}
          {briefingAt && !briefingLoading && (
            <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-500">
              Last updated {briefingAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      <div className={panel}>
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className={sectionHead}>Station join code (iOS)</span>
        </div>
        {rosterLoading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" aria-busy="true">
            Loading…
          </p>
        ) : rosterError && !roster ? (
          <p className="text-[11px] leading-snug text-red-700 dark:text-red-300">{rosterError}</p>
        ) : !roster?.station ? (
          <p className="text-[11px] leading-snug text-gray-600 dark:text-gray-400">
            Your station and <strong className="font-semibold text-gray-700 dark:text-gray-300">one</strong> iOS join code are created during{' '}
            <strong className="font-semibold text-gray-700 dark:text-gray-300">responder signup</strong> (station name + verified address).
            Refresh shortly, or open{' '}
            <Link
              href="/dashboard/responder/station"
              className="font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-400"
            >
              Station hub
            </Link>{' '}
            for roster and code tools.
          </p>
        ) : (
          <>
            {rosterError && (
              <p className="mb-2 text-[10px] text-red-600 dark:text-red-400">{rosterError}</p>
            )}
            <p className="mb-2 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
              <strong className="font-semibold text-gray-700 dark:text-gray-300">One</strong> code per station — firefighters enter it in{' '}
              <strong className="font-semibold text-gray-700 dark:text-gray-300">Minutes Matter iOS</strong> to join this roster.
            </p>
            {roster.active_invite?.code ? (
              <>
                <div className="rounded-lg border border-dashed border-amber-300/90 bg-amber-50/80 px-2 py-1.5 font-mono text-[11px] font-bold tracking-wide text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
                  {roster.active_invite.code}
                </div>
                <p className="mt-1 text-[9px] text-gray-500 dark:text-gray-500">
                  {expiresInLabel(roster.active_invite.expires_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyInviteCode()}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <Copy className="h-3 w-3" />
                    {copyOk ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </>
            ) : roster.station.is_commander ? (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  No active iOS join code yet. Issue one — it stays valid until you replace it or reach the join limit.
                </p>
                <button
                  type="button"
                  disabled={regenBusy}
                  onClick={() => void regenerateInvite()}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/80 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/55"
                >
                  <RefreshCw className={`h-3 w-3 ${regenBusy ? 'animate-spin' : ''}`} />
                  Issue join code
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Ask your commander for the station&apos;s iOS join code.
              </p>
            )}
            <p className="mt-2 text-[9px] text-gray-500 dark:text-gray-500">
              <Link
                href="/dashboard/responder/station"
                className="font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-400"
              >
                Station hub
              </Link>{' '}
              — edit station name, roster, or replace this code.
            </p>
          </>
        )}
      </div>

      <div className={panel}>
        <div className="mb-2 flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className={sectionHead}>Incident status</span>
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {s.total_households} households in zone
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {s.completion_rate}% evacuated ({s.evacuated} of {s.total_people} people)
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all ${completionBarTone(s.completion_rate)}`}
            style={{ width: `${Math.min(100, Math.max(0, s.completion_rate))}%` }}
          />
        </div>
      </div>

      <div className={panel}>
        <div className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Priority assignments
        </div>
        {topFive.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No CRITICAL / HIGH households in queue.</p>
        ) : (
          <ul className="space-y-2.5">
            {topFive.map(a => (
              <li
                key={`${a.rank}-${a.address}`}
                className="rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-600 dark:bg-gray-900/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 text-xs font-bold text-gray-900 dark:text-gray-100">
                    {a.rank}. {a.address}
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${actionBadgeClass(a.action_required)}`}
                  >
                    {a.action_required}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-400">
                  {a.people_count} people · {a.cannot_evacuate_count} need help
                </div>
                {(a.mobility_flags.length > 0 || a.medical_flags.length > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {a.mobility_flags.map(t => (
                      <span
                        key={t}
                        className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {t}
                      </span>
                    ))}
                    {a.medical_flags.map(t => (
                      <span
                        key={t}
                        className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-900 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[10px] leading-snug text-gray-700 dark:text-gray-300">
                  &quot;{a.reason}&quot;
                </p>
                {a.assigned_to && (
                  <p className="mt-1.5 text-[10px] font-semibold text-sky-800 dark:text-sky-300">
                    Assigned to: {a.assigned_to}
                    {typeof a.estimated_travel_minutes === 'number'
                      ? ` · ~${a.estimated_travel_minutes} min (est.)`
                      : ''}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewOnMap(a.lat, a.lng)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                  >
                    <MapPin className="h-3 w-3" />
                    View on map →
                  </button>
                  {directionsOrigin?.trim() && a.address?.trim() && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(directionsOrigin.trim())}&destination=${encodeURIComponent(a.address.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      Directions (Google Maps)
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={panel}>
        <div className={`${sectionHead} mb-2`}>Zone progress</div>
        <p className="mb-2 text-[10px] text-gray-500 dark:text-gray-400">Recently marked evacuated (by check-in time)</p>
        {recentDone.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No recent evacuated timestamps in view.</p>
        ) : (
          <ul className="space-y-2">
            {recentDone.map((r, i) => (
              <li key={`${r.name}-${r.at}-${i}`} className="text-[11px] leading-snug text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                <span className="text-gray-400 dark:text-gray-500"> — </span>
                <span className="text-gray-600 dark:text-gray-400">{r.address}</span>
                <span className="text-emerald-700 dark:text-emerald-400"> — Evacuated ✓</span>
                <span className="text-gray-400 dark:text-gray-500"> — {relMinutesAgo(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={openFlameoChat}
        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-left text-base font-semibold text-amber-950 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
      >
        🔥 Ask Flameo anything →
      </button>
      <p className="text-center text-[9px] text-gray-500 dark:text-gray-400">
        Opens Flameo chat (responder mode) from the hub.
      </p>
    </div>
  )
}
