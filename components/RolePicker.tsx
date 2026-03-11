'use client'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, BarChart3, ChevronRight } from 'lucide-react'

const ROLE_CONFIG: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  border: string
}> = {
  caregiver: {
    label: 'Caregiver / Evacuee',
    description: 'Evacuation map, safety check-ins, household emergency profile',
    icon: Heart,
    href: '/dashboard/caregiver',
    color: 'text-amber-400',
    border: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
  },
  evacuee: {
    label: 'Evacuee',
    description: 'Evacuation map, safety check-ins, household emergency profile',
    icon: Heart,
    href: '/dashboard/caregiver',
    color: 'text-amber-400',
    border: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
  },
  emergency_responder: {
    label: 'Emergency Responder',
    description: 'Live incident map, signal gap analysis, ML spread predictor, COMMAND-INTEL AI',
    icon: Shield,
    href: '/dashboard/responder',
    color: 'text-red-400',
    border: 'border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5',
  },
  data_analyst: {
    label: 'Data Analyst',
    description: 'Signal gap analysis, equity metrics, ML models, fire dataset explorer',
    icon: BarChart3,
    href: '/dashboard/analyst',
    color: 'text-blue-400',
    border: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5',
  },
}

interface Props {
  roles: string[]
  activeRole: string
  name?: string | null
}

export default function RolePicker({ roles, activeRole, name }: Props) {
  const router = useRouter()
  const uniqueRoles = [...new Set(roles)].filter(r => ROLE_CONFIG[r])

  return (
    <main className="min-h-screen bg-ash-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ember-radial pointer-events-none" />
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
            Welcome{name ? `, ${name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-ash-400 text-sm mb-7">
            Your account has access to multiple dashboards. Which would you like to open?
          </p>

          <div className="space-y-3">
            {uniqueRoles.map(role => {
              const cfg = ROLE_CONFIG[role]
              const Icon = cfg.icon
              return (
                <button
                  key={role}
                  onClick={() => router.push(cfg.href)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-ash-900 transition-all text-left ${cfg.border}`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    role === activeRole ? `bg-ash-800 border-ash-600` : 'bg-ash-800/50 border-ash-700'
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
        </div>
      </div>
    </main>
  )
}
