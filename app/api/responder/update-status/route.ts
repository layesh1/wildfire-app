import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HOME_EVACUATION_STATUS_VALUES, type HomeEvacuationStatus } from '@/lib/checkin-status'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { logResponderAccessFireAndForget } from '@/lib/responder-access-log'

function isEmergencyResponder(role: string | null | undefined, roles: string[] | null | undefined): boolean {
  if (role === 'emergency_responder') return true
  return Array.isArray(roles) && roles.includes('emergency_responder')
}

type RpcResult = { ok?: boolean; error?: string }

export async function PATCH(request: NextRequest) {
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

  const updateNotes = !(body.responder_notes === undefined || body.responder_notes === null)
  const notesPayload = updateNotes ? String(body.responder_notes).slice(0, 2000) : null

  const { data: rpcRaw, error: rpcErr } = await supabase.rpc('responder_update_evacuee_home_status', {
    p_target_user_id: userId,
    p_home_evacuation_status: status,
    p_update_notes: updateNotes,
    p_responder_notes: notesPayload,
  })

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 })
  }

  const rpc = rpcRaw as RpcResult | null
  if (!rpc?.ok) {
    const code = rpc?.error ?? 'unknown'
    if (code === 'not_authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (code === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (code === 'consent_required') {
      return NextResponse.json(
        { error: 'consent_required', code: 'RESPONDER_CONSENT_REQUIRED' },
        { status: 403 }
      )
    }
    if (code === 'profile_not_found') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (code === 'target_not_consented') {
      return NextResponse.json({ error: 'Target has not consented to responder visibility' }, { status: 403 })
    }
    if (code === 'invalid_status') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    return NextResponse.json({ error: code }, { status: 500 })
  }

  logResponderAccessFireAndForget(supabase, user.id, {
    action: 'updated_status',
    target_user_id: userId,
  })

  return NextResponse.json({ ok: true })
}
