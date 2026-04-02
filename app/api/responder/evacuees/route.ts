import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildHouseholdPins } from '@/lib/responder-household'
import {
  fetchResponderEvacueeProfiles,
  isEmergencyResponder,
} from '@/lib/responder-evacuees-server'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { logResponderAccessFireAndForget } from '@/lib/responder-access-log'

export type { ResponderEvacueeProfile as ResponderEvacueeApiRow } from '@/lib/responder-household'

/**
 * GET — emergency_responder only. Returns consented evacuee profile rows (no live GPS, email, or personal safety fields).
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('role, roles, responder_consent_accepted, responder_consent_version')
    .eq('id', user.id)
    .maybeSingle()

  if (meErr || !isEmergencyResponder(me?.role, me?.roles as string[] | null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isResponderConsentSatisfied(me)) {
    return NextResponse.json(
      { error: 'consent_required', code: 'RESPONDER_CONSENT_REQUIRED' },
      { status: 403 }
    )
  }

  logResponderAccessFireAndForget(supabase, user.id, { action: 'viewed_map' })

  const { list, error } = await fetchResponderEvacueeProfiles(supabase)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const householdPins = await buildHouseholdPins(list)
  return NextResponse.json({ profiles: list, householdPins })
}
