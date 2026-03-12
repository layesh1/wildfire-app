import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_ROLES = ['data_analyst', 'emergency_responder']
const ROLE_DESTINATIONS: Record<string, string> = {
  emergency_responder: '/dashboard/responder',
  data_analyst: '/dashboard/analyst',
  caregiver: '/dashboard/caregiver',
  evacuee: '/dashboard/caregiver',
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'caregiver'
  const codeId = searchParams.get('code_id') // present for email signups with invite

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

    // Fetch existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', data.user.id)
      .single()

    const existingRoles: string[] = Array.isArray(existing?.roles) && existing.roles.length
      ? existing.roles
      : existing?.role ? [existing.role] : []

    const alreadyHasRole = existingRoles.includes(role)

    // Protected role requested via OAuth (no invite code in URL) and user doesn't have it yet
    // → send to post-OAuth verification page
    if (PROTECTED_ROLES.includes(role) && !alreadyHasRole && !codeId) {
      return NextResponse.redirect(
        `${origin}/auth/add-role?role=${role}`
      )
    }

    if (!existing) {
      // Brand new user — create profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name ?? null,
        role,
        roles: [role],
      })
    } else if (!alreadyHasRole) {
      // Existing user adding a new non-protected role (caregiver/evacuee)
      const updatedRoles = [...new Set([...existingRoles, role])]
      await supabase.from('profiles').update({
        roles: updatedRoles,
        // Only update active role if current one is the default caregiver fallback
        ...(existing.role === 'caregiver' && role !== 'caregiver' ? { role } : {}),
      }).eq('id', data.user.id)
    }
    // else: user already has this role → just send them to their dashboard

    const destination = ROLE_DESTINATIONS[role] ?? '/dashboard'
    return NextResponse.redirect(`${origin}${destination}`)
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message)}`)
  }
}
