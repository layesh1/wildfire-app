'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Flame, Shield, Heart, BarChart3, Map, AlertTriangle,
  Users, Brain, LogOut, ChevronLeft, ChevronRight,
  Activity, TrendingUp, Bell, User, Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Props {
  user: any
  profile: any
}

const NAV_BY_ROLE: Record<string, { label: string; href: string; icon: any }[]> = {
  emergency_responder: [
    { label: 'Live Map', href: '/dashboard/responder', icon: Map },
    { label: 'Signal Gaps', href: '/dashboard/responder/signals', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/responder/ml', icon: Brain },
    { label: 'Agency Coverage', href: '/dashboard/responder/coverage', icon: Shield },
    { label: 'COMMAND-INTEL', href: '/dashboard/responder/ai', icon: Activity },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  caregiver: [
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  evacuee: [
    { label: 'My Alerts', href: '/dashboard/caregiver', icon: Bell },
    { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: Map },
    { label: 'Check-In', href: '/dashboard/caregiver/checkin', icon: Users },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  data_analyst: [
    { label: 'Overview', href: '/dashboard/analyst', icon: BarChart3 },
    { label: 'Signal Gap Analysis', href: '/dashboard/analyst/signal-gap', icon: AlertTriangle },
    { label: 'ML Predictor', href: '/dashboard/analyst/ml', icon: Brain },
    { label: 'Equity Metrics', href: '/dashboard/analyst/equity', icon: TrendingUp },
    { label: 'Live Fire Map', href: '/dashboard/analyst/map', icon: Map },
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
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Infer role from URL path; for non-role-specific paths (like /settings),
  // fall back to localStorage so the last active role is remembered
  const urlRole = pathname.startsWith('/dashboard/responder') ? 'emergency_responder'
    : pathname.startsWith('/dashboard/analyst') ? 'data_analyst'
    : pathname.startsWith('/dashboard/caregiver') ? 'caregiver'
    : null
  // Sync to localStorage whenever URL tells us the role
  if (urlRole && typeof window !== 'undefined') {
    localStorage.setItem('wfa_active_role', urlRole)
  }
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('wfa_active_role') : null
  const role = urlRole || storedRole || profile?.role || 'caregiver'
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.caregiver
  const RoleIcon = ROLE_ICONS[role] || Heart

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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
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
        })}
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
