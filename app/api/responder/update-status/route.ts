import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HOME_EVACUATION_STATUS_VALUES, type HomeEvacuationStatus } from '@/lib/checkin-status'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { logResponderAccessFireAndForget } from '@/lib/responder-access-log'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isEmergencyResponder(role: string | null | undefined, roles: string[] | null | undefined): boolean {
  if (role === 'emergency_responder') return true
  return Array.isArray(roles) && roles.includes('emergency_responder')
}

export async function PATCH(request: NextRequest) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required for responder updates' },
      { status: 503 }
    )
  }

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

  let body: { userId?: string; status?: string; responder_notes?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const status = body.status as HomeEvacuationStatus
  if (!status || !(HOME_EVACUATION_STATUS_VALUES as string[]).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const notes =
    body.responder_notes === undefined || body.responder_notes === null
      ? undefined
      : String(body.responder_notes).slice(0, 2000)

  const admin = adminClient()
  const { data: target, error: readErr } = await admin
    .from('profiles')
    .select('id, location_sharing_consent, evacuation_status_consent')
    .eq('id', userId)
    .maybeSingle()

  if (readErr || !target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!target.location_sharing_consent || !target.evacuation_status_consent) {
    return NextResponse.json({ error: 'Target has not consented to responder visibility' }, { status: 403 })
  }

  const patch: Record<string, unknown> = {
    home_evacuation_status: status,
    home_status_updated_at: new Date().toISOString(),
  }
  if (notes !== undefined) {
    patch.responder_notes = notes
  }

  const { error: upErr } = await admin.from('profiles').update(patch).eq('id', userId)
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  logResponderAccessFireAndForget(supabase, user.id, {
    action: 'updated_status',
    target_user_id: userId,
  })

  return NextResponse.json({ ok: true })
}
