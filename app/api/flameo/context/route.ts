import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { distanceMiles } from '@/lib/hub-map-distance'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { geocodeAddress } from '@/lib/geocoding'
import { reverseGeocode } from '@/lib/geocoding'
import { rankSheltersByProximity } from '@/lib/shelter-ranking'
import { parseUsStateCodeFromAddress } from '@/lib/us-address-state'
import type {
  FlameoAnchor,
  FlameoContext,
  FlameoContextApiResponse,
  FlameoContextStatus,
  FlameoIncidentNearby,
  FlameoLocationAnchorDetail,
  FlameoShelterNearby,
  FlameoSheltersMeta,
  FlameoUserRole,
  FlameoWeatherSummary,
} from '@/lib/flameo-context-types'

const DEFAULT_RADIUS_MI = 50
const MAX_INCIDENTS = 25
const MAX_SHELTERS = 6
/** Match map “away from home” — below this, treat GPS as same place as saved home for Flameo. */
const LIVE_HOME_DIVERGENCE_MI = 0.35

function parseLiveCoords(searchParams: URLSearchParams): [number, number] | null {
  const lat = parseFloat(
    searchParams.get('liveLat') || searchParams.get('currentLat') || ''
  )
  const lon = parseFloat(
    searchParams.get('liveLon') || searchParams.get('currentLng') || ''
  )
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return [lat, lon]
}

function parseDetectedAnchor(
  raw: string | null
): 'work' | 'home' | 'unknown' | null {
  if (raw === 'work' || raw === 'home' || raw === 'unknown') return raw
  return null
}

function resolveRole(profileRole: string | undefined, q: string | null): FlameoUserRole {
  if (q === 'evacuee') return 'evacuee'
  if (q === 'emergency_responder') return 'emergency_responder'
  if (profileRole === 'evacuee') return 'evacuee'
  if (profileRole === 'emergency_responder') return 'emergency_responder'
  // Legacy DB rows or old query params — treat as evacuee for Flameo copy
  if (q === 'caregiver' || profileRole === 'caregiver') return 'evacuee'
  return 'evacuee'
}

type NifcRow = {
  id: string
  latitude: number
  longitude: number
  fire_name: string
  acres: number | null
  containment: number | null
  source: string
}

