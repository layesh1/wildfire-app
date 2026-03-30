import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPersons, savePersons } from '@/lib/user-data'

export type FamilyLookupRow = {
  user_id: string
  full_name: string | null
  role: string | null
}

/** Insert caregiver_family_links + monitored_persons when caregiver adds an existing evacuee by email. */
export async function linkCaregiverToEvacueeByEmail(
  supabase: SupabaseClient,
  caregiverUserId: string,
  emailNormalized: string,
  target: FamilyLookupRow
): Promise<
  | { ok: true; alreadyLinked?: boolean; name: string }
  | { ok: false; code: 'self' | 'not_evacuee'; message?: string }
  | { ok: false; code: 'db'; message: string }
> {
  if (target.user_id === caregiverUserId) {
    return { ok: false, code: 'self' }
  }
  if (target.role !== 'evacuee' && target.role !== 'caregiver') {
    return { ok: false, code: 'not_evacuee' }
  }

  const { error: linkErr } = await supabase.from('caregiver_family_links').insert({
    caregiver_user_id: caregiverUserId,
    evacuee_user_id: target.user_id,
  })

  if (linkErr) {
    if (linkErr.code === '23505' || linkErr.message?.includes('duplicate')) {
      return {
        ok: true,
        alreadyLinked: true,
        name: target.full_name || 'Evacuee',
      }
    }
    return { ok: false, code: 'db', message: linkErr.message }
  }

  await ensureEvacueeOnCaregiverMonitored(supabase, caregiverUserId, target.user_id, emailNormalized)

  return {
    ok: true,
    name: target.full_name || 'Evacuee',
  }
}

/** Add evacuee to caregiver’s monitored_persons JSON if not already present (My Family hub list). */
export async function ensureEvacueeOnCaregiverMonitored(
  supabase: SupabaseClient,
  caregiverUserId: string,
  evacueeUserId: string,
  evacueeEmailFallback: string
) {
  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', evacueeUserId)
    .maybeSingle()
  const name =
    (prof as { full_name?: string } | null)?.full_name?.trim() ||
    evacueeEmailFallback.split('@')[0] ||
    'Evacuee'
  const email = evacueeEmailFallback.trim()

  const persons = await loadPersons(supabase, caregiverUserId)
  if (persons.some((p: { id: string }) => p.id === evacueeUserId)) return

  await savePersons(supabase, caregiverUserId, [
    ...persons,
    {
      id: evacueeUserId,
      name,
      relationship: 'Family',
      familyRelation: 'Family',
      mobility: 'Mobile Adult',
      address: '',
      phone: '',
      email,
      notes: '',
    },
  ])
}

/** Reverse link + monitored list so both users see each other (unified evacuee model). */
export async function mirrorFamilyLinkForEvacuee(
  supabase: SupabaseClient,
  inviterUserId: string,
  targetUserId: string,
  inviterEmail: string
) {
  const { error: revErr } = await supabase.from('caregiver_family_links').insert({
    caregiver_user_id: targetUserId,
    evacuee_user_id: inviterUserId,
  })
  if (revErr && revErr.code !== '23505' && !revErr.message?.includes('duplicate')) {
    console.warn('[mirrorFamilyLinkForEvacuee]', revErr.message)
  }
  await ensureEvacueeOnCaregiverMonitored(supabase, targetUserId, inviterUserId, inviterEmail)
}
