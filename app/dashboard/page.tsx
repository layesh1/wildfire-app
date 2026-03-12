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

  const activeRole = profile?.role || user.user_metadata?.role || 'caregiver'
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

  // Always show the role picker — it lets users switch roles and request new ones
  return <RolePicker roles={allRoles} activeRole={activeRole} name={profile?.full_name} />
}
