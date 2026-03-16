import { NextResponse } from 'next/server'

interface RedFlagWarning {
  zone: string
  headline: string
  onset: string
  expires: string
  lat: number
  lon: number
  description: string
}

function computeCentroid(coords: number[][]): { lat: number; lon: number } {
  const lon = coords.reduce((s, p) => s + p[0], 0) / coords.length
  const lat = coords.reduce((s, p) => s + p[1], 0) / coords.length
  return { lat, lon }
}

export async function GET() {
  const fetched_at = new Date().toISOString()

  try {
    const res = await fetch(
      'https://api.weather.gov/alerts/active?event=Red%20Flag%20Warning',
      {
        headers: { Accept: 'application/geo+json', 'User-Agent': 'WildfireAlertApp/2.0' },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ warnings: [], count: 0, error: 'unavailable', fetched_at })
    }

    const geojson = await res.json()
    const features: any[] = geojson.features ?? []

    const warnings: RedFlagWarning[] = []

    for (const feature of features) {
      const props = feature.properties ?? {}
      const geometry = feature.geometry

      let lat: number | null = null
      let lon: number | null = null

      if (geometry?.type === 'Polygon') {
        const ring: number[][] = geometry.coordinates[0] ?? []
        if (ring.length > 0) {
          const c = computeCentroid(ring)
          lat = c.lat
          lon = c.lon
        }
      } else if (geometry?.type === 'MultiPolygon') {
        const firstRing: number[][] = geometry.coordinates[0]?.[0] ?? []
        if (firstRing.length > 0) {
          const c = computeCentroid(firstRing)
          lat = c.lat
          lon = c.lon
        }
      }

      // Skip features with no usable geometry
      if (lat === null || lon === null) continue

      warnings.push({
        zone: props.areaDesc ?? '',
        headline: props.headline ?? '',
        onset: props.onset ?? '',
        expires: props.expires ?? '',
        lat,
        lon,
        description: props.description ?? '',
      })
    }

    return NextResponse.json({ warnings, count: warnings.length, fetched_at })
  } catch {
    return NextResponse.json({ warnings: [], count: 0, error: 'unavailable', fetched_at })
  }
}
