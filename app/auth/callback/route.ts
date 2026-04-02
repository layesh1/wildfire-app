import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    if (!data.user) {
      return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
    }

    // Ensure profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    const pendingCookie = request.cookies.get('wfa_pending_consumer_role')?.value
    const consumerRole = pendingCookie === 'caregiver' ? 'caregiver' : 'evacuee'

    if (!existing) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name ?? null,
        role: consumerRole,
        roles: [consumerRole],
      })
      const res = NextResponse.redirect(
        `${origin}/auth/onboarding?role=${encodeURIComponent(consumerRole)}`
      )
      res.cookies.set('wfa_pending_consumer_role', '', { path: '/', maxAge: 0 })
      return res
    }

    const res = NextResponse.redirect(`${origin}/dashboard`)
    res.cookies.set('wfa_pending_consumer_role', '', { path: '/', maxAge: 0 })
    return res
  } catch (err: any) {
    const res = NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message)}`)
    res.cookies.set('wfa_pending_consumer_role', '', { path: '/', maxAge: 0 })
    return res
  }
}
