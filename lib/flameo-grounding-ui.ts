import type { FlameoContext, FlameoContextStatus } from '@/lib/flameo-context-types'

export function flameoGroundingBadgeText(
  context: FlameoContext | null | undefined,
  status: FlameoContextStatus | null | undefined
): string | null {
  if (status == null) return null
  if (status === 'feeds_unavailable') return '🔴 Live data unavailable'
  if (status === 'no_fires_in_radius') return '🟡 No active fires near you'
  if (status === 'ready' || status === 'feeds_partial') {
    const n = context?.incidents_nearby?.length ?? 0
    return `🟢 Grounded — ${n} fire${n === 1 ? '' : 's'} in context`
  }
  return null
}
