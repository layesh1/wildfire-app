/**
 * Nominatim (OSM) helpers: only treat results as valid "home" anchors when they are
 * street-level (not whole cities, counties, or generic regions).
 * @see https://nominatim.org/release-docs/latest/api/Output/
 */

export type NominatimAddress = {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  postcode?: string
  country?: string
  [key: string]: string | undefined
}

export type NominatimSearchHit = {
  place_id: number
  lat: string
  lon: string
  display_name: string
  class?: string
  type?: string
  addresstype?: string
  address?: NominatimAddress
}

const REJECT_TYPES = new Set([
  'administrative',
  'state',
  'region',
  'county',
  'city',
  'town',
  'village',
  'municipality',
  'hamlet',
  'suburb',
  'neighbourhood',
  'city_district',
  'border',
])

const ACCEPT_TYPES = new Set([
  'house',
  'building',
  'terrace',
  'apartments',
  'detached',
  'bungalow',
  'cottage',
  'farm',
  'residential',
])

/** True when this hit is specific enough to use as a household anchor (not metro/county-only). */
export function isSpecificStreetAddress(hit: NominatimSearchHit): boolean {
  const cls = hit.class ?? ''
  const typ = hit.type ?? ''
  const addr = hit.address

  if (cls === 'boundary') return false
  if (typ === 'administrative') return false

  if (addr?.house_number && String(addr.house_number).trim().length > 0) return true

  if (ACCEPT_TYPES.has(typ)) return true
  if (cls === 'building') return true

  if (REJECT_TYPES.has(typ)) return false

  return false
}

export function filterToStreetAddresses(hits: NominatimSearchHit[]): NominatimSearchHit[] {
  return hits.filter(isSpecificStreetAddress)
}

/** Lightweight client check before server geocode — must include a street number. */
export function looksLikeUsStreetAddress(line: string): boolean {
  const t = line.trim()
  if (t.length < 8) return false
  // US-style: leading number, or "123-A" patterns
  return /\d/.test(t)
}

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

/** Reverse geocode; returns display_name or null on failure. */
export async function reverseGeocodeDisplayName(lat: string, lon: string): Promise<string | null> {
  try {
    const url = `${NOMINATIM_REVERSE}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'WildfireAlert/2.0 (address-verify)',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { display_name?: string }
    return typeof data.display_name === 'string' && data.display_name.trim() ? data.display_name.trim() : null
  } catch {
    return null
  }
}
