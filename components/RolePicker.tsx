'use client'
import { useEffect, useState } from 'react'
import { Flame, Shield, Heart, BarChart3, ChevronRight, Plus, Lock, Loader2, CheckCircle, X } from 'lucide-react'

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

const LS_ROLES_KEY = 'wfa_roles'
const LS_ACTIVE_KEY = 'wfa_active_role'

interface Props {
  roles: string[]
  activeRole: string
  name?: string | null
}

export default function RolePicker({ roles, activeRole, name }: Props) {
  const [myRoles, setMyRoles] = useState<string[]>(roles.filter(r => ROLE_CONFIG[r]))

  // Access code state
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [codeId, setCodeId] = useState<string | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_ROLES_KEY)
      const localRoles: string[] = stored ? JSON.parse(stored) : []
      const valid = localRoles.filter((r: string) => ROLE_CONFIG[r])
      const merged = [...new Set([...roles.filter(r => ROLE_CONFIG[r]), ...valid])]
      setMyRoles(merged)
      localStorage.setItem(LS_ROLES_KEY, JSON.stringify(merged))
    } catch {
      // ignore parse errors
    }
  }, []) // eslint-disable-line

  const otherRoles = ALL_ROLES.filter(r => !myRoles.includes(r))

  async function selectRole(role: string, href: string) {
    const updated = [...new Set([...myRoles, role])]
    localStorage.setItem(LS_ACTIVE_KEY, role)
    localStorage.setItem(LS_ROLES_KEY, JSON.stringify(updated))
    fetch('/api/profile/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }).catch(() => {})
    window.location.href = href
  }

  function toggleExpand(role: string) {
    if (expandedRole === role) {
      setExpandedRole(null)
    } else {
      setExpandedRole(role)
      setCode('')
      setCodeVerified(false)
      setCodeError('')
      setOrgName(null)
      setCodeId(null)
    }
  }

  async function verifyCode() {
    if (!expandedRole || !code.trim()) return
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch('/api/invite/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), role: expandedRole }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setCodeError(data.error || 'Invalid code. Please try again.')
      } else if (data.role !== expandedRole) {
        setCodeError(`This code is for ${data.role.replace('_', ' ')}, not ${expandedRole.replace('_', ' ')}.`)
      } else {
        setCodeVerified(true)
        setOrgName(data.org_name)
        setCodeId(data.code_id)
      }
    } catch {
      setCodeError('Network error — check your connection.')
    }
    setCodeLoading(false)
  }

  async function claimRole() {
    if (!expandedRole || !codeVerified) return
    setClaimLoading(true)
    localStorage.setItem(LS_ACTIVE_KEY, expandedRole)
    try {
      const prev: string[] = JSON.parse(localStorage.getItem('wfa_claimed_roles') || '[]')
      localStorage.setItem('wfa_claimed_roles', JSON.stringify([...new Set([...prev, expandedRole])]))
    } catch {}
    await fetch('/api/profile/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: expandedRole }),
    }).catch(() => {})
    if (codeId) {
      await fetch('/api/invite/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_id: codeId }),
      }).catch(() => {})
    }
    window.location.href = ROLE_CONFIG[expandedRole].href
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-4 py-12 overflow-y-auto">
      <div className="fixed inset-0 bg-forest-radial pointer-events-none" />
      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-200 flex items-center justify-center">
            <Flame className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <div className="font-display font-bold text-gray-900 text-xl leading-none">Minutes Matter</div>
            <div className="text-gray-400 text-xs">Equity-driven evacuation intelligence</div>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
            {name ? `Welcome, ${name.split(' ')[0]}` : 'Choose your dashboard'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
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
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-white transition-all text-left hover:bg-gray-50 hover:shadow-sm ${
                    isActive ? 'border-forest-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-forest-50 border-forest-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{cfg.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              )
            })}
          </div>

          {/* Roles the user can request */}
          {otherRoles.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-gray-400 text-xs font-medium">Add a role</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="space-y-2">
                {otherRoles.map(role => {
                  const cfg = ROLE_CONFIG[role]
                  const Icon = cfg.icon
                  const isExpanded = expandedRole === role

                  return (
                    <div key={role} className={`rounded-xl border transition-all ${isExpanded ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
                      {/* Role header row */}
                      <button
                        onClick={() => toggleExpand(role)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100/60 transition-colors rounded-xl"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          <Icon className={`w-4 h-4 ${cfg.color} opacity-60`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-600 text-sm font-medium">{cfg.label}</div>
                          {cfg.protected && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400 text-xs">Requires access code</span>
                            </div>
                          )}
                        </div>
                        {isExpanded
                          ? <X className="w-4 h-4 text-gray-400 shrink-0" />
                          : <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                      </button>

                      {/* Inline access code form */}
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="border-t border-gray-100 pt-3">
                            {!codeVerified ? (
                              <>
                                <p className="text-gray-500 text-xs mb-3">
                                  Enter your access code to unlock {cfg.label}.
                                  Codes are issued by your organization or agency.
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={code}
                                    onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                                    onKeyDown={e => e.key === 'Enter' && verifyCode()}
                                    placeholder="e.g. ER-ORG-1234"
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:border-blue-400 placeholder:text-gray-400"
                                  />
                                  <button
                                    onClick={verifyCode}
                                    disabled={codeLoading || !code.trim()}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {codeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                                  </button>
                                </div>
                                {codeError && (
                                  <p className="text-signal-danger text-xs mt-2">{codeError}</p>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-signal-safe text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="font-medium">Code verified{orgName ? ` · ${orgName}` : ''}</span>
                                </div>
                                <button
                                  onClick={claimRole}
                                  disabled={claimLoading}
                                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                                    role === 'emergency_responder'
                                      ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                                      : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100'
                                  }`}
                                >
                                  {claimLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <>Add {cfg.label} to my account →</>
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
