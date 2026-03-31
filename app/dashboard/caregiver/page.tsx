'use client'
import { Suspense, useEffect, useState, useRef, useMemo, useCallback, Component, type ReactNode } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBreakpointMdUp } from '@/hooks/useBreakpointMdUp'
import { requiresConsumerHomeAddress } from '@/lib/profile-requirements'
import { alertLevelFromFlameoContext } from '@/lib/hub-alert-level'
import type { AlertLevel } from '@/components/AlertJar'
import {
  Flame, MapPin, Phone, CheckCircle,
  ChevronRight, Package, User, Bell,
  Factory, Heart, Navigation, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import type { NifcFire, WindData, EvacShelter } from './map/LeafletMap'
import type { HazardFacility } from '@/lib/hazard-facilities'
import AlertJar from '@/components/AlertJar'
import { useRoleContext, type RolePerson } from '@/components/RoleContext'
import { loadPersons, loadGoBag, saveGoBag } from '@/lib/user-data'
import { useConsumerAlerts } from '@/hooks/useConsumerAlerts'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'
import ProactiveBriefing from '@/components/flameo/ProactiveBriefing'
import FlameoAnchorAlert from '@/components/flameo/FlameoAnchorAlert'
import ShelterRouteCard from '@/components/flameo/ShelterRouteCard'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { distanceMiles } from '@/lib/hub-map-distance'
import {
  mapLegacyCheckinToDual,
  labelForHomeEvacuationStatus,
  isHomeEvacuationStatus,
  isPersonSafetyStatus,
  PERSON_SAFETY_CHECKIN_STATUS_OPTIONS,
  type HomeEvacuationStatus,
  type PersonSafetyStatus,
} from '@/lib/checkin-status'
import { flameoGroundingBadgeText } from '@/lib/flameo-grounding-ui'
import { geocodeAddressClient } from '@/lib/geocoding-client'

const LeafletMap = dynamic(() => import('./map/LeafletMap'), { ssr: false })

class MapErrorBoundary extends Component<{ children: ReactNode; mapHref: string }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 text-center">
        <p className="text-sm text-gray-600">The map could not load in this view.</p>
        <p className="text-xs text-gray-500">Try refreshing the page. If it keeps happening, open the full map.</p>
        <Link href={this.props.mapHref} className="text-sm font-semibold text-forest-700 hover:underline">
          Open full map
        </Link>
      </div>
    )
    return this.props.children
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GO_BAG_ITEMS = [
  { id: 'water',     label: 'Water (1 gal/person/day × 3 days)',          critical: true  },
  { id: 'docs',      label: 'ID, insurance & vital documents',             critical: true  },
  { id: 'meds',      label: 'Medications (7-day supply + list)',           critical: true  },
  { id: 'phone',     label: 'Phone charger & battery pack',                critical: true  },
  { id: 'cash',      label: 'Cash ($100+ small bills)',                    critical: false },
  { id: 'clothes',   label: 'Clothing change + sturdy shoes',              critical: false },
  { id: 'food',      label: 'Non-perishable food (3-day supply)',          critical: false },
  { id: 'first_aid', label: 'First-aid kit',                               critical: false },
  { id: 'flashlight',label: 'Flashlight + extra batteries',               critical: false },
  { id: 'pet',       label: 'Pet supplies (carrier, food, records)',       critical: false },
  { id: 'radio',     label: 'Battery/crank weather radio',                 critical: false },
  { id: 'map',       label: 'Paper map of your area',                      critical: false },
]

