import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { distanceMiles } from '@/lib/hub-map-distance'
import type {
  FlameoAnchor,
  FlameoContext,
  FlameoContextApiResponse,
  FlameoContextStatus,
  FlameoIncidentNearby,
  FlameoUserRole,
  FlameoWeatherSummary,
} from '@/lib/flameo-context-types'

const DEFAULT_RADIUS_MI = 50
const MAX_INCIDENTS = 25
/** Match map “away from home” — below this, treat GPS as same place as saved home for Flameo. */
const LIVE_HOME_DIVERGENCE_MI = 0.35

function parseLiveCoords(searchParams: URLSearchParams): [number, number] | null {
  const lat = parseFloat(searchParams.get('liveLat') || '')
  const lon = parseFloat(searchParams.get('liveLon') || '')
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return [lat, lon]
}

async function geocodeUs(location: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildfireAlert/2.0 (wildfire-app@vercel.app)' },
    })
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
  } catch {
    return null
  }
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('address, alert_radius_miles, role')
    .eq('id', user.id)
    .single()

  const profileRole = profile?.role as string | undefined
  const role = resolveRole(profileRole, roleParam)

  const rawRadius = profile?.alert_radius_miles
  const alertRadiusMiles =
    typeof rawRadius === 'number' && rawRadius > 0 && rawRadius <= 500
      ? rawRadius
      : DEFAULT_RADIUS_MI

  let address = (profile?.address || '').trim()
  if (!address && fallbackAddress) address = fallbackAddress

  if (!address) {
    const body: FlameoContextApiResponse = {
      status: 'address_missing',
      message: 'Add your home address in Settings to enable proximity-based Flameo context.',
      context: emptyContext(role, alertRadiusMiles),
      feeds: { nifc: false, firms: false },
    }
    return NextResponse.json(body)
  }

  const geo = await geocodeUs(address)
  if (!geo) {
    const body: FlameoContextApiResponse = {
      status: 'geocode_failed',
      message: 'Could not locate your address. Check spelling in Settings.',
      context: emptyContext(role, alertRadiusMiles),
      feeds: { nifc: false, firms: false },
    }
    return NextResponse.json(body)
  }

  const homeAnchor: FlameoContext['anchors'][0] = {
    id: 'home',
    label: geo.display,
    lat: geo.lat,
    lon: geo.lon,
  }
  const homePoint: [number, number] = [geo.lat, geo.lon]

  const liveCoords = parseLiveCoords(new URL(request.url).searchParams)
  let liveVsHomeMiles: number | null = null
  let liveAnchor: FlameoAnchor | null = null
  if (liveCoords) {
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

  const anchors: FlameoContext['anchors'] = liveAnchor ? [homeAnchor, liveAnchor] : [homeAnchor]
  const livePoint: [number, number] | null = liveAnchor ? [liveAnchor.lat, liveAnchor.lon] : null
  const dualMode = livePoint != null

  const origin = new URL(request.url).origin

  let nifcOk = false
  let firmsOk = false
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
        const dLive = livePoint ? distanceMiles(livePoint, [f.latitude, f.longitude]) : null
        const inRadius =
          dHome <= alertRadiusMiles || (dLive != null && dLive <= alertRadiusMiles)
        if (!inRadius) continue
        const distMin = Math.min(dHome, dLive ?? Infinity)
        const nearest: 'home' | 'live' =
          dualMode && dLive != null && dLive < dHome ? 'live' : 'home'
        candidates.push({
          id: String(f.id),
          source: 'nifc',
          distance_miles: Math.round(distMin * 10) / 10,
          distance_miles_from_home: Math.round(dHome * 10) / 10,
          distance_miles_from_live: dLive != null ? Math.round(dLive * 10) / 10 : null,
          nearest_anchor_id: dualMode ? nearest : 'home',
          name: f.fire_name || null,
          lat: f.latitude,
          lon: f.longitude,
        })
      }
    }
  } catch {
    nifcOk = false
  }

  try {
    const firmsRes = await fetch(`${origin}/api/fires/firms?days=2`, { cache: 'no-store' })
    if (firmsRes.ok) {
      const json = await firmsRes.json()
      firmsOk = true
      const rows = Array.isArray(json.data) ? json.data : []
      rows.forEach((row: Record<string, string>, i: number) => {
        const lat = parseFloat(row.latitude || '')
        const lon = parseFloat(row.longitude || '')
        if (Number.isNaN(lat) || Number.isNaN(lon)) return
        const dHome = distanceMiles(homePoint, [lat, lon])
        const dLive = livePoint ? distanceMiles(livePoint, [lat, lon]) : null
        const inRadius =
          dHome <= alertRadiusMiles || (dLive != null && dLive <= alertRadiusMiles)
        if (!inRadius) return
        const distMin = Math.min(dHome, dLive ?? Infinity)
        const nearest: 'home' | 'live' =
          dualMode && dLive != null && dLive < dHome ? 'live' : 'home'
        candidates.push({
          id: `firms-${i}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
          source: 'firms',
          distance_miles: Math.round(distMin * 10) / 10,
          distance_miles_from_home: Math.round(dHome * 10) / 10,
          distance_miles_from_live: dLive != null ? Math.round(dLive * 10) / 10 : null,
          nearest_anchor_id: dualMode ? nearest : 'home',
          name: null,
          lat,
          lon,
        })
      })
    } else if (firmsRes.status === 503) {
      firmsOk = false
    }
  } catch {
    firmsOk = false
  }

  candidates.sort((a, b) => a.distance_miles - b.distance_miles)
  const incidents_nearby = candidates.slice(0, MAX_INCIDENTS)

  let weather_summary: FlameoWeatherSummary | null = null
  try {
    const wUrl = `${origin}/api/weather?location=${encodeURIComponent(address)}`
    const wRes = await fetch(wUrl, { next: { revalidate: 300 } })
    if (wRes.ok) {
      const w = await wRes.json()
      weather_summary = {
        temp_f: w.temp_f ?? null,
        wind_mph: w.wind_mph ?? null,
        fire_risk: typeof w.fire_risk === 'string' ? w.fire_risk : 'Unknown',
      }
    }
  } catch {
    weather_summary = null
  }

  const hasThreat = incidents_nearby.length > 0
  const feedsWorked = nifcOk || firmsOk
  const partialFeeds = nifcOk !== firmsOk && feedsWorked

  let status: FlameoContextStatus
  let message: string | undefined

  if (!nifcOk && !firmsOk) {
    status = 'feeds_unavailable'
    message = 'Active fire feeds are unavailable right now. Try again later.'
  } else if (hasThreat) {
    status = partialFeeds ? 'feeds_partial' : 'ready'
    if (partialFeeds) {
      message = 'Some fire feeds were unavailable; showing incidents from available sources only.'
    }
  } else if (partialFeeds) {
    status = 'feeds_partial'
    message = dualMode
      ? 'Partial fire data: at least one source was unavailable. Nothing confirmed within your alert radius of home or your current location.'
      : 'Partial fire data: at least one source was unavailable. Nothing confirmed within your alert radius.'
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
    weather_summary,
    flags: {
      has_confirmed_threat: hasThreat,
      no_data: noDataFlag,
      live_differs_from_home: dualMode,
    },
    alert_radius_miles: alertRadiusMiles,
    live_vs_home_miles: dualMode ? liveVsHomeMiles : null,
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
