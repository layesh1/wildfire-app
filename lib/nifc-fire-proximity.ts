import { distanceMiles } from '@/lib/hub-map-distance'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import { isActiveNifcFire } from '@/lib/nifc-fire-map'

/** Minimum distance (miles) from a point to any active NIFC incident in the list. */
export function nearestActiveNifcFireDistanceMiles(lat: number, lng: number, fires: NifcFire[]): number {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Number.POSITIVE_INFINITY
  let best = Number.POSITIVE_INFINITY
  for (const f of fires) {
    if (!isActiveNifcFire(f)) continue
    if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) continue
    const d = distanceMiles([lat, lng], [f.latitude, f.longitude])
    if (d < best) best = d
  }
  return best
}

export function isWithinActiveFireProximity(
  lat: number,
  lng: number,
  fires: NifcFire[],
  radiusMiles: number,
): boolean {
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return false
  return nearestActiveNifcFireDistanceMiles(lat, lng, fires) <= radiusMiles
}
