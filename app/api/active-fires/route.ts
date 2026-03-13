import { NextResponse } from 'next/server'

// NIFC Current Wildland Fire Locations — returnGeometry=true so we get point coords
// from geometry.x/y (WGS84), not unreliable attribute fields
const NIFC_URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query' +
  '?where=1%3D1' +
  '&outFields=IncidentName,IncidentTypeCategory,PercentContained,InitialLatitude,InitialLongitude,POOLatitude,POOLongitude,DailyAcres,GISAcres,POOCounty,POOState,FireCause,UniqueFireIdentifier,ModifiedOnDateTime_dt' +
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

export async function GET() {
  try {
    const res = await fetch(NIFC_URL, {
      next: { revalidate: 900 }, // cache 15 min
      headers: { 'User-Agent': 'WildFireApp/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'NIFC unavailable', fires: [] }, { status: 200 })
    }

    const json = await res.json()
    const features: unknown[] = json?.features ?? []

    const fires: ActiveFire[] = features
      .map((f: unknown) => {
        const feature = f as {
          attributes: Record<string, unknown>
          geometry?: { x?: number; y?: number }
        }
        const attrs = feature.attributes

        // Prefer geometry point (most reliable), then attribute lat/lon fields
        const lat = Number(
          feature.geometry?.y ??
          attrs.POOLatitude ??
          attrs.InitialLatitude ??
          0
        )
        const lng = Number(
          feature.geometry?.x ??
          attrs.POOLongitude ??
          attrs.InitialLongitude ??
          0
        )

        // Skip features with no valid coordinates or clearly wrong values
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

        const acres = Number(attrs.DailyAcres ?? attrs.GISAcres ?? 0)
        const name = String(attrs.IncidentName ?? 'Unknown Fire').trim()

        return {
          id: String(attrs.UniqueFireIdentifier ?? `${lat}-${lng}`),
          name: name || 'Unknown Fire',
          state: String(attrs.POOState ?? '').trim(),
          county: String(attrs.POOCounty ?? '').trim(),
          lat,
          lng,
          acres,
          contained_pct: Number(attrs.PercentContained ?? 0),
          cause: String(attrs.FireCause ?? 'Unknown'),
          type: String(attrs.IncidentTypeCategory ?? 'WF'),
          updated: attrs.ModifiedOnDateTime_dt
            ? new Date(Number(attrs.ModifiedOnDateTime_dt)).toISOString()
            : null,
        } as ActiveFire
      })
      .filter(Boolean) as ActiveFire[]

    return NextResponse.json({
      fires,
      total_features: features.length,
      source: 'NIFC',
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Active fires fetch error:', err)
    return NextResponse.json({ error: 'Fetch failed', fires: [] }, { status: 200 })
  }
}
