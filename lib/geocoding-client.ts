export type ClientGeocodeResult = {
  lat: number
  lng: number
  formatted: string
  types: string[]
}

function requireClientPlacesKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_GOOGLE_PLACES_API_KEY')
  return key
}

export async function geocodeAddressClient(address: string): Promise<ClientGeocodeResult> {
  const key = requireClientPlacesKey()
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json'
    + `?address=${encodeURIComponent(address)}`
    + '&region=us'
    + `&key=${encodeURIComponent(key)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`)
  const data = (await res.json()) as {
    status?: string
    results?: Array<{
      formatted_address?: string
      geometry?: { location?: { lat?: number; lng?: number } }
      types?: string[]
    }>
  }

  const first = data.results?.[0]
  const lat = first?.geometry?.location?.lat
  const lng = first?.geometry?.location?.lng
  const formatted = first?.formatted_address
  if (
    data.status !== 'OK'
    || typeof lat !== 'number'
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
    types: Array.isArray(first?.types) ? first.types : [],
  }
}
