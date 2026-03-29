import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { RoleProvider } from '@/components/RoleContext'
import MobileNav from '@/app/m/MobileNav'
import MobileFlameo from '@/app/m/MobileFlameo'
import NotificationCenter from '@/components/NotificationCenter'
import { FlameoHubAgentProvider } from '@/components/FlameoHubAgentBridge'

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
      {/* Safe-area aware full-screen shell */}
      <div className="flex flex-col bg-gray-50 text-gray-900" style={{ minHeight: '100dvh' }}>
        {/* Page content — padded above bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom navigation */}
        <MobileNav role={role} />

        {/* Flameo chat FAB */}
        <MobileFlameo />
      </div>
      </FlameoHubAgentProvider>
    </RoleProvider>
  )
}
