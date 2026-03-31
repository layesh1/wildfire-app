'use client'

import { useEffect, useMemo, useState, Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { Heart, Factory, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { NifcFire, WindData, EvacShelter } from '@/app/dashboard/caregiver/map/LeafletMap'
import type { HazardFacility } from '@/lib/hazard-facilities'
import { useRoleContext, type RolePerson } from '@/components/RoleContext'
import { loadPersons } from '@/lib/user-data'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { distanceMiles } from '@/lib/hub-map-distance'
import { useConsumerAlerts } from '@/hooks/useConsumerAlerts'
import { geocodeAddressClient } from '@/lib/geocoding-client'
const LeafletMap = dynamic(() => import('@/app/dashboard/caregiver/map/LeafletMap'), { ssr: false })

class MapErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  render() {
    if (this.state.crashed) {
      return (
        <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-gray-100 px-4 text-center text-sm text-gray-600">
          <p>The map could not load.</p>
          <p className="text-xs text-gray-500">Try refreshing the page.</p>
        </div>
      )
    }
    return this.props.children
  }
}

type MonitoredPerson = {
  id: string
  name: string
  address?: string
  mobility?: string
  mobilityOther?: string
}

function toRolePerson(p: MonitoredPerson): RolePerson {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    relationship: undefined,
  }
}

