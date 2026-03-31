import type { WorkBuildingType } from '@/lib/profile-work-location'

type GeocodeResult = {
  lat: number
  lng: number
  formatted: string
  types: string[]
}

function requireServerGeocodingKey(): string {
  const key = process.env.GOOGLE_GEOCODING_API_KEY
  if (!key) throw new Error('Missing GOOGLE_GEOCODING_API_KEY')
  return key
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = requireServerGeocodingKey()
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json'
    + `?address=${encodeURIComponent(address)}`
    + '&region=us'
    + `&key=${encodeURIComponent(key)}`

  const res = await fetch(url, { cache: 'no-store' })
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

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ formatted: string }> {
  const key = requireServerGeocodingKey()
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json'
    + `?latlng=${encodeURIComponent(`${lat},${lng}`)}`
    + '&region=us'
    + `&key=${encodeURIComponent(key)}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Reverse geocoding request failed (${res.status})`)
  const data = (await res.json()) as {
    status?: string
    results?: Array<{ formatted_address?: string }>
  }
  const formatted = data.results?.[0]?.formatted_address
  if (data.status !== 'OK' || typeof formatted !== 'string' || !formatted.trim()) {
    throw new Error('No reverse geocoding results found')
  }
  return { formatted: formatted.trim() }
}

export function detectBuildingType(types: string[]): WorkBuildingType {
  const t = new Set(types)
  if (t.has('office')) return 'office'
  if (t.has('point_of_interest') && t.has('establishment') && !t.has('street_address')) {
    return 'office'
  }
  if (t.has('premise') && t.has('establishment') && !t.has('street_address')) {
    return 'apartment'
  }
  if (t.has('street_address') && !t.has('establishment')) {
    return 'house'
  }
  return 'other'
}
