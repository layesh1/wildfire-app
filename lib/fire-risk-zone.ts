/**
 * Approximate “modeled concern” radius around a reported incident (acres → km).
 * Used for dashed prediction halos on command / analyst maps — not an official evacuation line.
 */
export function estimatedRiskRadiusKm(acres: number | null): number {
  if (!acres || acres < 10) return 0.5
  const radiusKm = Math.sqrt((acres * 0.00405) / Math.PI) * 2.2
  return Math.min(Math.max(radiusKm, 0.5), 80)
}
