import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { logResponderAccessFireAndForget } from '@/lib/responder-access-log'

type RpcResult = { ok?: boolean; error?: string }

/**
 * Firefighter marks a consented household address as evacuated / cleared (same RPC as command status updates).
 * Body: target_user_id (required), target_address (optional, for client logging only).
 */
export async function POST(request: NextRequest) {
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

  let body: { target_user_id?: string; target_address?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
  }

  const { data: rpcRaw, error: rpcErr } = await supabase.rpc('responder_update_evacuee_home_status', {
    p_target_user_id: userId,
    p_home_evacuation_status: 'evacuated',
    p_update_notes: false,
    p_responder_notes: null,
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
    action: 'cleared_house',
    target_user_id: userId,
    target_address:
      typeof body.target_address === 'string' && body.target_address.trim()
        ? body.target_address.trim().slice(0, 500)
        : null,
  })

  return NextResponse.json({
    ok: true,
    target_user_id: userId,
    ...(typeof body.target_address === 'string' && body.target_address.trim()
      ? { target_address: body.target_address.trim().slice(0, 500) }
      : {}),
  })
}
