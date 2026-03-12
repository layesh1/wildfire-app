'use client'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, BarChart3, ChevronRight, Plus, Lock } from 'lucide-react'

const ALL_ROLES = ['caregiver', 'emergency_responder', 'data_analyst'] as const

const ROLE_CONFIG: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  bg: string
  border: string
  activeBorder: string
  protected: boolean
}> = {
  caregiver: {
    label: 'Caregiver / Evacuee',
    description: 'Evacuation map, safety check-ins, household emergency profile',
    icon: Heart,
    href: '/dashboard/caregiver',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    activeBorder: 'border-amber-500/60',
    protected: false,
  },
  emergency_responder: {
    label: 'Emergency Responder',
    description: 'Live incident map, signal gap analysis, ML spread predictor, COMMAND-INTEL AI',
    icon: Shield,
    href: '/dashboard/responder',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    activeBorder: 'border-red-500/60',
    protected: true,
  },
  data_analyst: {
    label: 'Data Analyst',
    description: 'Signal gap analysis, equity metrics, ML models, fire dataset explorer',
    icon: BarChart3,
    href: '/dashboard/analyst',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    activeBorder: 'border-blue-500/60',
    protected: true,
  },
}

interface Props {
  roles: string[]
  activeRole: string
  name?: string | null
}

export default function RolePicker({ roles, activeRole, name }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const myRoles = roles.filter(r => ROLE_CONFIG[r])
  const otherRoles = ALL_ROLES.filter(r => !roles.includes(r))

  async function selectRole(role: string, href: string) {
    await fetch('/api/profile/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    window.location.href = href
  }

  return (
    <main className="min-h-screen bg-ash-950 flex items-start justify-center p-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 bg-ember-radial pointer-events-none" />
      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ember-500/20 border border-ember-500/40 flex items-center justify-center">
            <Flame className="w-5 h-5 text-ember-400" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-xl leading-none">WildfireAlert</div>
            <div className="text-ash-500 text-xs">Equity-driven evacuation intelligence</div>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-2xl font-bold text-white mb-1">
            {name ? `Welcome, ${name.split(' ')[0]}` : 'Choose your dashboard'}
          </h2>
          <p className="text-ash-400 text-sm mb-6">
            {myRoles.length > 1
              ? 'You have access to multiple dashboards. Where would you like to go?'
              : 'Select your dashboard to continue.'}
          </p>

          {/* Roles the user has access to */}
          <div className="space-y-3 mb-6">
            {myRoles.map(role => {
              const cfg = ROLE_CONFIG[role]
              const Icon = cfg.icon
              const isActive = role === activeRole
              return (
                <button
                  key={role}
                  onClick={() => selectRole(role, cfg.href)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-ash-900 transition-all text-left hover:bg-ash-800 ${
                    isActive ? cfg.activeBorder : cfg.border
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isActive ? `${cfg.bg} ${cfg.activeBorder}` : 'bg-ash-800/50 border-ash-700'
                  }`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
                    <div className="text-ash-500 text-xs mt-0.5">{cfg.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ash-600 shrink-0" />
                </button>
              )
            })}
          </div>

          {/* Roles the user can request */}
          {otherRoles.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 border-t border-ash-800" />
                <span className="text-ash-600 text-xs font-medium">Add a role</span>
                <div className="flex-1 border-t border-ash-800" />
              </div>

              <div className="space-y-2">
                {otherRoles.map(role => {
                  const cfg = ROLE_CONFIG[role]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={role}
                      onClick={() => router.push(`/auth/add-role?role=${role}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-ash-800 bg-ash-900/50 hover:bg-ash-800 hover:border-ash-700 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-ash-800 border border-ash-700 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${cfg.color} opacity-60`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-ash-400 text-sm font-medium">{cfg.label}</div>
                        {cfg.protected && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Lock className="w-3 h-3 text-ash-600" />
                            <span className="text-ash-600 text-xs">Requires access code</span>
                          </div>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-ash-600 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
