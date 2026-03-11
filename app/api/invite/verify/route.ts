import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses service role key so it can read invite_codes (RLS: service role only)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { code, email } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
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

  // Email-specific checks
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

  // Valid — return role and org info (do NOT increment uses yet; do that on successful signup)
  return NextResponse.json({
    valid: true,
    role: data.role,
    org_name: data.org_name ?? null,
    code_id: data.id,
  })
}
