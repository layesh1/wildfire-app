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
    return NextResponse.json({ shelters: [], near_capacity: 0, error: 'unavailable' })
  }
}
