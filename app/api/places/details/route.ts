import { NextRequest, NextResponse } from 'next/server'

function serverMapsKey(): string | null {
  const k = process.env.GOOGLE_GEOCODING_API_KEY?.trim()
  return k || null
}

/** Place Details for a `place_id` from autocomplete (server key). */
export async function GET(request: NextRequest) {
  const key = serverMapsKey()
  if (!key) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const placeId = request.nextUrl.searchParams.get('place_id')?.trim() ?? ''
  if (!placeId) {
    return NextResponse.json({ error: 'place_id required' }, { status: 400 })
  }

  const u = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  u.searchParams.set('place_id', placeId)
  u.searchParams.set('fields', 'formatted_address,geometry,types')
  u.searchParams.set('key', key)

  const res = await fetch(u.toString(), { cache: 'no-store' })
  const data = (await res.json()) as {
    status?: string
    result?: {
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
      types?: string[]
    }
    error_message?: string
  }

  if (data.status !== 'OK' || !data.result) {
    console.error('[places/details]', data.status, data.error_message)
    return NextResponse.json(
      { error: data.error_message || data.status || 'place_details_failed' },
      { status: 404 }
    )
  }

  const r = data.result
  const lat = r.geometry?.location?.lat
  const lng = r.geometry?.location?.lng
  const formatted = typeof r.formatted_address === 'string' ? r.formatted_address.trim() : ''
  if (typeof lat !== 'number' || typeof lng !== 'number' || !formatted) {
    return NextResponse.json({ error: 'incomplete_result' }, { status: 404 })
  }

  return NextResponse.json({
    formatted_address: formatted,
    lat,
    lng,
    types: Array.isArray(r.types) ? r.types : [],
  })
}
