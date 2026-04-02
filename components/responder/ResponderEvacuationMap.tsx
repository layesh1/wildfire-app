'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Factory,
  Clock,
  RefreshCw,
  MessageCircle,
  Phone,
  Heart,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { HouseholdPin } from '@/lib/responder-household'
import {
  CHARLOTTE_DEMO_NIFC_FIRES,
  FIELD_HUB_DEMO_MAP_CENTER,
  RESPONDER_DEMO_HOUSEHOLDS_TAGGED,
} from '@/lib/responder-demo-households'
import { fetchResponderEvacuationHouseholds } from '@/lib/fetch-responder-evacuation-households'
import type { FlameoContext } from '@/lib/flameo-context-types'
import FlameoCommandRoom from '@/components/flameo/FlameoCommandRoom'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import { distanceMiles } from '@/lib/hub-map-distance'
import { parseUsStateCodeFromAddress } from '@/lib/us-address-state'
import type { EvacueePin } from '@/components/EvacueeStatusMap'
import type { LiveShelterPin, NifcFire, WindData } from '@/app/dashboard/caregiver/map/LeafletMap'

const EvacueeStatusMap = dynamic(() => import('@/components/EvacueeStatusMap'), { ssr: false })

const EMPTY_EVACUEE_PINS: EvacueePin[] = []

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

export type ResponderEvacuationMapProps = {
  mapCenter: [number, number]
  mapZoom?: number
  flameoContext: FlameoContext | null
  canAccessEvacueeData: boolean
  /** Wildfire incidents shown when not in demo mode (miles from `mapCenter`). */
  incidentRadiusMiles?: number
  stationAddressForDirections?: string | null
  stationGeoReady?: boolean
  /** True when profile `address` (station / base) is empty — prompts Settings. */
  stationProfileAddressMissing?: boolean
}

/**
 * Command hub map: households, NIFC (radius-scoped live / Charlotte demo), hazards, shelters, Flameo COMMAND.
 */
