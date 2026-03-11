import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import RolePicker from '@/components/RolePicker'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles, full_name')
    .eq('id', user.id)
    .single()

  // Determine active role — fall back to user metadata from signup
  const metaRole = user.user_metadata?.role
  const activeRole = profile?.role || metaRole || 'caregiver'

  // Build the full list of roles this user has access to
  const allRoles: string[] = Array.isArray(profile?.roles) && profile.roles.length > 0
    ? profile.roles
    : [activeRole]

  // Backfill profile if needed
  if (!profile?.role || !profile?.roles?.length) {
    await supabase.from('profiles').upsert(
      { id: user.id, role: activeRole, roles: allRoles },
      { onConflict: 'id' }
    )
  }

  // Multiple roles → show picker
  if (allRoles.length > 1) {
    return <RolePicker roles={allRoles} activeRole={activeRole} name={profile?.full_name} />
  }

  // Single role → route directly
  if (activeRole === 'emergency_responder') redirect('/dashboard/responder')
  if (activeRole === 'data_analyst') redirect('/dashboard/analyst')
  redirect('/dashboard/caregiver')
}
