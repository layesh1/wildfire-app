import { distanceMiles } from '@/lib/hub-map-distance'

/**
 * FEMA National Shelter System — public Open Shelters layer (ArcGIS REST).
 * @see https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0
 */
export const FEMA_NSS_OPEN_SHELTERS_QUERY =
  'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query'

export type LiveShelterStatus = 'open' | 'closed' | 'full'

export interface LiveShelter {
  id: string
  name: string
  address: string
  city: string
  state: string
  lat: number
  lng: number
  capacity: number | null
  current_occupancy: number | null
  status: LiveShelterStatus
  shelter_type: string
  last_verified_at: string
  distance_miles?: number
  source: 'fema_nss'
}

const TYPE_ANIMAL = /\b(animal|pet|veterinary|vet\s)\b/i
const NAME_ANIMAL = /\b(animal|humane|spca|veterinary|vet\s|pet\s)\b/i

function isHumanShelter(name: string, orgName: string, shelterType: string): boolean {
  if (TYPE_ANIMAL.test(shelterType)) return false
  if (NAME_ANIMAL.test(`${name} ${orgName}`)) return false
  return true
}

function rowStatus(
  shelterStatus: string | null | undefined,
  capacity: number | null,
  occ: number | null
): LiveShelterStatus {
  const u = (shelterStatus || '').toUpperCase()
  if (u !== 'OPEN') return 'closed'
  if (capacity != null && occ != null && capacity > 0 && occ >= capacity) return 'full'
  return 'open'
}

export type FemaLiveQueryResult = {
  shelters: LiveShelter[]
  fetched_at: string
  ok: boolean
}

export async function queryFemaOpenSheltersForState(options: {
  state: string
  sortFrom?: { lat: number; lng: number } | null
  resultRecordCount?: number
  fetchedAt?: string
}): Promise<FemaLiveQueryResult> {
  const state = options.state.trim().toUpperCase()
  const fetched_at = options.fetchedAt ?? new Date().toISOString()
  const limit = options.resultRecordCount ?? 50

  if (!/^[A-Z]{2}$/.test(state)) {
    return { shelters: [], fetched_at, ok: false }
  }

  const outFields = [
    'objectid',
    'shelter_name',
    'address',
    'city',
    'state',
    'zip',
    'shelter_status',
    'evacuation_capacity',
    'total_population',
    'latitude',
    'longitude',
    'org_name',
  ].join(',')

  const where = encodeURIComponent(`state='${state}' AND shelter_status='OPEN'`)
  const url =
    `${FEMA_NSS_OPEN_SHELTERS_QUERY}?where=${where}`
    + `&outFields=${encodeURIComponent(outFields)}`
    + '&f=json'
    + `&resultRecordCount=${limit}`

  type FemaFeature = {
    attributes?: Record<string, unknown>
    /** NSS layer often leaves latitude/longitude null and only sets point geometry (WGS84: x=lng, y=lat). */
    geometry?: { x?: number; y?: number }
  }
  let json: { features?: FemaFeature[]; error?: { message?: string } }
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) return { shelters: [], fetched_at, ok: false }
    json = (await res.json()) as typeof json
  } catch {
    return { shelters: [], fetched_at, ok: false }
  }

  if (json.error && !Array.isArray(json.features)) {
    return { shelters: [], fetched_at, ok: false }
  }

  const features = Array.isArray(json.features) ? json.features : []
  const shelters: LiveShelter[] = []

  for (const f of features) {
    const a = f.attributes ?? {}
    const geom = f.geometry
    let lat = typeof a.latitude === 'number' ? a.latitude : Number(a.latitude)
    let lng = typeof a.longitude === 'number' ? a.longitude : Number(a.longitude)
    if (
      (!Number.isFinite(lat) || !Number.isFinite(lng)) &&
      geom &&
      typeof geom.x === 'number' &&
      typeof geom.y === 'number'
    ) {
      lng = geom.x
      lat = geom.y
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < 24 || lat > 49 || lng < -125 || lng > -66) continue

    const name = String(a.shelter_name ?? 'Shelter').trim() || 'Shelter'
    const orgName = String(a.org_name ?? '').trim()
    const shelterType = String((a as { shelter_type?: string }).shelter_type ?? '').trim()
    if (!isHumanShelter(name, orgName, shelterType)) continue

    const capRaw = a.evacuation_capacity
    const capacity =
      typeof capRaw === 'number' && capRaw > 0
        ? capRaw
        : Number.isFinite(Number(capRaw)) && Number(capRaw) > 0
          ? Math.round(Number(capRaw))
          : null
    const occRaw = a.total_population
    const current_occupancy =
      typeof occRaw === 'number' && occRaw >= 0
        ? occRaw
        : Number.isFinite(Number(occRaw)) && Number(occRaw) >= 0
          ? Math.round(Number(occRaw))
          : null

    const city = String(a.city ?? '').trim()
    const st = String(a.state ?? state).trim().toUpperCase()
    const zip = String(a.zip ?? '').trim()
    const line1 = String(a.address ?? '').trim()
    const address = [line1, [city, st, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

    const oid = a.objectid != null ? String(a.objectid) : `${lat},${lng},${name.slice(0, 20)}`

    shelters.push({
      id: oid,
      name,
      address,
      city,
      state: st,
      lat,
      lng,
      capacity,
      current_occupancy,
      status: rowStatus(
        typeof a.shelter_status === 'string' ? a.shelter_status : null,
        capacity,
        current_occupancy
      ),
      shelter_type: shelterType || 'General',
      last_verified_at: fetched_at,
      source: 'fema_nss',
    })
  }

  const origin = options.sortFrom
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    for (const s of shelters) {
      s.distance_miles = Math.round(distanceMiles([origin.lat, origin.lng], [s.lat, s.lng]) * 10) / 10
    }
    shelters.sort((a, b) => (a.distance_miles ?? 0) - (b.distance_miles ?? 0))
  }

  return { shelters, fetched_at, ok: true }
}
