import { NextRequest, NextResponse } from 'next/server'

function serverMapsKey(): string | null {
  const k = process.env.GOOGLE_GEOCODING_API_KEY?.trim()
  return k || null
}

type Pred = { place_id: string; description: string }

function googleStatusOk(status: string): boolean {
  return status === 'OK' || status === 'ZERO_RESULTS'
}

/**
 * Server-side Google Place Autocomplete (US). Use when the browser cannot load
 * `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (missing key, referrer restrictions, etc.).
 * Same GCP key as forward geocode if Places API is enabled for the project.
 */
export async function GET(request: NextRequest) {
  const key = serverMapsKey()
  if (!key) {
    return NextResponse.json(
      { error: 'not_configured', predictions: [] as Pred[] },
      { status: 503 }
    )
  }
  const mapsKey: string = key

  const input = request.nextUrl.searchParams.get('input')?.trim() ?? ''
  if (input.length < 3) {
    return NextResponse.json({ predictions: [] as Pred[] })
  }

  async function fetchPreds(types: 'address' | null): Promise<{
    preds: Pred[]
    status: string
    error_message?: string
  }> {
    const u = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    u.searchParams.set('input', input)
    u.searchParams.set('components', 'country:us')
    u.searchParams.set('key', mapsKey)
    if (types) u.searchParams.set('types', types)
    const res = await fetch(u.toString(), { cache: 'no-store' })
    const data = (await res.json()) as {
      status?: string
      predictions?: Array<{ place_id?: string; description?: string }>
      error_message?: string
    }
    const status = data.status || 'UNKNOWN'
    if (status === 'REQUEST_DENIED' || status === 'INVALID_REQUEST') {
      console.error('[places/autocomplete]', status, data.error_message)
      return { preds: [], status, error_message: data.error_message }
    }
    const raw = Array.isArray(data.predictions) ? data.predictions : []
    const preds = raw
      .map(p => ({
        place_id: String(p.place_id ?? ''),
        description: String(p.description ?? ''),
      }))
      .filter(p => p.place_id && p.description)
      .slice(0, 12)
    return { preds, status }
  }

  let first = await fetchPreds('address')
  let preds = first.preds
  if (preds.length === 0 && /\d/.test(input)) {
    const broad = await fetchPreds(null)
    preds = broad.preds.filter(p => /^\d/.test(p.description.trim())).slice(0, 12)
    if (preds.length === 0 && !googleStatusOk(broad.status)) {
      return NextResponse.json({
        predictions: [] as Pred[],
        googleStatus: broad.status,
        googleError: broad.error_message,
      })
    }
  }

  if (preds.length === 0 && !googleStatusOk(first.status)) {
    return NextResponse.json({
      predictions: [] as Pred[],
      googleStatus: first.status,
      googleError: first.error_message,
    })
  }

  return NextResponse.json({ predictions: preds })
}
