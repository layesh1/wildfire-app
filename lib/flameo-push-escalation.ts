/**
 * Event-driven escalation levels for consumer push (Phase C).
 * Level 4 = mandatory order in DB slice; L1–L3 from proximity + threat.
 */

export type FlameoEscalationLevel = 1 | 2 | 3 | 4

const MI_PER_KM = 1 / 1.609344

export function kmToMiles(km: number) {
  return km * MI_PER_KM
}

export function computeEscalationLevel(input: {
  /** Minimum miles to any in-radius incident (FIRMS or fire_events) */
  milesInRadius: number | null
  /** Any fire_events row in radius with mandatory order */
  hasMandatoryOrderInRadius: boolean
  /** Any fire_events in radius: uncontained / spreading (no order) */
  hasSevereUncontainedInRadius: boolean
}): FlameoEscalationLevel | null {
  const { milesInRadius, hasMandatoryOrderInRadius, hasSevereUncontainedInRadius } = input
  if (hasMandatoryOrderInRadius) return 4
  if (milesInRadius == null || !Number.isFinite(milesInRadius)) return null
  if (hasSevereUncontainedInRadius) return 3
  if (milesInRadius <= 20) return 2
  return 1
}

export function escalationCopy(level: FlameoEscalationLevel, miles: number): { title: string; body: string } {
  const x = Math.max(1, Math.round(miles * 10) / 10)
  switch (level) {
    case 1:
      return {
        title: 'Wildfire monitor',
        body: `⚠️ Fire detected ${x} miles from your address. Monitor situation.`,
      }
    case 2:
      return {
        title: 'Wildfire prepare',
        body: `🔥 Fire is ${x} miles away. Prepare your go-bag now.`,
      }
    case 3:
      return {
        title: 'Evacuation warning',
        body: '🚨 Evacuation WARNING for your zone. Leave soon.',
      }
    case 4:
      return {
        title: 'Mandatory evacuation',
        body: '🚨 MANDATORY evacuation ORDER. Leave now.',
      }
  }
}

const TWENTY_MIN_MS = 20 * 60 * 1000
const TWO_HOUR_MS = 2 * 60 * 60 * 1000

export function shouldSendEscalationPush(input: {
  level: FlameoEscalationLevel
  nowMs: number
  lastPushAtMs: number
  lastLevel: number | null
}): boolean {
  const { level, nowMs, lastPushAtMs, lastLevel } = input
  if (level === 4) {
    if (lastLevel === 4 && nowMs - lastPushAtMs < TWENTY_MIN_MS) return false
    return true
  }
  if (lastLevel === level && nowMs - lastPushAtMs < TWENTY_MIN_MS) return false
  if (typeof lastLevel === 'number' && level < lastLevel && nowMs - lastPushAtMs < TWENTY_MIN_MS) {
    return false
  }
  return true
}

export function shouldSendStatusPrompt(input: {
  activeIncident: boolean
  nowMs: number
  lastStatusPromptAtMs: number
}): boolean {
  if (!input.activeIncident) return false
  return input.nowMs - input.lastStatusPromptAtMs >= TWO_HOUR_MS
}
