import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Fall back to role stored in auth user metadata (set during signUp)
  const role = profile?.role || user.user_metadata?.role || 'caregiver'

  // If profile exists but has no role, backfill it now
  if (profile && !profile.role && role !== 'caregiver') {
    await supabase.from('profiles').update({ role }).eq('id', user.id)
  }

  if (role === 'emergency_responder') redirect('/dashboard/responder')
  if (role === 'data_analyst') redirect('/dashboard/analyst')
  redirect('/dashboard/caregiver')
}
