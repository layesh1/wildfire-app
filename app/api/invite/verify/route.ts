import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { normalizeInviteCodeInput } from '@/lib/invite-code-normalize'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  inviteCodeAllowedForProfile,
  profileRolesFromRow,
} from '@/lib/profile-role-policy'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per minute per IP
  const ip = getClientIp(req)
  if (!checkRateLimit(ip, 'invite', 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }

  const { code, email, role: requestedRole } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
  }

  const upperCode = normalizeInviteCodeInput(code)

  // Admin bypass — lets admin/devs claim any role without invite_codes table
  // Falls back to hardcoded value if env var is not set in Vercel
  const bypassCode = process.env.ADMIN_BYPASS_CODE
  if (bypassCode && upperCode === bypassCode.toUpperCase()) {
    if (!requestedRole) {
      return NextResponse.json({ error: 'Role is required with bypass code.' }, { status: 400 })
    }
    return NextResponse.json({
      valid: true,
      role: requestedRole,
      org_name: 'Admin',
      code_id: null, // no DB record to consume
    })
  }

  // Demo code for WiDS evaluation and testing
  if (upperCode === 'WIDS-DEMO-2025') {
    if (!requestedRole) {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 })
    }
    return NextResponse.json({
      valid: true,
      role: requestedRole,
      org_name: 'WiDS Demo',
      code_id: null,
    })
  }

  async function policyCheck(codeRole: string, policyBypass: boolean): Promise<NextResponse | null> {
    if (codeRole !== 'data_analyst' && codeRole !== 'emergency_responder') return null
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to verify this code.' }, { status: 401 })
    }
    const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
    const profileRoles = profileRolesFromRow(prof)
    const policy = inviteCodeAllowedForProfile(codeRole, profileRoles, policyBypass)
    if (!policy.ok) {
      return NextResponse.json({ error: policy.error }, { status: policy.status })
    }
    return null
  }

  // Normal invite code lookup
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_service_role_key_here') {
    return NextResponse.json(
      {
        error: 'Invite system not configured.',
        hint: 'Set SUPABASE_SERVICE_ROLE_KEY in .env.local from Supabase → Settings → API (same project as NEXT_PUBLIC_SUPABASE_URL). Invite verification requires the service role key on the server.',
      },
      { status: 503 }
    )
  }

  const supabase = adminClient()

  async function fetchInviteRow(): Promise<{ row: Record<string, unknown> | null; dbError: boolean }> {
    const exact = await supabase.from('invite_codes').select('*').eq('code', upperCode).maybeSingle()
    if (exact.error) {
      return { row: null, dbError: true }
    }
    if (exact.data) {
      return { row: exact.data as Record<string, unknown>, dbError: false }
    }
    // Case mismatch in DB (e.g. manual insert) — ilike is exact when the pattern has no LIKE wildcards; avoid `_` in pattern
    if (!upperCode.includes('_') && !upperCode.includes('%')) {
      const il = await supabase.from('invite_codes').select('*').ilike('code', upperCode).maybeSingle()
      if (il.error) {
        return { row: null, dbError: true }
      }
      if (il.data) {
        return { row: il.data as Record<string, unknown>, dbError: false }
      }
    }
    return { row: null, dbError: false }
  }

  const { row: data, dbError } = await fetchInviteRow()

  if (dbError) {
    return NextResponse.json({ error: 'Could not verify code. Try again.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 400 })
  }

  if (data.active === false) {
    return NextResponse.json({ error: 'This code has been deactivated.' }, { status: 400 })
  }

  const expiresAt = data.expires_at
  if (expiresAt && new Date(String(expiresAt)) < new Date()) {
    return NextResponse.json({ error: 'This code has expired.' }, { status: 400 })
  }

  const uses = Number(data.uses)
  const maxUses = Number(data.max_uses)
  if (Number.isFinite(uses) && Number.isFinite(maxUses) && uses >= maxUses) {
    return NextResponse.json({ error: 'This code has reached its maximum uses.' }, { status: 400 })
  }

  const emailTrim = typeof email === 'string' ? email.trim() : ''

  if (data.specific_email) {
    const want = String(data.specific_email).toLowerCase().trim()
    if (!emailTrim || emailTrim.toLowerCase() !== want) {
      return NextResponse.json({ error: 'This code is not valid for your email address.' }, { status: 400 })
    }
  }

  if (data.email_domain) {
    const dom = String(data.email_domain).toLowerCase().trim()
    const suffix = dom.startsWith('@') ? dom : `@${dom}`
    if (!emailTrim || !emailTrim.toLowerCase().endsWith(suffix)) {
      return NextResponse.json(
        { error: `This code is restricted to ${suffix} email addresses.` },
        { status: 400 }
      )
    }
  }

  const codeRole = String(data.role)
  const policyBlock = await policyCheck(codeRole, false)
  if (policyBlock) return policyBlock

  return NextResponse.json({
    valid: true,
    role: codeRole,
    org_name: (data.org_name as string | null) ?? null,
    code_id: data.id as string,
  })
}
