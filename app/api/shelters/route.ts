import { NextResponse } from 'next/server'

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

const FEMA_URL =
  'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query' +
  '?where=1%3D1' +
  '&outFields=SHELTER_NAME,COUNTY,STATE,LATITUDE,LONGITUDE,CAPACITY,CURRENT_OCCUPANCY' +
  '&f=json' +
  '&resultRecordCount=100'

export async function GET() {
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

    const near_capacity = shelters.filter(
      s => s.pct_full !== null && s.pct_full >= 80
    ).length

    return NextResponse.json({ shelters, near_capacity })
  } catch {
    // FEMA API unavailable — return demo data for development/preview
    const demoShelters: Shelter[] = [
      { name: 'Paradise Community Center', county: 'Butte', state: 'CA', lat: 39.759, lon: -121.619, capacity: 450, occupancy: 187, pct_full: 42 },
      { name: 'Chico State Events Center', county: 'Butte', state: 'CA', lat: 39.728, lon: -121.845, capacity: 1200, occupancy: 1050, pct_full: 88 },
      { name: 'Shasta County Fairgrounds', county: 'Shasta', state: 'CA', lat: 40.581, lon: -122.352, capacity: 600, occupancy: 210, pct_full: 35 },
      { name: 'Oroville Veterans Memorial Hall', county: 'Butte', state: 'CA', lat: 39.514, lon: -121.556, capacity: 320, occupancy: 85, pct_full: 27 },
      { name: 'Red Bluff Civic Center', county: 'Tehama', state: 'CA', lat: 40.178, lon: -122.236, capacity: 280, occupancy: 240, pct_full: 86 },
      { name: 'Los Angeles Convention Center', county: 'Los Angeles', state: 'CA', lat: 34.040, lon: -118.270, capacity: 5000, occupancy: 2100, pct_full: 42 },
      { name: 'Pasadena Rose Bowl', county: 'Los Angeles', state: 'CA', lat: 34.162, lon: -118.167, capacity: 2000, occupancy: 1800, pct_full: 90 },
    ]
    const near_capacity = demoShelters.filter(s => s.pct_full !== null && s.pct_full >= 80).length
    return NextResponse.json({ shelters: demoShelters, near_capacity, demo: true })
  }
}
