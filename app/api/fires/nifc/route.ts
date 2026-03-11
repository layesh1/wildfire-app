import { NextResponse } from 'next/server'

const ARCGIS_BASE = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services'

const QUERY_PARAMS = 'where=1%3D1&outFields=*&f=json&resultRecordCount=500'

export interface NifcFire {
  id: string
  latitude: number
  longitude: number
  fire_name: string
  acres: number | null
  containment: number | null
  source: 'nifc_perimeter' | 'nifc_incident'
}

async function fetchPerimeters(): Promise<NifcFire[]> {
  const url = `${ARCGIS_BASE}/Current_WildlandFire_Perimeters/FeatureServer/0/query?${QUERY_PARAMS}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const json = await res.json()
  if (!json.features) return []
  return json.features
    .filter((f: any) => f.attributes && f.centroid)
    .map((f: any) => ({
      id: `nifc-p-${f.attributes.OBJECTID ?? Math.random()}`,
      latitude: f.centroid?.y ?? null,
      longitude: f.centroid?.x ?? null,
      fire_name: f.attributes.IncidentName || f.attributes.GACGName || 'Unknown Fire',
      acres: f.attributes.GISAcres ?? f.attributes.Acres ?? null,
      containment: f.attributes.PercentContained ?? null,
      source: 'nifc_perimeter' as const,
    }))
    .filter((f: NifcFire) => f.latitude && f.longitude)
}

async function fetchIncidents(): Promise<NifcFire[]> {
  const url = `${ARCGIS_BASE}/WFIGS_Incident_Locations_Current/FeatureServer/0/query?${QUERY_PARAMS}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const json = await res.json()
  if (!json.features) return []
  return json.features
    .filter((f: any) => f.geometry && f.attributes)
    .map((f: any) => ({
      id: `nifc-i-${f.attributes.OBJECTID ?? Math.random()}`,
      latitude: f.geometry.y,
      longitude: f.geometry.x,
      fire_name: f.attributes.IncidentName || f.attributes.POOName || 'Unknown Fire',
      acres: f.attributes.IncidentTypeCategory === 'WF'
        ? (f.attributes.DailyAcres ?? f.attributes.CalculatedAcres ?? null)
        : null,
      containment: f.attributes.PercentContained ?? null,
      source: 'nifc_incident' as const,
    }))
    .filter((f: NifcFire) => f.latitude && f.longitude)
}

export async function GET() {
  try {
    const [perimeters, incidents] = await Promise.allSettled([
      fetchPerimeters(),
      fetchIncidents(),
    ])

    const fires: NifcFire[] = [
      ...(perimeters.status === 'fulfilled' ? perimeters.value : []),
      ...(incidents.status === 'fulfilled' ? incidents.value : []),
    ]

    // Deduplicate by name (prefer incident over perimeter)
    const seen = new Set<string>()
    const deduped = fires.filter(f => {
      const key = f.fire_name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ data: deduped, count: deduped.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
