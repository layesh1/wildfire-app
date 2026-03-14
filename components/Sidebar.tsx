'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Flame, Shield, Heart, BarChart3, Map, AlertTriangle,
  Users, Brain, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  Activity, TrendingUp, Bell, User, Settings, BarChart2, Globe,
  ClipboardList, Thermometer, FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'

interface Props {
  user: any
  profile: any
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: any }[]> = {
  emergency_responder: [
    { label: 'Live Map', href: '/dashboard/responder', icon: Map },
    { label: 'ICS Incident Board', href: '/dashboard/responder/ics', icon: ClipboardList },
    { label: 'ML Predictor', href: '/dashboard/responder/ml', icon: Brain },
    { label: 'COMMAND-INTEL', href: '/dashboard/responder/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  caregiver: [
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Early Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle },
    { label: 'My Persons', href: '/dashboard/caregiver/persons', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  evacuee: [
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Early Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle },
    { label: 'My Persons', href: '/dashboard/caregiver/persons', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  data_analyst: [
    { label: 'Overview', href: '/dashboard/analyst', icon: BarChart3 },
    { label: 'Signal Gap Analysis', href: '/dashboard/analyst/signal-gap', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/analyst/ml', icon: Brain },
    { label: 'Equity Metrics', href: '/dashboard/analyst/equity', icon: TrendingUp },
    { label: 'Live Fire Map', href: '/dashboard/analyst/map', icon: Map },
    { label: 'Trends', href: '/dashboard/analyst/trends', icon: TrendingUp },
    { label: 'NRI Analysis', href: '/dashboard/analyst/nri', icon: BarChart2 },
    { label: 'Fire Weather', href: '/dashboard/analyst/fire-weather', icon: Thermometer },
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
  emergency_responder: 'text-red-400 bg-red-500/20 border-red-500/30',
  caregiver: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  evacuee: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  data_analyst: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
}

export default function Sidebar({ user, profile }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [caregiverOpen, setCaregiverOpen] = useState(true)
  const [evacueeOpen, setEvacueeOpen] = useState(true)
  const langRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()

  const [claimedRoles, setClaimedRoles] = useState<string[]>([])

  // Close language dropdown on click-outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    if (langOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [langOpen])

  // Infer role from URL path; caregiver is ambiguous (it's the default) so
  // only override localStorage for the two non-default roles.
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('wfa_active_role') : null

  const urlRole = pathname.startsWith('/dashboard/responder') ? 'emergency_responder'
    : pathname.startsWith('/dashboard/analyst') ? 'data_analyst'
    : null   // caregiver URLs do NOT override localStorage — they are the default fallback

  // Only write to localStorage when a non-caregiver role is active in the URL
  if (urlRole && typeof window !== 'undefined') {
    localStorage.setItem('wfa_active_role', urlRole)
  }

  // Priority: explicit non-caregiver URL > localStorage (persisted claimed role) > DB role > default
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

  return (
    <aside className={`
      relative flex flex-col bg-ash-900 border-r border-ash-800
      transition-all duration-300 shrink-0
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-20 w-6 h-6 bg-ash-800 border border-ash-700 rounded-full flex items-center justify-center text-ash-400 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-ash-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-ember-500/20 border border-ember-500/40 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 text-ember-400" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-bold text-white text-sm leading-none">WildfireAlert</div>
            <div className="text-ash-500 text-xs">v2.0</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-ash-800">
          <div className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${ROLE_COLORS[role]}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span className="font-medium capitalize">{role.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {/* Multi-role switcher */}
      {!collapsed && claimedRoles.length > 1 && (
        <div className="px-3 py-2 border-b border-ash-800">
          <p className="text-ash-600 text-xs uppercase tracking-wider mb-1.5">My Dashboards</p>
          {claimedRoles.map((r) => {
            const RIcon = ROLE_ICONS[r] || Heart
            const isActive = r === role
            const dest = r === 'emergency_responder' ? '/dashboard/responder' : r === 'data_analyst' ? '/dashboard/analyst' : '/dashboard/caregiver'
            return (
              <button
                key={r}
                onClick={() => {
                  if (r === 'caregiver' || r === 'emergency_responder') {
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(() => {}, () => {})
                    }
                  }
                  router.push(dest)
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${isActive ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white hover:bg-ash-800'}`}
              >
                <RIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="capitalize flex-1 text-left">{r.replace('_', ' ')}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-ember-400" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {(role === 'caregiver' || role === 'evacuee') ? (
          <>
            {/* Caregiver section */}
            <button
              onClick={() => !collapsed && setCaregiverOpen(v => !v)}
              className={`w-full flex items-center gap-1 px-2 py-1.5 text-left group ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Caregiver' : undefined}
            >
              {!collapsed && (
                <>
                  <Heart className="w-3 h-3 text-ash-600 shrink-0" />
                  <span className="text-ash-600 text-xs font-semibold uppercase tracking-wider flex-1">Caregiver</span>
                  {caregiverOpen ? <ChevronDown className="w-3 h-3 text-ash-600" /> : <ChevronRight className="w-3 h-3 text-ash-600" />}
                </>
              )}
              {collapsed && <Heart className="w-3 h-3 text-ash-600" />}
            </button>
            {(caregiverOpen || collapsed) && [
              { label: 'My Persons', href: '/dashboard/caregiver/persons', icon: Users },
              { label: 'Early Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle },
              { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
              { label: 'Emergency Card', href: '/dashboard/caregiver/emergency-card', icon: FileText },
            ].map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <button key={href} onClick={() => router.push(href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${active ? 'bg-ash-800 text-white border-l-2 border-ember-500' : 'text-ash-400 hover:text-white hover:bg-ash-800'} ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{label}</span>}
                </button>
              )
            })}

            <div className="my-2 border-t border-ash-800/60" />

            {/* Evacuee section */}
            <button
              onClick={() => !collapsed && setEvacueeOpen(v => !v)}
              className={`w-full flex items-center gap-1 px-2 py-1.5 text-left group ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Evacuee' : undefined}
            >
              {!collapsed && (
                <>
                  <Shield className="w-3 h-3 text-ash-600 shrink-0" />
                  <span className="text-ash-600 text-xs font-semibold uppercase tracking-wider flex-1">Evacuee</span>
                  {evacueeOpen ? <ChevronDown className="w-3 h-3 text-ash-600" /> : <ChevronRight className="w-3 h-3 text-ash-600" />}
                </>
              )}
              {collapsed && <Shield className="w-3 h-3 text-ash-600" />}
            </button>
            {(evacueeOpen || collapsed) && [
              { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
              { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
              { label: 'Ask SAFE-PATH AI', href: '/dashboard/caregiver/ai', icon: Activity },
            ].map(({ label, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <button key={href} onClick={() => router.push(href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${active ? 'bg-ash-800 text-white border-l-2 border-amber-400' : 'text-ash-400 hover:text-white hover:bg-ash-800'} ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{label}</span>}
                </button>
              )
            })}

            <div className="my-2 border-t border-ash-800/60" />
            {/* Settings */}
            {[{ label: 'Settings', href: '/dashboard/settings', icon: Settings }].map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <button key={href} onClick={() => router.push(`/dashboard/settings?role=${role}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${active ? 'bg-ash-800 text-white border-l-2 border-ember-500' : 'text-ash-400 hover:text-white hover:bg-ash-800'} ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{label}</span>}
                </button>
              )
            })}
          </>
        ) : (
          nav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <button
                key={href}
                onClick={() => router.push(href === '/dashboard/settings' ? `/dashboard/settings?role=${role}` : href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left
                  ${active
                    ? 'bg-ash-800 text-white border-l-2 border-ember-500'
                    : 'text-ash-400 hover:text-white hover:bg-ash-800'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-sm">{label}</span>}
              </button>
            )
          })
        )}
      </nav>

      {/* User + signout */}
      <div className={`p-3 border-t border-ash-800 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <div className="text-white text-sm font-medium truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </div>
            <div className="text-ash-500 text-xs truncate">{user?.email}</div>
          </div>
        )}

        {/* Language switcher */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className={`flex items-center gap-2 text-ash-500 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-ash-800 w-full
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? `Language: ${lang.name}` : undefined}
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-sm flex-1 text-left">
                {lang.flag} <span className="uppercase text-xs font-medium">{lang.code.split('-')[0]}</span>
              </span>
            )}
          </button>

          {langOpen && (
            <div className={`absolute ${collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-1 left-0 right-0'} bg-ash-800 border border-ash-600 rounded-xl shadow-2xl overflow-hidden z-50`}
              style={{ width: collapsed ? '240px' : undefined }}>
              <div className="px-3 py-2 border-b border-ash-700">
                <p className="text-ash-400 text-xs font-medium uppercase tracking-wide">Language</p>
              </div>
              <div className="overflow-y-auto p-2" style={{ maxHeight: '240px' }}>
                <div className="grid grid-cols-2 gap-1">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setLangOpen(false) }}
                      className={`text-xs px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors
                        ${l.code === lang.code
                          ? 'border border-ember-400/60 bg-ember-500/10 text-white'
                          : 'border border-transparent hover:bg-ash-700 text-ash-300 hover:text-white'
                        }`}
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
          className={`flex items-center gap-2 text-ash-500 hover:text-signal-danger transition-colors px-3 py-2 rounded-lg hover:bg-signal-danger/10 w-full
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
