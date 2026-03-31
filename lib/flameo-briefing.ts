import type { FlameoContext, FlameoContextStatus } from '@/lib/flameo-context-types'

/** Server-only copy when we do not call the LLM (status !== 'ready' or missing API key). */
export function briefingForNonReadyStatus(
  status: FlameoContextStatus,
  message?: string
): string {
  switch (status) {
    case 'address_missing':
      return 'Add your home address in Settings to get personalized fire proximity alerts and briefings.'
    case 'geocode_failed':
      return message ?? 'We could not locate your address on the map. Check spelling in Settings.'
    case 'feeds_unavailable':
      return message ?? 'Active fire feeds are unavailable right now. Try again later.'
    case 'feeds_partial':
      return message ?? 'Some fire data sources were unavailable. What we can show may be incomplete.'
    case 'no_fires_in_radius':
      return message ?? 'No confirmed fire activity within your alert radius right now.'
    case 'ready':
      return ''
    default:
      return message ?? 'Fire safety data is limited right now.'
  }
}

/** When the LLM fails but we still have verified incidents in context. */
export function templatedLlmFailureBriefing(context: FlameoContext): string {
  const n = context.incidents_nearby.length
  const closest = context.incidents_nearby[0]
  if (n > 0 && closest) {
    const name = closest.name || 'a detected incident'
    const where =
      context.flags?.live_differs_from_home && closest.nearest_anchor_id === 'live'
        ? 'closer to your current GPS position than to your saved home'
        : context.flags?.live_differs_from_home && closest.nearest_anchor_id === 'home'
          ? 'closer to your saved home than to your current GPS position'
          : 'relative to your location'
    return (
      `We confirmed activity near you (${name}, about ${closest.distance_miles} mi ${where}), but a full AI briefing could not be generated. ` +
      'Open My Alerts and the evacuation map for details. If you are in danger, call 911.'
    )
  }
  return (
    'We could not generate a briefing right now. Check My Alerts and the evacuation map. If you are in danger, call 911.'
  )
}

/** Rule-based briefing when status is ready but Anthropic is not configured. */
export function templatedReadyWithoutLlm(context: FlameoContext): string {
  const lines: string[] = []
  const home = context.anchors.find(a => a.id === 'home')
  const live = context.anchors.find(a => a.id === 'live')
  if (home) {
    lines.push(`Saved home: ${home.label}.`)
  }
  if (live && typeof context.live_vs_home_miles === 'number') {
    lines.push(
      `Your current GPS position is about ${context.live_vs_home_miles.toFixed(1)} mi from that address — threats may apply to home, to where you are now, or both.`
    )
  }
  if (context.incidents_nearby.length === 0) {
    return lines.join(' ') + ' No incidents within your alert radius in the current feed.'
  }
  const top = context.incidents_nearby.slice(0, 3)
  lines.push(
    `Confirmed activity within ${context.alert_radius_miles} mi (nearest reference point):`,
    top
      .map(i => {
        const near =
          context.flags?.live_differs_from_home && i.nearest_anchor_id === 'live'
            ? ' (nearest: current GPS)'
            : context.flags?.live_differs_from_home && i.nearest_anchor_id === 'home'
              ? ' (nearest: saved home)'
              : ''
        return `• ${i.name ?? i.source.toUpperCase()} (~${i.distance_miles} mi${near})`
      })
      .join(' '),
    'Review the evacuation map and My Alerts for shelter and hazard information.',
    'Shelters listed are human emergency evacuation shelters only. Do not use animal shelters or veterinary facilities as evacuation destinations.'
  )
  return lines.join(' ')
}
