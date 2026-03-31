import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

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

const ANIMAL_NAME_BLACKLIST =
  /\b(animal|humane society|spca|veterinary|vet\s|pet\s|dog|cat|wildlife|kennel|zoo)\b/i

function isHumanShelterName(name: string): boolean {
  return !ANIMAL_NAME_BLACKLIST.test(name)
}

const FEMA_URL =
  'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query' +
  '?where=1%3D1' +
  '&outFields=SHELTER_NAME,COUNTY,STATE,LATITUDE,LONGITUDE,CAPACITY,CURRENT_OCCUPANCY' +
  '&f=json' +
  '&resultRecordCount=100'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'shelters', 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const stateFilter = searchParams.get('state')?.toUpperCase() || null

  try {
    const res = await fetch(FEMA_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ shelters: [], near_capacity: 0, error: 'unavailable' })
    }

    const json = await res.json()
    const features: any[] = json.features ?? []

    const shelters: Shelter[] = []

    for (const feature of features) {
      const a = feature.attributes ?? {}

      const lat: number | null = a.LATITUDE ?? null
      const lon: number | null = a.LONGITUDE ?? null

      // Require valid CONUS coordinates
      if (
        lat === null ||
        lon === null ||
        lat < 24 ||
        lat > 49 ||
        lon < -125 ||
        lon > -66
      ) {
        continue
      }

      const capacity: number | null =
        typeof a.CAPACITY === 'number' && a.CAPACITY > 0 ? a.CAPACITY : null
      const occupancy: number | null =
        typeof a.CURRENT_OCCUPANCY === 'number' && a.CURRENT_OCCUPANCY > 0
          ? a.CURRENT_OCCUPANCY
          : null

      const pct_full: number | null =
        capacity !== null && occupancy !== null
          ? Math.round((occupancy / capacity) * 100)
          : null

      shelters.push({
        name: a.SHELTER_NAME ?? 'Unknown Shelter',
        county: a.COUNTY ?? '',
        state: a.STATE ?? '',
        lat,
        lon,
        capacity,
        occupancy,
        pct_full,
      })
    }

    const humanShelters = shelters.filter(s => isHumanShelterName(s.name || ''))
    const filtered = stateFilter ? humanShelters.filter(s => s.state?.toUpperCase() === stateFilter) : humanShelters

    const near_capacity = filtered.filter(
      s => s.pct_full !== null && s.pct_full >= 80
    ).length

    return NextResponse.json({ shelters: filtered, near_capacity })
  } catch {
    const demoShelters: Shelter[] = [
      // California
      { name: 'Paradise Community Center', county: 'Butte', state: 'CA', lat: 39.759, lon: -121.619, capacity: 450, occupancy: 187, pct_full: 42 },
      { name: 'Chico State Events Center', county: 'Butte', state: 'CA', lat: 39.728, lon: -121.845, capacity: 1200, occupancy: 1050, pct_full: 88 },
      { name: 'Shasta County Fairgrounds', county: 'Shasta', state: 'CA', lat: 40.581, lon: -122.352, capacity: 600, occupancy: 210, pct_full: 35 },
      { name: 'Los Angeles Convention Center', county: 'Los Angeles', state: 'CA', lat: 34.040, lon: -118.270, capacity: 5000, occupancy: 2100, pct_full: 42 },
      { name: 'Pasadena Rose Bowl Shelter', county: 'Los Angeles', state: 'CA', lat: 34.162, lon: -118.167, capacity: 2000, occupancy: 1800, pct_full: 90 },
      { name: 'San Diego Convention Center', county: 'San Diego', state: 'CA', lat: 32.706, lon: -117.162, capacity: 3000, occupancy: 1200, pct_full: 40 },
      // Oregon
      { name: 'Medford Expo Center', county: 'Jackson', state: 'OR', lat: 42.342, lon: -122.856, capacity: 800, occupancy: 320, pct_full: 40 },
      { name: 'Klamath County Fairgrounds', county: 'Klamath', state: 'OR', lat: 42.215, lon: -121.782, capacity: 500, occupancy: 440, pct_full: 88 },
      { name: 'Eugene Hult Center', county: 'Lane', state: 'OR', lat: 44.049, lon: -123.094, capacity: 700, occupancy: 180, pct_full: 26 },
      // Washington
      { name: 'Yakima Fairgrounds', county: 'Yakima', state: 'WA', lat: 46.596, lon: -120.505, capacity: 900, occupancy: 630, pct_full: 70 },
      { name: 'Spokane Convention Center', county: 'Spokane', state: 'WA', lat: 47.658, lon: -117.424, capacity: 1500, occupancy: 450, pct_full: 30 },
      // Colorado
      { name: 'Boulder County Fairgrounds', county: 'Boulder', state: 'CO', lat: 40.050, lon: -105.227, capacity: 400, occupancy: 340, pct_full: 85 },
      { name: 'Colorado Springs City Auditorium', county: 'El Paso', state: 'CO', lat: 38.835, lon: -104.821, capacity: 600, occupancy: 220, pct_full: 37 },
      // Arizona
      { name: 'Flagstaff Coconino Fairgrounds', county: 'Coconino', state: 'AZ', lat: 35.185, lon: -111.631, capacity: 350, occupancy: 140, pct_full: 40 },
      { name: 'Tucson Convention Center', county: 'Pima', state: 'AZ', lat: 32.222, lon: -110.973, capacity: 1200, occupancy: 960, pct_full: 80 },
      // Texas
      { name: 'Austin Convention Center', county: 'Travis', state: 'TX', lat: 30.263, lon: -97.740, capacity: 2000, occupancy: 600, pct_full: 30 },
      { name: 'San Antonio Freeman Coliseum', county: 'Bexar', state: 'TX', lat: 29.438, lon: -98.473, capacity: 1800, occupancy: 720, pct_full: 40 },
      // North Carolina
      { name: 'Asheville Civic Center', county: 'Buncombe', state: 'NC', lat: 35.576, lon: -82.548, capacity: 600, occupancy: 210, pct_full: 35 },
      // Florida
      { name: 'Tampa Convention Center', county: 'Hillsborough', state: 'FL', lat: 27.944, lon: -82.456, capacity: 3000, occupancy: 2700, pct_full: 90 },
    ]
    const humanDemoShelters = demoShelters.filter(s => isHumanShelterName(s.name || ''))
    const filtered = stateFilter ? humanDemoShelters.filter(s => s.state === stateFilter) : humanDemoShelters
    const near_capacity = filtered.filter(s => s.pct_full !== null && s.pct_full >= 80).length
    return NextResponse.json({ shelters: filtered, near_capacity, demo: true })
  }
}
