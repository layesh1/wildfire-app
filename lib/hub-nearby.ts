/**
 * Hub automation: distance helpers for filtering fires relative to a home / map anchor.
 */

export const NEAR_RADIUS_KM = 200 // ~124 mi — "near your address"

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface FirePoint {
  latitude: number
  longitude: number
  fire_name?: string
  incident_name?: string
  id?: string
  containment?: number | null
  acres?: number | null
}

export function firesWithinRadius<T extends FirePoint>(
  fires: T[],
  center: [number, number] | null,
  radiusKm: number
): (T & { distanceKm: number })[] {
  if (!center || !fires.length) return []
  const [clat, clon] = center
  const out: (T & { distanceKm: number })[] = []
  for (const f of fires) {
    const lat = f.latitude
    const lon = f.longitude
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const d = haversineKm(clat, clon, lat, lon)
    if (d <= radiusKm) out.push({ ...f, distanceKm: d })
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm)
  return out
}
