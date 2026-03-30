import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateString, ValidationError } from '@/lib/validate'

const VALID_ROLES = ['caregiver', 'evacuee', 'emergency_responder', 'data_analyst']

function normalizeRole(r: string): string {
  return r === 'caregiver' ? 'evacuee' : r
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawRole = validateString(body.role, 'role', { allowedValues: VALID_ROLES })
    const role = normalizeRole(rawRole)

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get current roles and merge
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single()

    const existingRoles: string[] = Array.isArray(profile?.roles) && profile.roles.length
      ? profile.roles
      : profile?.role ? [profile.role] : ['evacuee']

    const normalizedExisting = [...new Set(existingRoles.map(normalizeRole))]
    const updatedRoles = [...new Set([...normalizedExisting, role])]

    const { error } = await supabase
      .from('profiles')
      .update({ role, roles: updatedRoles })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, role, roles: updatedRoles })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
