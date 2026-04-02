/** Shared NIFC styling / filtering for Leaflet layers (hub + evacuation maps). */

export function containmentColor(pct: number | null): string {
  if (pct == null || pct < 25) return '#ef4444'
  if (pct < 50) return '#f97316'
  if (pct < 75) return '#eab308'
  return '#22c55e'
}

export function containmentRadius(acres: number | null): number {
  if (!acres) return 9
  return Math.min(8 + Math.log10(acres + 1) * 4, 22)
}

export function isActiveNifcFire(f: {
  containment: number | null
  latitude: number
  longitude: number
}): boolean {
  return (
    (f.containment == null || f.containment < 100)
    && Number.isFinite(f.latitude)
    && Number.isFinite(f.longitude)
  )
}
