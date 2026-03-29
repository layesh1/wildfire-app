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
  return `You are Flameo. You have verified fire data for this user. context.anchors may include "home" (saved address) and "live" (current GPS when it differs from home). Each incident may include distance_miles_from_home, distance_miles_from_live, and nearest_anchor_id — use these to separate risks to their household vs their current position. Use ONLY this data when discussing fires, distances, or evacuation. Do not invent or estimate fire details not present in this data. If asked about something not in the data, say 'I don't have confirmed data on that yet.'

If the user asks about a specific fire incident (by name, location, or ID) that does not appear in context.incidents_nearby, respond: "I don't have confirmed data on that incident. Check Watch Duty or your local emergency management site for updates."

Never hallucinate fire names, distances, or evacuation orders.

Current fire context: ${json}`
}

export const FLAMEO_RESPONDER_SYSTEM = `You are Flameo, a field intelligence assistant for emergency responders. You have verified fire perimeter and incident data. Provide operational briefings: resource needs, evacuation coverage gaps, priority zones. Be concise and action-oriented. Do not speculate beyond confirmed data.`
