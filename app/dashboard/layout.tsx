import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'
import FlameoChat from '@/components/FlameoChat'
import { FlameoHubAgentProvider } from '@/components/FlameoHubAgentBridge'
import LanguageProvider from '@/components/LanguageProvider'
import ThemeWrapper from '@/components/ThemeWrapper'
import UserSessionGuard from '@/components/UserSessionGuard'
import MainWrapper from '@/components/MainWrapper'
import PushSetup from '@/components/PushSetup'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <LanguageProvider initialLang={profile?.language_preference ?? null}>
      <ThemeWrapper>
        <FlameoHubAgentProvider>
        <UserSessionGuard />
        <PushSetup />
        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-row items-stretch wfa-dashboard-typography">
          <Sidebar user={user} profile={profile} />
          <MainWrapper>
            {children}
          </MainWrapper>
        </div>
        <FlameoChat />
        {/* Honeypot: invisible to users, visible to crawlers/scanners */}
        <a href="/api/honeypot" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
        </FlameoHubAgentProvider>
      </ThemeWrapper>
    </LanguageProvider>
  )
}