export default function ResponderEvacuationMap({
  mapCenter,
  mapZoom = 11,
  flameoContext,
  canAccessEvacueeData,
  incidentRadiusMiles = 50,
  stationAddressForDirections = null,
  stationGeoReady = true,
  stationProfileAddressMissing = false,
}: ResponderEvacuationMapProps) {
  const [householdPins, setHouseholdPins] = useState<HouseholdPin[]>([])
  const [mapDemoMode, setMapDemoMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [showFacilities, setShowFacilities] = useState(false)
  const [showShelters, setShowShelters] = useState(true)
  const [liveMapShelters, setLiveMapShelters] = useState<LiveShelterPin[]>([])
  const [responderProfiles, setResponderProfiles] = useState<ResponderVisibleProfile[]>([])
  const [commandBriefingKey, setCommandBriefingKey] = useState(0)
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const [nifcFires, setNifcFires] = useState<NifcFire[]>([])
  const [windData, setWindData] = useState<WindData | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const effectiveMapCenter = useMemo<[number, number]>(
    () => (mapDemoMode ? FIELD_HUB_DEMO_MAP_CENTER : mapCenter),
    [mapDemoMode, mapCenter]
  )

  const nifcForEvacMap = useMemo(() => {
    if (mapDemoMode) return [...CHARLOTTE_DEMO_NIFC_FIRES]
    const hub = mapCenter
    const r = incidentRadiusMiles
    return nifcFires.filter(f => {
      if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) return false
      return distanceMiles([f.latitude, f.longitude], hub) <= r
    })
  }, [mapDemoMode, nifcFires, mapCenter, incidentRadiusMiles])

  useEffect(() => {
    const st =
      parseUsStateCodeFromAddress(stationAddressForDirections ?? '')
      || (Math.abs(effectiveMapCenter[0] - 35.2) < 3 && Math.abs(effectiveMapCenter[1] + 80.8) < 3 ? 'NC' : 'CA')
    const [lat, lng] = effectiveMapCenter
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
  }, [effectiveMapCenter, stationAddressForDirections])

  const refreshFiresAndWind = useCallback(async () => {
    if (!mapDemoMode) {
      try {
        const nifcRes = await fetch('/api/fires/nifc')
        if (nifcRes.ok) {
          const json = (await nifcRes.json().catch(() => ({}))) as { data?: NifcFire[] }
          if (Array.isArray(json.data)) setNifcFires(json.data)
        }
      } catch {
        /* ignore */
      }
    }
    const [lat, lng] = effectiveMapCenter
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setWindData(null)
      return
    }
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=auto`
      )
      const data = (await r.json()) as {
        current?: { wind_speed_10m?: number; wind_direction_10m?: number }
      }
      const speed = data?.current?.wind_speed_10m
      const dir = data?.current?.wind_direction_10m
      if (speed != null && dir != null) {
        setWindData({
          speedMph: speed,
          directionDeg: dir,
          spreadDeg: (dir + 180) % 360,
        })
      } else {
        setWindData(null)
      }
    } catch {
      setWindData(null)
    }
  }, [mapDemoMode, effectiveMapCenter])

  useEffect(() => {
    void refreshFiresAndWind()
  }, [refreshFiresAndWind])

  const loadEvacMap = useCallback(async () => {
    try {
      const { householdPins: hp, demoMode } = await fetchResponderEvacuationHouseholds()
      setHouseholdPins(hp)
      setMapDemoMode(demoMode)
    } catch {
      setHouseholdPins(RESPONDER_DEMO_HOUSEHOLDS_TAGGED)
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
        const data = (await res.json()) as { count?: number }
        setRedFlagCount(typeof data.count === 'number' ? data.count : null)
      }
    } catch {
      // ignore
    }

    await refreshFiresAndWind()

    setLastUpdated(new Date())
    setLoading(false)
  }, [canAccessEvacueeData, loadEvacMap, refreshFiresAndWind, supabase])

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
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] min-h-[70dvh] wfa-responder-map-surface rounded-xl overflow-hidden border border-gray-200 bg-white dark:border-ash-800 dark:bg-ash-900">
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-ash-800 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 bg-gray-50/90 dark:bg-ash-900">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 shrink-0 text-amber-700 dark:text-signal-info" />
            <span className="font-display font-bold text-gray-900 dark:text-white text-sm truncate">
              Command hub
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-ash-500 pl-7 leading-snug max-w-xl">
            {mapDemoMode
              ? 'Training scenario: Charlotte metro — demo households and simulated fire markers (circles).'
              : `Live NIFC incidents within ${incidentRadiusMiles} mi of your station anchor, with hazards and shelters.`}
          </p>
        </div>

        {(stationProfileAddressMissing || !stationGeoReady) && (
          <div className="w-full order-last sm:order-none rounded-lg border border-amber-300/80 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
            {!stationGeoReady ? (
              <span>Resolving map anchor (station address or device location)…</span>
            ) : (
              <span>
                Add your <strong>fire station or base address</strong> under profile settings so the map, incident radius, and directions use the correct origin.{' '}
                <Link href="/dashboard/settings?tab=profile" className="font-semibold underline underline-offset-2">
                  Open settings
                </Link>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-safe/10 border border-signal-safe/20">
            <CheckCircle className="w-3 h-3 text-signal-safe" />
            <span className="text-signal-safe text-xs font-bold">{byHome.evacuated}</span>
            <span className="text-gray-500 dark:text-ash-500 text-xs">evacuated</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 dark:bg-ash-800 dark:border-ash-600">
            <MapPin className="w-3 h-3 text-gray-500 dark:text-ash-400" />
            <span className="text-gray-800 dark:text-ash-300 text-xs font-bold">{byHome.not_evacuated}</span>
            <span className="text-gray-500 dark:text-ash-500 text-xs">not evacuated</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-200 dark:bg-signal-danger/10 dark:border-signal-danger/30">
            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-signal-danger" />
            <span className="text-red-700 dark:text-signal-danger text-xs font-bold">{byHome.cannot_evacuate}</span>
            <span className="text-gray-500 dark:text-ash-500 text-xs">cannot evacuate</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFacilities(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showFacilities
              ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-400'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-ash-700 dark:text-ash-400 dark:hover:text-white dark:hover:border-ash-600'
          }`}
        >
          <Factory className="w-3 h-3" />
          {showFacilities ? 'Hazard Sites: ON' : 'Hazard Sites'}
        </button>

        <button
          type="button"
          onClick={() => setShowShelters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showShelters
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-ash-700 dark:text-ash-400 dark:hover:text-white dark:hover:border-ash-600'
          }`}
        >
          <Heart className="w-3 h-3" />
          {showShelters ? 'Shelters: ON' : 'Shelters'}
        </button>

        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
          {redFlagCount !== null && redFlagCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
              <AlertTriangle className="w-3 h-3 text-signal-danger shrink-0" />
              <span className="text-signal-danger text-xs font-medium">
                {redFlagCount} Red Flag Warning{redFlagCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ash-500 text-xs">
            <Clock className="w-3 h-3 shrink-0" />
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ash-700 text-ash-400 hover:text-white hover:border-ash-600 transition-colors text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row gap-0">
        {!canAccessEvacueeData ? (
          <div className="flex flex-1 min-h-[220px] items-center justify-center px-4 lg:min-h-0">
            <div className="max-w-md text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-amber-500/80" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Evacuation data is locked</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-ash-500">
                Accept the Data Access Agreement to load the evacuation map and opt-in household details.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[220px] lg:min-h-0">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-signal-info/30 border-t-signal-info rounded-full animate-spin mx-auto mb-3" />
              <div className="text-gray-500 dark:text-ash-500 text-sm">Loading evacuation data…</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-[220px] min-w-0 lg:min-h-0">
              <EvacueeStatusMap
                pins={EMPTY_EVACUEE_PINS}
                householdPins={householdPins}
                center={effectiveMapCenter}
                zoom={mapZoom}
                facilities={HAZARD_FACILITIES}
                showFacilities={showFacilities}
                shelters={HUMAN_EVAC_SHELTERS}
                liveShelters={liveMapShelters}
                showShelters={showShelters}
                demoMode={mapDemoMode}
                mapFocusRequest={mapFocus}
                nifcFires={nifcForEvacMap}
                nifcFiresCircleOnly
                windData={windData}
                onResponderStatusUpdated={() => {
                  void loadEvacMap()
                }}
              />
            </div>

            <div className="w-full max-h-[45vh] lg:max-h-none lg:w-[26rem] shrink-0 flex flex-col overflow-hidden border-t border-gray-200 bg-gray-50/80 dark:border-ash-800 dark:bg-ash-950 lg:border-t-0 lg:border-l">
              <FlameoCommandRoom
                householdPins={householdPins}
                mapCenter={effectiveMapCenter}
                fireContext={flameoContext}
                demoMode={mapDemoMode}
                briefingRefreshKey={commandBriefingKey}
                onViewOnMap={(lat, lng) => setMapFocus({ lat, lng, nonce: Date.now() })}
                directionsOrigin={stationAddressForDirections}
              />
              <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-ash-800">
                <div className="p-2.5 sm:p-3">
                  <div className="mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-signal-info" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        Opt-in households — communication &amp; health
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                      Evacuees who consented to responder visibility in Settings. Profile flags appear here.
                    </p>
                  </div>
                  {responderProfiles.length === 0 ? (
                    <p className="px-1 text-xs text-gray-500 dark:text-gray-400">No households have opted in yet.</p>
                  ) : (
                    <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                      {responderProfiles.map(row => {
                        const comm = communicationNeedStrings(row.communication_needs)
                        const mob = row.mobility_needs?.filter(Boolean) ?? []
                        const med = row.medical_needs?.filter(Boolean) ?? []
                        return (
                          <div
                            key={row.id}
                            className="rounded-xl border border-gray-200 bg-white p-2.5 text-[11px] shadow-sm dark:border-gray-700 dark:bg-gray-800/95"
                          >
                            <div className="truncate font-semibold text-gray-900 dark:text-white">
                              {row.full_name || 'Unknown'}
                            </div>
                            {row.address && (
                              <div className="mt-0.5 flex items-start gap-1 text-gray-600 dark:text-gray-400">
                                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                <span className="break-words">{row.address}</span>
                              </div>
                            )}
                            {mob.length > 0 && (
                              <div className="mt-1.5 text-gray-700 dark:text-gray-300">
                                <span className="text-gray-500 dark:text-gray-500">Mobility:</span> {mob.join(' · ')}
                              </div>
                            )}
                            {med.length > 0 && (
                              <div className="mt-1 text-gray-700 dark:text-gray-300">
                                <span className="text-gray-500 dark:text-gray-500">Medical:</span> {med.join(' · ')}
                              </div>
                            )}
                            {(row.disability_other || row.medical_other) && (
                              <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-400">
                                {[row.disability_other, row.medical_other].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {comm.length > 0 && (
                              <div className="mt-1.5 text-sky-800 dark:text-sky-300">
                                <span className="text-gray-500 dark:text-gray-500">Communication & cognitive:</span>{' '}
                                {comm.join(' · ')}
                              </div>
                            )}
                            {row.special_notes && (
                              <div className="mt-1.5 border-t border-gray-200 pt-1.5 text-[10px] leading-relaxed text-gray-700 dark:border-gray-600 dark:text-gray-300">
                                <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-500">
                                  Responder guidance
                                </span>
                                <div className="mt-0.5">{truncateResponderNote(row.special_notes, 320)}</div>
                              </div>
                            )}
                            {row.phone && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                <Phone className="h-3 w-3" />
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