function emptyContext(role: FlameoUserRole, radius: number): FlameoContext {
  return {
    role,
    anchors: [],
    incidents_nearby: [],
    hazard_sites_nearby: [],
    shelters_nearby: [],
    shelters_ranked: [],
    weather_summary: null,
    flags: { has_confirmed_threat: false, no_data: true },
    alert_radius_miles: radius,
    live_vs_home_miles: null,
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const roleParam = searchParams.get('role')
  const fallbackAddress = (searchParams.get('fallbackAddress') || '').trim()
  /** My People: anchor Flameo on this address instead of the signed-in user’s profile home. */
  const contextAddress = (searchParams.get('contextAddress') || '').trim()
  const detectedAnchorParam = parseDetectedAnchor(searchParams.get('detectedAnchor'))

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'address, alert_radius_miles, role, work_address, work_building_type, work_floor_number, work_location_note, mobility_needs, health_data_consent, location_sharing_consent, evacuation_status_consent'
    )
    .eq('id', user.id)
    .single()

  const profileRole = profile?.role as string | undefined
  const role = resolveRole(profileRole, roleParam)

  const rawRadius = profile?.alert_radius_miles
  const alertRadiusMiles =
    typeof rawRadius === 'number' && rawRadius > 0 && rawRadius <= 500
      ? rawRadius
      : DEFAULT_RADIUS_MI

  const workAddr =
    typeof (profile as { work_address?: string | null }).work_address === 'string'
      ? (profile as { work_address?: string }).work_address!.trim()
      : ''
  const workBuildingType =
    (profile as { work_building_type?: string | null }).work_building_type ?? null
  const workFloorNumber =
    (profile as { work_floor_number?: number | null }).work_floor_number ?? null
  const workLocationNote =
    (profile as { work_location_note?: string | null }).work_location_note ?? null
  const mobilityNeeds =
    (profile as { mobility_needs?: string[] | null }).mobility_needs ?? null
  const healthDataConsent =
    (profile as { health_data_consent?: boolean | null }).health_data_consent === true
  /** Responder RPC `profiles_visible_to_responder()` uses `responder_data_consent` (see migrations); not used by this route. */
  const prefersAccessibleShelter =
    healthDataConsent
    && Array.isArray(mobilityNeeds)
    && mobilityNeeds.some(x => /\b(wheelchair|mobility|device)\b/i.test(String(x)))

  let address = (profile?.address || '').trim()
  if (!address && fallbackAddress) address = fallbackAddress
  const preferWorkAnchor = detectedAnchorParam === 'work' && Boolean(workAddr)

  if (!address && !preferWorkAnchor) {
    const body: FlameoContextApiResponse = {
      status: 'address_missing',
      message: 'Add your home address in Settings to enable proximity-based Flameo context.',
      context: emptyContext(role, alertRadiusMiles),
      feeds: { nifc: false, firms: false },
    }
    return NextResponse.json(body)
  }

  let geo: { lat: number; lon: number; display: string } | null = null
  let baseAnchorSource: 'home' | 'work' = 'home'
  const firstAddress = preferWorkAnchor ? workAddr : address
  try {
    const g = await geocodeAddress(firstAddress)
    geo = { lat: g.lat, lon: g.lng, display: g.formatted }
    baseAnchorSource = preferWorkAnchor ? 'work' : 'home'
  } catch {
    geo = null
  }
  if (!geo && workAddr && firstAddress !== workAddr) {
    try {
      const g = await geocodeAddress(workAddr)
      geo = { lat: g.lat, lon: g.lng, display: g.formatted }
      baseAnchorSource = 'work'
    } catch {
      geo = null
    }
  }
  if (!geo) {
    const body: FlameoContextApiResponse = {
      status: 'geocode_failed',
      message: 'Could not locate your saved home/work address. Check spelling in Settings.',
      context: emptyContext(role, alertRadiusMiles),
      feeds: { nifc: false, firms: false },
    }
    return NextResponse.json(body)
  }

  const homeAnchor: FlameoContext['anchors'][0] = {
    id: baseAnchorSource === 'work' ? 'work' : 'home',
    label: geo.display,
    lat: geo.lat,
    lon: geo.lon,
  }
  const homePoint: [number, number] = [geo.lat, geo.lon]

  const sp = new URL(request.url).searchParams
  const liveCoords = parseLiveCoords(sp)

  let location_anchor: FlameoLocationAnchorDetail | undefined
  if (baseAnchorSource === 'work') {
    location_anchor = {
      anchor: 'work',
      anchor_address: workAddr || geo.display,
      building_type: workBuildingType,
      floor_number: workFloorNumber,
      location_note: workLocationNote,
    }
  } else {
    location_anchor = {
      anchor: 'home',
      anchor_address: address || geo.display,
    }
  }

  let liveVsHomeMiles: number | null = null
  let liveAnchor: FlameoAnchor | null = null
  if (
    liveCoords
    && detectedAnchorParam !== 'work'
    && detectedAnchorParam !== 'unknown'
  ) {
    liveVsHomeMiles = distanceMiles(homePoint, liveCoords)
    if (liveVsHomeMiles > LIVE_HOME_DIVERGENCE_MI) {
      liveAnchor = {
        id: 'live',
        label: 'Your current location (live GPS)',
        lat: liveCoords[0],
        lon: liveCoords[1],
      }
    }
  }

  let anchors: FlameoContext['anchors'] = liveAnchor ? [homeAnchor, liveAnchor] : [homeAnchor]
  let livePoint: [number, number] | null = liveAnchor ? [liveAnchor.lat, liveAnchor.lon] : null
  let dualMode = livePoint != null

  if (detectedAnchorParam === 'work' && workAddr) {
    let wg: { lat: number; lon: number; display: string } | null = null
    try {
      const g = await geocodeAddress(workAddr)
      wg = { lat: g.lat, lon: g.lng, display: g.formatted }
    } catch {
      wg = null
    }
    if (wg) {
      anchors = [{ id: 'work', label: workAddr, lat: wg.lat, lon: wg.lon }]
      liveAnchor = null
      livePoint = null
      dualMode = false
      liveVsHomeMiles = null
      location_anchor = {
        anchor: 'work',
        anchor_address: workAddr,
        building_type: workBuildingType,
        floor_number: workFloorNumber,
        location_note: workLocationNote,
      }
    }
  } else if (detectedAnchorParam === 'unknown' && liveCoords) {
    let unknownAddress: string | null = null
    try {
      const rev = await reverseGeocode(liveCoords[0], liveCoords[1])
      unknownAddress = rev.formatted
    } catch {
      unknownAddress = null
    }
    anchors = [
      {
        id: 'unknown',
        label: unknownAddress || 'Your current location (GPS)',
        lat: liveCoords[0],
        lon: liveCoords[1],
      },
    ]
    liveAnchor = null
    livePoint = null
    dualMode = false
    liveVsHomeMiles = null
    location_anchor = { anchor: 'unknown', anchor_address: unknownAddress }
  }

  /** Reference points for distance-to-fire: A = primary; B = optional second (live vs home). */
  let refA: [number, number] = homePoint
  let refB: [number, number] | null = livePoint
  let dualForIncidents = dualMode
  if (location_anchor?.anchor === 'work' && anchors[0]?.id === 'work') {
    refA = [anchors[0].lat, anchors[0].lon]
    refB = null
    dualForIncidents = false
  } else if (location_anchor?.anchor === 'unknown' && liveCoords) {
    refA = liveCoords
    refB = null
    dualForIncidents = false
  }

  const hazard_sites_nearby = HAZARD_FACILITIES
    .map(h => ({
      id: h.id,
      name: h.name,
      type: h.type,
      lat: h.lat,
      lon: h.lng,
      distance_miles: Math.round(distanceMiles(refA, [h.lat, h.lng]) * 10) / 10,
      risk_note: h.riskNote,
    }))
    .filter(h => h.distance_miles <= alertRadiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)

  const shelterOrigin: [number, number] = refB ?? refA
  const shelterOriginObj = { lat: shelterOrigin[0], lng: shelterOrigin[1] }
  const origin = new URL(request.url).origin

  const addressForState = (contextAddress || address || workAddr || '').trim()
  const stateForShelters =
    parseUsStateCodeFromAddress(addressForState) || 'NC'

  type LiveShelterApi = {
    id: string
    name: string
    address: string
    city: string
    state: string
    lat: number
    lng: number
    capacity: number | null
    current_occupancy: number | null
    last_verified_at: string
    source: 'fema_nss'
  }
  type LiveApiBody = {
    shelters?: LiveShelterApi[]
    source_status?: string
    fallback?: boolean
    fetched_at?: string
  }

  let liveBody: LiveApiBody | null = null
  let liveCacheAgeSec = 0
  try {
    const liveUrl =
      `${origin}/api/shelters/live?state=${encodeURIComponent(stateForShelters)}`
      + `&lat=${encodeURIComponent(String(shelterOrigin[0]))}`
      + `&lng=${encodeURIComponent(String(shelterOrigin[1]))}`
    const liveRes = await fetch(liveUrl, { cache: 'no-store' })
    liveCacheAgeSec = parseInt(liveRes.headers.get('x-cache-age') || '0', 10) || 0
    if (liveRes.ok) liveBody = (await liveRes.json()) as LiveApiBody
  } catch {
    liveBody = null
  }

  const femaOk =
    liveBody?.source_status === 'ok'
    && liveBody.fallback !== true
  const femaList: LiveShelterApi[] =
    femaOk && Array.isArray(liveBody?.shelters) ? liveBody!.shelters! : []
  const useFemaForList = femaList.length > 0

  let shelters_nearby: FlameoShelterNearby[] = []
  if (useFemaForList) {
    shelters_nearby = femaList
      .map(s => ({
        name: s.name,
        county: s.city || '',
        lat: s.lat,
        lon: s.lng,
        distance_miles: Math.round(distanceMiles(shelterOrigin, [s.lat, s.lng]) * 10) / 10,
        phone: null,
        address: s.address,
        capacity: s.capacity,
        current_occupancy: s.current_occupancy,
        verified: true,
        source: 'fema_nss' as const,
        last_verified_at: s.last_verified_at,
      }))
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, MAX_SHELTERS)
  } else {
    shelters_nearby = HUMAN_EVAC_SHELTERS.map(s => ({
      name: s.name,
      county: s.county,
      lat: s.lat,
      lon: s.lng,
      distance_miles: Math.round(distanceMiles(shelterOrigin, [s.lat, s.lng]) * 10) / 10,
      phone: null,
      address: null,
      capacity: s.capacity ?? null,
      current_occupancy: null,
      verified: false,
      source: 'pre_identified' as const,
      last_verified_at: null,
    }))
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, MAX_SHELTERS)
  }

  const rankingShelters = useFemaForList
    ? femaList.map(s => ({
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        county: s.city,
        phone: null as string | null,
        verified: true as boolean,
        source: 'fema_nss' as const,
        last_verified_at: s.last_verified_at,
        capacity: s.capacity,
        current_occupancy: s.current_occupancy,
      }))
    : HUMAN_EVAC_SHELTERS.map(s => ({
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        county: s.county,
        phone: null as string | null,
        verified: false as boolean,
        source: 'pre_identified' as const,
        last_verified_at: null as string | null,
        capacity: s.capacity ?? null,
        current_occupancy: null as number | null,
      }))

  let rankedByTravel = await rankSheltersByProximity(
    shelterOriginObj,
    rankingShelters,
    { preferAccessible: prefersAccessibleShelter }
  ).catch(() => [])

  const shelters_meta: FlameoSheltersMeta = {
    last_checked_at:
      typeof liveBody?.fetched_at === 'string'
        ? liveBody.fetched_at
        : new Date().toISOString(),
    cache_age_seconds: liveCacheAgeSec,
    live_feed_ok: femaOk,
    fema_shelter_count: useFemaForList ? femaList.length : 0,
    pre_identified_count: useFemaForList ? 0 : shelters_nearby.length,
    routes_use_verified_open: useFemaForList,
  }

  let nifcOk = false
  /** NASA FIRMS hotspots are excluded from consumer Flameo context — they are often non-wildfire (industrial flare, ag burn) and read as false “fires” near cities. NIFC incident/perimeter layers only. */
  const firmsOk = false
  const candidates: FlameoIncidentNearby[] = []

  try {
    const nifcRes = await fetch(`${origin}/api/fires/nifc`, { next: { revalidate: 120 } })
    if (nifcRes.ok) {
      const json = await nifcRes.json()
      const rows: NifcRow[] = Array.isArray(json.data) ? json.data : []
      nifcOk = true
      for (const f of rows) {
        if (f.latitude == null || f.longitude == null) continue
        const dHome = distanceMiles(homePoint, [f.latitude, f.longitude])
        const dA = distanceMiles(refA, [f.latitude, f.longitude])
        const dB = refB ? distanceMiles(refB, [f.latitude, f.longitude]) : null
        const dLive = livePoint ? distanceMiles(livePoint, [f.latitude, f.longitude]) : null
        const inRadius =
          dA <= alertRadiusMiles || (dB != null && dB <= alertRadiusMiles)
        if (!inRadius) continue
        const distMin = Math.min(dA, dB ?? Infinity)
        let nearest: 'home' | 'live' | 'work' | 'unknown' = 'home'
        if (location_anchor?.anchor === 'work') nearest = 'work'
        else if (location_anchor?.anchor === 'unknown') nearest = 'unknown'
        else if (dualForIncidents && dB != null && dB < dA) nearest = 'live'
        candidates.push({
          id: String(f.id),
          source: 'nifc',
          distance_miles: Math.round(distMin * 10) / 10,
          distance_miles_from_home: Math.round(dHome * 10) / 10,
          distance_miles_from_live: dLive != null ? Math.round(dLive * 10) / 10 : null,
          nearest_anchor_id: dualForIncidents || location_anchor ? nearest : 'home',
          name: f.fire_name || null,
          lat: f.latitude,
          lon: f.longitude,
        })
      }
    }
  } catch {
    nifcOk = false
  }

  candidates.sort((a, b) => a.distance_miles - b.distance_miles)
  const incidents_nearby = candidates.slice(0, MAX_INCIDENTS)

  let shelters_ranked: NonNullable<FlameoContext['shelters_ranked']> = []
  if (rankedByTravel.length > 0) {
    try {
      const firePerimeter = incidents_nearby
        .slice(0, 8)
        .map(i => ({ lat: i.lat, lng: i.lon }))
      const routeRes = await fetch(`${origin}/api/shelter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: shelterOrigin[0],
          originLng: shelterOrigin[1],
          shelters: rankedByTravel.slice(0, 6).map(s => ({
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            verified: s.verified === true,
          })),
          firePerimeter: firePerimeter.length >= 3 ? firePerimeter : undefined,
          hazardSites: hazard_sites_nearby.map(h => ({
            lat: h.lat,
            lng: h.lon,
            buffer_miles: 0.5,
          })),
        }),
        cache: 'no-store',
      })
      const routeJson = (await routeRes.json()) as {
        shelter_verified?: boolean
        ranked?: Array<{
          shelter: { name: string; lat: number; lng: number }
          duration_seconds: number
          distance_meters: number
          summary: string
          passes_near_fire: boolean
          passes_near_hazard?: boolean
        }>
      }
      const routeRows = Array.isArray(routeJson.ranked) ? routeJson.ranked : []
      shelters_ranked = routeRows.map(r => {
        const match = rankedByTravel.find(
          s => s.name === r.shelter.name && s.lat === r.shelter.lat && s.lng === r.shelter.lng
        )
        const verified = routeJson.shelter_verified === true && match?.verified === true
        return {
          name: r.shelter.name,
          lat: r.shelter.lat,
          lon: r.shelter.lng,
          travel_minutes: Math.max(1, Math.round((r.duration_seconds || 0) / 60)),
          distance_miles: Math.round(((r.distance_meters || 0) / 1609.344) * 10) / 10,
          route_summary: r.summary || 'Primary route',
          route_avoids_fire: !r.passes_near_fire,
          passes_near_hazard: r.passes_near_hazard ?? false,
          accessibility_likely: match?.accessibilityLikely ?? false,
          phone: match?.phone ?? null,
          verified,
          source: match?.source ?? 'pre_identified',
          last_verified_at: match?.last_verified_at ?? null,
          capacity: match?.capacity ?? null,
          current_occupancy: match?.current_occupancy ?? null,
        }
      })
    } catch {
      shelters_ranked = rankedByTravel.slice(0, 3).map(s => ({
        name: s.name,
        lat: s.lat,
        lon: s.lng,
        travel_minutes: Math.max(1, Math.round(s.travelTimeSeconds / 60)),
        distance_miles: Math.round((s.travelDistanceMeters / 1609.344) * 10) / 10,
        route_summary: 'Primary route',
        route_avoids_fire: true,
        passes_near_hazard: false,
        accessibility_likely: s.accessibilityLikely,
        phone: s.phone ?? null,
        verified: s.verified === true,
        source: s.source ?? 'pre_identified',
        last_verified_at: s.last_verified_at ?? null,
        capacity: s.capacity ?? null,
        current_occupancy: s.current_occupancy ?? null,
      }))
    }
  }

  let weather_summary: FlameoWeatherSummary | null = null
  try {
    const weatherLine =
      location_anchor?.anchor === 'work' && workAddr ? workAddr : address
    const wUrl = `${origin}/api/weather?location=${encodeURIComponent(weatherLine)}`
    const wRes = await fetch(wUrl, { next: { revalidate: 300 } })
    if (wRes.ok) {
      const w = await wRes.json()
      weather_summary = {
        temp_f: w.temp_f ?? null,
        wind_mph: w.wind_mph ?? null,
        wind_dir: typeof w.wind_dir === 'string' ? w.wind_dir : null,
        wind_dir_deg: typeof w.wind_dir_deg === 'number' ? w.wind_dir_deg : null,
        fire_risk: typeof w.fire_risk === 'string' ? w.fire_risk : 'Unknown',
      }
    }
  } catch {
    weather_summary = null
  }

  const hasThreat = incidents_nearby.length > 0

  let status: FlameoContextStatus
  let message: string | undefined

  if (!nifcOk) {
    status = 'feeds_unavailable'
    message = 'Active fire feeds are unavailable right now. Try again later.'
  } else if (hasThreat) {
    status = 'ready'
  } else {
    status = 'no_fires_in_radius'
    message = dualMode
      ? `No confirmed fire activity within ${alertRadiusMiles} mi of your saved home or your current GPS position.`
      : `No confirmed fire activity within ${alertRadiusMiles} mi of your home.`
  }

  const noDataFlag = status === 'feeds_unavailable' || !hasThreat

  const context: FlameoContext = {
    role,
    anchors,
    incidents_nearby,
    hazard_sites_nearby,
    shelters_nearby,
    shelters_ranked,
    shelters_meta,
    weather_summary,
    flags: {
      has_confirmed_threat: hasThreat,
      no_data: noDataFlag,
      live_differs_from_home: dualMode,
    },
    alert_radius_miles: alertRadiusMiles,
    live_vs_home_miles: dualMode ? liveVsHomeMiles : null,
    location_anchor,
  }

  if (status === 'feeds_unavailable') {
    context.flags.has_confirmed_threat = false
  }

  const body: FlameoContextApiResponse = {
    status,
    message,
    context,
    feeds: { nifc: nifcOk, firms: firmsOk },
  }

  return NextResponse.json(body)
}
