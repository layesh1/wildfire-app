import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function randomSegment(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function generateCode(role: string, orgName?: string) {
  const prefix = role === 'data_analyst' ? 'DA' : 'ER'
  const orgSlug = orgName ? orgName.replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' : ''
  return `${prefix}-${orgSlug}${randomSegment(4)}-${randomSegment(4)}`
}

/**
 * Admin-only endpoint to generate invite codes.
 * Requires ADMIN_SECRET header matching ADMIN_SECRET env var.
 *
 * POST /api/invite/generate
 * Body: {
 *   role: 'data_analyst' | 'emergency_responder',
 *   org_name?: string,          // e.g. "LAFD"
 *   email_domain?: string,      // e.g. "@lafd.org"
 *   specific_email?: string,    // lock to one email
 *   max_uses?: number,          // default 1 for analysts, 100 for orgs
 *   expires_days?: number,      // days until expiry (null = never)
 * }
 */
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { role, org_name, email_domain, specific_email, max_uses, expires_days } = body

  if (!role || !['data_analyst', 'emergency_responder'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const code = generateCode(role, org_name)
  const defaultMax = role === 'data_analyst' ? 1 : 100
  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400000).toISOString()
    : null

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      role,
      org_name: org_name ?? null,
      email_domain: email_domain ?? null,
      specific_email: specific_email ?? null,
      max_uses: max_uses ?? defaultMax,
      expires_at,
    })
    .select('code, role, org_name, max_uses, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data })
}
