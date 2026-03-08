'use client'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, BarChart3, ChevronRight, AlertTriangle } from 'lucide-react'

const roles = [
  {
    id: 'emergency_responder',
    title: 'Emergency Responder',
    subtitle: 'COMMAND-INTEL access',
    description: 'Live fire tracking, agency coverage gaps, ML spread predictions, resource deployment.',
    icon: Shield,
    color: 'from-red-500/20 to-transparent',
    border: 'border-red-500/40 hover:border-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    badgeText: 'RESTRICTED',
  },
  {
    id: 'caregiver',
    title: 'Caregiver / Evacuee',
    subtitle: 'SAFE-PATH access',
    description: 'Personalized evacuation alerts, check-in system, accessible route guidance.',
    icon: Heart,
    color: 'from-amber-500/20 to-transparent',
    border: 'border-amber-500/40 hover:border-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    badgeText: 'PUBLIC',
  },
  {
    id: 'data_analyst',
    title: 'Data Analyst',
    subtitle: 'Full dataset access',
    description: 'Signal gap analysis, SVI equity metrics, 62,696 fire incidents, export tools.',
    icon: BarChart3,
    color: 'from-blue-500/20 to-transparent',
    border: 'border-blue-500/40 hover:border-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    badgeText: 'RESEARCH',
  },
]

const stats = [
  { value: '62,696', label: 'Fire incidents analyzed', sub: '2021–2025' },
  { value: '11.5h', label: 'Median evacuation delay', sub: 'across all counties' },
  { value: '99.74%', label: 'Fires w/ no formal order', sub: 'despite external signals' },
  { value: '9×', label: 'State disparity gap', sub: 'fastest vs slowest' },
]

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-ash-950 bg-noise relative overflow-hidden">
      {/* Ember radial background */}
      <div className="absolute inset-0 bg-ember-radial pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-ember-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-ash-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ember-500/20 border border-ember-500/40 flex items-center justify-center">
              <Flame className="w-5 h-5 text-ember-400" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-lg leading-none block">WildfireAlert</span>
              <span className="text-ash-500 text-xs">WiDS Datathon 2025</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="btn-ghost text-sm"
          >
            Sign in
          </button>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Alert banner */}
        <div className="flex items-center gap-3 bg-signal-danger/10 border border-signal-danger/30 rounded-lg px-4 py-3 mb-12 max-w-2xl mx-auto animate-fade-up">
          <AlertTriangle className="w-4 h-4 text-signal-danger shrink-0" />
          <p className="text-sm text-ash-300">
            <span className="text-signal-danger font-medium">Research Finding: </span>
            High-vulnerability counties experience significantly longer evacuation delays.
          </p>
        </div>

        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="font-display text-6xl md:text-7xl font-bold text-white leading-tight mb-6 animate-fade-up">
            Wildfire alerts that{' '}
            <span className="text-gradient-ember">reach everyone.</span>
          </h1>
          <p className="text-ash-400 text-xl max-w-2xl mx-auto animate-fade-up animate-delay-100">
            Equity-driven evacuation intelligence system analyzing signal gaps in underserved communities across 62,696 wildfire incidents.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="card p-6 text-center animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="stat-value text-gradient-ember">{stat.value}</div>
              <div className="text-ash-300 text-sm font-medium mt-1">{stat.label}</div>
              <div className="text-ash-500 text-xs mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Role selector */}
        <div className="text-center mb-10">
          <h2 className="section-title mb-2">Choose your role</h2>
          <p className="text-ash-400">Each role unlocks a tailored view of the data.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {roles.map((role, i) => {
            const Icon = role.icon
            return (
              <button
                key={role.id}
                onClick={() => router.push(`/auth/login?role=${role.id}`)}
                className={`card border ${role.border} p-6 text-left group transition-all duration-300 hover:scale-[1.02] animate-fade-up cursor-pointer`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-b ${role.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-ash-800 border border-ash-700 flex items-center justify-center group-hover:border-current transition-colors">
                      <Icon className="w-6 h-6 text-ash-400 group-hover:text-current transition-colors" />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${role.badge}`}>
                      {role.badgeText}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-1">{role.title}</h3>
                  <p className="text-ash-500 text-xs mb-3">{role.subtitle}</p>
                  <p className="text-ash-400 text-sm leading-relaxed mb-4">{role.description}</p>
                  <div className="flex items-center gap-2 text-ash-400 group-hover:text-white transition-colors text-sm font-medium">
                    Enter dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-ash-600 text-sm">
          Data: WatchDuty/WiDS 2025 dataset · CDC Social Vulnerability Index · NASA FIRMS Live Feed
        </p>
      </div>
    </main>
  )
}
