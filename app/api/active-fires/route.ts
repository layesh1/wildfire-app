import { NextResponse } from 'next/server'

// NIFC EGP Active Incidents — public view, no token required
// Field names confirmed from live schema inspection
const NIFC_URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/EGP_Active_Incidents_Prod_Public_View/FeatureServer/0/query' +
  '?where=1%3D1' +
  '&outFields=Name,POOState,County,PercentContained,Cause,DailyAcres,DiscoveryAcres,CalculatedAcres,Incident_Type_Kind,UniqueFireIdentifier,Last_Time_Information_Modified,Discovery_Date' +
  '&returnGeometry=true' +
  '&outSR=4326' +
  '&f=json' +
  '&resultRecordCount=300'

export interface ActiveFire {
  id: string
  name: string
  state: string
  county: string
  lat: number
  lng: number
  acres: number
  contained_pct: number
  cause: string
  type: string
  updated: string | null
}

// Normalize state values like "US-FL" → "FL"
function normalizeState(raw: string): string {
  if (!raw) return ''
  return raw.replace(/^US-/, '').trim()
}

export async function GET() {
  try {
    const res = await fetch(NIFC_URL, {
      next: { revalidate: 600 }, // cache 10 min
      headers: { 'User-Agent': 'WildFireApp/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'NIFC unavailable', fires: [] }, { status: 200 })
    }

    const json = await res.json()

    if (json?.error) {
      return NextResponse.json({ error: json.error.message ?? 'NIFC error', fires: [] }, { status: 200 })
    }

    const features: unknown[] = json?.features ?? []

    const fires: ActiveFire[] = features
      .map((f: unknown) => {
        const feature = f as {
          attributes: Record<string, unknown>
          geometry?: { x?: number; y?: number }
        }
        const attrs = feature.attributes

        const lat = Number(feature.geometry?.y ?? 0)
        const lng = Number(feature.geometry?.x ?? 0)
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

        // Best acreage field: DailyAcres > CalculatedAcres > DiscoveryAcres
        const acres = Number(attrs.DailyAcres ?? attrs.CalculatedAcres ?? attrs.DiscoveryAcres ?? 0)

        // Last_Time_Information_Modified is a Unix ms timestamp
        const updatedMs = attrs.Last_Time_Information_Modified
        const updated = updatedMs ? new Date(Number(updatedMs)).toISOString() : null

        return {
          id: String(attrs.UniqueFireIdentifier ?? `${lat}-${lng}-${Math.random()}`),
          name: String(attrs.Name ?? 'Unknown Fire').trim(),
          state: normalizeState(String(attrs.POOState ?? '')),
          county: String(attrs.County ?? '').trim(),
          lat,
          lng,
          acres,
          contained_pct: Number(attrs.PercentContained ?? 0),
          cause: String(attrs.Cause ?? 'Unknown').trim(),
          type: String(attrs.Incident_Type_Kind ?? 'WF'),
          updated,
        } as ActiveFire
      })
      .filter(Boolean) as ActiveFire[]

    return NextResponse.json({
      fires,
      total_features: features.length,
      source: 'NIFC EGP',
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Active fires fetch error:', err)
    return NextResponse.json({ error: 'Fetch failed', fires: [] }, { status: 200 })
  }
}
