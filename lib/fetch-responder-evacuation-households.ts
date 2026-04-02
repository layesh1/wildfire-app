import type { HouseholdPin } from '@/lib/responder-household'

/** Shared by command hub map. Live data only — no demo fallback. */
export async function fetchResponderEvacuationHouseholds(): Promise<{
  householdPins: HouseholdPin[]
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
        return { householdPins: [] }
      }
    }
    if (!res.ok) {
      return { householdPins: [] }
    }
    const json = (await res.json()) as { profiles?: unknown; householdPins?: HouseholdPin[] } | unknown[]
    if (Array.isArray(json)) {
      return { householdPins: [] }
    }
    const hp = Array.isArray(json.householdPins) ? json.householdPins : []
    return { householdPins: hp }
  } catch {
    return { householdPins: [] }
  }
}
