import { NextResponse } from 'next/server'

const BASE = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/EGP_Active_Incidents_Prod_Public_View/FeatureServer/0/query'

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

function normalizeState(raw: string): string {
  return raw ? raw.replace(/^US-/, '').trim() : ''
}

export async function GET() {
  const params = new URLSearchParams({
    where: 'PercentContained < 100 OR PercentContained IS NULL',
    outFields: 'Name,POOState,County,PercentContained,Cause,DailyAcres,CalculatedAcres,DiscoveryAcres,UniqueFireIdentifier,Last_Time_Information_Modified',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '300',
  })

  const url = `${BASE}?${params.toString()}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()

    // Return raw snippet for debugging if empty
    let json: Record<string, unknown>
    try {
      json = JSON.parse(text)
    } catch {
      return NextResponse.json({
        fires: [], error: 'JSON parse failed', raw_snippet: text.slice(0, 300),
      })
    }

    if (json?.error) {
      return NextResponse.json({
        fires: [], error: String((json.error as Record<string,unknown>)?.message ?? json.error),
        raw_snippet: text.slice(0, 300),
      })
    }

    const features = (json?.features as unknown[]) ?? []

    const fires: ActiveFire[] = features
      .map((f: unknown) => {
        const feat = f as { attributes: Record<string, unknown>; geometry?: { x?: number; y?: number } }
        const a = feat.attributes
        const lat = Number(feat.geometry?.y ?? 0)
        const lng = Number(feat.geometry?.x ?? 0)
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
        const acres = Number(a.DailyAcres ?? a.CalculatedAcres ?? a.DiscoveryAcres ?? 0)
        const updatedMs = Number(a.Last_Time_Information_Modified)
        return {
          id: String(a.UniqueFireIdentifier ?? `${lat}_${lng}`),
          name: String(a.Name ?? 'Unknown').trim(),
          state: normalizeState(String(a.POOState ?? '')),
          county: String(a.County ?? '').trim(),
          lat, lng, acres,
          contained_pct: Number(a.PercentContained ?? 0),
          cause: String(a.Cause ?? 'Unknown').trim(),
          type: 'WF',
          updated: updatedMs ? new Date(updatedMs).toISOString() : null,
        } as ActiveFire
      })
      .filter(Boolean) as ActiveFire[]

    return NextResponse.json({
      fires,
      total_features: features.length,
      source: 'NIFC EGP',
      fetched_at: new Date().toISOString(),
      // debug: include raw snippet if fires is empty so we can diagnose
      ...(fires.length === 0 && { raw_snippet: text.slice(0, 500) }),
    })
  } catch (err) {
    return NextResponse.json({ fires: [], error: String(err) })
  }
}
