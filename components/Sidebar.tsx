'use client'
import { useRouter, usePathname } from 'next/navigation'
import {
  Flame, Shield, Heart, BarChart3, Map, AlertTriangle, CheckCircle,
  LogOut, Activity, Bell, Settings,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  Sidebar as SidebarRoot,
  SidebarBody,
  useSidebar,
} from '@/components/ui/sidebar'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { ANALYST_SIDEBAR_PRIMARY } from '@/lib/analyst-dashboard-nav'
interface Props {
  user: any
  profile: any
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: any }[]> = {
  emergency_responder: [
    { label: 'Command Hub', href: '/dashboard/responder', icon: Map },
    { label: 'Command Analytics', href: '/dashboard/responder/analytics', icon: BarChart3 },
    { label: 'Flameo · Field', href: '/dashboard/responder/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  caregiver: [
    { label: 'My Hub', href: '/dashboard/home', icon: Bell },
    { label: 'Ask FlameoAI', href: '/dashboard/home/ai', icon: Activity },
    { label: 'Evacuation Map', href: '/dashboard/home/map', icon: Map },
    { label: 'Check-in', href: '/dashboard/home/checkin', icon: CheckCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  evacuee: [
    { label: 'My Hub', href: '/dashboard/home', icon: Bell },
    { label: 'Ask FlameoAI', href: '/dashboard/home/ai', icon: Activity },
    { label: 'Evacuation Map', href: '/dashboard/home/map', icon: Map },
    { label: 'Check-in', href: '/dashboard/home/checkin', icon: CheckCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  /** Analyst nav is ANALYST_SIDEBAR_PRIMARY + Settings in the branch below */
  data_analyst: [],
}

const ROLE_ICONS: Record<string, any> = {
  emergency_responder: Shield,
  evacuee: Heart,
  data_analyst: BarChart3,
}

const ROLE_COLORS: Record<string, string> = {
  emergency_responder: 'text-white/80 border-white/20',
  evacuee: 'text-white/80 border-white/20',
  data_analyst: 'text-white/80 border-white/20',
}

function normalizeConsumerRoleKey(r: string | undefined | null): string {
  if (!r) return 'evacuee'
  return r === 'caregiver' ? 'evacuee' : r
}

function SidebarInner({ user, profile }: Props) {
  const { open } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('wfa_active_role') : null
  const pathRole =
    pathname.startsWith('/dashboard/responder') ? 'emergency_responder'
    : pathname.startsWith('/dashboard/analyst') ? 'data_analyst'
    : pathname.startsWith('/dashboard/evacuee') ? 'evacuee'
    : pathname.startsWith('/dashboard/caregiver') ? 'evacuee'
    : pathname.startsWith('/dashboard/home') ? 'evacuee'
    : null
  if (pathRole && typeof window !== 'undefined' && (pathRole === 'emergency_responder' || pathRole === 'data_analyst')) {
    localStorage.setItem('wfa_active_role', pathRole)
  }

  const profileRoleRaw = profile?.role as string | undefined
  const profileRole = normalizeConsumerRoleKey(profileRoleRaw)
  const storedNorm = normalizeConsumerRoleKey(storedRole)

  let role: string
  if (pathRole === 'emergency_responder' || pathRole === 'data_analyst') {
    role = pathRole
  } else if (pathRole === 'evacuee') {
    role = 'evacuee'
  } else if (profileRoleRaw === 'emergency_responder' || profileRoleRaw === 'data_analyst') {
    role = profileRoleRaw
  } else {
    role = 'evacuee'
  }

  const baseNav = role === 'data_analyst' ? [] : (NAV_BY_ROLE[role] || NAV_BY_ROLE.evacuee)
  const nav = baseNav
  const RoleIcon = ROLE_ICONS[role] || Heart
  const roleBadgeLabel = role === 'evacuee' ? 'evacuee' : role.replace('_', ' ')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const collapsed = !open

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className={cn('flex items-center pb-4 border-b border-white/10', collapsed ? 'justify-center' : '')}>
        <AnimatePresence>
          {open ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="font-display font-bold text-white text-xl leading-none whitespace-nowrap">Minutes Matter</div>
              <div className="text-white/40 text-xs mt-0.5">v2.0</div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/20 bg-white/10"
            >
              <Flame className="w-4 h-4 text-amber-300" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role badge */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="py-3 border-b border-white/10 overflow-hidden"
          >
            <div className={cn('flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border bg-white/10', ROLE_COLORS[role])}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span className="font-medium capitalize whitespace-nowrap">{roleBadgeLabel}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {role === 'data_analyst' ? (
          <>
            {ANALYST_SIDEBAR_PRIMARY.map(({ label, href, icon: Icon }) => {
              const active =
                href === '/dashboard/analyst'
                  ? pathname === '/dashboard/analyst' || pathname === '/dashboard/analyst/'
                  : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => router.push(href)}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'relative w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-all duration-150',
                    active ? 'bg-white/5 font-medium text-amber-200' : 'text-white/55 hover:bg-white/10',
                    collapsed ? 'justify-center' : ''
                  )}
                >
                  {active && (
                    <span
                      className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-amber-600"
                      aria-hidden
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <AnimatePresence>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.12 }}
                        className="text-base whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => router.push(`/dashboard/settings?role=${role}`)}
              title={collapsed ? 'Settings' : undefined}
              data-tour="nav-settings"
              className={cn(
                'relative mt-1 w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-all duration-150',
                pathname.startsWith('/dashboard/settings')
                  ? 'bg-white/5 font-medium text-amber-200'
                  : 'text-white/55 hover:bg-white/10',
                collapsed ? 'justify-center' : ''
              )}
            >
              {pathname.startsWith('/dashboard/settings') && (
                <span
                  className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-amber-600"
                  aria-hidden
                />
              )}
              <Settings className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-base whitespace-nowrap overflow-hidden"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </>
        ) : (
          nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard/home' && pathname.startsWith(href + '/'))
            const dest = href === '/dashboard/settings' ? `/dashboard/settings?role=${role}` : href
            const hubTour =
              href.includes('/checkin') ? 'checkin'
              : href.includes('/ai') && label.toLowerCase().includes('flameo') ? 'flameo-ai'
              : undefined
            return (
              <button
                key={href}
                type="button"
                onClick={() => router.push(dest)}
                title={collapsed ? label : undefined}
                data-hub-tour={hubTour}
                data-tour={label === 'Settings' ? 'nav-settings' : undefined}
                className={cn(
                  'relative w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-all duration-150',
                  active ? 'bg-white/5 font-medium text-amber-200' : 'text-white/55 hover:bg-white/10',
                  collapsed ? 'justify-center' : ''
                )}
              >
                {active && (
                  <span
                    className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-amber-600"
                    aria-hidden
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.12 }}
                      className="text-base whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })
        )}
      </nav>

      {/* Language + user + signout */}
      <div className={cn('pb-3 border-t border-white/10', collapsed ? 'flex flex-col items-center gap-1' : '')}>
        <div
          className={cn(
            'px-2 pt-3 pb-2',
            open ? 'w-full' : 'flex justify-center'
          )}
        >
          <LanguageSwitcher
            menuOpens="above"
            compact={collapsed}
            className={open ? 'w-full' : undefined}
            menuButtonClassName={cn(
              'justify-center border-white/25 bg-white/10 text-white/95 hover:bg-white/15 hover:text-white',
              'dark:border-white/25 dark:bg-white/10 dark:text-white/95 dark:hover:bg-white/15',
              open ? 'w-full' : ''
            )}
          />
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="px-2 py-2 mb-1 overflow-hidden"
            >
              <div className="text-base font-medium text-white truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </div>
              <div className="truncate text-xs text-white/40">{user?.email}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-2 transition-colors px-2 py-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 w-full',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className="overflow-hidden whitespace-nowrap text-base"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ user, profile }: Props) {
  return (
    <SidebarRoot animate>
      <SidebarBody className="justify-between gap-0 pt-2 pb-3 px-3">
        <SidebarInner user={user} profile={profile} />
      </SidebarBody>
    </SidebarRoot>
  )
}
