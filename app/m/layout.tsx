import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { RoleProvider } from '@/components/RoleContext'
import { FlameoHubAgentProvider } from '@/components/FlameoHubAgentBridge'
import MobileAppShell from '@/components/MobileAppShell'

export const metadata = { title: 'WildfireAlert', viewport: 'width=device-width, initial-scale=1, viewport-fit=cover' }

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'caregiver'

  return (
    <RoleProvider>
      <FlameoHubAgentProvider>
        <MobileAppShell role={role}>{children}</MobileAppShell>
      </FlameoHubAgentProvider>
    </RoleProvider>
  )
}
