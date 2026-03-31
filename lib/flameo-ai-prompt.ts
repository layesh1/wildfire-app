import type { FlameoContext, FlameoAiRole } from '@/lib/flameo-context-types'
import type { FlameoNavConsumer, FlameoNavBase } from '@/lib/flameo-phase-c-tools'

export function parseOptionalFlameoContext(raw: unknown): FlameoContext | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.incidents_nearby)) return null
  return raw as FlameoContext
}

export function parseFlameoNavContext(body: Record<string, unknown>): {
  consumer: FlameoNavConsumer
  navBase: FlameoNavBase
} {
  const raw = body.flameoNavContext
  let consumer: FlameoNavConsumer = 'caregiver'
  let navBase: FlameoNavBase = 'desktop'
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const c = o.consumer
    if (c === 'evacuee' || c === 'caregiver') consumer = c
    const n = o.navBase
    if (n === 'mobile' || n === 'desktop') navBase = n
  }
  return { consumer, navBase }
}

/** Resolves chat role: explicit `flameoRole`, legacy COMMAND-INTEL persona, or nav consumer. */
export function resolveFlameoAiRole(
  body: Record<string, unknown>,
  legacyPersona: string
): FlameoAiRole {
  const r = body.flameoRole
  if (r === 'caregiver' || r === 'evacuee' || r === 'responder') return r
  if (legacyPersona === 'COMMAND-INTEL') return 'responder'
  const { consumer } = parseFlameoNavContext(body)
  return consumer === 'evacuee' ? 'evacuee' : 'caregiver'
}

export function buildFlameoGroundingPrefix(context: FlameoContext): string {
  const json = JSON.stringify(context)
  const la = context.location_anchor
  const rankedShelters = (context.shelters_ranked ?? []).slice(0, 3)
  const rankedShelterBlock =
    context.incidents_nearby.length > 0 && rankedShelters.length > 0
      ? `

Nearest safe shelters ranked by travel time:
${rankedShelters.map((s, i) => `  ${i + 1}. ${s.name} — ${s.travel_minutes} min (${s.distance_miles} mi) — ${s.route_avoids_fire ? 'route avoids fire' : 'route passes near fire zone'}${s.accessibility_likely ? ' — accessibility likely' : ''}`).join('\n')}

When recommending evacuation destination, prefer #1 unless the user asks for alternatives.
`
      : ''
  const workAnchorBlock =
    la?.anchor === 'work'
      ? `

Work-location grounding (when context.location_anchor.anchor is "work"): The user is currently detected at their work location: ${la.anchor_address ?? 'unknown'}. Building type: ${la.building_type ?? 'unknown'}. Floor: ${la.floor_number != null ? String(la.floor_number) : 'unknown'}. Mobility note: ${la.location_note?.trim() ? la.location_note : 'none'}.

If building type is office or apartment and a fire is nearby, prioritize stairwell evacuation guidance. Do not recommend elevators. If the user has mobility needs, emphasize requesting building security assistance for evacuation.
`
      : ''

  return `You are Flameo. You have verified fire data for this user. context.anchors may include "home" (saved address), "work" (saved work address when the client signals they are there), "live" (current GPS when it differs from home), or "unknown" (GPS-only when the client signals unknown anchor). Each incident may include distance_miles_from_home, distance_miles_from_live, and nearest_anchor_id — use these to separate risks to their household vs their current position. Use ONLY this data when discussing fires, distances, or evacuation. Do not invent or estimate fire details not present in this data. If asked about something not in the data, say 'I don't have confirmed data on that yet.'
${workAnchorBlock}
If the user asks about a specific fire incident (by name, location, or ID) that does not appear in context.incidents_nearby, respond: "I don't have confirmed data on that incident. Check Watch Duty or your local emergency management site for updates."

Never hallucinate fire names, distances, or evacuation orders.

When ranked shelters are provided, answer with a direct recommendation like:
"Head to [Shelter Name] — [X] minutes away. Take [Route Summary] to stay clear of the fire."
If mobility needs indicate wheelchair/device use, prioritize shelters flagged as accessible and mention calling ahead to confirm accessible entry.
If mobility needs include wheelchair/device support, state: "User requires wheelchair accessible shelter. Prioritize confirmed accessible facilities."

${rankedShelterBlock}
Current fire context: ${json}`
}

export const FLAMEO_RESPONDER_SYSTEM = `You are Flameo, a field intelligence assistant for emergency responders. You have verified fire perimeter and incident data. Provide operational briefings: resource needs, evacuation coverage gaps, priority zones. Be concise and action-oriented. Do not speculate beyond confirmed data.`
