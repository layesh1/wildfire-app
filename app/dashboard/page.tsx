import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'


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

  // Redirect directly to the user's active role dashboard
  const ROLE_ROUTES: Record<string, string> = {
    emergency_responder: '/dashboard/responder',
    data_analyst: '/dashboard/analyst',
    caregiver: '/dashboard/caregiver',
    evacuee: '/dashboard/caregiver',
  }
  redirect(ROLE_ROUTES[activeRole] ?? '/dashboard/caregiver')
}
