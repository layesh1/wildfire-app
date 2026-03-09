import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'caregiver'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Exchange error:', error.message)
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        role: role,
        full_name: data.user.user_metadata?.full_name,
      }, { onConflict: 'id', ignoreDuplicates: true })
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  } catch (err: any) {
    console.error('Callback error:', err)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message)}`)
  }
}
