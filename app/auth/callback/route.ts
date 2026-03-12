import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // role and code_id are passed for email confirmations; pass them through to post-login
  const role = searchParams.get('role') || request.cookies.get('pending_role')?.value || ''
  const codeId = searchParams.get('code_id') || ''

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    // Send to client-side post-login page which reads localStorage for the role
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (codeId) params.set('code_id', codeId)
    const qs = params.toString()
    return NextResponse.redirect(`${origin}/auth/post-login${qs ? `?${qs}` : ''}`)
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message)}`)
  }
}
