import { NextResponse } from 'next/server'

// NASA EONET — free, no API key, always public
// Returns open wildfire events with coordinates and acreage
const EONET_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200'

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

// Best-effort state extraction from event title (e.g. "Yellow Wildfire, Moore, Texas")
function extractState(title: string): string {
  const US_STATES: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY',
  }
  for (const [name, abbr] of Object.entries(US_STATES)) {
    if (title.includes(name)) return abbr
  }
  return ''
}

// Extract county/location from title — typically "Fire Name, Location, State"
function extractCounty(title: string): string {
  const parts = title.split(',').map(p => p.trim())
  // parts[1] is usually the county/city, parts[2] the state
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

export async function GET() {
  try {
    const res = await fetch(EONET_URL, {
      next: { revalidate: 900 }, // cache 15 min
      headers: { 'User-Agent': 'WildFireApp/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'EONET unavailable', fires: [] }, { status: 200 })
    }

    const json = await res.json()
    const events: unknown[] = json?.events ?? []

    const fires: ActiveFire[] = events
      .map((e: unknown) => {
        const ev = e as {
          id: string
          title: string
          geometry: Array<{
            coordinates: [number, number]
            magnitudeValue?: number
            magnitudeUnit?: string
            date: string
          }>
          sources?: Array<{ id: string; url: string }>
        }

        // Use the most recent geometry point
        const geo = ev.geometry?.[ev.geometry.length - 1]
        if (!geo?.coordinates) return null

        const [lng, lat] = geo.coordinates
        if (!lat || !lng || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

        const acres = geo.magnitudeUnit === 'acres' ? Number(geo.magnitudeValue ?? 0) : 0
        const state = extractState(ev.title)
        const county = extractCounty(ev.title)

        return {
          id: ev.id,
          name: ev.title.split(',')[0].trim(),
          state,
          county,
          lat,
          lng,
          acres,
          contained_pct: 0, // EONET doesn't provide containment
          cause: 'Unknown',
          type: 'WF',
          updated: geo.date ?? null,
        } as ActiveFire
      })
      .filter(Boolean) as ActiveFire[]

    return NextResponse.json({
      fires,
      total_features: events.length,
      source: 'NASA EONET',
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Active fires fetch error:', err)
    return NextResponse.json({ error: 'Fetch failed', fires: [] }, { status: 200 })
  }
}
