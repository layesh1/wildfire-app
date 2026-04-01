import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildHouseholdPins } from '@/lib/responder-household'
import {
  fetchResponderEvacueeProfiles,
  isEmergencyResponder,
} from '@/lib/responder-evacuees-server'

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
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  if (meErr || !isEmergencyResponder(me?.role, me?.roles as string[] | null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { list, error } = await fetchResponderEvacueeProfiles(supabase)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const householdPins = await buildHouseholdPins(list)
  return NextResponse.json({ profiles: list, householdPins })
}
