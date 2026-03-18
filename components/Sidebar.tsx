'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Flame, Shield, Heart, BarChart3, Map, AlertTriangle,
  Users, Brain, LogOut, ChevronDown, ChevronRight,
  Activity, TrendingUp, Bell, Settings, BarChart2, Globe,
  ClipboardList, Thermometer, FileText, Database, Menu, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
  Sidebar as SidebarRoot,
  SidebarBody,
  useSidebar,
} from '@/components/ui/sidebar'

interface Props {
  user: any
  profile: any
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: any }[]> = {
  emergency_responder: [
    { label: 'Live Map', href: '/dashboard/responder', icon: Map },
    { label: 'ICS Incident Board', href: '/dashboard/responder/ics', icon: ClipboardList },
    { label: 'Coverage Gaps', href: '/dashboard/responder/coverage', icon: Shield },
    { label: 'Signal Gaps', href: '/dashboard/responder/signals', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/responder/ml', icon: Brain },
    { label: 'COMMAND-INTEL', href: '/dashboard/responder/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  caregiver: [
    { label: 'My Persons', href: '/dashboard/caregiver/persons', icon: Users },
    { label: 'Early Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Emergency Card', href: '/dashboard/caregiver/emergency-card', icon: FileText },
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Ask Flameo', href: '/dashboard/caregiver/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  evacuee: [
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Ask Flameo', href: '/dashboard/caregiver/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  data_analyst: [
    { label: 'Overview', href: '/dashboard/analyst', icon: BarChart3 },
    { label: 'Signal Gap Analysis', href: '/dashboard/analyst/signal-gap', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/analyst/ml', icon: Brain },
    { label: 'Equity Metrics', href: '/dashboard/analyst/equity', icon: TrendingUp },
    { label: 'Live Fire Map', href: '/dashboard/analyst/map', icon: Map },
    { label: 'Hidden Danger', href: '/dashboard/analyst/hidden-danger', icon: Flame },
    { label: 'Fire Patterns', href: '/dashboard/analyst/fire-patterns', icon: Activity },
    { label: 'Fire Density', href: '/dashboard/analyst/fire-density', icon: BarChart3 },
    { label: 'Trends', href: '/dashboard/analyst/trends', icon: TrendingUp },
    { label: 'NRI Analysis', href: '/dashboard/analyst/nri', icon: BarChart2 },
    { label: 'Fire Weather', href: '/dashboard/analyst/fire-weather', icon: Thermometer },
    { label: 'Data Health', href: '/dashboard/analyst/data-health', icon: Database },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
}

const ROLE_ICONS: Record<string, any> = {
  emergency_responder: Shield,
  caregiver: Heart,
  evacuee: Heart,
  data_analyst: BarChart3,
}

const ROLE_COLORS: Record<string, string> = {
  emergency_responder: 'text-red-600 bg-red-50 border-red-200',
  caregiver: 'text-forest-700 bg-forest-50 border-forest-200',
  evacuee: 'text-forest-700 bg-forest-50 border-forest-200',
  data_analyst: 'text-blue-600 bg-blue-50 border-blue-200',
}

function SidebarInner({ user, profile }: Props) {
  const { open } = useSidebar()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()

  const [claimedRoles, setClaimedRoles] = useState<string[]>(
    profile?.role ? [profile.role] : ['caregiver']
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    if (langOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [langOpen])

  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('wfa_active_role') : null
  const urlRole = pathname.startsWith('/dashboard/responder') ? 'emergency_responder'
    : pathname.startsWith('/dashboard/analyst') ? 'data_analyst'
    : pathname.startsWith('/dashboard/caregiver') ? 'caregiver'
    : null
  if (urlRole && typeof window !== 'undefined') {
    localStorage.setItem('wfa_active_role', urlRole)
  }

  const role = urlRole || storedRole || profile?.role || 'caregiver'
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.caregiver
  const RoleIcon = ROLE_ICONS[role] || Heart

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wfa_roles')
      const localRoles: string[] = stored ? JSON.parse(stored) : []
      const serverRoles: string[] = Array.isArray(profile?.roles) && profile.roles.length > 0
        ? profile.roles
        : profile?.role ? [profile.role] : []
      const merged = [...new Set([...serverRoles, ...localRoles])].filter(r =>
        ['emergency_responder', 'caregiver', 'evacuee', 'data_analyst'].includes(r)
      )
      setClaimedRoles(merged.length > 0 ? merged : [role])
    } catch {
      setClaimedRoles([role])
    }
  }, []) // eslint-disable-line

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const collapsed = !open

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 pb-4 border-b border-gray-100', collapsed ? 'justify-center' : '')}>
        <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-forest-600" />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="font-display font-bold text-gray-900 text-sm leading-none whitespace-nowrap">Minutes Matter</div>
              <div className="text-gray-400 text-xs">v2.0</div>
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
            className="py-3 border-b border-gray-100 overflow-hidden"
          >
            <div className={cn('flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border', ROLE_COLORS[role])}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span className="font-medium capitalize whitespace-nowrap">{role.replace('_', ' ')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Dashboards */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="py-2 border-b border-gray-100 overflow-hidden"
          >
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1.5">My Dashboards</p>
            {[
              { r: 'caregiver', label: 'Caregiver', dest: '/dashboard/caregiver', Icon: Heart },
              { r: 'emergency_responder', label: 'Responder', dest: '/dashboard/responder', Icon: Shield },
              { r: 'data_analyst', label: 'Data Analyst', dest: '/dashboard/analyst', Icon: BarChart3 },
            ].filter(({ r }) => claimedRoles.includes(r)).map(({ r, label, dest, Icon }) => {
              const isActive = r === role
              return (
                <button
                  key={r}
                  onClick={() => router.push(dest)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5',
                    isActive
                      ? 'bg-forest-50 text-forest-700 border border-forest-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap">{label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-forest-600" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard/caregiver' && pathname.startsWith(href + '/'))
          const dest = href === '/dashboard/settings' ? `/dashboard/settings?role=${role}` : href
          return (
            <button
              key={href}
              onClick={() => router.push(dest)}
              title={collapsed ? label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 text-left',
                active
                  ? 'bg-forest-50 text-forest-700 border-l-2 border-forest-500 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                collapsed ? 'justify-center' : ''
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.12 }}
                    className="text-sm whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* User + signout */}
      <div className={cn('pt-3 border-t border-gray-100', collapsed ? 'flex flex-col items-center gap-1' : '')}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="px-2 py-2 mb-1 overflow-hidden"
            >
              <div className="text-gray-900 text-sm font-medium truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </div>
              <div className="text-gray-400 text-xs truncate">{user?.email}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language switcher */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            title={collapsed ? `Language: ${lang.name}` : undefined}
            className={cn(
              'flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors px-2 py-2 rounded-lg hover:bg-gray-100 w-full',
              collapsed ? 'justify-center' : ''
            )}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {open && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-sm flex-1 text-left overflow-hidden whitespace-nowrap"
                >
                  {lang.flag} <span className="uppercase text-xs font-medium">{lang.code.split('-')[0]}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {langOpen && (
            <div
              className={cn(
                'absolute bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50',
                collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-1 left-0 right-0'
              )}
              style={{ width: collapsed ? '240px' : undefined }}
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Language</p>
              </div>
              <div className="overflow-y-auto p-2" style={{ maxHeight: '240px' }}>
                <div className="grid grid-cols-2 gap-1">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setLangOpen(false) }}
                      className={cn(
                        'text-xs px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors',
                        l.code === lang.code
                          ? 'border border-forest-300 bg-forest-50 text-forest-700'
                          : 'border border-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      )}
                    >
                      <span className="text-sm leading-none">{l.flag}</span>
                      <span className="truncate">{l.native}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors px-2 py-2 rounded-lg hover:bg-red-50 w-full',
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
                className="text-sm overflow-hidden whitespace-nowrap"
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
      <SidebarBody className="h-screen sticky top-0 justify-between gap-0 py-4 px-3">
        <SidebarInner user={user} profile={profile} />
      </SidebarBody>
    </SidebarRoot>
  )
}
