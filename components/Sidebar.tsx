'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Flame, Shield, Heart, BarChart3, Map, AlertTriangle,
  Users, Brain, LogOut, ChevronDown, ChevronRight,
  Activity, TrendingUp, Bell, Settings, BarChart2, Globe,
  ClipboardList, Thermometer, Database, Menu, X, User
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
import { useRoleContext } from '@/components/RoleContext'

interface Props {
  user: any
  profile: any
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: any }[]> = {
  emergency_responder: [
    { label: 'Evacuation Status Map', href: '/dashboard/responder', icon: Map },
    { label: 'Assist Requests', href: '/dashboard/responder/coverage', icon: Shield },
    { label: 'Signal Gaps', href: '/dashboard/responder/signals', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/responder/ml', icon: Brain },
    { label: 'COMMAND-INTEL', href: '/dashboard/responder/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  caregiver: [
    { label: 'My Hub', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Ask FlameoAI', href: '/dashboard/caregiver/ai', icon: Activity },
    { label: 'Early Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'My Persons', href: '/dashboard/caregiver/persons', icon: Users },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  evacuee: [
    { label: 'My Hub', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Ask FlameoAI', href: '/dashboard/caregiver/ai', icon: Activity },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
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
  emergency_responder: 'text-white/80 border-white/20',
  caregiver: 'text-white/80 border-white/20',
  evacuee: 'text-white/80 border-white/20',
  data_analyst: 'text-white/80 border-white/20',
}

function SidebarInner({ user, profile }: Props) {
  const { open } = useSidebar()
  const [langOpen, setLangOpen] = useState(false)
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const personPickerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()
  const { mode, activePerson, persons, setMode, setActivePerson } = useRoleContext()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (personPickerRef.current && !personPickerRef.current.contains(e.target as Node)) {
        setPersonPickerOpen(false)
      }
    }
    if (personPickerOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [personPickerOpen])

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
  const baseNav = NAV_BY_ROLE[role] || NAV_BY_ROLE.caregiver
  // Hide "My Persons" when the user is in My Safety mode (acting for themselves)
  const nav = (mode === 'self' && role === 'caregiver')
    ? baseNav.filter(item => item.href !== '/dashboard/caregiver/persons')
    : baseNav
  const RoleIcon = ROLE_ICONS[role] || Heart

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
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Flame className="w-4 h-4" style={{ color: '#d4a574' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role mode toggle — caregiver pages only */}
      <AnimatePresence>
        {open && role === 'caregiver' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="py-3 border-b border-white/10 overflow-hidden"
          >
            {/* Pill toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <button
                onClick={() => { setMode('self'); setPersonPickerOpen(false) }}
                className={cn('flex-1 text-[11px] font-semibold py-1.5 transition-all', mode === 'self' ? 'text-white' : 'text-white/40 hover:text-white/70')}
                style={mode === 'self' ? { background: 'rgba(124,179,66,0.35)' } : {}}
              >
                My Safety
              </button>
              <button
                onClick={() => {
                  if (persons.length === 0) { setMode('caregiver'); return }
                  setPersonPickerOpen(v => !v)
                }}
                className={cn('flex-1 text-[11px] font-semibold py-1.5 transition-all flex items-center justify-center gap-1', mode === 'caregiver' ? 'text-white' : 'text-white/40 hover:text-white/70')}
                style={mode === 'caregiver' ? { background: 'rgba(200,100,50,0.35)' } : {}}
              >
                <span className="truncate">{mode === 'caregiver' && activePerson ? activePerson.name.split(' ')[0] : 'Caring For'}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </div>

            {/* Person picker dropdown */}
            {personPickerOpen && (
              <div ref={personPickerRef} className="mt-2 rounded-xl overflow-hidden shadow-lg" style={{ background: '#2a1810', border: '1px solid rgba(255,255,255,0.12)' }}>
                {persons.length === 0 ? (
                  <button
                    onClick={() => { router.push('/dashboard/caregiver/persons'); setPersonPickerOpen(false) }}
                    className="w-full text-left px-3 py-2.5 text-xs text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    + Add someone to care for
                  </button>
                ) : (
                  persons.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePerson(p); setPersonPickerOpen(false) }}
                      className={cn('w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center gap-2', activePerson?.id === p.id ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5')}
                    >
                      <User className="w-3 h-3 shrink-0 text-white/40" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Active person label */}
            {mode === 'caregiver' && activePerson && !personPickerOpen && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg text-[11px] text-white/60 flex items-center gap-1.5" style={{ background: 'rgba(200,100,50,0.12)' }}>
                <User className="w-3 h-3 text-white/40 shrink-0" />
                <span className="truncate">For: {activePerson.name}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className={cn('flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border', ROLE_COLORS[role])} style={{ background: 'rgba(255,255,255,0.08)' }}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span className="font-medium capitalize whitespace-nowrap">{role.replace('_', ' ')}</span>
            </div>
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
                  ? 'border-l-2 border-[#c86432] font-medium'
                  : 'hover:bg-white/10',
                collapsed ? 'justify-center' : ''
              )}
              style={{ color: active ? '#d4a574' : 'rgba(255,255,255,0.55)' }}
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

      {/* Language switcher */}
      <div ref={langRef} className="relative border-t border-white/10 pt-1 pb-1">
        <button
          onClick={() => setLangOpen(v => !v)}
          title={collapsed ? `Language: ${lang.name}` : undefined}
          className={cn(
            'flex items-center gap-2 transition-colors px-2 py-2 rounded-lg hover:bg-white/10 w-full',
            collapsed ? 'justify-center' : ''
          )}
          style={{ color: 'rgba(255,255,255,0.5)' }}
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
              'absolute rounded-xl shadow-xl overflow-hidden z-50',
              'bottom-full mb-1 left-0',
            )}
            style={{ width: open ? undefined : '240px', right: open ? 0 : undefined, background: '#2a1810', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wide">Language</p>
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
                        ? 'border border-[#c86432]/50 text-[#d4a574]'
                        : 'border border-transparent text-white/50 hover:text-white hover:bg-white/10'
                    )}
                    style={l.code === lang.code ? { background: 'rgba(200,100,50,0.2)' } : undefined}
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

      {/* User + signout */}
      <div className={cn('pb-3 border-t border-white/10', collapsed ? 'flex flex-col items-center gap-1' : '')}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="px-2 py-2 mb-1 overflow-hidden"
            >
              <div className="text-white text-sm font-medium truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </div>
              <div className="text-white/40 text-xs truncate">{user?.email}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-2 transition-colors px-2 py-2 rounded-lg hover:bg-white/10 w-full',
            collapsed ? 'justify-center' : ''
          )}
          style={{ color: 'rgba(255,255,255,0.4)' }}
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
