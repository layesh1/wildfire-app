'use client'
import { Suspense, useEffect, useState, useRef, useMemo, useCallback, Component, type ReactNode } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useBreakpointMdUp } from '@/hooks/useBreakpointMdUp'
import { requiresConsumerHomeAddress } from '@/lib/profile-requirements'
import { alertLevelFromFlameoContext } from '@/lib/hub-alert-level'
import type { AlertLevel } from '@/components/AlertJar'
import {
  Flame, MapPin, Phone, CheckCircle,
  ChevronRight, Package, User, Bell,
  Factory, Heart, Navigation, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import type { NifcFire, WindData, EvacShelter, LiveShelterPin } from './map/LeafletMap'
import type { HazardFacility } from '@/lib/hazard-facilities'
import AlertJar from '@/components/AlertJar'
import { useRoleContext, type RolePerson } from '@/components/RoleContext'
import {
  loadMonitoredPersonsForHub,
  loadGoBag,
  saveGoBag,
  monitoredPersonsExcludingSelf,
  linkedMonitoredPersonPlaceholder,
} from '@/lib/user-data'
import { useConsumerAlerts } from '@/hooks/useConsumerAlerts'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'
import ProactiveBriefing from '@/components/flameo/ProactiveBriefing'
import FlameoAnchorAlert from '@/components/flameo/FlameoAnchorAlert'
import ShelterRouteCard from '@/components/flameo/ShelterRouteCard'
import FlameoSituationRoom from '@/components/flameo/FlameoSituationRoom'
import { FlameoHubTour } from '@/components/hub/FlameoHubTour'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { distanceMiles } from '@/lib/hub-map-distance'
import { cn } from '@/lib/utils'
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
import { coerceAlertRadiusToChip, DEFAULT_ALERT_RADIUS_MILES } from '@/lib/alert-radius'
import { parseUsStateCodeFromAddress } from '@/lib/us-address-state'
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

const HUB_PEOPLE_ROW_BASE =
  'w-full rounded-xl border px-3 py-2.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60'
const HUB_PEOPLE_ROW_SELECTED =
  'border-amber-600 bg-amber-50/80 dark:border-amber-500 dark:bg-gray-800'
const HUB_PEOPLE_ROW_IDLE = 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'

type HubPersonStatus = {
  home?: HomeEvacuationStatus
  safety?: PersonSafetyStatus
  homeAt?: string | null
  safetyAt?: string | null
}

/** Shared My People rows: map/Flameo anchor via RoleContext; status + address under mobility. */
function HubMyPeopleRows({
  monitoredOthers,
  personStatuses,
  personCoords,
  liveAddressLabel,
  isAwayFromHome,
  viewingSelf,
  selectedMemberId,
  onSelectSelf,
  onSelectMember,
  missingHomeAddress,
  userProfile,
}: {
  monitoredOthers: MonitoredPerson[]
  personStatuses: Record<string, HubPersonStatus>
  personCoords: Record<string, [number, number]>
  liveAddressLabel: string
  isAwayFromHome: boolean
  viewingSelf: boolean
  selectedMemberId: string | null
  onSelectSelf: () => void
  onSelectMember: (p: RolePerson) => void
  missingHomeAddress: boolean
  userProfile: {
    full_name?: string
    email?: string
    address?: string | null
    work_address?: string | null
  } | null
}) {
  return (
    <>
      <button type="button" onClick={onSelectSelf} className={cn(HUB_PEOPLE_ROW_BASE, HUB_PEOPLE_ROW_IDLE)}>
        <div className="text-xs font-semibold text-gray-900 dark:text-white">Live location</div>
        <div
          className="line-clamp-2 break-words text-[11px] leading-snug text-gray-500 dark:text-gray-400"
          title={liveAddressLabel}
        >
          {liveAddressLabel}
        </div>
        {isAwayFromHome && (
          <div className="mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            Live location differs from home
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onSelectSelf}
        className={cn(
          HUB_PEOPLE_ROW_BASE,
          missingHomeAddress
            ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
            : viewingSelf
              ? HUB_PEOPLE_ROW_SELECTED
              : HUB_PEOPLE_ROW_IDLE
        )}
      >
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Me
        </div>
        <div className="text-xs font-semibold text-gray-900 dark:text-white">
          {userProfile?.full_name?.trim() || 'You'}
        </div>
        {userProfile?.email && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">{userProfile.email}</div>
        )}
        <div className="mt-1.5 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Home:</span>{' '}
            {userProfile?.address?.trim() || (
              <span className="font-medium text-amber-800 dark:text-amber-200">
                Add your address in Settings to unlock hub features
              </span>
            )}
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Work:</span>{' '}
            {userProfile?.work_address?.trim() || 'Not set'}
          </div>
        </div>
      </button>

      {monitoredOthers.map(p => {
        const st = personStatuses[p.id]
        const memberSelected = Boolean(selectedMemberId && selectedMemberId === p.id)
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectMember(toRolePerson(p))}
            className={cn(
              HUB_PEOPLE_ROW_BASE,
              memberSelected ? HUB_PEOPLE_ROW_SELECTED : HUB_PEOPLE_ROW_IDLE
            )}
          >
            <div className="truncate text-xs font-semibold text-gray-900 dark:text-white">{p.name}</div>
            <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {p.familyRelation || p.relationship}
            </div>
            <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {p.mobilityOther || p.mobility || '—'}
            </div>
            {(p.address?.trim() || personCoords[p.id]) && (
              <div className="mt-1 line-clamp-2 text-left text-[10px] leading-snug text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-700 dark:text-gray-200">Live: </span>
                {p.address?.trim()
                  ? p.address.trim()
                  : 'On map from geocoded home — add their full street in Manage My People if you don’t see it here yet'}
              </div>
            )}
            {(st?.home || st?.safety) ? (
              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-left text-[10px] text-gray-800 dark:border-gray-600 dark:text-gray-100">
                {st.home && (
                  <div>
                    <span className="font-semibold">Home evacuation: </span>
                    {labelForHomeEvacuationStatus(st.home)}
                    {st.homeAt && (
                      <span className="text-gray-500 dark:text-gray-400"> · {new Date(st.homeAt).toLocaleString()}</span>
                    )}
                  </div>
                )}
                {st.safety && (
                  <div>
                    <span className="font-semibold">Safety: </span>
                    {PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.find(o => o.value === st.safety)?.label}
                    {st.safetyAt && (
                      <span className="text-gray-500 dark:text-gray-400"> · {new Date(st.safetyAt).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 border-t border-gray-100 pt-2 text-left text-[10px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Evacuation and safety status appear here after their next check-in.
              </p>
            )}
          </button>
        )
      })}
    </>
  )
}

const STAGE_META: Record<EvacStage, { bg: string; text: string; action: string }> = {
  'Order issued':    { bg: '#c86432', text: 'white',    action: 'Mandatory evacuation — go immediately. Shelter info on map.' },
  'Warning issued':  { bg: '#d97706', text: 'white',    action: 'Leave NOW — do not wait for Order. In high-SVI counties, a formal order may never be issued.' },
  'Advisory issued': { bg: '#d4a574', text: '#3e2723',  action: 'Load car, move valuables, prepare to leave immediately.' },
  'Watch (now)':     { bg: '#7cb342', text: 'white',    action: 'Pack go-bag, fill gas, locate pets, know your route.' },
}

// ── Main dashboard (household = evacuee; canonical route /dashboard/home) ───
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export type ConsumerRole = 'evacuee'

export function ConsumerHubDashboard({
  unifiedHub = false,
}: {
  /** Single hub at /dashboard/home — My People selection scopes map/Flameo. */
  unifiedHub?: boolean
}) {
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()
  const [proactiveUi, setProactiveUi] = useState<'hidden' | 'loading' | 'address' | 'briefing'>('hidden')
  const [briefingText, setBriefingText] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
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
    role?: string | null
  } | null>(null)
  const [personLocation, setPersonLocation] = useState<[number, number] | null>(null)

  const { mode, activePerson, setMode, setActivePerson } = useRoleContext()
  const isViewingMember = mode === 'member' && activePerson != null

  /** Home street for Flameo/map when viewing someone — RoleContext may omit address until refresh. */
  const flameoContextAddress = useMemo(() => {
    if (!isViewingMember || !activePerson) return null
    const direct = activePerson.address?.trim()
    if (direct) return direct
    const row = persons.find(p => p.id === activePerson.id)
    const fromRow = typeof row?.address === 'string' ? row.address.trim() : ''
    return fromRow || null
  }, [isViewingMember, activePerson, persons])

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
  const [alertRadiusMiles, setAlertRadiusMiles] = useState(DEFAULT_ALERT_RADIUS_MILES)
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
  const [mapFlyToNonce, setMapFlyToNonce] = useState(0)
  const [liveMapShelters, setLiveMapShelters] = useState<LiveShelterPin[]>([])
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

  // Geocode active My People member home (RoleContext address or row from profiles merge)
  useEffect(() => {
    if (!isViewingMember || !activePerson) {
      setPersonLocation(null)
      return
    }
    const addr =
      activePerson.address?.trim()
      || persons.find(p => p.id === activePerson.id)?.address?.trim()
      || ''
    if (!addr) {
      setPersonLocation(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const g = await geocodeAddressClient(addr)
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
  }, [isViewingMember, activePerson?.id, activePerson?.address, persons])

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

  useEffect(() => {
    const memberAddr =
      isViewingMember && activePerson
        ? activePerson.address?.trim()
          || persons.find(p => p.id === activePerson.id)?.address?.trim()
          || ''
        : ''
    const addr = memberAddr || userProfile?.address?.trim() || ''
    const st = parseUsStateCodeFromAddress(addr) || 'NC'
    if (!mapAnchor) {
      setLiveMapShelters([])
      return
    }
    const [lat, lng] = mapAnchor
    let cancelled = false
    fetch(
      `/api/shelters/live?state=${encodeURIComponent(st)}&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    )
      .then(r => r.json())
      .then(
        (data: {
          shelters?: Array<{
            id: string
            name: string
            lat: number
            lng: number
            capacity: number | null
            current_occupancy: number | null
            last_verified_at: string
          }>
        }) => {
          if (cancelled) return
          const list = Array.isArray(data.shelters) ? data.shelters : []
          setLiveMapShelters(
            list.map(s => ({
              id: String(s.id),
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              capacity: s.capacity,
              currentOccupancy: s.current_occupancy,
              lastVerifiedAt: s.last_verified_at,
            }))
          )
        }
      )
      .catch(() => {
        if (!cancelled) setLiveMapShelters([])
      })
    return () => {
      cancelled = true
    }
  }, [mapAnchor, isViewingMember, activePerson?.id, activePerson?.address, userProfile?.address, persons])

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
  const geocodeMonitoredPeople = true
  const showPeopleRail = true
  const personsManageHref = '/dashboard/home/persons'

  const monitoredOthers = useMemo(() => monitoredPersonsExcludingSelf(persons), [persons])

  const viewingMemberLiveLine = useMemo(() => {
    if (!isViewingMember || !activePerson) return ''
    const addr =
      activePerson.address?.trim()
      || persons.find(p => p.id === activePerson.id)?.address?.trim()
      || ''
    if (addr) return addr
    if (personCoords[activePerson.id]) {
      return 'On your hub map — their home street appears here when their profile shares it.'
    }
    return 'No home address yet — link their account or add a street under Manage people.'
  }, [isViewingMember, activePerson, persons, personCoords])

  const watchedLocationsForMap = useMemo(() => {
    const out: { label: string; lat: number; lng: number }[] = []
    if (geocodeMonitoredPeople) {
      for (const p of monitoredOthers) {
        const c = personCoords[p.id]
        if (c) out.push({ label: p.name, lat: c[0], lng: c[1] })
      }
    }
    return out
  }, [geocodeMonitoredPeople, monitoredOthers, personCoords])

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
    if (!geocodeMonitoredPeople || !monitoredOthers.length) {
      setPersonCoords({})
      return
    }
    let cancelled = false
    async function geocodeAll() {
      const next: Record<string, [number, number]> = {}
      for (const p of monitoredOthers) {
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
  }, [monitoredOthers, geocodeMonitoredPeople])

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

  async function locateOnMap() {
    setLocatingMap(true)
    try {
      await userLocHook.refreshPosition()
      setMapFlyToNonce(n => n + 1)
    } finally {
      setLocatingMap(false)
    }
  }

  const supabase = createClient()
  const refreshPersons = useCallback(
    async (
      userId: string,
      ensureLinked?: { linkedUserId: string; name: string; email: string }
    ) => {
      let list: MonitoredPerson[] = []
      try {
        list = (await loadMonitoredPersonsForHub(supabase, userId)) as MonitoredPerson[]
      } catch (e) {
        console.warn('[refreshPersons] Supabase load failed; using local cache if any', e)
        try {
          const raw = localStorage.getItem('monitored_persons_v2')
          if (raw) list = JSON.parse(raw) as MonitoredPerson[]
        } catch {
          list = []
        }
      }
      if (ensureLinked && !list.some(p => p.id === ensureLinked.linkedUserId)) {
        const row = linkedMonitoredPersonPlaceholder({
          linkedUserId: ensureLinked.linkedUserId,
          displayName: ensureLinked.name,
          email: ensureLinked.email,
        }) as MonitoredPerson
        list = [...list, row]
        try {
          localStorage.setItem('monitored_persons_v2', JSON.stringify(list))
        } catch {
          /* ignore */
        }
      }
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
                  'full_name, address, alert_radius_miles, role, work_address, work_building_type, work_floor_number, mobility_needs'
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
                role: prof?.role ?? null,
              })
              if (prof?.alert_radius_miles != null) {
                setAlertRadiusMiles(coerceAlertRadiusToChip(Number(prof.alert_radius_miles)))
              }
              setLoading(false)
              return
            }
          } catch {}
          const { data: prof } = await supabase
            .from('profiles')
            .select(
              'full_name, address, alert_radius_miles, work_address, work_building_type, work_floor_number, mobility_needs, role'
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
            role: typeof pr.role === 'string' ? pr.role : null,
          })
          if (prof?.alert_radius_miles != null) {
            setAlertRadiusMiles(coerceAlertRadiusToChip(Number(prof.alert_radius_miles)))
          }
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
  }, [hubUserId, persons, supabase])

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
    const emailInput = familyEmail.trim()
    if (!emailInput || !hubUserId) return
    setFamilyAddLoading(true)
    setFamilyAddErr(null)
    setFamilyAddOk(null)
    try {
      const res = await fetch('/api/family/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const base = typeof data.error === 'string' ? data.error : 'Request failed'
        const extra =
          typeof data.details === 'string' && data.details.trim()
            ? ` — ${data.details.trim()}`
            : typeof data.hint === 'string' && data.hint.trim()
              ? ` — ${data.hint.trim()}`
              : ''
        const code = typeof data.code === 'string' && data.code.trim() ? ` [${data.code}]` : ''
        setFamilyAddErr(`${base}${extra}${code}`)
        return
      }
      if (data.mode === 'linked') {
        setFamilyAddOk(`${data.name} — ${data.message}` || 'Added to My Family')
        setFamilyEmail('')
        const linkedId = typeof data.linkedUserId === 'string' ? data.linkedUserId : ''
        await refreshPersons(
          hubUserId,
          linkedId
            ? {
                linkedUserId: linkedId,
                name: typeof data.name === 'string' ? data.name : '',
                email: emailInput.toLowerCase(),
              }
            : undefined
        )
      } else if (data.mode === 'pending_signup') {
        setFamilyAddOk(typeof data.message === 'string' ? data.message : 'Added.')
        setFamilyEmail('')
      } else {
        const extra =
          data.devLink && !data.emailSent
            ? ` Copy link: ${data.devLink}`
            : ''
        const provider =
          typeof data.emailProviderMessage === 'string' && data.emailProviderMessage.trim()
            ? `\n\nResend: ${data.emailProviderMessage.trim()}`
            : ''
        setFamilyAddOk((data.message || 'Invitation sent.') + extra + provider)
        setFamilyEmail('')
      }
    } catch (e) {
      console.error('[handleFamilyInvite]', e)
      setFamilyAddErr(e instanceof Error ? e.message : 'Something went wrong.')
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

  const missingHomeAddress =
    !loading
    && requiresConsumerHomeAddress('evacuee')
    && userProfile != null
    && !userProfile.address?.trim()

  const meCard = (
    <div
      className={cn(
        'rounded-xl border-2 px-3 py-2.5',
        missingHomeAddress
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      )}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Me
      </div>
      <div className="text-xs font-semibold text-gray-900 dark:text-white">
        {userProfile?.full_name?.trim() || 'You'}
      </div>
      {userProfile?.email && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          {userProfile.email}
        </div>
      )}
      <div className="mt-1.5 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Home:</span>{' '}
          {userProfile?.address?.trim() || (
            <span className="font-medium text-amber-800 dark:text-amber-200">Add your address in Settings to unlock hub features</span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">Work:</span>{' '}
          {userProfile?.work_address?.trim() || 'Not set'}
        </div>
      </div>
    </div>
  )

  const flameoBriefingProps = {
    mode: proactiveUi,
    addressMessage: 'Add your home address in Settings so alerts and distances match where you live.',
    briefingText,
    hasNearbyFires: (flameo.context?.incidents_nearby?.length ?? 0) > 0,
    mapHref,
    checkinHref,
    alertsHref: `${hubBase}?panel=alerts`,
    settingsHref: '/dashboard/settings',
    onDismiss: dismissFlameoPrologue,
  }
  const shouldShowShelterRoutes =
    (flameo.status === 'ready' || flameo.status === 'feeds_partial' || flameo.status === 'no_fires_in_radius')
    && (flameo.context?.shelters_ranked?.length ?? 0) > 0
    && userLocHook.lat != null
    && userLocHook.lng != null
  const wheelchairShelterMode =
    (userProfile?.mobility_needs ?? []).some(v => /\b(wheelchair|mobility|device)\b/i.test(String(v)))
  const hasWheelchairNeed =
    (userProfile?.mobility_needs ?? []).some(v => /\b(wheelchair|mobility|device)\b/i.test(String(v)))

  const situationRoomPeople = useMemo(() => {
    const incidents = flameo.context?.incidents_nearby ?? []
    return monitoredOthers.map(p => {
      const status = personStatuses[p.id]
      const coord = personCoords[p.id]
      let inDanger = false
      if (coord && incidents.length > 0) {
        inDanger = incidents.some(i => distanceMiles(coord, [i.lat, i.lon]) <= alertRadiusMiles)
      }
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        home_evacuation_status: status?.home ?? null,
        in_danger_zone: inDanger,
      }
    })
  }, [
    alertRadiusMiles,
    flameo.context?.incidents_nearby,
    monitoredOthers,
    personCoords,
    personStatuses,
  ])

  const memberPersonCard =
    isViewingMember && activePerson ? (
      <div className="rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/80 px-3 py-2.5 shadow-sm dark:border-amber-700/50 dark:from-amber-950/45 dark:via-gray-900 dark:to-amber-950/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200/90">
          My People — live location
        </div>
        <div className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{activePerson.name}</div>
        <div className="mt-1.5 text-[11px] leading-snug text-gray-700 dark:text-gray-200">
          <span className="font-semibold text-gray-900 dark:text-white">Live: </span>
          {viewingMemberLiveLine}
        </div>
      </div>
    ) : null

  return (
    <div className="flex min-h-[100dvh] w-full flex-1 flex-col">
      {bpMd === undefined && (
        <div className="flex flex-1 min-h-[50vh] items-center justify-center p-8 text-sm text-gray-500">
          Loading your hub…
        </div>
      )}

      {missingHomeAddress && bpMd !== undefined && (
        <div
          role="alert"
          className="mx-4 mt-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm dark:border-amber-800 dark:bg-amber-950/50"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-100">Add your home address</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            The hub, fire alerts, and distance-to-fire features need a saved home location. Add it in Settings when you&apos;re ready — we won&apos;t send you away from this page.
          </p>
          <Link
            href="/dashboard/settings?tab=profile"
            className="mt-2 inline-block text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
          >
            Open Settings to add address
          </Link>
        </div>
      )}

      {/* ══ MOBILE LAYOUT (< md) — only one branch mounts so Leaflet is not initialized twice ══ */}
      {bpMd !== true && (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-4 px-4 pt-4 pb-28 [-webkit-overflow-scrolling:touch]"
        style={{ background: 'var(--wfa-page-bg)' }}
      >

        {/* Header */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wfa-accent)' }}>
            {isViewingMember
              ? `Viewing ${activePerson!.name}`
              : 'Your household'}
          </div>
          <h1 className="font-display font-bold text-2xl mt-0.5" style={{ color: 'var(--wfa-text)' }}>
            {isViewingMember
              ? `${activePerson!.name.split(' ')[0]}'s Hub`
              : 'My Hub'}
          </h1>
        </div>

        {memberPersonCard}

        {!showPeopleRail && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {meCard}
          </div>
        )}

        {/* Map (hero) */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowShelters(v => !v)} className={`text-[11px] px-2 py-1 rounded-lg border ${showShelters ? 'bg-emerald-50 border-emerald-400' : 'border-gray-200'}`}>Shelters</button>
          <button type="button" onClick={() => setShowFacilities(v => !v)} className={`text-[11px] px-2 py-1 rounded-lg border ${showFacilities ? 'bg-amber-50 border-amber-400' : 'border-gray-200'}`}>Hazards</button>
          <button type="button" onClick={locateOnMap} className="text-[11px] px-2 py-1 rounded-lg border border-blue-200 bg-blue-50">Locate</button>
          <button type="button" onClick={refreshNifcHub} className="text-[11px] px-2 py-1 rounded-lg border border-gray-200">Refresh</button>
        </div>
        <div className="h-56 rounded-2xl overflow-hidden relative border border-gray-200" data-hub-tour="map">
          <MapErrorBoundary mapHref={mapHref}>
            <LeafletMap
              nifc={sortedNifc}
              userLocation={userLocation}
              center={mapAnchor ?? userLocation ?? [37.5, -119.5]}
              flyToUserZoom={7}
              flyToTrigger={mapFlyToNonce}
              suppressInitialFlyToUser={false}
              homePosition={homeCoords}
              showHomePin={isAwayFromHome && !!homeCoords}
              shelters={HUMAN_EVAC_SHELTERS}
              liveShelters={liveMapShelters}
              showShelters={showShelters}
              watchedLocations={watchedLocationsForMap}
              facilities={HAZARD_FACILITIES}
              showFacilities={showFacilities}
              windData={windData}
              householdPins={[]}
              onHouseholdPinsUpdated={undefined}
              nifcCircleMarkersOnly={false}
            />
          </MapErrorBoundary>
        </div>

        {/* Fire alert card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--wfa-hero-bg)' }} data-hub-tour="alerts">
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
                {isViewingMember
                  ? `Ping ${activePerson!.name.split(' ')[0]}`
                  : 'Check in safe'}
              </div>
              <div className="text-white/40 text-[10px] mt-0.5">
                Update your status
              </div>
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
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">Checklist</div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {GO_BAG_ITEMS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleGoBagItem(item.id)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/80"
                >
                  <input
                    type="checkbox"
                    checked={bagChecked.has(item.id)}
                    readOnly
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                  />
                  <span className="text-[11px] text-gray-800 dark:text-gray-200">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* My People */}
        {showPeopleRail && (
          <div data-hub-tour="people" className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">My People</div>
              <p className="mb-2 text-[11px] leading-snug text-gray-600 dark:text-gray-400">
                Tap <span className="font-semibold text-gray-800 dark:text-gray-200">Me</span> or{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">Live location</span> for your map; tap a family row to center on them. Each row shows <span className="font-semibold text-gray-800 dark:text-gray-200">Live:</span> home when their profile shares it, plus evacuation status when they share check-ins.
              </p>
              <div className="space-y-2">
                <HubMyPeopleRows
                  monitoredOthers={monitoredOthers}
                  personStatuses={personStatuses}
                  personCoords={personCoords}
                  liveAddressLabel={liveAddressLabel}
                  isAwayFromHome={isAwayFromHome}
                  viewingSelf={!isViewingMember}
                  selectedMemberId={isViewingMember && activePerson ? activePerson.id : null}
                  onSelectSelf={() => { setMode('self'); setActivePerson(null) }}
                  onSelectMember={setActivePerson}
                  missingHomeAddress={missingHomeAddress}
                  userProfile={userProfile}
                />
              </div>
            </div>
          <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">My People</div>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
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
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
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
            onSaveFloor={saveWorkFloorToProfile}
          />
        )}

        <ProactiveBriefing {...flameoBriefingProps} variant="panel" />
        {shouldShowShelterRoutes && flameo.context?.shelters_ranked && (
          <ShelterRouteCard
            shelters={flameo.context.shelters_ranked}
            userLat={userLocHook.lat!}
            userLng={userLocHook.lng!}
            mapHref={mapHref}
            wheelchairMode={wheelchairShelterMode}
            shelterDataCheckedAt={flameo.context.shelters_meta?.last_checked_at}
            shelterCacheAgeSeconds={flameo.context.shelters_meta?.cache_age_seconds}
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
            <div className="text-white/50 text-[11px]">
              Fires and resources near you
            </div>
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
      <div className="flex min-h-0 max-h-[100dvh] flex-1 flex-col overflow-hidden">
        {/* Root: viewport-tall 3-column layout — max-h + min-h-0 so My alerts column can scroll */}
        <div
          ref={containerRef}
          className="flex min-h-0 flex-1 overflow-hidden items-stretch"
          style={{ background: 'var(--wfa-page-bg)', fontFamily: 'var(--font-body)', userSelect: dragging ? 'none' : undefined }}
        >

          {/* ══ LEFT — household My People, evacuee You, or responder operations ═══════════════════ */}
          <div
            data-hub-tour="people"
            className="flex min-h-0 flex-col shrink-0 border-r"
            style={{ width: `${leftPct}%`, minWidth: 180, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-l)' }}
          >
            <div className="border-b border-gray-200 px-4 pb-3 pt-5 dark:border-gray-700">
              <div className="font-display text-lg font-bold text-gray-900 dark:text-white">
                {showPeopleRail ? 'My People' : 'You'}
              </div>
              <div className="mt-1 text-xs leading-snug text-gray-600 dark:text-gray-400">
                {showPeopleRail
                  ? 'If you are caring for somebody or watching out for your family, add them here. Tap Me or Live location for your map, or a family row for theirs.'
                  : 'Address powers nearby alerts'}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {showPeopleRail ? (
                <>
                  {memberPersonCard}
                  <HubMyPeopleRows
                    monitoredOthers={monitoredOthers}
                    personStatuses={personStatuses}
                    personCoords={personCoords}
                    liveAddressLabel={liveAddressLabel}
                    isAwayFromHome={isAwayFromHome}
                    viewingSelf={!isViewingMember}
                    selectedMemberId={isViewingMember && activePerson ? activePerson.id : null}
                    onSelectSelf={() => { setMode('self'); setActivePerson(null) }}
                    onSelectMember={setActivePerson}
                    missingHomeAddress={missingHomeAddress}
                    userProfile={userProfile}
                  />
                  <Link
                    href={personsManageHref}
                    className="flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl border border-dashed"
                    style={{ borderColor: 'var(--wfa-border)', color: 'var(--wfa-accent)' }}
                  >
                    Manage people
                  </Link>
                  <div className="space-y-1.5 rounded-xl border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">Add someone</div>
                    <input
                      type="email"
                      value={familyEmail}
                      onChange={e => { setFamilyEmail(e.target.value); setFamilyAddErr(null); setFamilyAddOk(null) }}
                      placeholder="evacuee@email.com"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[11px] text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
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
                <div
                  className={cn(
                    'rounded-xl border-2 p-3',
                    missingHomeAddress
                      ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  )}
                >
                  <div className="mb-1 text-xs font-semibold text-gray-900 dark:text-white">{userProfile?.full_name || 'My profile'}</div>
                  <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {userProfile?.address?.trim() || (
                      <span className="font-medium text-amber-800 dark:text-amber-200">Add your home address in Settings — hub and alerts need it</span>
                    )}
                  </div>
                  <Link href="/dashboard/settings?tab=profile" className="mt-2 inline-block text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100">
                    Edit profile →
                  </Link>
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
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">Checklist</div>
                  <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {GO_BAG_ITEMS.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleGoBagItem(item.id)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/80"
                      >
                        <input
                          type="checkbox"
                          checked={bagChecked.has(item.id)}
                          readOnly
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                        />
                        <span className="text-[11px] text-gray-800 dark:text-gray-200">{item.label}</span>
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
          <div data-hub-tour="map" className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ minWidth: 240 }}>
            <div className="shrink-0 px-3 py-2 border-b flex flex-wrap items-center gap-2 justify-between" style={{ borderColor: 'var(--wfa-border)', background: 'var(--wfa-page-bg)' }}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--wfa-accent)' }}>
                  Evacuation map
                </div>
                <div className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--wfa-text)' }}>
                  {isViewingMember
                    ? `${activePerson!.name.split(' ')[0]}'s view`
                    : 'My Hub'}
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
                  flyToTrigger={mapFlyToNonce}
                  suppressInitialFlyToUser={false}
                  homePosition={homeCoords}
                  showHomePin={isAwayFromHome && !!homeCoords}
                  shelters={HUMAN_EVAC_SHELTERS}
                  liveShelters={liveMapShelters}
                  showShelters={showShelters}
                  watchedLocations={watchedLocationsForMap}
                  facilities={HAZARD_FACILITIES}
                  showFacilities={showFacilities}
                  windData={windData}
                  householdPins={[]}
                  onHouseholdPinsUpdated={undefined}
                  nifcCircleMarkersOnly={false}
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
            data-hub-tour="alerts"
            ref={alertsPanelRef}
            className="flex min-h-0 min-w-0 flex-col shrink-0 border-l scroll-mt-4"
            style={{ width: `${rightPct}%`, minWidth: 220, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-r)' }}
          >
            <div className="px-4 pt-4 pb-2 border-b shrink-0" style={{ borderColor: 'var(--wfa-border-lite)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--wfa-accent)' }} />
                  <span className="font-display truncate text-lg font-bold" style={{ color: 'var(--wfa-text)' }}>
                    My alerts
                  </span>
                </div>
                <Link href="/dashboard/settings" className="shrink-0 text-sm font-semibold" style={{ color: 'var(--wfa-accent)' }}>Settings</Link>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--wfa-text-40)' }}>
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
                  onSaveFloor={saveWorkFloorToProfile}
                />
              )}
              <FlameoSituationRoom
                flameoContext={flameo.context}
                flameoStatus={flameo.status}
                flameoBriefing={briefingText}
                flameoLoading={flameo.loading}
                flameoError={flameo.error}
                userLat={userLocHook.lat}
                userLng={userLocHook.lng}
                detectedAnchor={userLocHook.detected_anchor ?? 'home'}
                myPeople={situationRoomPeople}
                peopleSectionTitle="My People"
                wheelchairMode={hasWheelchairNeed}
                onAskFlameo={() => router.push(`${hubBase}/ai`)}
              />
            </div>
          </div>

        </div>
      </div>
      )}

      {unifiedHub && pathname === '/dashboard/home' && <FlameoHubTour active />}
    </div>
  )
}

function EvacueeHubDashboardInner() {
  return <ConsumerHubDashboard unifiedHub />
}

/** Default page for legacy `/dashboard/caregiver` — same hub as `/dashboard/home`. */
export default function EvacueeHubDashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <EvacueeHubDashboardInner />
    </Suspense>
  )
}
