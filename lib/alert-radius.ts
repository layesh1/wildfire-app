/** Consumer fire proximity radius — DB default and UI fallbacks should match. */
export const DEFAULT_ALERT_RADIUS_MILES = 50

/** Settings “Fire Alert Range” chip options (miles). */
export const ALERT_RADIUS_CHIP_MILES = [25, 50, 75, 100] as const

export function coerceAlertRadiusToChip(miles: number): number {
  if (!Number.isFinite(miles) || miles <= 0) return DEFAULT_ALERT_RADIUS_MILES
  const chips = ALERT_RADIUS_CHIP_MILES as readonly number[]
  if (chips.includes(miles)) return miles
  return chips.reduce((best, c) =>
    Math.abs(c - miles) < Math.abs(best - miles) ? c : best
  )
}
