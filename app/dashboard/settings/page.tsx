'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Heart, BarChart3, Lock, Check, ShieldCheck, Globe, Settings, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'

const ROLE_CONFIG: Record<string, {
  label: string; description: string; icon: React.ElementType
  color: string; border: string; activeBorder: string; protected: boolean
}> = {
  caregiver: {
    label: 'Caregiver / Evacuee', description: 'Evacuation map, safety check-ins, emergency profile',
    icon: Heart, color: 'text-amber-400', border: 'border-amber-500/30',
    activeBorder: 'border-amber-500 bg-amber-500/10', protected: false,
  },
  emergency_responder: {
    label: 'Emergency Responder', description: 'Live incident map, COMMAND-INTEL AI, signal gap analysis',
    icon: Shield, color: 'text-red-400', border: 'border-red-500/30',
    activeBorder: 'border-red-500 bg-red-500/10', protected: true,
  },
  data_analyst: {
    label: 'Data Analyst', description: 'Signal gap analysis, equity metrics, ML models',
    icon: BarChart3, color: 'text-blue-400', border: 'border-blue-500/30',
    activeBorder: 'border-blue-500 bg-blue-500/10', protected: true,
  },
}

const ALL_ROLES = ['caregiver', 'emergency_responder', 'data_analyst']

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()

  const [profile, setProfile] = useState<any>(null)
  const [myRoles, setMyRoles] = useState<string[]>([])
  const [activeRole, setActiveRole] = useState('')
  const [langSearch, setLangSearch] = useState('')
  const [savingRole, setSavingRole] = useState('')

  // Add role state
  const [addingRole, setAddingRole] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [codeId, setCodeId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const roles: string[] = Array.isArray(p?.roles) && p.roles.length ? p.roles : p?.role ? [p.role] : ['caregiver']
      setMyRoles(roles)
      setActiveRole(p?.role || 'caregiver')
    }
    load()
  }, [])

  async function switchActive(role: string) {
    setSavingRole(role)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ role }).eq('id', user.id)
      setActiveRole(role)
    }
    setSavingRole('')
  }

  async function verifyCode() {
    if (!addingRole || !code.trim()) return
    setCodeLoading(true)
    setCodeError('')
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch('/api/invite/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), email: user?.email, role: addingRole }),
    })
    const data = await res.json()
    if (!res.ok || !data.valid) {
      setCodeError(data.error || 'Invalid code.')
    } else if (data.role !== addingRole) {
      setCodeError(`This code is for ${data.role.replace('_', ' ')}, not ${addingRole.replace('_', ' ')}.`)
    } else {
      setCodeVerified(true)
      setOrgName(data.org_name)
      setCodeId(data.code_id)
    }
    setCodeLoading(false)
  }

  async function claimRole() {
    if (!addingRole || !codeVerified) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updatedRoles = [...new Set([...myRoles, addingRole])]
    await supabase.from('profiles').update({ roles: updatedRoles, role: addingRole }).eq('id', user.id)
    if (codeId) {
      await fetch('/api/invite/consume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_id: codeId }),
      })
    }
    setMyRoles(updatedRoles)
    setActiveRole(addingRole)
    resetAddRole()
  }

  function resetAddRole() {
    setAddingRole(null)
    setCode('')
    setCodeVerified(false)
    setCodeError('')
    setOrgName(null)
    setCodeId(null)
  }

  const otherRoles = ALL_ROLES.filter(r => !myRoles.includes(r))
  const filteredLangs = LANGUAGES.filter(l =>
    !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-ash-400" />
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* ── Role Management ── */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-1">Your roles</h2>
        <p className="text-ash-500 text-sm mb-4">Switch your active dashboard or add a new role with an access code.</p>

        {/* Roles you have */}
        <div className="space-y-2 mb-4">
          {myRoles.filter(r => ROLE_CONFIG[r]).map(role => {
            const cfg = ROLE_CONFIG[role]
            const Icon = cfg.icon
            const isActive = role === activeRole
            return (
              <div key={role} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? cfg.activeBorder : 'border-ash-800 bg-ash-900'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
                  {isActive && <div className="text-ash-500 text-xs">Active</div>}
                </div>
                {isActive ? (
                  <span className="text-xs text-ash-500 px-2 py-1 rounded-lg bg-ash-800">Current</span>
                ) : (
                  <button
                    onClick={() => switchActive(role)}
                    disabled={savingRole === role}
                    className="text-xs px-3 py-1.5 rounded-lg bg-ash-800 hover:bg-ash-700 text-ash-300 hover:text-white transition-colors border border-ash-700"
                  >
                    {savingRole === role ? '…' : 'Switch to'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add new role */}
        {otherRoles.length > 0 && !addingRole && (
          <div className="space-y-2">
            <p className="text-ash-600 text-xs font-medium uppercase tracking-wider mb-2">Add a role</p>
            {otherRoles.filter(r => ROLE_CONFIG[r]).map(role => {
              const cfg = ROLE_CONFIG[role]
              const Icon = cfg.icon
              return (
                <button
                  key={role}
                  onClick={() => { setAddingRole(role); setCode(''); setCodeVerified(false); setCodeError('') }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-ash-800 bg-ash-900 hover:bg-ash-800 hover:border-ash-700 transition-all text-left"
                >
                  <Icon className={`w-4 h-4 ${cfg.color} opacity-70 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ash-300 text-sm font-medium">{cfg.label}</div>
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
        )}

        {/* Inline code entry */}
        {addingRole && ROLE_CONFIG[addingRole] && (
          <div className="border border-ash-700 rounded-xl p-4 bg-ash-900/50 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {(() => { const Icon = ROLE_CONFIG[addingRole].icon; return <Icon className={`w-4 h-4 ${ROLE_CONFIG[addingRole].color}`} /> })()}
                <span className={`text-sm font-semibold ${ROLE_CONFIG[addingRole].color}`}>{ROLE_CONFIG[addingRole].label}</span>
              </div>
              <button onClick={resetAddRole} className="text-ash-600 hover:text-ash-400 text-xs">Cancel</button>
            </div>

            {!codeVerified ? (
              <>
                <label className="block text-ash-400 text-xs mb-1.5">Access code</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="input flex-1 font-mono uppercase tracking-wider text-sm"
                    placeholder={addingRole === 'data_analyst' ? 'DA-XXXX-XXXX' : 'ER-ORG-XXXX'}
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                    onKeyDown={e => e.key === 'Enter' && verifyCode()}
                  />
                  <button
                    onClick={verifyCode}
                    disabled={!code.trim() || codeLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors disabled:opacity-40 shrink-0"
                  >
                    {codeLoading ? <div className="w-4 h-4 border border-ember-400/40 border-t-ember-400 rounded-full animate-spin" /> : 'Verify'}
                  </button>
                </div>
                {codeError && <p className="text-signal-danger text-xs">{codeError}</p>}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-signal-safe/10 border border-signal-safe/30 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-signal-safe shrink-0" />
                  <span className="text-signal-safe text-sm font-medium">
                    {orgName ? `${orgName} — access verified` : 'Access code verified'}
                  </span>
                </div>
                <button
                  onClick={claimRole}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Add {ROLE_CONFIG[addingRole].label} to my account
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Language ── */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-ash-400" />
          <h2 className="font-display text-lg font-bold text-white">Language</h2>
        </div>
        <p className="text-ash-500 text-sm mb-4">The app will be translated to your selected language.</p>
        <input
          type="text"
          value={langSearch}
          onChange={e => setLangSearch(e.target.value)}
          placeholder="Search language…"
          className="input w-full mb-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredLangs.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                l.code === lang.code
                  ? 'bg-ember-500/20 border border-ember-500/40 text-ember-300'
                  : 'text-ash-300 hover:bg-ash-800 border border-transparent'
              }`}
            >
              <span className="text-base shrink-0">{l.flag}</span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{l.native}</div>
                {l.code !== 'en' && <div className="truncate text-ash-600 text-xs">{l.name}</div>}
              </div>
              {l.code === lang.code && <Check className="w-3 h-3 ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