export default function EvacuationMapExperience({
  consumerRole: _consumerRole = 'evacuee',
  mobile = false,
}: {
  /** Legacy `caregiver` matches `evacuee` (unified consumer). */
  consumerRole?: 'evacuee' | 'caregiver'
  mobile?: boolean
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isHomeHub =
    pathname.startsWith('/dashboard/home') || pathname.startsWith('/m/dashboard/home')
  const hubBase = isHomeHub ? '/dashboard/home' : '/dashboard/evacuee'
  const mHub = isHomeHub ? '/m/dashboard/home' : '/m/dashboard/evacuee'

  const [nifc, setNifc] = useState<NifcFire[]>([])
  const [persons, setPersons] = useState<MonitoredPerson[]>([])
  const [userProfile, setUserProfile] = useState<{ address?: string | null } | null>(null)
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [personLocation, setPersonLocation] = useState<[number, number] | null>(null)
  const [personCoords, setPersonCoords] = useState<Record<string, [number, number]>>({})
  const [showShelters, setShowShelters] = useState(true)
  const [showFacilities, setShowFacilities] = useState(true)
  const [windData, setWindData] = useState<WindData | null>(null)
  const [locatingMap, setLocatingMap] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(!mobile)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [aiEnabled, setAiEnabled] = useState(false)

  const { mode, activePerson, setMode, setActivePerson } = useRoleContext()
  const isViewingMember = mode === 'member' && activePerson !== null

  /** Deep links from Flameo Phase C tools: ?lat=&lon=&shelters=1 */
  useEffect(() => {
    if (searchParams.get('shelters') === '1') setShowShelters(true)
    const la = parseFloat(searchParams.get('lat') || '')
    const lo = parseFloat(searchParams.get('lon') || '')
    if (Number.isFinite(la) && Number.isFinite(lo)) setUserLocation([la, lo])
  }, [searchParams])

  useEffect(() => {
    if (!activePerson?.address) {
      setPersonLocation(null)
      return
    }
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

  const sortedNifc = useMemo(() => {
    return [...nifc].sort((a, b) => {
      const ca = a.containment ?? -1
      const cb = b.containment ?? -1
      if (ca !== cb) return ca - cb
      return (b.acres ?? 0) - (a.acres ?? 0)
    })
  }, [nifc])

  const watchedLocationsForMap = useMemo(() => {
    const out: { label: string; lat: number; lng: number }[] = []
    for (const p of persons) {
      const c = personCoords[p.id]
      if (c) out.push({ label: p.name, lat: c[0], lng: c[1] })
    }
    return out
  }, [persons, personCoords])

  const nearestSheltersList = useMemo(() => {
    if (!mapAnchor) return [] as EvacShelter[]
    const origin: [number, number] = [mapAnchor[0], mapAnchor[1]]
    return [...HUMAN_EVAC_SHELTERS]
      .map(s => ({ s, d: distanceMiles(origin, [s.lat, s.lng]) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 6)
      .map(x => x.s)
  }, [mapAnchor])

  const nearestHazardsList = useMemo(() => {
    if (!mapAnchor) return [] as HazardFacility[]
    const origin: [number, number] = [mapAnchor[0], mapAnchor[1]]
    return [...HAZARD_FACILITIES]
      .map(h => ({ h, d: distanceMiles(origin, [h.lat, h.lng]) }))
      .filter(x => x.d <= 200)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map(x => x.h)
  }, [mapAnchor])

  const { proximityItems, aiSummary, aiLoading, aiError } = useConsumerAlerts(
    nifc,
    homeAnchorForAlerts,
    radiusMiles,
    aiEnabled,
    homeLabelForAi
  )

  useEffect(() => {
    if (!persons.length) {
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
    return () => {
      cancelled = true
    }
  }, [persons])

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

  const supabase = createClient()
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          if (Number.isFinite(lat) && Number.isFinite(lon)) setUserLocation([lat, lon])
        },
        () => {}
      )
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('address, alert_radius_miles, alerts_ai_enabled')
        .eq('id', user.id)
        .single()
      setUserProfile({ address: prof?.address ?? null })
      if (prof?.alert_radius_miles != null) setRadiusMiles(Number(prof.alert_radius_miles))
      if (prof?.alerts_ai_enabled != null) setAiEnabled(!!prof.alerts_ai_enabled)
      const p = await loadPersons(supabase, user.id)
      setPersons(p as MonitoredPerson[])
      const nifcRes = await fetch('/api/fires/nifc').catch(() => null)
      if (nifcRes?.ok) {
        const json = await nifcRes.json().catch(() => ({}))
        if (json?.data) setNifc(json.data)
      }
    }
    load()
  }, [supabase])

  function locateOnMap() {
    if (!navigator.geolocation) return
    setLocatingMap(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (Number.isFinite(lat) && Number.isFinite(lon)) setUserLocation([lat, lon])
        setLocatingMap(false)
      },
      () => setLocatingMap(false),
      { timeout: 10000 }
    )
  }

  async function refreshNifc() {
    const nifcRes = await fetch('/api/fires/nifc').catch(() => null)
    if (nifcRes?.ok) {
      const json = await nifcRes.json().catch(() => ({}))
      if (json?.data) setNifc(json.data)
    }
  }

  const checkinHref = mobile
    ? isHomeHub
      ? '/m/dashboard/home/checkin'
      : '/m/dashboard/evacuee/checkin'
    : isHomeHub
      ? '/dashboard/home/checkin'
      : '/dashboard/evacuee/checkin'

  const rail = (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l border-gray-200">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-700 flex items-center gap-1">
          <Bell className="w-3.5 h-3.5" /> Alerts & resources
        </span>
        {!mobile && (
          <button
            type="button"
            aria-label="Collapse panel"
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {aiLoading && (
          <div className="text-xs text-gray-500 animate-pulse">Generating AI summary…</div>
        )}
        {aiError && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">{aiError}</div>}
        {aiSummary && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3">
            <div className="text-[10px] font-bold uppercase text-violet-700">AI summary</div>
            <div className="font-semibold text-gray-900 text-sm mt-0.5">{aiSummary.headline}</div>
            <ul className="mt-2 space-y-1 text-xs text-gray-700 list-disc pl-4">
              {aiSummary.bullets.slice(0, 5).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {homeAnchorForAlerts && proximityItems.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-gray-600 uppercase mb-1">
              {isViewingMember && activePerson
                ? `Fires near ${activePerson.name.split(' ')[0]}'s address (${radiusMiles} mi)`
                : `Fires near home (${radiusMiles} mi)`}
            </div>
            <div className="space-y-1.5">
              {proximityItems.slice(0, 8).map(f => (
                <div key={f.id} className="rounded-lg px-2 py-1.5 text-xs bg-orange-50 border border-orange-100">
                  <div className="font-medium text-gray-900 truncate">{f.fire_name}</div>
                  <div className="text-gray-500">
                    {f.distanceKm < 1 ? `${Math.round(f.distanceKm * 1000)} m` : `${f.distanceKm.toFixed(1)} km`} away
                    {f.containment != null ? ` · ${f.containment}% contained` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!!nearestSheltersList.length && (
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> Shelters
            </div>
            <div className="space-y-1.5">
              {nearestSheltersList.map(s => {
                const d = mapAnchor ? distanceMiles(mapAnchor, [s.lat, s.lng]) : null
                return (
                  <div key={s.id} className="rounded-lg px-2 py-1.5 text-xs bg-emerald-50/80 border border-emerald-100">
                    <div className="font-medium text-emerald-950">{s.name}</div>
                    <div className="text-emerald-800/80">
                      {s.county}
                      {d != null ? ` · ${d.toFixed(0)} mi` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!!nearestHazardsList.length && (
          <div>
            <div className="text-[11px] font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
              <Factory className="w-3.5 h-3.5" /> Hazards
            </div>
            <div className="space-y-1.5">
              {nearestHazardsList.map(h => {
                const d = mapAnchor ? distanceMiles(mapAnchor, [h.lat, h.lng]) : null
                return (
                  <div key={h.id} className="rounded-lg px-2 py-1.5 text-xs bg-amber-50/50 border border-amber-100">
                    <div className="font-medium text-amber-950">{h.name}</div>
                    <div className="text-amber-900/70">
                      {h.county}, {h.state}
                      {d != null ? ` · ${d.toFixed(0)} mi` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!mapAnchor && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
            Add your home address in Settings to center the map.
          </div>
        )}
        <Link
          href={`${checkinHref}?returnTo=${encodeURIComponent(mobile ? mHub : hubBase)}`}
          className="block text-center py-2.5 rounded-xl border-2 border-amber-500 bg-white text-amber-900 text-xs font-semibold shadow-sm hover:bg-amber-50 transition-colors"
        >
          Open check-in
        </Link>
      </div>
    </div>
  )

  const toolbar = (
    <div className="flex flex-wrap gap-1.5 items-center justify-between px-2 py-1.5 bg-white/95 border-b border-gray-200 shrink-0">
      <Link
        href={mobile ? mHub : hubBase}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4" /> Hub
      </Link>
      <div className="flex flex-wrap gap-1 justify-end">
        <button
          type="button"
          onClick={locateOnMap}
          disabled={locatingMap}
          className="text-[11px] px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 font-medium disabled:opacity-50"
        >
          {locatingMap ? '…' : 'Locate'}
        </button>
        <button
          type="button"
          onClick={() => setShowShelters(v => !v)}
          className={`text-[11px] px-2 py-1 rounded-lg border font-medium ${showShelters ? 'bg-emerald-50 border-emerald-300' : 'border-gray-200'}`}
        >
          Shelters
        </button>
        <button
          type="button"
          onClick={() => setShowFacilities(v => !v)}
          className={`text-[11px] px-2 py-1 rounded-lg border font-medium ${showFacilities ? 'bg-amber-50 border-amber-300' : 'border-gray-200'}`}
        >
          Hazards
        </button>
        <button
          type="button"
          onClick={refreshNifc}
          className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  )

  const mapNode = (
    <MapErrorBoundary>
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
  )

  if (mobile) {
    return (
      <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100dvh - 5rem)' }}>
        {toolbar}
        <div className="flex-1 min-h-0 relative">
          {mapNode}
          <button
            type="button"
            onClick={() => setSheetOpen(v => !v)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold shadow-lg"
          >
            {sheetOpen ? 'Hide panel' : 'Shelters & alerts'}
          </button>
        </div>
        {sheetOpen && (
          <div className="border-t border-gray-200 bg-white max-h-[45vh] overflow-hidden flex flex-col">
            {rail}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0" style={{ height: 'calc(100dvh - 2.75rem)' }}>
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {toolbar}
        <div className="flex-1 min-h-0 relative">{mapNode}</div>
      </div>
      {drawerOpen && (
        <div className="w-full md:w-[min(360px,36vw)] shrink-0 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col min-h-[200px] md:min-h-0">
          {persons.length > 0 && (
            <div className="px-2 py-2 border-b border-gray-100 text-[11px] space-y-1 max-h-28 overflow-y-auto bg-gray-50">
              <div className="font-semibold text-gray-600">Map anchor</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('self')
                    setActivePerson(null)
                  }}
                  className={`px-2 py-0.5 rounded-md border text-[10px] ${mode === 'self' ? 'bg-white border-gray-400' : 'border-transparent'}`}
                >
                  Me
                </button>
                {persons.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePerson(toRolePerson(p))}
                    className={`px-2 py-0.5 rounded-md border text-[10px] truncate max-w-[100px] ${activePerson?.id === p.id ? 'bg-white border-gray-400' : 'border-transparent'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {rail}
        </div>
      )}
      {!drawerOpen && (
        <button
          type="button"
          aria-label="Open panel"
          onClick={() => setDrawerOpen(true)}
          className="hidden md:flex items-center px-1 border-l border-gray-200 bg-gray-100 hover:bg-gray-200"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
    </div>
  )
}
