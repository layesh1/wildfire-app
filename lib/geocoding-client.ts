export type ClientGeocodeResult = {
  lat: number
  lng: number
  formatted: string
  types: string[]
}

/**
 * Geocode a saved address line from the browser via `/api/geocode/forward` (server uses `GOOGLE_GEOCODING_API_KEY`).
 * Direct calls to maps.googleapis.com from the browser often fail (CORS, key restrictions on Geocoding API).
 */
export async function geocodeAddressClient(address: string): Promise<ClientGeocodeResult> {
  const q = address.trim()
  if (q.length < 4) throw new Error('Address too short')

  const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(q)}`, {
    credentials: 'same-origin',
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    lat?: number
    lng?: number
    formatted?: string
    types?: string[]
  }

  if (!res.ok) {
    throw new Error(data.error || `Geocoding failed (${res.status})`)
  }

  const { lat, lng, formatted, types } = data
  if (
    typeof lat !== 'number'
    || typeof lng !== 'number'
    || typeof formatted !== 'string'
    || !formatted.trim()
  ) {
    throw new Error('No geocoding results found')
  }

  return {
    lat,
    lng,
    formatted: formatted.trim(),
    types: Array.isArray(types) ? types : [],
  }
}
