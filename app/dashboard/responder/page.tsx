'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, Flame, AlertTriangle, Activity, Clock, ChevronRight, Wind, Droplets, Truck, Map, Building2, Brain, Factory, CheckCircle, MapPin, Phone, RefreshCw, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import type { EvacueePin } from '@/components/EvacueeStatusMap'
import type { HouseholdPin } from '@/lib/responder-household'
import type { FlameoContext } from '@/lib/flameo-context-types'
import FlameoCommandRoom from '@/components/flameo/FlameoCommandRoom'
import ResponderDataConsent from '@/components/responder/ResponderDataConsent'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { useResponderStationAnchor } from '@/hooks/useResponderStationAnchor'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'

const EvacueeStatusMap = dynamic(() => import('@/components/EvacueeStatusMap'), { ssr: false })

/** Demo households — HouseholdPin shape for map + COMMAND (Concord / Cabarrus County, NC). */
const DEMO_HOUSEHOLDS: HouseholdPin[] = [
  {
    id: 'demo-hh-moss',
    address: '4231 Moss Creek Dr NW, Concord, NC',
    lat: 35.408,
    lng: -80.579,
    total_people: 3,
    evacuated: 1,
    not_evacuated: 1,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: ['Uses wheelchair or mobility device', 'Requires assistance to evacuate'],
    medical_flags: ['Requires oxygen or ventilator'],
    members: [
      {
        id: 'demo-hh-moss-1',
        name: 'Linda Johnson',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:02:00.000Z',
        mobility_needs: ['Uses wheelchair or mobility device'],
        medical_needs: ['Requires oxygen or ventilator'],
        disability_other: null,
        medical_other: null,
        phone: '(704) 555-0142',
        work_address: null,
      },
      {
        id: 'demo-hh-moss-2',
        name: 'Robert Johnson',
        home_evacuation_status: 'evacuated',
        home_status_updated_at: '2026-03-31T12:00:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
      {
        id: 'demo-hh-moss-3',
        name: 'Maria Johnson',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T14:30:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-branch',
    address: '1342 Branchview Dr NE, Concord, NC',
    lat: 35.415,
    lng: -80.561,
    total_people: 1,
    evacuated: 0,
    not_evacuated: 1,
    needs_help: 0,
    priority: 'MONITOR',
    mobility_flags: ['Cannot walk long distances'],
    medical_flags: [],
    members: [
      {
        id: 'demo-hh-branch-1',
        name: 'James Harrington',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T14:45:00.000Z',
        mobility_needs: ['Cannot walk long distances'],
        medical_needs: [],
        disability_other: null,
        medical_other: 'Lives alone, elderly',
        phone: '(704) 555-0521',
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-flowes',
    address: '4412 Flowes Store Rd, Concord, NC',
    lat: 35.392,
    lng: -80.587,
    total_people: 2,
    evacuated: 0,
    not_evacuated: 1,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: [],
    medical_flags: ['Requires dialysis'],
    members: [
      {
        id: 'demo-hh-flowes-1',
        name: 'Carol Simmons',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:10:00.000Z',
        mobility_needs: [],
        medical_needs: ['Requires dialysis'],
        disability_other: null,
        medical_other: null,
        phone: '(704) 555-0844',
        work_address: null,
      },
      {
        id: 'demo-hh-flowes-2',
        name: 'David Simmons',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T13:00:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-kannapolis',
    address: '777 Kannapolis Pkwy, Concord, NC',
    lat: 35.401,
    lng: -80.572,
    total_people: 1,
    evacuated: 0,
    not_evacuated: 0,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: ['Bedridden or limited mobility', 'Requires assistance to evacuate'],
    medical_flags: [],
    members: [
      {
        id: 'demo-hh-kannapolis-1',
        name: 'Earl Thompson',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:08:00.000Z',
        mobility_needs: ['Bedridden or limited mobility', 'Requires assistance to evacuate'],
        medical_needs: [],
        disability_other: null,
        medical_other: 'EMS required',
        phone: '(704) 555-1367',
        work_address: null,
      },
    ],
  },
]

const DEMO_HOUSEHOLDS_TAGGED: HouseholdPin[] = DEMO_HOUSEHOLDS.map(h => ({ ...h, is_demo: true }))

const EMPTY_EVACUEE_PINS: EvacueePin[] = []

const STAFFING = [
  { shift: 'A-Shift (On duty)', crew: ['Lt. Morris (OIC)', 'FF Garcia (Driver/Pump)', 'FF Patel (EMS)', 'FF Kim (S&R)'], truck: 'Engine 1 + Rescue 1' },
  { shift: 'B-Shift (On call)', crew: ['Capt. Rhodes', 'FF Johnson', 'FF Davis'], truck: 'Engine 2' },
]

const DEMO_FIRES = [
  { id: 'd1', incident_name: 'Dixie Fire', county: 'Plumas', state: 'CA', acres_burned: 963309, containment_pct: null, svi_score: 0.69, signal_gap_hours: 3.5 },
  { id: 'd2', incident_name: 'Bootleg Fire', county: 'Klamath', state: 'OR', acres_burned: 401279, containment_pct: null, svi_score: 0.58, signal_gap_hours: 2.1 },
  { id: 'd3', incident_name: 'Wallow Fire', county: 'Greenlee', state: 'AZ', acres_burned: 538049, containment_pct: null, svi_score: 0.74, signal_gap_hours: 18.4 },
  { id: 'd4', incident_name: 'Creek Fire', county: 'Fresno', state: 'CA', acres_burned: 379895, containment_pct: null, svi_score: 0.72, signal_gap_hours: 4.2 },
  { id: 'd5', incident_name: 'Caldor Fire', county: 'El Dorado', state: 'CA', acres_burned: 221774, containment_pct: null, svi_score: 0.61, signal_gap_hours: 6.8 },
  { id: 'd6', incident_name: 'Monument Fire', county: 'Trinity', state: 'CA', acres_burned: 223124, containment_pct: null, svi_score: 0.63, signal_gap_hours: null },
  { id: 'd7', incident_name: 'Snake River Complex', county: 'Owyhee', state: 'ID', acres_burned: 481838, containment_pct: null, svi_score: 0.71, signal_gap_hours: null },
  { id: 'd8', incident_name: 'Whitewater-Baldy', county: 'Catron', state: 'NM', acres_burned: 297845, containment_pct: null, svi_score: 0.78, signal_gap_hours: null },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface RedFlagWarning {
  zone: string
  headline: string
  onset: string
  expires: string
  lat: number
  lon: number
  description: string
}

interface NifcFire {
  id: string
  fire_name: string
  latitude: number
  longitude: number
  acres: number | null
  containment: number | null
  source: string
}

interface Shelter {
  name: string
  county: string
  state: string
  lat: number
  lon: number
  capacity: number | null
  occupancy: number | null
  pct_full: number | null
}

const COMMAND_QUICK_LINKS = [
  { label: 'ML Fire Prediction', href: '/dashboard/responder/analytics?tab=ml', icon: Brain, badge: 'AI', badgeColor: 'text-xs font-bold text-ember-400' },
  { label: 'ICS Board', href: '/dashboard/responder/ics', icon: Shield, badge: 'ICS', badgeColor: 'text-xs font-bold text-blue-400' },
  { label: 'Signal Gap Analysis', href: '/dashboard/responder/analytics?tab=signals', icon: Activity, badge: '99%', badgeColor: 'text-xs font-bold text-signal-warn' },
] as const

// ─── Helper: format ISO date ──────────────────────────────────────────────────

type ResponderVisibleProfile = {
  id: string
  full_name: string | null
  address: string | null
  phone: string | null
  mobility_needs: string[] | null
  medical_needs: string[] | null
  disability_other: string | null
  medical_other: string | null
  communication_needs: unknown
  special_notes: string | null
}

function communicationNeedStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function truncateResponderNote(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Sub-component: Situation Report Header ──────────────────────────────────

function SituationReportHeader() {
  const [incidentName, setIncidentName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [nifcCount, setNifcCount] = useState<number | null>(null)
  const [shelterWarn, setShelterWarn] = useState<number | null>(null)
  const [redFlagLoaded, setRedFlagLoaded] = useState(false)
  const [nifcLoaded, setNifcLoaded] = useState(false)
  const [shelterLoaded, setShelterLoaded] = useState(false)

  // Load saved incident name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active_incident_name')
      if (saved) setIncidentName(saved)
    } catch {}
  }, [])

  // Tick clock every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Fetch status chips
  useEffect(() => {
    fetch('/api/fires/redflags')
      .then(r => r.json())
      .then(d => setRedFlagCount(d.count ?? 0))
      .catch(() => setRedFlagCount(0))
      .finally(() => setRedFlagLoaded(true))

    fetch('/api/fires/nifc')
      .then(r => r.json())
      .then(d => setNifcCount(Array.isArray(d.data) ? d.data.length : 0))
      .catch(() => setNifcCount(0))
      .finally(() => setNifcLoaded(true))

    fetch('/api/shelters')
      .then(r => r.json())
      .then(d => setShelterWarn(d.near_capacity ?? 0))
      .catch(() => setShelterWarn(0))
      .finally(() => setShelterLoaded(true))
  }, [])

  function saveIncident(name: string) {
    setIncidentName(name)
    try { localStorage.setItem('active_incident_name', name) } catch {}
  }

  const timeStr = currentTime.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 text-ember-400 text-xs font-medium mb-4">
        <Shield className="w-3.5 h-3.5" />
        SITUATION REPORT
        <span className="ml-auto flex items-center gap-1.5 text-ash-500 font-mono text-xs">
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
      </div>

      {/* Incident name */}
      <input
        type="text"
        value={incidentName}
        onChange={e => saveIncident(e.target.value)}
        placeholder="Active incident name (e.g. Caldor Fire)…"
        className="w-full bg-ash-800 border border-ash-700 rounded-lg px-4 py-2.5 text-white text-base font-semibold focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 transition-colors mb-4"
      />

      {/* Status chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Red Flag */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !redFlagLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          redFlagCount && redFlagCount > 0
            ? 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {!redFlagLoaded ? 'Loading…' : redFlagCount && redFlagCount > 0
            ? `${redFlagCount} Red Flag Warning${redFlagCount !== 1 ? 's' : ''}`
            : 'No Red Flag Warnings'
          }
        </div>

        {/* NIFC Active */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !nifcLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          nifcCount && nifcCount > 0
            ? 'bg-ember-500/10 border-ember-500/30 text-ember-400'
            : 'bg-ash-900 border-ash-800 text-ash-400'
        }`}>
          <Flame className="w-3.5 h-3.5 shrink-0" />
          {!nifcLoaded ? 'Loading…' : `${nifcCount ?? 0} NIFC Active`}
        </div>

        {/* Nearest Weather */}
        <Link
          href="#weather"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-signal-info/30 bg-signal-info/10 text-signal-info text-xs font-medium hover:bg-signal-info/20 transition-colors"
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          View Weather ↓
        </Link>

        {/* Shelters */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !shelterLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          shelterWarn && shelterWarn > 0
            ? 'bg-signal-warn/10 border-signal-warn/30 text-signal-warn'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {!shelterLoaded ? 'Loading…' : shelterWarn && shelterWarn > 0
            ? `${shelterWarn} shelter${shelterWarn !== 1 ? 's' : ''} near capacity`
            : 'Shelters OK'
          }
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component: Red Flag Warnings ────────────────────────────────────────

function RedFlagSection({
  mapCenter,
  flameoContext,
  canAccessEvacueeData,
}: {
  mapCenter: [number, number]
  flameoContext: FlameoContext | null
  canAccessEvacueeData: boolean
}) {
  const [householdPins, setHouseholdPins] = useState<HouseholdPin[]>([])
  const [mapDemoMode, setMapDemoMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [showFacilities, setShowFacilities] = useState(false)
  const [responderProfiles, setResponderProfiles] = useState<ResponderVisibleProfile[]>([])
  const [commandBriefingKey, setCommandBriefingKey] = useState(0)
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadEvacMap = useCallback(async () => {
    try {
      const res = await fetch('/api/responder/evacuees')
      if (res.status === 403) {
        let body: { error?: string; code?: string } = {}
        try {
          body = await res.json()
        } catch {
          body = {}
        }
        if (body.code === 'RESPONDER_CONSENT_REQUIRED' || body.error === 'consent_required') {
          setHouseholdPins([])
          setMapDemoMode(false)
          return
        }
      }
      if (!res.ok) {
        setHouseholdPins(DEMO_HOUSEHOLDS_TAGGED)
        setMapDemoMode(true)
        return
      }
      const json = (await res.json()) as { profiles?: unknown; householdPins?: HouseholdPin[] } | unknown[]
      if (Array.isArray(json)) {
        setHouseholdPins(DEMO_HOUSEHOLDS_TAGGED)
        setMapDemoMode(true)
        return
      }
      const hp = Array.isArray(json.householdPins) ? json.householdPins : []
      if (hp.length > 0) {
        setHouseholdPins(hp)
        setMapDemoMode(false)
      } else {
        setHouseholdPins(DEMO_HOUSEHOLDS_TAGGED)
        setMapDemoMode(true)
      }
    } catch {
      setHouseholdPins(DEMO_HOUSEHOLDS_TAGGED)
      setMapDemoMode(true)
    } finally {
      setCommandBriefingKey(k => k + 1)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!canAccessEvacueeData) {
      setHouseholdPins([])
      setMapDemoMode(false)
      setResponderProfiles([])
      setLoading(false)
      setLastUpdated(new Date())
      return
    }
    setLoading(true)
    await loadEvacMap()

    try {
      const { data: vis } = await supabase.rpc('profiles_visible_to_responder')
      setResponderProfiles(Array.isArray(vis) ? (vis as ResponderVisibleProfile[]) : [])
    } catch {
      setResponderProfiles([])
    }

    try {
      const res = await fetch('/api/fires/redflags')
      if (res.ok) {
        const data = await res.json()
        setRedFlagCount(Array.isArray(data) ? data.length : null)
      }
    } catch {
      // silently ignore
    }

    setLastUpdated(new Date())
    setLoading(false)
  }, [canAccessEvacueeData, loadEvacMap, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!canAccessEvacueeData) return
    const channel = supabase
      .channel('responder-profiles-home-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: { old?: Record<string, unknown>; new?: Record<string, unknown> }) => {
          const prev = payload.old?.home_evacuation_status
          const next = payload.new?.home_evacuation_status
          if (prev !== undefined && next !== undefined && prev === next) return
          void loadEvacMap()
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, loadEvacMap, canAccessEvacueeData])

  const byHome = useMemo(() => {
    let evacuated = 0
    let not_evacuated = 0
    let cannot_evacuate = 0
    for (const h of householdPins) {
      evacuated += h.evacuated
      not_evacuated += h.not_evacuated
      cannot_evacuate += h.needs_help
    }
    return { evacuated, not_evacuated, cannot_evacuate }
  }, [householdPins])

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] min-h-[70dvh] bg-ash-900 wfa-responder-map-surface rounded-xl overflow-hidden border border-ash-800">
      {/* Top bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-ash-800 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 bg-ash-900">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-5 h-5 text-signal-info shrink-0" />
          <span className="font-display font-bold text-white text-sm truncate">Evacuation Status Map</span>
          <span className="text-ash-600 text-xs ml-1 hidden sm:inline">· API map layer concept</span>
        </div>

        {/* Status counts (home evacuation model) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-safe/10 border border-signal-safe/20">
            <CheckCircle className="w-3 h-3 text-signal-safe" />
            <span className="text-signal-safe text-xs font-bold">{byHome.evacuated}</span>
            <span className="text-ash-500 text-xs">evacuated</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-ash-800 border border-ash-600">
            <MapPin className="w-3 h-3 text-ash-400" />
            <span className="text-ash-300 text-xs font-bold">{byHome.not_evacuated}</span>
            <span className="text-ash-500 text-xs">not evacuated</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
            <AlertTriangle className="w-3 h-3 text-signal-danger" />
            <span className="text-signal-danger text-xs font-bold">{byHome.cannot_evacuate}</span>
            <span className="text-ash-500 text-xs">cannot evacuate</span>
          </div>
        </div>

        <button
          onClick={() => setShowFacilities(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showFacilities
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'border-ash-700 text-ash-400 hover:text-white hover:border-ash-600'
          }`}
        >
          <Factory className="w-3 h-3" />
          {showFacilities ? 'Hazard Sites: ON' : 'Hazard Sites'}
        </button>

        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
          {redFlagCount !== null && redFlagCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
              <AlertTriangle className="w-3 h-3 text-signal-danger shrink-0" />
              <span className="text-signal-danger text-xs font-medium">{redFlagCount} Red Flag Warning{redFlagCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ash-500 text-xs">
            <Clock className="w-3 h-3 shrink-0" />
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ash-700 text-ash-400 hover:text-white hover:border-ash-600 transition-colors text-xs disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main content: map + COMMAND panel */}
      <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row gap-0">
        {!canAccessEvacueeData ? (
          <div className="flex flex-1 min-h-[220px] items-center justify-center px-4 lg:min-h-0">
            <div className="max-w-md text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-amber-500/80" />
              <p className="text-sm font-semibold text-white">Evacuation data is locked</p>
              <p className="mt-2 text-xs leading-relaxed text-ash-500">
                Accept the Data Access Agreement above to load the evacuation map and opt-in household details.
                Demo pins are not shown until you agree.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[220px] lg:min-h-0">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-signal-info/30 border-t-signal-info rounded-full animate-spin mx-auto mb-3" />
              <div className="text-ash-500 text-sm">Loading evacuation data…</div>
            </div>
          </div>
        ) : (
          <>
        <div className="flex-1 min-h-[220px] min-w-0 lg:min-h-0">
            <EvacueeStatusMap
              pins={EMPTY_EVACUEE_PINS}
              householdPins={householdPins}
              center={mapCenter}
              zoom={12}
              facilities={HAZARD_FACILITIES}
              showFacilities={showFacilities}
              demoMode={mapDemoMode}
              mapFocusRequest={mapFocus}
              onResponderStatusUpdated={() => { void loadEvacMap() }}
            />
        </div>

        <div className="w-full max-h-[45vh] lg:max-h-none lg:w-[26rem] shrink-0 flex flex-col overflow-hidden bg-ash-900">
          <FlameoCommandRoom
            householdPins={householdPins}
            mapCenter={mapCenter}
            fireContext={flameoContext}
            demoMode={mapDemoMode}
            briefingRefreshKey={commandBriefingKey}
            onViewOnMap={(lat, lng) => setMapFocus({ lat, lng, nonce: Date.now() })}
          />
          <div className="flex-1 overflow-y-auto border-t border-ash-800">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-3.5 h-3.5 text-signal-info shrink-0" />
                <span className="text-white text-xs font-semibold">Opt-in households — communication & health</span>
              </div>
              <p className="text-ash-500 text-[10px] leading-snug mb-2">
                Evacuees who consented to responder visibility in Settings. Cognitive, communication, and medical flags from their profile appear here — not on the demo map pins above.
              </p>
              {responderProfiles.length === 0 ? (
                <p className="text-ash-600 text-xs">No households have opted in yet.</p>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {responderProfiles.map(row => {
                    const comm = communicationNeedStrings(row.communication_needs)
                    const mob = row.mobility_needs?.filter(Boolean) ?? []
                    const med = row.medical_needs?.filter(Boolean) ?? []
                    return (
                      <div key={row.id} className="rounded-lg border border-ash-800 bg-ash-800/40 p-2.5 text-[11px]">
                        <div className="text-white font-semibold truncate">{row.full_name || 'Unknown'}</div>
                        {row.address && (
                          <div className="flex items-start gap-1 text-ash-500 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="break-words">{row.address}</span>
                          </div>
                        )}
                        {mob.length > 0 && (
                          <div className="text-ash-300 mt-1.5">
                            <span className="text-ash-500">Mobility:</span> {mob.join(' · ')}
                          </div>
                        )}
                        {med.length > 0 && (
                          <div className="text-ash-300 mt-1">
                            <span className="text-ash-500">Medical:</span> {med.join(' · ')}
                          </div>
                        )}
                        {(row.disability_other || row.medical_other) && (
                          <div className="text-ash-400 mt-1 text-[10px]">
                            {[row.disability_other, row.medical_other].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {comm.length > 0 && (
                          <div className="text-signal-info mt-1.5">
                            <span className="text-ash-500">Communication & cognitive:</span> {comm.join(' · ')}
                          </div>
                        )}
                        {row.special_notes && (
                          <div className="text-ash-300 mt-1.5 text-[10px] leading-relaxed border-t border-ash-700/80 pt-1.5">
                            <span className="text-ash-500 text-[9px] uppercase tracking-wide">Responder guidance</span>
                            <div className="mt-0.5">{truncateResponderNote(row.special_notes, 320)}</div>
                          </div>
                        )}
                        {row.phone && (
                          <div className="flex items-center gap-1 text-ash-500 text-[10px] mt-1.5">
                            <Phone className="w-3 h-3" />
                            {row.phone}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-component: NIFC Live Incidents ───────────────────────────────────────

function NifcSection() {
  const [fires, setFires] = useState<NifcFire[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/fires/firms?limit=8')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fires?.length) setFires(data.fires)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (loaded && fires.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-signal-danger" />
        <h2 className="text-white font-semibold text-sm">Live NIFC Active Incidents</h2>
        <span className="ml-auto text-ash-600 text-xs">NASA FIRMS · refreshes every 5 min</span>
      </div>
      <div className="card overflow-hidden">
        {!loaded ? (
          <div className="p-6 text-center text-ash-500 text-sm">Loading live incidents…</div>
        ) : (
          <div className="divide-y divide-ash-800">
            {fires.slice(0, 6).map((f, i) => (
              <div key={f.id ?? i} className="flex items-center gap-4 px-5 py-3 hover:bg-ash-800/40 transition-colors">
                <div className="w-2 h-2 rounded-full bg-signal-danger animate-pulse-slow shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{f.fire_name || 'Active Fire'}</div>
                  <div className="text-ash-500 text-xs">{f.source}</div>
                </div>
                <div className="text-right shrink-0">
                  {f.acres != null && <div className="text-ash-300 text-xs font-mono">{f.acres.toLocaleString()} ac</div>}
                  {f.containment != null && <div className="text-signal-safe text-xs">{f.containment}% contained</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-component: Shelter Capacity ──────────────────────────────────────────

function ShelterSection() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [nearCapacity, setNearCapacity] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/shelters')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.shelters) { setShelters(data.shelters.slice(0, 8)); setNearCapacity(data.near_capacity ?? 0) }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-signal-info" />
        <h2 className="text-white font-semibold text-sm">Shelter Capacity — FEMA Live</h2>
        {nearCapacity > 0 && (
          <span className="badge-danger ml-2">{nearCapacity} near capacity</span>
        )}
        <span className="ml-auto text-ash-600 text-xs">FEMA NSS · updates every 5 min</span>
      </div>
      <div className="card overflow-hidden">
        {!loaded ? (
          <div className="p-6 text-center text-ash-500 text-sm">Loading shelter data…</div>
        ) : shelters.length === 0 ? (
          <div className="p-6 text-center text-ash-500 text-sm">No active shelters in system</div>
        ) : (
          <div className="divide-y divide-ash-800">
            {shelters.map((s, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-ash-800/40 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.pct_full != null && s.pct_full >= 80 ? 'bg-signal-danger' : s.pct_full != null && s.pct_full >= 50 ? 'bg-signal-warn' : 'bg-signal-safe'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{s.name}</div>
                  <div className="text-ash-500 text-xs">{s.county}{s.county && s.state ? ', ' : ''}{s.state}</div>
                </div>
                <div className="text-right shrink-0">
                  {s.capacity != null && <div className="text-ash-300 text-xs font-mono">{s.occupancy ?? '?'} / {s.capacity}</div>}
                  {s.pct_full != null && (
                    <div className={`text-xs font-bold ${s.pct_full >= 80 ? 'text-signal-danger' : s.pct_full >= 50 ? 'text-signal-warn' : 'text-signal-safe'}`}>{s.pct_full}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResponderDashboard() {
  const [activeFires, setActiveFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [consentReady, setConsentReady] = useState(false)
  const [consentOk, setConsentOk] = useState(false)
  const supabase = createClient()
  const flameoAgent = useFlameoContext({ role: 'emergency_responder' })
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()

  useEffect(() => {
    setFlameoHubAgentPayload({
      context: flameoAgent.context,
      status: flameoAgent.status,
      flameoRole: 'responder',
    })
  }, [flameoAgent.context, flameoAgent.status, setFlameoHubAgentPayload])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        if (!cancelled) setConsentReady(true)
        return
      }
      const { data: p } = await supabase
        .from('profiles')
        .select('responder_consent_accepted, responder_consent_version')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setConsentOk(isResponderConsentSatisfied(p))
      setConsentReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const { center, weatherLocation, stationLabel, manualInput, setManualInput, applyManualStation, geoReady } = useResponderStationAnchor()
  const [weather, setWeather] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    if (!geoReady || !weatherLocation.trim()) return
    let cancelled = false
    async function loadWeather() {
      setWeatherLoading(true)
      try {
        const res = await fetch(`/api/weather?location=${encodeURIComponent(weatherLocation)}`)
        if (res.ok && !cancelled) setWeather(await res.json())
      } catch {}
      if (!cancelled) setWeatherLoading(false)
    }
    loadWeather()
    return () => { cancelled = true }
  }, [geoReady, weatherLocation])

  async function applyStationAndRefresh() {
    await applyManualStation()
  }

  async function refreshWeatherOnly() {
    if (!weatherLocation.trim()) return
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(weatherLocation)}`)
      if (res.ok) setWeather(await res.json())
    } catch {}
    setWeatherLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, svi_score, signal_gap_hours')
        .is('containment_pct', null)
        .order('acres_burned', { ascending: false })
        .limit(8)
      if (data && data.length > 0) setActiveFires(data)
      else setActiveFires(DEMO_FIRES as any[])
      setLoading(false)
    }
    load()
  }, [])

  const showConsentGate = consentReady && !consentOk

  return (
    <div className="relative w-full min-w-0 max-w-none mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-red-400 text-xs sm:text-sm font-medium">
          <Shield className="w-4 h-4" />
          EMERGENCY RESPONDER · COMMAND HUB
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/responder/analytics" className="inline-flex items-center gap-1 rounded-lg border border-ash-700 px-2.5 py-1.5 text-ash-300 text-xs hover:text-white hover:border-ash-500">
            Command Analytics <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/dashboard/responder/ai" className="inline-flex items-center gap-1 rounded-lg border border-ash-700 px-2.5 py-1.5 text-ash-300 text-xs hover:text-white hover:border-ash-500">
            Flameo · Field Agent <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      {consentOk && (
        <div
          className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/60 px-3 py-2.5 text-xs leading-snug text-amber-100/95 sm:text-sm"
          role="status"
        >
          🔒 You are viewing sensitive evacuation data. Access is logged. Use only for active incident response.
        </div>
      )}
      <div className={showConsentGate ? 'pointer-events-none select-none blur-[3px] opacity-40' : ''}>
        <RedFlagSection
          mapCenter={center}
          flameoContext={flameoAgent.context}
          canAccessEvacueeData={consentOk}
        />
      </div>
      <ResponderDataConsent open={showConsentGate} onAgreed={() => setConsentOk(true)} />
    </div>
  )
}
