import { NextResponse } from 'next/server'

// NIFC Current Wildland Fire Locations (public ArcGIS service — no API key)
const NIFC_URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/Current_WildlandFire_Locations/FeatureServer/0/query' +
  '?where=1%3D1' +
  '&outFields=IncidentName,IncidentTypeCategory,PercentContained,InitialLatitude,InitialLongitude,DailyAcres,GISAcres,POOCounty,POOState,FireCause,UniqueFireIdentifier,ModifiedOnDateTime_dt' +
  '&returnGeometry=false' +
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
        const attrs = (f as { attributes: Record<string, unknown> }).attributes
        const lat = Number(attrs.InitialLatitude ?? 0)
        const lng = Number(attrs.InitialLongitude ?? 0)
        if (!lat || !lng) return null
        const acres = Number(attrs.DailyAcres ?? attrs.GISAcres ?? 0)
        return {
          id: String(attrs.UniqueFireIdentifier ?? Math.random()),
          name: String(attrs.IncidentName ?? 'Unknown Fire'),
          state: String(attrs.POOState ?? ''),
          county: String(attrs.POOCounty ?? ''),
          lat,
          lng,
          acres,
          contained_pct: Number(attrs.PercentContained ?? 0),
          cause: String(attrs.FireCause ?? 'Unknown'),
          type: String(attrs.IncidentTypeCategory ?? 'WF'),
          updated: attrs.ModifiedOnDateTime_dt ? new Date(Number(attrs.ModifiedOnDateTime_dt)).toISOString() : null,
        } as ActiveFire
      })
      .filter(Boolean) as ActiveFire[]

    return NextResponse.json({ fires, source: 'NIFC', fetched_at: new Date().toISOString() })
  } catch (err) {
    console.error('Active fires fetch error:', err)
    return NextResponse.json({ error: 'Fetch failed', fires: [] }, { status: 200 })
  }
}
