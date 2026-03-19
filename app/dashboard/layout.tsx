import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'
import FlameoChat from '@/components/FlameoChat'
import LanguageProvider from '@/components/LanguageProvider'
import ThemeWrapper from '@/components/ThemeWrapper'
import UserSessionGuard from '@/components/UserSessionGuard'

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
        <UserSessionGuard />
        <Sidebar user={user} profile={profile} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <FlameoChat />
        {/* Honeypot: invisible to users, visible to crawlers/scanners */}
        <a href="/api/honeypot" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
      </ThemeWrapper>
    </LanguageProvider>
  )
}
