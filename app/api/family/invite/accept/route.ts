import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateString, ValidationError } from '@/lib/validate'
import { ensureEvacueeOnCaregiverMonitored } from '@/lib/family-link'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

type RpcPayload = {
  ok?: boolean
  error?: string
  inviter_role?: string
  inviter_user_id?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = validateString(body.token, 'token', { minLength: 16, maxLength: 200 })

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: raw, error: rpcErr } = await supabase.rpc('accept_family_invite', {
      p_token: token.trim(),
    })

    if (rpcErr) {
      console.error('[family/invite/accept] rpc (full error object):', rpcErr)
      return NextResponse.json(
        { error: rpcErr.message, details: rpcErr.details, code: rpcErr.code },
        { status: 500 }
      )
    }

    const payload = (
      typeof raw === 'string' ? (JSON.parse(raw) as RpcPayload) : (raw as RpcPayload)
    ) as RpcPayload
    if (!payload?.ok) {
      const code = payload?.error || 'unknown'
      const status =
        code === 'not_authenticated'
          ? 401
          : code === 'email_mismatch'
            ? 403
            : 400
      const messages: Record<string, string> = {
        invalid_or_expired: 'This invitation is invalid or has expired.',
        email_mismatch: 'Sign in with the same email address the invitation was sent to.',
        cannot_accept_own_invite: 'You cannot accept your own invite.',
        missing_token: 'Missing invitation token.',
      }
      return NextResponse.json(
        { error: messages[code] || 'Could not accept invitation.', code },
        { status }
      )
    }

    const inviterId = payload.inviter_user_id as string | undefined
    if (!inviterId) {
      return NextResponse.json({ error: 'Unexpected response from server.' }, { status: 500 })
    }

    const svc = serviceClient()
    let inviterEmail = ''
    if (svc) {
      const { data: adminUser } = await svc.auth.admin.getUserById(inviterId)
      inviterEmail = adminUser?.user?.email || ''
    }
    const accepterEmail = user.email || ''

    if (svc) {
      await ensureEvacueeOnCaregiverMonitored(svc, user.id, inviterId, inviterEmail || 'family@local')
      await ensureEvacueeOnCaregiverMonitored(svc, inviterId, user.id, accepterEmail || 'family@local')
    } else {
      await ensureEvacueeOnCaregiverMonitored(
        supabase,
        user.id,
        inviterId,
        inviterEmail || 'family@local'
      )
      console.warn(
        '[family/invite/accept] SUPABASE_SERVICE_ROLE_KEY missing; inviter monitored list may need manual refresh'
      )
    }

    return NextResponse.json({ ok: true, message: 'You are now connected in My Family.' })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[family/invite/accept] unhandled (full error):', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}