// ── Types ─────────────────────────────────────────────────────────────────────
type MonitoredPerson = {
  id: string
  name: string
  relationship: string
  familyRelation?: string
  mobility: string
  mobilityOther?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

type FireEvent = {
  id: string
  incident_name: string
  county: string
  state: string
  acres_burned: number | null
  containment_pct: number | null
  started_at: string
  signal_gap_hours: number | null
  has_evacuation_order: boolean | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type EvacStage = 'Order issued' | 'Warning issued' | 'Advisory issued' | 'Watch (now)'

function evacuationStage(fire: FireEvent): EvacStage {
  if (fire.has_evacuation_order) return 'Order issued'
  const pct = fire.containment_pct
  if (pct == null || pct < 25) return 'Warning issued'
  if (pct < 50) return 'Advisory issued'
  return 'Watch (now)'
}

function toRolePerson(p: MonitoredPerson): RolePerson {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    phone: p.phone,
    relationship: p.familyRelation || p.relationship,
  }
}

const STAGE_META: Record<EvacStage, { bg: string; text: string; action: string }> = {
  'Order issued':    { bg: '#c86432', text: 'white',    action: 'Mandatory evacuation — go immediately. Shelter info on map.' },
  'Warning issued':  { bg: '#d97706', text: 'white',    action: 'Leave NOW — do not wait for Order. In high-SVI counties, a formal order may never be issued.' },
  'Advisory issued': { bg: '#d4a574', text: '#3e2723',  action: 'Load car, move valuables, prepare to leave immediately.' },
  'Watch (now)':     { bg: '#7cb342', text: 'white',    action: 'Pack go-bag, fill gas, locate pets, know your route.' },
}

function mobilityStatus(m: string): 'safe' | 'caution' | 'danger' {
  const l = (m || '').toLowerCase()
  if (l.includes('oxygen') || l.includes('bedridden') || l.includes('medical')) return 'danger'
  if (l.includes('wheelchair') || l.includes('limited') || l.includes('walker')) return 'caution'
  return 'safe'
}

const STATUS_COLORS = {
  safe:    '#7cb342',
  caution: '#d4a574',
  danger:  '#c86432',
}

// ── Person tracking card ──────────────────────────────────────────────────────
function PersonCard({ person, index }: { person: MonitoredPerson; index: number }) {
  const status  = mobilityStatus(person.mobility)
  const color   = STATUS_COLORS[status]
  const isPrimary = index === 0

  return (
    <div
      className="rounded-2xl p-4 transition-shadow hover:shadow-md"
      style={{
        background: isPrimary
          ? 'linear-gradient(135deg, #c86432 0%, #8b3a1a 100%)'
          : 'var(--wfa-panel-solid)',
        border: isPrimary ? 'none' : `1.5px solid ${color}40`,
      }}
    >
      {/* Name + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div
            className={`font-semibold text-sm truncate ${isPrimary ? 'text-white' : ''}`}
            style={isPrimary ? undefined : { color: 'var(--wfa-text)' }}
          >
            {person.name}
          </div>
          <div
            className={`text-xs mt-0.5 ${isPrimary ? 'text-white/60' : ''}`}
            style={isPrimary ? undefined : { color: 'var(--wfa-text-50)' }}
          >
            {person.familyRelation || person.relationship}
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
          style={{
            background: isPrimary ? 'rgba(255,255,255,0.2)' : color + '20',
            color: isPrimary ? 'white' : color,
            border: `1px solid ${isPrimary ? 'rgba(255,255,255,0.3)' : color + '50'}`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Mobility pill */}
      {person.mobility && (
        <div
          className="inline-block text-[11px] px-2.5 py-1 rounded-xl mb-3"
          style={{
            background: isPrimary ? 'rgba(255,255,255,0.15)' : 'var(--wfa-tag-bg)',
            color: isPrimary ? 'rgba(255,255,255,0.8)' : 'var(--wfa-text)',
          }}
        >
          {person.mobilityOther || person.mobility}
        </div>
      )}

      {/* Timeline dots */}
      <div className="space-y-1.5">
        {person.address && (
          <div className={`flex items-center gap-2 text-xs ${isPrimary ? 'text-white/55' : 'text-gray-400'}`}>
            <div className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color }} />
            <span className="truncate">{person.address}</span>
          </div>
        )}
        {person.phone && (
          <div className={`flex items-center gap-2 text-xs ${isPrimary ? 'text-white/55' : 'text-gray-400'}`}>
            <div className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
            <span>{person.phone}</span>
          </div>
        )}
      </div>

      {/* Quick call on featured card */}
      {isPrimary && person.phone && (
        <a
          href={`tel:${person.phone}`}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-white/90"
          style={{ background: 'var(--wfa-call-btn-bg)', color: 'var(--wfa-accent)' }}
        >
          <Phone className="w-3 h-3" />
          Call {person.name.split(' ')[0]}
        </a>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export type ConsumerRole = 'evacuee'

export function ConsumerHubDashboard({
  consumerRole = 'evacuee',
  unifiedHub = false,
}: {
  consumerRole?: ConsumerRole
  /** Single hub at /dashboard/home — all household accounts use evacuee role; My People selection scopes map/Flameo. */
  unifiedHub?: boolean
}) {
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()
  const [proactiveUi, setProactiveUi] = useState<'hidden' | 'loading' | 'address' | 'briefing'>('hidden')
  const [briefingText, setBriefingText] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const bpMd = useBreakpointMdUp()
  const alertsPanelRef = useRef<HTMLDivElement>(null)
  const [fires, setFires]     = useState<FireEvent[]>([])
  const [nifc, setNifc]       = useState<NifcFire[]>([])
  const [persons, setPersons] = useState<MonitoredPerson[]>([])
  const [userProfile, setUserProfile] = useState<{
    full_name?: string
    email?: string
    address?: string | null
    work_address?: string | null
    work_building_type?: string | null
    work_floor_number?: number | null
    mobility_needs?: string[] | null
    mobility_access_needs?: string[] | null
    role?: string | null
  } | null>(null)
  const [personLocation, setPersonLocation] = useState<[number, number] | null>(null)

  const { mode, activePerson, setMode, setActivePerson } = useRoleContext()
  const isViewingMember = mode === 'member' && activePerson != null
  const flameoContextAddress =
    isViewingMember && activePerson?.address?.trim() ? activePerson.address.trim() : null

  const userLocHook = useUserLocation({
    homeAddress: userProfile?.address,
    workAddress: userProfile?.work_address,
    enabled: Boolean(userProfile) && !isViewingMember,
  })

  const userLocation = useMemo((): [number, number] | null => {
    if (userLocHook.lat != null && userLocHook.lng != null) {
      return [userLocHook.lat, userLocHook.lng]
    }
    return null
  }, [userLocHook.lat, userLocHook.lng])

  const flameo = useFlameoContext({
    role: 'evacuee',
    liveLocation: userLocation,
    contextAddress: flameoContextAddress,
    detectedAnchor: isViewingMember ? null : userLocHook.detected_anchor,
  })
  const [alertRadiusMiles, setAlertRadiusMiles] = useState(25)
  const [alertsAiEnabled, setAlertsAiEnabled] = useState(false)
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [bagChecked, setBagChecked] = useState<Set<string>>(new Set())

  // Resizable 3-column layout
  const [leftPct, setLeftPct]   = useState(22)
  const [rightPct, setRightPct] = useState(30)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showShelters, setShowShelters] = useState(true)
  const [showFacilities, setShowFacilities] = useState(true)
  const [windData, setWindData] = useState<WindData | null>(null)
  const [personCoords, setPersonCoords] = useState<Record<string, [number, number]>>({})
  const [locatingMap, setLocatingMap] = useState(false)
  const [hubUserId, setHubUserId] = useState<string | null>(null)
  const [personStatuses, setPersonStatuses] = useState<
    Record<
      string,
      {
        home?: HomeEvacuationStatus
        safety?: PersonSafetyStatus
        homeAt?: string | null
        safetyAt?: string | null
      }
    >
  >({})
  const [familyEmail, setFamilyEmail] = useState('')
  const [familyAddLoading, setFamilyAddLoading] = useState(false)
  const [familyAddErr, setFamilyAddErr] = useState<string | null>(null)
  const [familyAddOk, setFamilyAddOk] = useState<string | null>(null)

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      if (dragging === 'left') { setLeftPct(clamp(pct, 15, 40)) }
      if (dragging === 'right') { setRightPct(clamp(100 - pct, 20, 50)) }
    }
    function onUp() { setDragging(null) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const hubBase = unifiedHub ? '/dashboard/home' : '/dashboard/evacuee'
  const checkinHref = unifiedHub ? '/dashboard/home/checkin' : '/dashboard/evacuee/checkin'
  const mapHref = unifiedHub ? '/dashboard/home/map' : '/dashboard/evacuee/map'

  useEffect(() => {
    setFlameoHubAgentPayload({
      context: flameo.context,
      status: flameo.status,
      flameoRole: 'evacuee',
    })
  }, [flameo.context, flameo.status, setFlameoHubAgentPayload])

  useEffect(() => {
    if (loading) return
    if (!requiresConsumerHomeAddress(consumerRole)) return
    if (userProfile == null) return
    if (userProfile.address?.trim()) return
    router.replace('/dashboard/settings?tab=profile&needHomeAddress=1')
  }, [loading, consumerRole, userProfile, router])

  function flameoBriefingTodayKey() {
    return new Date().toISOString().slice(0, 10)
  }

  function dismissFlameoPrologue() {
    try {
      sessionStorage.setItem('flameo_briefing_shown_today', flameoBriefingTodayKey())
    } catch { /* ignore */ }
    setProactiveUi('hidden')
  }

  /** Phase B (ANISHA): proactive Flameo briefing when context is ready; address hint when missing. */
  useEffect(() => {
    if (flameo.loading) return
    if (flameo.error || !flameo.context) {
      setProactiveUi('hidden')
      return
    }

    if (flameo.status === 'address_missing') {
      setBriefingText(null)
      setProactiveUi('hidden')
      return
    }

    if (flameo.status !== 'ready') {
      setProactiveUi('hidden')
      return
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem('flameo_briefing_shown_today') === flameoBriefingTodayKey()) {
      setProactiveUi('hidden')
      return
    }

    let cancelled = false
    async function runBriefing() {
      setProactiveUi('loading')
      setBriefingText(null)
      try {
        const res = await fetch('/api/flameo/briefing', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: flameo.status,
            context: flameo.context,
            message: flameo.message,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Briefing failed')
        setBriefingText(typeof data.briefing === 'string' ? data.briefing : '')
        setProactiveUi('briefing')
      } catch {
        if (!cancelled) {
          setBriefingText('Review My Alerts and the evacuation map for activity near you.')
          setProactiveUi('briefing')
        }
      }
    }
    runBriefing()
    return () => { cancelled = true }
  }, [flameo.loading, flameo.error, flameo.status, flameo.context, flameo.message])

  /** Push / deep link: open hub with Flameo briefing pre-loaded */
  useEffect(() => {
    if (searchParams.get('flameoBriefing') !== '1') return
    if (flameo.loading) return
    if (flameo.error || !flameo.context) return
    if (flameo.status === 'address_missing' || flameo.status === 'geocode_failed') return

    let cancelled = false
    async function run() {
      setProactiveUi('loading')
      setBriefingText(null)
      try {
        const res = await fetch('/api/flameo/briefing', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: flameo.status,
            context: flameo.context,
            message: flameo.message,
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Briefing failed')
        setBriefingText(typeof data.briefing === 'string' ? data.briefing : '')
        setProactiveUi('briefing')
      } catch {
        if (!cancelled) {
          setBriefingText('Review My Alerts and the evacuation map for activity near you.')
          setProactiveUi('briefing')
        }
      } finally {
        if (!cancelled) router.replace(hubBase, { scroll: false })
      }
    }
    run()
    return () => { cancelled = true }
  }, [
    searchParams,
    flameo.loading,
    flameo.error,
    flameo.status,
    flameo.context,
    flameo.message,
    hubBase,
    router,
  ])

  useEffect(() => {
    if (searchParams.get('panel') === 'alerts' && alertsPanelRef.current) {
      alertsPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams])

  // Geocode active person's address whenever they change
  useEffect(() => {
    if (!activePerson?.address) { setPersonLocation(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const g = await geocodeAddressClient(activePerson.address!)
        if (!cancelled && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
          setPersonLocation([g.lat, g.lng])
          return
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setPersonLocation(null)
    })()
    return () => {
      cancelled = true
    }
  }, [activePerson?.address])

  useEffect(() => {
    const addr = userProfile?.address?.trim()
    if (!addr) {
      setHomeCoords(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const g = await geocodeAddressClient(addr)
        if (!cancelled && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
          setHomeCoords([g.lat, g.lng])
          return
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setHomeCoords(null)
    })()
    return () => {
      cancelled = true
    }
  }, [userProfile?.address])

  const mapAnchor = useMemo((): [number, number] | null => {
    if (isViewingMember && personLocation) return personLocation
    if (userLocation) return userLocation
    return homeCoords
  }, [isViewingMember, personLocation, userLocation, homeCoords])

  /** NIFC + AI proximity use saved home (or monitored person’s address), not GPS — matches Flameo “near home”. */
  const homeAnchorForAlerts = useMemo((): [number, number] | null => {
    if (isViewingMember && personLocation) return personLocation
    return homeCoords
  }, [isViewingMember, personLocation, homeCoords])

  const homeLabelForAi = useMemo(() => {
    if (isViewingMember && activePerson) {
      const first = activePerson.name.trim().split(/\s+/)[0] ?? 'Family'
      return `${first}'s home`
    }
    return 'Your home'
  }, [isViewingMember, activePerson])

  const AWAY_FROM_HOME_MI = 0.35
  const isAwayFromHome = useMemo(() => {
    if (isViewingMember) return false
    if (!userLocation || !homeCoords) return false
    return distanceMiles(userLocation, homeCoords) > AWAY_FROM_HOME_MI
  }, [isViewingMember, userLocation, homeCoords])

  const { proximityItems, aiSummary, aiLoading, aiError } = useConsumerAlerts(
    nifc,
    homeAnchorForAlerts,
    alertRadiusMiles,
    alertsAiEnabled,
    homeLabelForAi
  )

  const sortedNifc = useMemo(() => {
    return [...nifc].sort((a, b) => {
      const ca = a.containment ?? -1
      const cb = b.containment ?? -1
      if (ca !== cb) return ca - cb
      return (b.acres ?? 0) - (a.acres ?? 0)
    })
  }, [nifc])

  /** Geocode everyone in My People for map pins (all evacuee accounts). */
  const geocodeMonitoredPeople = consumerRole === 'evacuee'
  const showPeopleRail = consumerRole === 'evacuee'
  const personsManageHref = '/dashboard/home/persons'

  const watchedLocationsForMap = useMemo(() => {
    const out: { label: string; lat: number; lng: number }[] = []
    if (geocodeMonitoredPeople) {
      for (const p of persons) {
        const c = personCoords[p.id]
        if (c) out.push({ label: p.name, lat: c[0], lng: c[1] })
      }
    }
    return out
  }, [geocodeMonitoredPeople, persons, personCoords])

  const nearestSheltersList = useMemo(() => {
    if (!mapAnchor) return [] as EvacShelter[]
    const origin: [number, number] = [mapAnchor[0], mapAnchor[1]]
    return [...HUMAN_EVAC_SHELTERS]
      .map(s => ({ s, d: distanceMiles(origin, [s.lat, s.lng]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
      .map(x => x.s)
  }, [mapAnchor])

  const nearestHazardsList = useMemo(() => {
    if (!mapAnchor) return [] as HazardFacility[]
    const origin: [number, number] = [mapAnchor[0], mapAnchor[1]]
    return [...HAZARD_FACILITIES]
      .map(h => ({ h, d: distanceMiles(origin, [h.lat, h.lng]) }))
      .filter(x => x.d <= 200)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(x => x.h)
  }, [mapAnchor])

  useEffect(() => {
    if (!geocodeMonitoredPeople || !persons.length) {
      setPersonCoords({})
      return
    }
    let cancelled = false
    async function geocodeAll() {
      const next: Record<string, [number, number]> = {}
      for (const p of persons) {
        if (!p.address?.trim()) continue
        try {
          const g = await geocodeAddressClient(p.address)
          if (Number.isFinite(g.lat) && Number.isFinite(g.lng)) next[p.id] = [g.lat, g.lng]
        } catch { /* ignore */ }
        await new Promise(res => setTimeout(res, 1000))
        if (cancelled) return
      }
      if (!cancelled) setPersonCoords(next)
    }
    geocodeAll()
    return () => { cancelled = true }
  }, [persons, geocodeMonitoredPeople])

  useEffect(() => {
    if (!mapAnchor) {
      setWindData(null)
      return
    }
    const [lat, lng] = mapAnchor
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=auto`
    )
      .then(r => r.json())
      .then(data => {
        const speed = data?.current?.wind_speed_10m
        const dir = data?.current?.wind_direction_10m
        if (speed != null && dir != null) {
          setWindData({
            speedMph: speed,
            directionDeg: dir,
            spreadDeg: (dir + 180) % 360,
          })
        }
      })
      .catch(() => setWindData(null))
  }, [mapAnchor])

  async function refreshNifcHub() {
    try {
      const nifcRes = await fetch('/api/fires/nifc').catch(() => null)
      if (nifcRes?.ok) {
        const json = await nifcRes.json().catch(() => ({}))
        if (json?.data) setNifc(json.data)
      }
    } catch { /* ignore */ }
  }

  function locateOnMap() {
    setLocatingMap(true)
    userLocHook.refreshPosition()
    window.setTimeout(() => setLocatingMap(false), 1500)
  }

  const supabase = createClient()
  const refreshPersons = useCallback(
    async (userId: string) => {
      const list = await loadPersons(supabase, userId)
      setPersons(list)
    },
    [supabase]
  )

  useEffect(() => {
    // Supabase data + NIFC live fires
    async function load() {
      try {
        const [firesRes, authRes, nifcRes] = await Promise.all([
          supabase
            .from('fire_events')
            .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, signal_gap_hours, has_evacuation_order')
            .order('started_at', { ascending: false })
            .limit(6),
          supabase.auth.getUser(),
          fetch('/api/fires/nifc').catch(() => null),
        ])
        const firesData = firesRes?.data
        const user = authRes?.data?.user
        if (nifcRes?.ok) {
          const json = await nifcRes.json().catch(() => ({}))
          if (json?.data) setNifc(json.data)
        }
        if (firesData) setFires(firesData)
        if (user) {
          setHubUserId(user.id)
          // Load synced persons + go-bag from Supabase (falls back to localStorage inside)
          refreshPersons(user.id).catch(() => {})
          loadGoBag(supabase, user.id).then(items => setBagChecked(new Set(items))).catch(() => {})
          try {
            const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
            if (card.full_name) {
              const { data: prof } = await supabase
                .from('profiles')
                .select(
                  'full_name, address, alert_radius_miles, alerts_ai_enabled, role, work_address, work_building_type, work_floor_number, mobility_needs, mobility_access_needs'
                )
                .eq('id', user.id)
                .single()
              const pr = (prof ?? {}) as Record<string, unknown>
              setUserProfile({
                full_name: card.full_name,
                email: user.email,
                address: prof?.address ?? null,
                work_address: typeof pr.work_address === 'string' ? pr.work_address : null,
                work_building_type: typeof pr.work_building_type === 'string' ? pr.work_building_type : null,
                work_floor_number:
                  typeof pr.work_floor_number === 'number' ? pr.work_floor_number : null,
                mobility_needs: Array.isArray(pr.mobility_needs) ? (pr.mobility_needs as string[]) : null,
                mobility_access_needs: Array.isArray(pr.mobility_access_needs)
                  ? (pr.mobility_access_needs as string[])
                  : null,
                role: prof?.role ?? null,
              })
              if (prof?.alert_radius_miles != null) setAlertRadiusMiles(Number(prof.alert_radius_miles))
              if (prof?.alerts_ai_enabled != null) setAlertsAiEnabled(!!prof.alerts_ai_enabled)
              setLoading(false)
              return
            }
          } catch {}
          const { data: prof } = await supabase
            .from('profiles')
            .select(
              'full_name, address, alert_radius_miles, alerts_ai_enabled, work_address, work_building_type, work_floor_number, mobility_needs, mobility_access_needs, role'
            )
            .eq('id', user.id)
            .single()
          const pr = (prof ?? {}) as Record<string, unknown>
          setUserProfile({
            full_name: prof?.full_name,
            email: user.email,
            address: prof?.address ?? null,
            work_address: typeof pr.work_address === 'string' ? pr.work_address : null,
            work_building_type: typeof pr.work_building_type === 'string' ? pr.work_building_type : null,
            work_floor_number:
              typeof pr.work_floor_number === 'number' ? pr.work_floor_number : null,
            mobility_needs: Array.isArray(pr.mobility_needs) ? (pr.mobility_needs as string[]) : null,
            mobility_access_needs: Array.isArray(pr.mobility_access_needs)
              ? (pr.mobility_access_needs as string[])
              : null,
            role: typeof pr.role === 'string' ? pr.role : null,
          })
          if (prof?.alert_radius_miles != null) setAlertRadiusMiles(Number(prof.alert_radius_miles))
          if (prof?.alerts_ai_enabled != null) setAlertsAiEnabled(!!prof.alerts_ai_enabled)
        }
      } catch (err) {
        console.error('[Hub] load error:', err)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPersons])

  useEffect(() => {
    if (!hubUserId) return

    const linksChannel = supabase
      .channel(`caregiver-family-links-${hubUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caregiver_family_links',
          filter: `caregiver_user_id=eq.${hubUserId}`,
        },
        () => {
          refreshPersons(hubUserId).catch(() => {})
        }
      )
      .subscribe()

    const linkedIds = persons
      .map(p => p.id)
      .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    const profileFilter = linkedIds.length ? `id=in.(${linkedIds.join(',')})` : 'id=eq.00000000-0000-0000-0000-000000000000'

    const profilesChannel = supabase
      .channel(`my-people-profiles-${hubUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: profileFilter,
        },
        () => {
          refreshPersons(hubUserId).catch(() => {})
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(linksChannel)
      void supabase.removeChannel(profilesChannel)
    }
  }, [hubUserId, persons, refreshPersons, supabase])

  useEffect(() => {
    if (!hubUserId) return
    if (consumerRole !== 'evacuee') return
    let cancelled = false
    async function loadStatuses() {
      const map: Record<
        string,
        {
          home?: HomeEvacuationStatus
          safety?: PersonSafetyStatus
          homeAt?: string | null
          safetyAt?: string | null
        }
      > = {}
      for (const p of persons) {
        if (p.id === 'self-user') continue
        const { data: chk } = await supabase
          .from('monitored_person_checkins')
          .select('status, updated_at')
          .eq('caregiver_user_id', hubUserId)
          .eq('monitored_person_id', p.id)
          .maybeSingle()

        let home: HomeEvacuationStatus | undefined
        let safety: PersonSafetyStatus | undefined
        let homeAt: string | null | undefined
        let safetyAt: string | null | undefined

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)) {
          const { data: prof } = await supabase
            .from('profiles')
            .select(
              'home_evacuation_status, person_safety_status, home_status_updated_at, safety_status_updated_at'
            )
            .eq('id', p.id)
            .maybeSingle()
          if (prof) {
            const pr = prof as Record<string, unknown>
            if (isHomeEvacuationStatus(pr.home_evacuation_status as string)) {
              home = pr.home_evacuation_status as HomeEvacuationStatus
              homeAt = (pr.home_status_updated_at as string) || null
            }
            if (isPersonSafetyStatus(pr.person_safety_status as string)) {
              safety = pr.person_safety_status as PersonSafetyStatus
              safetyAt = (pr.safety_status_updated_at as string) || null
            }
          }
        }

        if (chk?.status) {
          const m = mapLegacyCheckinToDual(chk.status)
          if (!home) {
            home = m.home
            homeAt = chk.updated_at
          }
          if (!safety && m.safety) {
            safety = m.safety
            safetyAt = chk.updated_at
          }
        }
        map[p.id] = { home, safety, homeAt, safetyAt }
      }
      if (!cancelled) setPersonStatuses(map)
    }
    loadStatuses()
    return () => {
      cancelled = true
    }
  }, [consumerRole, hubUserId, persons, supabase])

  async function saveWorkFloorToProfile(floor: number) {
    if (!hubUserId) throw new Error('Not signed in')
    const { error } = await supabase
      .from('profiles')
      .update({ work_floor_number: floor })
      .eq('id', hubUserId)
    if (error) throw new Error(error.message)
    setUserProfile(p => (p ? { ...p, work_floor_number: floor } : p))
  }

  async function handleFamilyInvite() {
    if (!familyEmail.trim() || !hubUserId) return
    setFamilyAddLoading(true)
    setFamilyAddErr(null)
    setFamilyAddOk(null)
    try {
      const res = await fetch('/api/family/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: familyEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFamilyAddErr(typeof data.error === 'string' ? data.error : 'Request failed')
        return
      }
      if (data.mode === 'linked') {
        setFamilyAddOk(`${data.name} — ${data.message}` || 'Added to My Family')
        setFamilyEmail('')
        await refreshPersons(hubUserId)
      } else {
        const extra =
          data.devLink && !data.emailSent
            ? ` Copy link: ${data.devLink}`
            : ''
        setFamilyAddOk((data.message || 'Invitation sent.') + extra)
        setFamilyEmail('')
      }
    } catch {
      setFamilyAddErr('Something went wrong.')
    } finally {
      setFamilyAddLoading(false)
    }
  }

  async function toggleGoBagItem(itemId: string) {
    const next = new Set(bagChecked)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    setBagChecked(next)
    if (!hubUserId) return
    await saveGoBag(supabase, hubUserId, Array.from(next))
  }

  const topFire    = fires[0] ?? null
  const otherFires = fires.slice(1)
  const readyPct   = Math.round((bagChecked.size / GO_BAG_ITEMS.length) * 100)
  const stage      = topFire ? evacuationStage(topFire) : null
  const stageMeta  = stage ? STAGE_META[stage] : null
  const hubAutoJarLevel: AlertLevel = useMemo(
    () => alertLevelFromFlameoContext(flameo.context),
    [flameo.context]
  )

  /** You’re away from saved home and Flameo sees fire within alert radius of home. */
  const awayHomeFlameoThreat =
    isAwayFromHome && flameo.context?.flags?.has_confirmed_threat === true
  const nearestHomeThreat = flameo.context?.incidents_nearby?.[0]

  const initials = userProfile?.full_name
    ? userProfile.full_name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  const homeAddr = userProfile?.address?.trim() || ''
  const workAddr = userProfile?.work_address?.trim() || ''
  const detectedAnchor = !isViewingMember ? userLocHook.detected_anchor : null
  const [liveAddressFromGps, setLiveAddressFromGps] = useState<string | null>(null)
  useEffect(() => {
    const lat = userLocHook.lat
    const lng = userLocHook.lng
    if (lat == null || lng == null) {
      setLiveAddressFromGps(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const gmaps = (window as any)?.google?.maps
      if (gmaps?.Geocoder) {
        try {
          const geocoder = new gmaps.Geocoder()
          const results = await geocoder.geocode({ location: { lat, lng } })
          const first = Array.isArray(results?.results) ? results.results[0] : null
          const line =
            typeof first?.formatted_address === 'string'
              ? first.formatted_address.trim()
              : ''
          if (!cancelled && line) {
            setLiveAddressFromGps(line)
            return
          }
        } catch {
          /* ignore and fallback below */
        }
      }
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
        const data = (await res.json()) as { formatted?: string }
        if (!cancelled && typeof data.formatted === 'string' && data.formatted.trim()) {
          setLiveAddressFromGps(data.formatted.trim())
          return
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLiveAddressFromGps(null)
    })()
    return () => {
      cancelled = true
    }
  }, [userLocHook.lat, userLocHook.lng])
  const liveAddressLabel = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^\w]/g, '')
    const liveAddr = liveAddressFromGps?.trim() || flameo.context?.location_anchor?.anchor_address?.trim() || ''
    const matchesHome = Boolean(liveAddr && homeAddr && norm(liveAddr) === norm(homeAddr))
    const matchesWork = Boolean(liveAddr && workAddr && norm(liveAddr) === norm(workAddr))

    if (liveAddr) {
      if (matchesWork || detectedAnchor === 'work') return `Work: ${workAddr || liveAddr}`
      if (matchesHome || detectedAnchor === 'home') return `Home: ${homeAddr || liveAddr}`
      return `Live: ${liveAddr} (different location)`
    }

    const anchor = flameo.context?.location_anchor
    if (anchor?.anchor === 'work') return `Work: ${anchor.anchor_address?.trim() || workAddr || 'Not set'}`
    if (anchor?.anchor === 'home') return `Home: ${anchor.anchor_address?.trim() || homeAddr || 'Not set'}`
    if (anchor?.anchor === 'unknown') {
      return userLocHook.lat != null && userLocHook.lng != null
        ? 'Live: Address unavailable (could not reverse-geocode current GPS)'
        : 'Live: Locating current address...'
    }

    if (detectedAnchor === 'work') return `Work: ${workAddr || 'Not set'}`
    if (detectedAnchor === 'home') return `Home: ${homeAddr || 'Not set'}`
    if (detectedAnchor === 'unknown') {
      return userLocHook.lat != null && userLocHook.lng != null
        ? 'Live: Address unavailable (could not reverse-geocode current GPS)'
        : 'Live: Locating current address...'
    }
    return `Home: ${homeAddr || 'Not set'}`
  }, [
    detectedAnchor,
    workAddr,
    homeAddr,
    flameo.context?.location_anchor?.anchor,
    liveAddressFromGps,
    flameo.context?.location_anchor?.anchor_address,
    userLocHook.lat,
    userLocHook.lng,
  ])

  const meCard = (
    <div className="rounded-xl border bg-white/80 px-3 py-2.5" style={{ borderColor: 'var(--wfa-border)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--wfa-accent)' }}>
        Me
      </div>
      <div className="text-xs font-semibold" style={{ color: 'var(--wfa-text)' }}>
        {userProfile?.full_name?.trim() || 'You'}
      </div>
      {userProfile?.email && (
        <div className="text-[11px]" style={{ color: 'var(--wfa-text-40)' }}>
          {userProfile.email}
        </div>
      )}
      <div className="mt-1.5 space-y-1 text-[11px]" style={{ color: 'var(--wfa-text-40)' }}>
        <div>
          <span className="font-medium" style={{ color: 'var(--wfa-text)' }}>Home:</span>{' '}
          {userProfile?.address?.trim() || 'Not set'}
        </div>
        <div>
          <span className="font-medium" style={{ color: 'var(--wfa-text)' }}>Work:</span>{' '}
          {userProfile?.work_address?.trim() || 'Not set'}
        </div>
      </div>
    </div>
  )


  const flameoBriefingProps = {
    mode: proactiveUi,
    addressMessage: 'Add your address in Settings to get personalized fire alerts.',
    briefingText,
    hasNearbyFires: (flameo.context?.incidents_nearby?.length ?? 0) > 0,
    mapHref,
    checkinHref,
    alertsHref: `${hubBase}?panel=alerts`,
    settingsHref: '/dashboard/settings',
    onDismiss: dismissFlameoPrologue,
  }
  const shouldShowShelterRoutes =
    flameo.status === 'ready'
    && (flameo.context?.shelters_ranked?.length ?? 0) > 0
    && userLocHook.lat != null
    && userLocHook.lng != null
  const wheelchairShelterMode =
    (userProfile?.mobility_needs ?? []).some(v => /\b(wheelchair|mobility|device)\b/i.test(String(v)))

  return (
    <div className="flex min-h-[100dvh] w-full flex-1 flex-col">
      {bpMd === undefined && (
        <div className="flex flex-1 min-h-[50vh] items-center justify-center p-8 text-sm text-gray-500">
          Loading your hub…
        </div>
      )}

      {/* ══ MOBILE LAYOUT (< md) — only one branch mounts so Leaflet is not initialized twice ══ */}
      {bpMd !== true && (
      <div className="flex flex-col overflow-y-auto space-y-4 px-4 pt-4 pb-8" style={{ background: 'var(--wfa-page-bg)' }}>

        {/* Header */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wfa-accent)' }}>
            {isViewingMember
              ? `Viewing ${activePerson!.name}`
              : 'Your household'}
          </div>
          <h1 className="font-display font-bold text-2xl mt-0.5" style={{ color: 'var(--wfa-text)' }}>
            {isViewingMember ? `${activePerson!.name.split(' ')[0]}'s Hub` : 'My Hub'}
          </h1>
        </div>

        {/* Map (hero) */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowShelters(v => !v)} className={`text-[11px] px-2 py-1 rounded-lg border ${showShelters ? 'bg-emerald-50 border-emerald-400' : 'border-gray-200'}`}>Shelters</button>
          <button type="button" onClick={() => setShowFacilities(v => !v)} className={`text-[11px] px-2 py-1 rounded-lg border ${showFacilities ? 'bg-amber-50 border-amber-400' : 'border-gray-200'}`}>Hazards</button>
          <button type="button" onClick={locateOnMap} className="text-[11px] px-2 py-1 rounded-lg border border-blue-200 bg-blue-50">Locate</button>
          <button type="button" onClick={refreshNifcHub} className="text-[11px] px-2 py-1 rounded-lg border border-gray-200">Refresh</button>
        </div>
        <div className="h-56 rounded-2xl overflow-hidden relative border border-gray-200">
          <MapErrorBoundary mapHref={mapHref}>
            <LeafletMap
              nifc={sortedNifc}
              userLocation={userLocation}
              center={mapAnchor ?? userLocation ?? [37.5, -119.5]}
              flyToUserZoom={7}
              homePosition={homeCoords}
              showHomePin={isAwayFromHome && !!homeCoords}
              shelters={HUMAN_EVAC_SHELTERS}
              showShelters={showShelters}
              watchedLocations={watchedLocationsForMap}
              facilities={HAZARD_FACILITIES}
              showFacilities={showFacilities}
              windData={windData}
            />
          </MapErrorBoundary>
        </div>

        {/* Fire alert card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--wfa-hero-bg)' }}>
          {loading ? (
            <div className="h-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ) : topFire ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(200,100,50,0.3)', border: '2px solid rgba(200,100,50,0.5)' }}>
                  <Flame className="w-4 h-4 text-orange-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-bold text-white text-base leading-tight truncate">{topFire.incident_name || 'Active Fire Alert'}</h2>
                  <div className="text-white/55 text-xs mt-0.5">{[topFire.county, topFire.state].filter(Boolean).join(', ')}</div>
                  {stageMeta && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: stageMeta.bg, color: stageMeta.text }}>{stage}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-5 mt-3">
                {topFire.acres_burned != null && <div><div className="text-white text-sm font-bold">{topFire.acres_burned.toLocaleString()}</div><div className="text-white/40 text-[10px]">Acres</div></div>}
                {topFire.containment_pct != null && <div><div className="text-white text-sm font-bold">{topFire.containment_pct}%</div><div className="text-white/40 text-[10px]">Contained</div></div>}
                {topFire.signal_gap_hours != null && <div><div className="text-white text-sm font-bold">{topFire.signal_gap_hours.toFixed(1)}h</div><div className="text-white/40 text-[10px]">Signal Gap</div></div>}
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center text-center">
              <AlertJar level={hubAutoJarLevel} size={56} />
              <h2 className="font-display text-sm font-bold text-white mt-2">
                {hubAutoJarLevel === 'safe' ? 'No Active Alerts' : 'Activity in your alert radius'}
              </h2>
              <p className="text-white/45 text-xs mt-0.5">
                {hubAutoJarLevel === 'safe'
                  ? 'Your area is currently clear. Stay prepared.'
                  : 'Automated status from Flameo — open My alerts (above) or the map for details. Use check-in to share your personal status.'}
              </p>
            </div>
          )}

          {/* Quick actions: map + alerts already on hub — keep check-in and 911 only */}
          <div className="grid grid-cols-2 gap-px border-t border-white/10">
            <Link
              href={checkinHref}
              className="flex flex-col items-center text-center p-3 transition-all active:bg-white/10"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <CheckCircle className="w-4 h-4 text-orange-300 mb-1" />
              <div className="text-white font-semibold text-xs leading-tight">
                {isViewingMember ? `Ping ${activePerson!.name.split(' ')[0]}` : 'Check in safe'}
              </div>
              <div className="text-white/40 text-[10px] mt-0.5">Update your status</div>
            </Link>
            <a
              href="tel:911"
              className="flex flex-col items-center text-center p-3 transition-all active:bg-white/10"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <Phone className="w-4 h-4 text-red-300 mb-1" />
              <div className="text-white font-semibold text-xs leading-tight">Call 911</div>
              <div className="text-white/40 text-[10px] mt-0.5">Emergency only</div>
            </a>
          </div>
        </div>

        {/* Go-bag */}
        <div className="group relative rounded-2xl p-4 bg-white border" style={{ borderColor: 'var(--wfa-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--wfa-text)' }}>
              <Package className="w-4 h-4" style={{ color: 'var(--wfa-accent)' }} /> Go-Bag Ready
            </div>
            <span className="text-xs font-bold" style={{ color: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432' }}>{readyPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--wfa-progress-bg)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${readyPct}%`, background: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432' }} />
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: 'var(--wfa-text-40)' }}>{bagChecked.size} / {GO_BAG_ITEMS.length} items packed</div>
          <div
            className="pointer-events-none absolute left-2 right-2 top-full z-30 mt-2 hidden rounded-xl border bg-white p-2 shadow-xl transition-opacity duration-150 md:block md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
            style={{ borderColor: 'var(--wfa-border)' }}
          >
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ash-600">Checklist</div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {GO_BAG_ITEMS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleGoBagItem(item.id)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ash-50"
                >
                  <input
                    type="checkbox"
                    checked={bagChecked.has(item.id)}
                    readOnly
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-[11px] text-ash-800">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* My People */}
        {showPeopleRail && persons.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--wfa-accent)' }}>My People</div>
            <div className="space-y-2">
              {meCard}
              {persons.map((p, i) => (
                <div key={p.id}>
                  <PersonCard person={p} index={i} />
                  {personStatuses[p.id] && (personStatuses[p.id].home || personStatuses[p.id].safety) && (
                    <div className="mt-2 rounded-xl px-3 py-2 text-[11px] border bg-white/80" style={{ borderColor: 'var(--wfa-border)' }}>
                      {personStatuses[p.id].home && (
                        <div className="text-gray-800">
                          <span className="font-semibold">Home: </span>
                          {labelForHomeEvacuationStatus(personStatuses[p.id].home!)}
                          {personStatuses[p.id].homeAt && (
                            <span className="text-gray-500 ml-1">
                              · {new Date(personStatuses[p.id].homeAt!).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      {personStatuses[p.id].safety && (
                        <div className="text-gray-800 mt-1">
                          <span className="font-semibold">Safety: </span>
                          {PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.find(o => o.value === personStatuses[p.id].safety)?.label}
                          {personStatuses[p.id].safetyAt && (
                            <span className="text-gray-500 ml-1">
                              · {new Date(personStatuses[p.id].safetyAt!).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showPeopleRail && (
          <div className="rounded-2xl p-4 bg-white border space-y-2" style={{ borderColor: 'var(--wfa-border)' }}>
            <div className="text-ash-800 text-sm font-semibold">My People</div>
            <p className="text-ash-500 text-xs leading-relaxed">
              If you are caring for somebody or watching out for your family, add them here. They create their own
              account; you&apos;ll see status and can get alerts for their location. If they already use Wildfire, we
              link right away — otherwise we send an email invite (or a link if email isn&apos;t configured).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={familyEmail}
                onChange={e => { setFamilyEmail(e.target.value); setFamilyAddErr(null); setFamilyAddOk(null) }}
                placeholder="name@email.com"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={familyAddLoading || !familyEmail.trim()}
                onClick={handleFamilyInvite}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {familyAddLoading ? 'Working…' : 'Add or invite'}
              </button>
            </div>
            {familyAddErr && <p className="text-xs text-red-600">{familyAddErr}</p>}
            {familyAddOk && <p className="text-xs text-green-700">{familyAddOk}</p>}
          </div>
        )}

        {unifiedHub && !isViewingMember && (
          <FlameoAnchorAlert
            status={flameo.status}
            context={flameo.context}
            detectedAnchor={userLocHook.detected_anchor}
            workBuildingType={userProfile?.work_building_type}
            workFloorFromProfile={userProfile?.work_floor_number ?? null}
            mobilityNeeds={userProfile?.mobility_needs ?? null}
            mobilityAccessNeeds={userProfile?.mobility_access_needs ?? null}
            onSaveFloor={saveWorkFloorToProfile}
          />
        )}

        <ProactiveBriefing {...flameoBriefingProps} variant="panel" />
        {shouldShowShelterRoutes && flameo.context?.shelters_ranked && (
          <ShelterRouteCard
            shelters={flameo.context.shelters_ranked}
            userLat={userLocHook.lat!}
            userLng={userLocHook.lng!}
            mapHref="/dashboard/home/map"
            wheelchairMode={wheelchairShelterMode}
          />
        )}

        {awayHomeFlameoThreat && (
          <div className="rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/90 p-3 text-slate-900 shadow-sm">
            <div className="flex items-start gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/flameo1.png"
                alt=""
                width={36}
                height={36}
                className="shrink-0 rounded-lg border border-amber-200 bg-white object-contain shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Away from home</div>
                <p className="mt-1 text-[11px] font-medium leading-snug text-slate-800">
                  Flameo sees fire near your <strong>saved home</strong> while your location shows you elsewhere.
                </p>
                {nearestHomeThreat && (
                  <p className="mt-1.5 text-[10px] text-slate-600">
                    Closest to home: {nearestHomeThreat.name ?? 'Fire'} · {nearestHomeThreat.distance_miles.toFixed(1)} mi
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <Link
          href={`${hubBase}?panel=alerts`}
          className="rounded-xl text-white flex items-center gap-3 px-4 py-3 w-full"
          style={{ background: 'linear-gradient(135deg, #7a2e0e, #c86432)' }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">My alerts</div>
            <div className="text-white/50 text-[11px]">Fires and resources near you</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </Link>

        {/* Other fires */}
        {otherFires.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--wfa-accent)' }}>Other Recent Fires</div>
            <div className="space-y-2">
              {otherFires.map(fire => (
                <div key={fire.id} className="rounded-2xl p-3 bg-white flex items-center gap-3 shadow-sm" style={{ border: '1px solid var(--wfa-fire-border)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: fire.containment_pct != null && fire.containment_pct >= 75 ? '#7cb342' : '#c86432' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--wfa-text)' }}>{fire.incident_name || 'Unnamed Fire'}</div>
                    <div className="text-xs" style={{ color: 'var(--wfa-text-40)' }}>{[fire.county, fire.state].filter(Boolean).join(', ')}</div>
                  </div>
                  <div className="text-right shrink-0 text-sm font-semibold" style={{ color: fire.containment_pct != null && fire.containment_pct >= 50 ? '#7cb342' : '#c86432' }}>
                    {fire.containment_pct != null ? `${fire.containment_pct}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ══ DESKTOP LAYOUT (≥ md) — map-first hub ═══════════════════════════════ */}
      {bpMd === true && (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Root: full height 3-column resizable layout — min-h-0 so nested panels can scroll */}
        <div
          ref={containerRef}
          className="flex min-h-0 flex-1 overflow-hidden items-stretch"
          style={{ background: 'var(--wfa-page-bg)', fontFamily: 'var(--font-body)', userSelect: dragging ? 'none' : undefined }}
        >

          {/* ══ LEFT — My People (family circle) or You ═══════════════════════════════════════════ */}
          <div
            className="flex min-h-0 flex-col shrink-0 border-r"
            style={{ width: `${leftPct}%`, minWidth: 180, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-l)' }}
          >
            <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: 'var(--wfa-border-lite)' }}>
              <div className="font-display font-bold text-lg" style={{ color: 'var(--wfa-text)' }}>
                {showPeopleRail ? 'My People' : 'You'}
              </div>
              <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--wfa-text-40)' }}>
                {showPeopleRail
                  ? 'If you are caring for somebody or watching out for your family, add them here. Tap a row to center the map.'
                  : 'Address powers nearby alerts'}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {showPeopleRail ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode('self'); setActivePerson(null) }}
                    className="w-full text-left rounded-xl px-3 py-2.5 border transition-all"
                    style={{
                      borderColor: mode === 'self' ? 'var(--wfa-accent)' : 'var(--wfa-border)',
                      background: mode === 'self' ? 'var(--wfa-tag-bg)' : 'transparent',
                    }}
                  >
                    <div className="text-xs font-semibold" style={{ color: 'var(--wfa-text)' }}>Live location</div>
                    <div
                      className="text-[11px] leading-snug line-clamp-2 break-words"
                      style={{ color: 'var(--wfa-text-40)' }}
                      title={liveAddressLabel}
                    >
                      {liveAddressLabel}
                    </div>
                    {isAwayFromHome && (
                      <div className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--wfa-accent)' }}>
                        Live location differs from home
                      </div>
                    )}
                  </button>
                  {meCard}
                  {persons.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setActivePerson(toRolePerson(p))}
                        className="w-full text-left rounded-xl px-3 py-2.5 border transition-all"
                        style={{
                          borderColor: activePerson?.id === p.id ? 'var(--wfa-accent)' : 'var(--wfa-border)',
                          background: activePerson?.id === p.id ? 'var(--wfa-tag-bg)' : 'transparent',
                        }}
                      >
                        <div className="text-xs font-semibold truncate" style={{ color: 'var(--wfa-text)' }}>{p.name}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--wfa-text-40)' }}>{p.mobilityOther || p.mobility || '—'}</div>
                      </button>
                      {personStatuses[p.id] && (personStatuses[p.id].home || personStatuses[p.id].safety) && (
                        <div className="text-[10px] px-2 py-1.5 rounded-lg bg-ash-100/80 border border-ash-200 text-ash-800 space-y-0.5">
                          {personStatuses[p.id].home && (
                            <div>
                              <span className="font-semibold">Home:</span>{' '}
                              {labelForHomeEvacuationStatus(personStatuses[p.id].home!)}
                              {personStatuses[p.id].homeAt && (
                                <span className="text-ash-500"> · {new Date(personStatuses[p.id].homeAt!).toLocaleString()}</span>
                              )}
                            </div>
                          )}
                          {personStatuses[p.id].safety && (
                            <div>
                              <span className="font-semibold">Safety:</span>{' '}
                              {PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.find(o => o.value === personStatuses[p.id].safety)?.label}
                              {personStatuses[p.id].safetyAt && (
                                <span className="text-ash-500"> · {new Date(personStatuses[p.id].safetyAt!).toLocaleString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link
                    href={personsManageHref}
                    className="flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl border border-dashed"
                    style={{ borderColor: 'var(--wfa-border)', color: 'var(--wfa-accent)' }}
                  >
                    Manage people
                  </Link>
                  <div className="rounded-xl px-2 py-2 border border-ash-200 bg-white space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ash-600">Add someone</div>
                    <input
                      type="email"
                      value={familyEmail}
                      onChange={e => { setFamilyEmail(e.target.value); setFamilyAddErr(null); setFamilyAddOk(null) }}
                      placeholder="evacuee@email.com"
                      className="w-full rounded-lg border border-ash-300 px-2 py-1.5 text-[11px]"
                    />
                    <button
                      type="button"
                      disabled={familyAddLoading || !familyEmail.trim()}
                      onClick={handleFamilyInvite}
                      className="w-full rounded-lg bg-amber-700 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                    >
                      {familyAddLoading ? 'Working…' : 'Add or invite'}
                    </button>
                    {familyAddErr && <p className="text-[10px] text-red-600">{familyAddErr}</p>}
                    {familyAddOk && <p className="text-[10px] text-green-700">{familyAddOk}</p>}
                  </div>
                </>
              ) : (
                <div className="rounded-xl p-3 border bg-white" style={{ borderColor: 'var(--wfa-border)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--wfa-text)' }}>{userProfile?.full_name || 'My profile'}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--wfa-text-40)' }}>{userProfile?.address || 'Add your address in Settings'}</div>
                  <Link href="/dashboard/settings" className="text-[11px] font-semibold mt-2 inline-block" style={{ color: 'var(--wfa-accent)' }}>Edit profile →</Link>
                </div>
              )}
              <div className="group relative rounded-2xl p-3 bg-white border" style={{ borderColor: 'var(--wfa-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--wfa-text)' }}>
                    <Package className="w-3.5 h-3.5" style={{ color: 'var(--wfa-accent)' }} />
                    Go-bag
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: readyPct >= 80 ? '#7cb342' : '#c86432' }}>{readyPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wfa-progress-bg)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${readyPct}%`, background: readyPct >= 80 ? '#7cb342' : '#d4a574' }} />
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--wfa-text-40)' }}>{bagChecked.size} / {GO_BAG_ITEMS.length} items</div>
                <div
                  className="pointer-events-none absolute left-2 right-2 top-full z-40 mt-2 hidden rounded-xl border bg-white p-2 shadow-xl transition-opacity duration-150 md:block md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
                  style={{ borderColor: 'var(--wfa-border)' }}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ash-600">Checklist</div>
                  <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {GO_BAG_ITEMS.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleGoBagItem(item.id)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ash-50"
                      >
                        <input
                          type="checkbox"
                          checked={bagChecked.has(item.id)}
                          readOnly
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                        />
                        <span className="text-[11px] text-ash-800">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ DRAG HANDLE — left/center ══════════════════════════════════ */}
          <div onMouseDown={() => setDragging('left')} style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize', zIndex: 10 }}>
            <div style={{ width: 2, height: 40, borderRadius: 4, background: dragging === 'left' ? '#f97316' : 'var(--wfa-border)', transition: 'background 0.15s' }} />
          </div>

          {/* ══ CENTER — evacuation map (hero) ═══════════════════════════════════════ */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ minWidth: 240 }}>
            <div className="shrink-0 px-3 py-2 border-b flex flex-wrap items-center gap-2 justify-between" style={{ borderColor: 'var(--wfa-border)', background: 'var(--wfa-page-bg)' }}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wfa-accent)' }}>Evacuation map</div>
                <div className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--wfa-text)' }}>
                  {isViewingMember ? `${activePerson!.name.split(' ')[0]}'s view` : 'My Hub'}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end">
                <button type="button" onClick={locateOnMap} disabled={locatingMap}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-500/40 text-blue-700 bg-blue-50/80 disabled:opacity-50">
                  <Navigation className="w-3.5 h-3.5" />{locatingMap ? 'Locating…' : 'Locate me'}
                </button>
                <button type="button" onClick={() => setShowShelters(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${showShelters ? 'bg-emerald-50 border-emerald-500/40 text-emerald-800' : 'border-gray-300 text-gray-600'}`}>
                  <Heart className="w-3.5 h-3.5" />Shelters
                </button>
                <button type="button" onClick={() => setShowFacilities(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${showFacilities ? 'bg-amber-50 border-amber-500/40 text-amber-900' : 'border-gray-300 text-gray-600'}`}>
                  <Factory className="w-3.5 h-3.5" />Hazards
                </button>
                <button type="button" onClick={refreshNifcHub}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-300 text-gray-600">
                  <RefreshCw className="w-3.5 h-3.5" />Refresh
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative">
              <MapErrorBoundary mapHref={mapHref}>
                <LeafletMap
                  nifc={sortedNifc}
                  userLocation={userLocation}
                  center={mapAnchor ?? userLocation ?? [37.5, -119.5]}
                  flyToUserZoom={7}
                  homePosition={homeCoords}
                  showHomePin={isAwayFromHome && !!homeCoords}
                  shelters={HUMAN_EVAC_SHELTERS}
                  showShelters={showShelters}
                  watchedLocations={watchedLocationsForMap}
                  facilities={HAZARD_FACILITIES}
                  showFacilities={showFacilities}
                  windData={windData}
                />
              </MapErrorBoundary>
            </div>
          </div>

          <div onMouseDown={() => setDragging('right')} style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize', zIndex: 10 }}>
            <div style={{ width: 2, height: 40, borderRadius: 4, background: dragging === 'right' ? '#f97316' : 'var(--wfa-border)', transition: 'background 0.15s' }} />
          </div>

          {/* ══ RIGHT — My alerts + quick actions ═════════════════════════════════════ */}
          <div
            id="my-alerts-panel"
            ref={alertsPanelRef}
            className="flex min-h-0 min-w-0 flex-col shrink-0 border-l scroll-mt-4"
            style={{ width: `${rightPct}%`, minWidth: 220, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-r)' }}
          >
            <div className="px-4 pt-4 pb-2 border-b shrink-0" style={{ borderColor: 'var(--wfa-border-lite)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--wfa-accent)' }} />
                  <span className="font-display font-bold text-sm truncate" style={{ color: 'var(--wfa-text)' }}>My alerts</span>
                </div>
                <Link href="/dashboard/settings" className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--wfa-accent)' }}>Settings</Link>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--wfa-text-40)' }}>
                Fire list uses your saved home; shelters and hazards follow the map view
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 space-y-3">
              {unifiedHub && !isViewingMember && (
                <FlameoAnchorAlert
                  status={flameo.status}
                  context={flameo.context}
                  detectedAnchor={userLocHook.detected_anchor}
                  workBuildingType={userProfile?.work_building_type}
                  workFloorFromProfile={userProfile?.work_floor_number ?? null}
                  mobilityNeeds={userProfile?.mobility_needs ?? null}
                  mobilityAccessNeeds={userProfile?.mobility_access_needs ?? null}
                  onSaveFloor={saveWorkFloorToProfile}
                />
              )}
              <ProactiveBriefing {...flameoBriefingProps} variant="panel" />
              {shouldShowShelterRoutes && flameo.context?.shelters_ranked && (
                <ShelterRouteCard
                  shelters={flameo.context.shelters_ranked}
                  userLat={userLocHook.lat!}
                  userLng={userLocHook.lng!}
                  mapHref="/dashboard/home/map"
                  wheelchairMode={wheelchairShelterMode}
                />
              )}
              {awayHomeFlameoThreat && (
                <div className="shrink-0 rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/90 p-3 text-slate-900 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/flameo1.png"
                      alt=""
                      width={36}
                      height={36}
                      className="shrink-0 rounded-lg border border-amber-200 bg-white object-contain shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Away from home</div>
                      <p className="mt-1 text-[11px] font-medium leading-snug text-slate-800">
                        Flameo sees fire activity near your <strong>saved home</strong> while your location shows you elsewhere.
                      </p>
                      {nearestHomeThreat && (
                        <p className="mt-1.5 text-[10px] text-slate-600">
                          Closest to home: {nearestHomeThreat.name ?? 'Fire'} · {nearestHomeThreat.distance_miles.toFixed(1)} mi
                        </p>
                      )}
                      <Link
                        href={`${hubBase}?panel=alerts`}
                        className="mt-2 inline-flex text-[10px] font-bold text-amber-800 hover:text-amber-950"
                      >
                        My alerts →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {proactiveUi === 'hidden' && (
                <>
                  {flameo.loading && (
                    <div
                      className="h-20 shrink-0 animate-pulse rounded-xl border bg-white/80"
                      style={{ borderColor: 'var(--wfa-border)' }}
                      aria-hidden
                    />
                  )}
                  {!flameo.loading && flameo.error && (
                    <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] text-amber-950">
                      <span className="font-semibold">Flameo: </span>
                      {flameo.error}
                    </div>
                  )}
                  {!flameo.loading && !flameo.error && flameo.context && (
                    <div className="shrink-0 rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/90 p-3 text-slate-900 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/flameo1.png"
                          alt=""
                          width={36}
                          height={36}
                          className="shrink-0 rounded-lg border border-amber-200 bg-white object-contain shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Flameo</div>
                          <p className="mt-1 text-[11px] font-medium leading-snug text-slate-800">
                            {flameoGroundingBadgeText(flameo.context, flameo.status)
                              ?? flameo.message
                              ?? 'Safety context is active for your home address.'}
                          </p>
                          <Link
                            href={`${hubBase}/ai`}
                            className="mt-2 inline-flex text-[10px] font-bold text-amber-800 hover:text-amber-950"
                          >
                            Ask Flameo →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {loading ? (
                <div className="h-24 rounded-xl animate-pulse bg-gray-100" />
              ) : topFire && stageMeta ? (
                <div className="rounded-xl p-3 border border-orange-200 bg-orange-50/90">
                  <div className="flex items-start gap-2">
                    <Flame className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-orange-950">{topFire.incident_name}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: stageMeta.bg, color: stageMeta.text }}>{stage}</span>
                      <p className="text-[11px] text-orange-900/85 mt-1.5 leading-snug">{stageMeta.action}</p>
                    </div>
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="rounded-xl p-3 border bg-emerald-50/50 border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-900">No headline fire alert</div>
                    <p className="text-[10px] text-emerald-800/80 mt-0.5">Your area is clear in our feed.</p>
                  </div>
                )
              )}
              {windData && (
                <div className="rounded-xl p-2.5 border border-slate-200 bg-white text-[11px]">
                  <span className="font-semibold text-slate-800">Wind {Math.round(windData.speedMph)} mph</span>
                  <span className="text-slate-500 ml-2">Spread direction on map</span>
                </div>
              )}
              {aiLoading && (
                <div className="text-[11px] text-gray-500 animate-pulse">Preparing AI summary…</div>
              )}
              {aiError && (
                <div className="rounded-lg px-2.5 py-2 text-[11px] bg-amber-50 border border-amber-100 text-amber-900">{aiError}</div>
              )}
              {aiSummary && (
                <div className="rounded-xl p-3 border border-violet-200 bg-violet-50/90">
                  <div className="text-[10px] font-bold uppercase text-violet-800">AI summary</div>
                  <div className="font-semibold text-sm mt-0.5" style={{ color: 'var(--wfa-text)' }}>{aiSummary.headline}</div>
                  <ul className="mt-2 space-y-1 text-[11px] text-gray-700 list-disc pl-4">
                    {aiSummary.bullets.slice(0, 5).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
              {homeAnchorForAlerts && proximityItems.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--wfa-text)' }}>
                    {isViewingMember && activePerson
                      ? `Fires near ${activePerson.name.split(' ')[0]}'s address`
                      : 'Fires near home'}
                  </div>
                  <div className="space-y-1.5">
                    {proximityItems.slice(0, 8).map(f => (
                      <div key={f.id} className="rounded-lg px-2.5 py-1.5 text-[11px] bg-orange-50 border border-orange-100">
                        <div className="font-medium truncate" style={{ color: 'var(--wfa-text)' }}>{f.fire_name}</div>
                        <div className="text-gray-500">
                          {f.distanceKm < 1 ? `${Math.round(f.distanceKm * 1000)} m` : `${f.distanceKm.toFixed(1)} km`} away
                          {f.containment != null ? ` · ${f.containment}% contained` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Within {alertRadiusMiles} mi (NIFC) · adjust in Settings</p>
                </div>
              )}
              {!!nearestSheltersList.length && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--wfa-text)' }}>
                    <Heart className="w-3.5 h-3.5 text-emerald-600" />Nearest shelters
                  </div>
                  <div className="space-y-1.5">
                    {nearestSheltersList.map(s => {
                      const d = mapAnchor ? distanceMiles(mapAnchor, [s.lat, s.lng]) : null
                      return (
                        <div key={s.id} className="rounded-lg px-2.5 py-1.5 text-[11px] bg-emerald-50/50 border border-emerald-100">
                          <div className="font-medium text-emerald-950">{s.name}</div>
                          <div className="text-emerald-800/80">{s.county}{d != null ? ` · ${d.toFixed(0)} mi` : ''}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!!nearestHazardsList.length && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--wfa-text)' }}>
                    <Factory className="w-3.5 h-3.5 text-amber-600" />Hazard sites
                  </div>
                  <div className="space-y-1.5">
                    {nearestHazardsList.map(h => {
                      const d = mapAnchor ? distanceMiles(mapAnchor, [h.lat, h.lng]) : null
                      return (
                        <div key={h.id} className="rounded-lg px-2.5 py-1.5 text-[11px] bg-amber-50/40 border border-amber-100">
                          <div className="font-medium text-amber-950">{h.name}</div>
                          <div className="text-amber-900/70">{h.county}, {h.state}{d != null ? ` · ${d.toFixed(0)} mi` : ''}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!mapAnchor && (
                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  Add your <strong>home address</strong> in{' '}
                  <Link href="/dashboard/settings" className="underline font-medium">Settings</Link> to center the map and automate alerts.
                </div>
              )}
              <div className="rounded-xl p-3 border bg-white" style={{ borderColor: 'var(--wfa-border)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--wfa-text)' }}>Quick actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={checkinHref} className="flex flex-col items-center text-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mb-0.5" />
                    {isViewingMember ? `Ping ${activePerson!.name.split(' ')[0]}` : 'Check in safe'}
                  </Link>
                  <a href="tel:911" className="flex flex-col items-center text-center p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[11px] font-semibold text-red-800">
                    <Phone className="w-4 h-4 mb-0.5" />Call 911
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
    </div>
  )
}

function CaregiverDashboardInner() {
  return <ConsumerHubDashboard consumerRole="evacuee" unifiedHub />
}

export default function CaregiverDashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <CaregiverDashboardInner />
    </Suspense>
  )
}
