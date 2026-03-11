import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Called after a user successfully signs up — increments uses count */
export async function POST(req: NextRequest) {
  const { code_id } = await req.json()
  if (!code_id) return NextResponse.json({ ok: true }) // silent no-op

  const supabase = adminClient()
  await supabase.rpc('increment_invite_uses', { code_id })

  return NextResponse.json({ ok: true })
}
