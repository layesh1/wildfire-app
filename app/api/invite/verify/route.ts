import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { code, email, role: requestedRole } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
  }

  const upperCode = code.trim().toUpperCase()

  // Admin bypass — lets admin/devs claim any role without invite_codes table
  // Falls back to hardcoded value if env var is not set in Vercel
  const bypassCode = process.env.ADMIN_BYPASS_CODE || 'ADMIN-BYPASS-2024'
  if (upperCode === bypassCode.toUpperCase()) {
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

  // Normal invite code lookup
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === 'your_service_role_key_here') {
    return NextResponse.json(
      { error: 'Invite system not configured. Use the admin bypass code.' },
      { status: 503 }
    )
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', upperCode)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 400 })
  }

  if (!data.active) {
    return NextResponse.json({ error: 'This code has been deactivated.' }, { status: 400 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This code has expired.' }, { status: 400 })
  }

  if (data.uses >= data.max_uses) {
    return NextResponse.json({ error: 'This code has reached its maximum uses.' }, { status: 400 })
  }

  if (data.specific_email && email) {
    if (email.toLowerCase() !== data.specific_email.toLowerCase()) {
      return NextResponse.json({ error: 'This code is not valid for your email address.' }, { status: 400 })
    }
  }

  if (data.email_domain && email) {
    if (!email.toLowerCase().endsWith(data.email_domain.toLowerCase())) {
      return NextResponse.json(
        { error: `This code is restricted to ${data.email_domain} email addresses.` },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({
    valid: true,
    role: data.role,
    org_name: data.org_name ?? null,
    code_id: data.id,
  })
}
