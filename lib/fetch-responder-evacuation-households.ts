import type { HouseholdPin } from '@/lib/responder-household'
import { RESPONDER_DEMO_HOUSEHOLDS_TAGGED } from '@/lib/responder-demo-households'

/** Shared by command hub map and full evacuation page. */
export async function fetchResponderEvacuationHouseholds(): Promise<{
  householdPins: HouseholdPin[]
  demoMode: boolean
}> {
  try {
    const res = await fetch('/api/responder/evacuees')
    if (res.status === 403) {
      let body: { error?: string; code?: string } = {}
      try {
        body = await res.json()
      } catch {
        body = {}
      }
      if (body.code === 'RESPONDER_CONSENT_REQUIRED' || body.error === 'consent_required') {
        return { householdPins: [], demoMode: false }
      }
    }
    if (!res.ok) {
      return { householdPins: RESPONDER_DEMO_HOUSEHOLDS_TAGGED, demoMode: true }
    }
    const json = (await res.json()) as { profiles?: unknown; householdPins?: HouseholdPin[] } | unknown[]
    if (Array.isArray(json)) {
      return { householdPins: RESPONDER_DEMO_HOUSEHOLDS_TAGGED, demoMode: true }
    }
    const hp = Array.isArray(json.householdPins) ? json.householdPins : []
    if (hp.length > 0) {
      return { householdPins: hp, demoMode: false }
    }
    return { householdPins: RESPONDER_DEMO_HOUSEHOLDS_TAGGED, demoMode: true }
  } catch {
    return { householdPins: RESPONDER_DEMO_HOUSEHOLDS_TAGGED, demoMode: true }
  }
}
