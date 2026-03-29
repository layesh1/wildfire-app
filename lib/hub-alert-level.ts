import type { AlertLevel } from '@/components/AlertJar'
import type { FlameoContext } from '@/lib/flameo-context-types'

/** Automated regional status from Flameo context (nearest incident within alert radius). */
export function alertLevelFromFlameoContext(ctx: FlameoContext | null): AlertLevel {
  if (!ctx?.flags?.has_confirmed_threat || !ctx.incidents_nearby?.length) return 'safe'
  const d = Math.min(...ctx.incidents_nearby.map(i => i.distance_miles))
  if (d <= 5) return 'act_now'
  if (d <= 12) return 'warning'
  return 'caution'
}
