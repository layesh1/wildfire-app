'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Heart, BarChart3, Lock, Check, ShieldCheck, Globe,
  Settings, Plus, User, Bell, BellOff, Moon, Sun, Monitor, LogOut,
  Trash2, Key, AlertTriangle, Save, CheckCircle, PawPrint, ShieldAlert
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'

// ── Types ──────────────────────────────────────────────────────────────────
interface Dependent { name: string; relationship: string; mobility_needs: string; medications: string; other_needs: string }
interface Pet { name: string; type: string; notes: string }
interface ProfileData {
  full_name: string; phone: string; address: string
  notification_email: string; notification_phone: string; notify_browser: boolean
  dependents: Dependent[]; pets: Pet[]; special_notes: string
  emergency_contact_name: string; emergency_contact_phone: string
  language_preference: string; communication_needs: string[]; household_languages: string
}
const EMPTY_DEP: Dependent = { name: '', relationship: '', mobility_needs: '', medications: '', other_needs: '' }
const EMPTY_PET: Pet = { name: '', type: '', notes: '' }
const DEFAULT: ProfileData = {
  full_name: '', phone: '', address: '', notification_email: '', notification_phone: '',
  notify_browser: false, dependents: [], pets: [], special_notes: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  language_preference: 'en', communication_needs: [], household_languages: '',
}

// ── Role config ────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; activeBorder: string; protected: boolean }> = {
  caregiver: { label: 'Caregiver / Evacuee', icon: Heart, color: 'text-amber-400', activeBorder: 'border-amber-500 bg-amber-500/10', protected: false },
  emergency_responder: { label: 'Emergency Responder', icon: Shield, color: 'text-red-400', activeBorder: 'border-red-500 bg-red-500/10', protected: true },
  data_analyst: { label: 'Data Analyst', icon: BarChart3, color: 'text-blue-400', activeBorder: 'border-blue-500 bg-blue-500/10', protected: true },
}
const ALL_ROLES = ['caregiver', 'emergency_responder', 'data_analyst']
const ROLE_DESTINATIONS: Record<string, string> = {
  emergency_responder: '/dashboard/responder',
  data_analyst: '/dashboard/analyst',
  caregiver: '/dashboard/caregiver',
}

// ── Small helpers ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-ember-400" />
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-ash-300 text-xs font-medium mb-1">{label}</label>
      {children}
      {hint && <p className="text-ash-600 text-xs mt-1">{hint}</p>}
    </div>
  )
}
function FInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
}
function FTextarea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 resize-none" />
}

type Tab = 'profile' | 'account' | 'preferences'
type Theme = 'dark' | 'light' | 'system'

// ── Main page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()

  const [tab, setTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<ProfileData>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null)
  const [email, setEmail] = useState('')

  // Roles
  const [myRoles, setMyRoles] = useState<string[]>([])
  const [activeRole, setActiveRole] = useState('')
  const [savingRole, setSavingRole] = useState('')
  const [addingRole, setAddingRole] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [codeId, setCodeId] = useState<string | null>(null)

  // Prefs
  const [theme, setThemeState] = useState<Theme>('dark')
  const [langSearch, setLangSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setThemeState((localStorage.getItem('wfa_theme') as Theme) || 'dark')
      if ('Notification' in window) setNotifPermission(Notification.permission)
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setProfile({
          full_name: p.full_name || '', phone: p.phone || '', address: p.address || '',
          notification_email: p.notification_email || '', notification_phone: p.notification_phone || '',
          notify_browser: p.notify_browser || false, dependents: p.dependents || [], pets: p.pets || [],
          special_notes: p.special_notes || '', emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_phone: p.emergency_contact_phone || '',
          language_preference: p.language_preference || 'en',
          communication_needs: p.communication_needs || [], household_languages: p.household_languages || '',
        })
        const roles: string[] = Array.isArray(p.roles) && p.roles.length ? p.roles : p.role ? [p.role] : ['caregiver']
        setMyRoles(roles)
        setActiveRole(p.role || 'caregiver')
      }
      setLoading(false)
    }
    load()
  }, [])

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile(p => ({ ...p, [key]: value })); setSaved(false)
  }
  function updateDep(i: number, key: keyof Dependent, val: string) {
    setProfile(p => { const d = [...p.dependents]; d[i] = { ...d[i], [key]: val }; return { ...p, dependents: d } }); setSaved(false)
  }
  function updatePet(i: number, key: keyof Pet, val: string) {
    setProfile(p => { const pets = [...p.pets]; pets[i] = { ...pets[i], [key]: val }; return { ...p, pets } }); setSaved(false)
  }
  function toggleNeed(need: string) {
    setProfile(p => ({
      ...p, communication_needs: p.communication_needs.includes(need)
        ? p.communication_needs.filter(n => n !== need) : [...p.communication_needs, need]
    })); setSaved(false)
  }

  async function save() {
    setSaving(true); setSaveError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Not signed in'); setSaving(false); return }
    const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile })
    if (error) setSaveError(error.message); else setSaved(true)
    setSaving(false)
  }

  async function requestBrowserNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') update('notify_browser', true)
  }

  function applyTheme(t: Theme) {
    setThemeState(t); localStorage.setItem('wfa_theme', t)
    document.documentElement.classList.toggle('light', t === 'light')
  }

  async function switchActive(role: string) {
    setSavingRole(role)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ role }).eq('id', user.id)
      // Full navigation so layout re-renders with new role
      router.push(ROLE_DESTINATIONS[role] ?? '/dashboard')
    }
    setSavingRole('')
  }

  async function verifyCode() {
    if (!addingRole || !code.trim()) return
    setCodeLoading(true); setCodeError('')
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch('/api/invite/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), email, role: addingRole }),
    })
    const data = await res.json()
    if (!res.ok || !data.valid) {
      setCodeError(data.error || 'Invalid code.')
    } else if (data.role !== addingRole) {
      setCodeError(`This code is for ${data.role.replace('_', ' ')}, not ${addingRole.replace('_', ' ')}.`)
    } else {
      setCodeVerified(true); setOrgName(data.org_name); setCodeId(data.code_id)
    }
    setCodeLoading(false)
  }

  async function claimRole() {
    if (!addingRole || !codeVerified) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updatedRoles = [...new Set([...myRoles, addingRole])]
    await supabase.from('profiles').update({ roles: updatedRoles, role: addingRole }).eq('id', user.id)
    if (codeId) await fetch('/api/invite/consume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_id: codeId }) })
    router.push(ROLE_DESTINATIONS[addingRole] ?? '/dashboard')
  }

  function resetCode() { setAddingRole(null); setCode(''); setCodeVerified(false); setCodeError(''); setOrgName(null); setCodeId(null) }

  const otherRoles = ALL_ROLES.filter(r => !myRoles.includes(r))
  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Emergency Profile' },
    { id: 'account', label: 'Account & Roles' },
    { id: 'preferences', label: 'Preferences' },
  ]

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-ash-400" />
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ash-900 rounded-xl p-1 border border-ash-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-ash-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="space-y-5">
          <Section icon={User} title="Your Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name"><FInput value={profile.full_name} onChange={v => update('full_name', v)} placeholder="Jane Smith" /></Field>
              <Field label="Phone number"><FInput value={profile.phone} onChange={v => update('phone', v)} placeholder="+1 (555) 000-0000" type="tel" /></Field>
              <Field label="Home address" hint="Used to assess your proximity to active fires">
                <FInput value={profile.address} onChange={v => update('address', v)} placeholder="123 Main St, City, CA" />
              </Field>
            </div>
          </Section>

          <Section icon={Heart} title="People in Your Care">
            <p className="text-ash-500 text-xs mb-4">Helps emergency responders prioritize and provide appropriate support.</p>
            <div className="space-y-3">
              {profile.dependents.map((dep, i) => (
                <div key={i} className="bg-ash-800/60 rounded-xl p-4 border border-ash-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-ash-300 text-xs font-medium">Person {i + 1}</span>
                    <button onClick={() => setProfile(p => ({ ...p, dependents: p.dependents.filter((_, idx) => idx !== i) }))} className="text-ash-600 hover:text-signal-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Name"><FInput value={dep.name} onChange={v => updateDep(i, 'name', v)} placeholder="Name" /></Field>
                    <Field label="Relationship"><FInput value={dep.relationship} onChange={v => updateDep(i, 'relationship', v)} placeholder="e.g. Mother, Child" /></Field>
                    <Field label="Mobility / accessibility needs"><FInput value={dep.mobility_needs} onChange={v => updateDep(i, 'mobility_needs', v)} placeholder="e.g. wheelchair, oxygen" /></Field>
                    <Field label="Medications"><FInput value={dep.medications} onChange={v => updateDep(i, 'medications', v)} placeholder="e.g. insulin (refrigerated)" /></Field>
                    <Field label="Other needs"><FTextarea value={dep.other_needs} onChange={v => updateDep(i, 'other_needs', v)} placeholder="e.g. non-verbal, hearing impaired" /></Field>
                  </div>
                </div>
              ))}
              <button onClick={() => setProfile(p => ({ ...p, dependents: [...p.dependents, { ...EMPTY_DEP }] }))}
                className="flex items-center gap-2 text-sm text-ash-400 hover:text-white border border-dashed border-ash-700 hover:border-ash-500 rounded-xl px-4 py-3 w-full justify-center transition-colors">
                <Plus className="w-4 h-4" /> Add person in your care
              </button>
            </div>
          </Section>

          <Section icon={PawPrint} title="Pets">
            <div className="space-y-3">
              {profile.pets.map((pet, i) => (
                <div key={i} className="bg-ash-800/60 rounded-xl p-4 border border-ash-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-ash-300 text-xs font-medium">Pet {i + 1}</span>
                    <button onClick={() => setProfile(p => ({ ...p, pets: p.pets.filter((_, idx) => idx !== i) }))} className="text-ash-600 hover:text-signal-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field label="Name"><FInput value={pet.name} onChange={v => updatePet(i, 'name', v)} placeholder="Buddy" /></Field>
                    <Field label="Type"><FInput value={pet.type} onChange={v => updatePet(i, 'type', v)} placeholder="Dog, Cat…" /></Field>
                    <Field label="Notes"><FInput value={pet.notes} onChange={v => updatePet(i, 'notes', v)} placeholder="e.g. needs carrier" /></Field>
                  </div>
                </div>
              ))}
              <button onClick={() => setProfile(p => ({ ...p, pets: [...p.pets, { ...EMPTY_PET }] }))}
                className="flex items-center gap-2 text-sm text-ash-400 hover:text-white border border-dashed border-ash-700 hover:border-ash-500 rounded-xl px-4 py-3 w-full justify-center transition-colors">
                <Plus className="w-4 h-4" /> Add a pet
              </button>
            </div>
          </Section>

          <Section icon={ShieldAlert} title="For Emergency Responders">
            <div className="mb-5">
              <label className="block text-ash-300 text-xs font-medium mb-1">Communication needs</label>
              <p className="text-ash-600 text-xs mb-3">Helps responders communicate effectively at your door and at shelters.</p>
              <div className="flex flex-wrap gap-2">
                {['Non-verbal household member','Deaf / Hard of hearing','Uses sign language (ASL)','Blind / Low vision','Spanish-speaking only','Limited English proficiency','Mixed-language household','Uses AAC device','Cognitive disability','Autism spectrum — sensory sensitivities','Dementia / memory impairment','Prefers written communication'].map(need => {
                  const active = profile.communication_needs.includes(need)
                  return (
                    <button key={need} type="button" onClick={() => toggleNeed(need)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? 'bg-ember-500/20 border-ember-500/50 text-ember-300' : 'bg-ash-800 border-ash-700 text-ash-400 hover:border-ash-500 hover:text-ash-200'}`}>
                      {active ? '✓ ' : ''}{need}
                    </button>
                  )
                })}
              </div>
            </div>
            <Field label="Languages spoken in this household" hint="e.g. 'Spanish and English', 'Cantonese only'">
              <FInput value={profile.household_languages} onChange={v => update('household_languages', v)} placeholder="e.g. Spanish only, no English" />
            </Field>
            <div className="border-t border-ash-800 my-4" />
            <Field label="Additional notes for first responders" hint="e.g. front door code, oxygen on 2nd floor, dog may be scared">
              <FTextarea value={profile.special_notes} onChange={v => update('special_notes', v)} placeholder="Any information that could help emergency personnel…" rows={3} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Emergency contact name"><FInput value={profile.emergency_contact_name} onChange={v => update('emergency_contact_name', v)} placeholder="Contact name" /></Field>
              <Field label="Emergency contact phone"><FInput value={profile.emergency_contact_phone} onChange={v => update('emergency_contact_phone', v)} placeholder="+1 (555) 000-0000" type="tel" /></Field>
            </div>
          </Section>

          <Section icon={Bell} title="Fire Alerts">
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${notifPermission === 'granted' ? 'border-signal-safe/30 bg-signal-safe/5' : 'border-ash-700 bg-ash-800/40'}`}>
                <div className="mt-0.5">{notifPermission === 'granted' ? <Bell className="w-4 h-4 text-signal-safe" /> : <BellOff className="w-4 h-4 text-ash-500" />}</div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">Browser notifications</div>
                  <div className="text-ash-400 text-xs mt-0.5">
                    {notifPermission === 'granted' ? "Enabled — you'll receive alerts when nearby fires change status." : notifPermission === 'denied' ? 'Blocked in browser settings.' : 'Get notified when fires near you change status.'}
                  </div>
                </div>
                {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                  <button onClick={requestBrowserNotifications} className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors">Enable</button>
                )}
              </div>
              <Field label="Email for fire alerts" hint="Alerts when fires near your address change containment status.">
                <FInput value={profile.notification_email} onChange={v => update('notification_email', v)} placeholder="your@email.com" type="email" />
              </Field>
              <Field label="Phone for SMS alerts">
                <FInput value={profile.notification_phone} onChange={v => update('notification_phone', v)} placeholder="+1 (555) 000-0000" type="tel" />
              </Field>
            </div>
          </Section>

          <div className="flex items-center gap-4 pb-8">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save profile'}
            </button>
            {saved && <div className="flex items-center gap-2 text-signal-safe text-sm"><CheckCircle className="w-4 h-4" /> Saved</div>}
            {saveError && <div className="text-signal-danger text-sm">{saveError}</div>}
          </div>
        </div>
      )}

      {/* ── ACCOUNT & ROLES TAB ── */}
      {tab === 'account' && (
        <div className="space-y-5">
          <section className="card p-6">
            <div className="flex items-center gap-2 mb-4"><User className="w-4 h-4 text-ember-400" /><h2 className="font-semibold text-white">Account</h2></div>
            <div className="space-y-3">
              <div className="py-2 border-b border-ash-800">
                <div className="text-sm text-ash-300 font-medium">{profile.full_name || '—'}</div>
                <div className="text-xs text-ash-500">{email}</div>
              </div>
              <button onClick={() => setTab('profile')} className="flex items-center gap-2 text-ash-400 hover:text-white transition-colors text-sm py-1">
                <User className="w-4 h-4" /> Edit emergency profile
              </button>
              <button className="flex items-center gap-2 text-ash-400 hover:text-white transition-colors text-sm py-1">
                <Key className="w-4 h-4" /> Change password (email login only)
              </button>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-ember-400" /><h2 className="font-semibold text-white">Roles & dashboards</h2></div>
            <p className="text-ash-500 text-sm mb-4">Switch your active dashboard or add a new role with an access code.</p>
            <div className="space-y-2 mb-4">
              {myRoles.filter(r => ROLE_CONFIG[r]).map(role => {
                const cfg = ROLE_CONFIG[role]; const Icon = cfg.icon; const isActive = role === activeRole
                return (
                  <div key={role} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? cfg.activeBorder : 'border-ash-800 bg-ash-900'}`}>
                    <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
                      {isActive && <div className="text-ash-500 text-xs">Active dashboard</div>}
                    </div>
                    {isActive ? (
                      <span className="text-xs text-ash-500 px-2 py-1 rounded-lg bg-ash-800 border border-ash-700">Current</span>
                    ) : (
                      <button onClick={() => switchActive(role)} disabled={savingRole === role}
                        className="text-xs px-3 py-1.5 rounded-lg bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors disabled:opacity-40">
                        {savingRole === role ? '…' : 'Switch to this'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {otherRoles.length > 0 && !addingRole && (
              <div className="space-y-2">
                <p className="text-ash-600 text-xs font-medium uppercase tracking-wider mb-2">Request access</p>
                {otherRoles.filter(r => ROLE_CONFIG[r]).map(role => {
                  const cfg = ROLE_CONFIG[role]; const Icon = cfg.icon
                  return (
                    <button key={role} onClick={() => { setAddingRole(role); setCode(''); setCodeVerified(false); setCodeError('') }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-ash-800 bg-ash-900 hover:bg-ash-800 hover:border-ash-700 transition-all text-left">
                      <Icon className={`w-4 h-4 ${cfg.color} opacity-60 shrink-0`} />
                      <div className="flex-1"><div className="text-ash-300 text-sm font-medium">{cfg.label}</div>
                        <div className="flex items-center gap-1 mt-0.5"><Lock className="w-3 h-3 text-ash-600" /><span className="text-ash-600 text-xs">Requires access code</span></div>
                      </div>
                      <Plus className="w-4 h-4 text-ash-600 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {addingRole && ROLE_CONFIG[addingRole] && (
              <div className="border border-ash-700 rounded-xl p-4 bg-ash-900/50 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = ROLE_CONFIG[addingRole].icon; return <Icon className={`w-4 h-4 ${ROLE_CONFIG[addingRole].color}`} /> })()}
                    <span className={`text-sm font-semibold ${ROLE_CONFIG[addingRole].color}`}>{ROLE_CONFIG[addingRole].label}</span>
                  </div>
                  <button onClick={resetCode} className="text-ash-600 hover:text-ash-400 text-xs">Cancel</button>
                </div>
                {!codeVerified ? (
                  <>
                    <label className="block text-ash-400 text-xs mb-1.5">Access code</label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" className="input flex-1 font-mono uppercase tracking-wider text-sm"
                        placeholder={addingRole === 'data_analyst' ? 'DA-XXXX-XXXX' : 'ER-ORG-XXXX'}
                        value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                        onKeyDown={e => e.key === 'Enter' && verifyCode()} />
                      <button onClick={verifyCode} disabled={!code.trim() || codeLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors disabled:opacity-40 shrink-0">
                        {codeLoading ? <div className="w-4 h-4 border border-ember-400/40 border-t-ember-400 rounded-full animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                    {codeError && <p className="text-signal-danger text-xs">{codeError}</p>}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-signal-safe/10 border border-signal-safe/30 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-signal-safe shrink-0" />
                      <span className="text-signal-safe text-sm font-medium">{orgName ? `${orgName} — verified` : 'Access code verified'}</span>
                    </div>
                    <button onClick={claimRole} className="btn-primary w-full flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" /> Add {ROLE_CONFIG[addingRole].label} to my account
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="card p-6 border-signal-danger/20">
            <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-signal-danger" /><h2 className="font-semibold text-signal-danger">Danger zone</h2></div>
            <div className="space-y-3">
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-ash-800 bg-ash-900 hover:bg-ash-800 transition-all text-left">
                <LogOut className="w-4 h-4 text-ash-400 shrink-0" />
                <div><div className="text-sm text-ash-300 font-medium">Sign out</div><div className="text-xs text-ash-600">Sign out of your account on this device</div></div>
              </button>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-signal-danger/20 bg-signal-danger/5 hover:bg-signal-danger/10 transition-all text-left">
                  <Trash2 className="w-4 h-4 text-signal-danger shrink-0" />
                  <div><div className="text-sm text-signal-danger font-medium">Delete account</div><div className="text-xs text-ash-600">Permanently delete your account and all data</div></div>
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-signal-danger/40 bg-signal-danger/10">
                  <p className="text-signal-danger text-sm font-medium mb-3">Are you sure? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/?deleted=true') }} className="px-4 py-2 rounded-lg bg-signal-danger text-white text-sm font-medium hover:bg-red-600 transition-colors">Yes, delete</button>
                    <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 rounded-lg bg-ash-800 text-ash-300 text-sm font-medium hover:bg-ash-700 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── PREFERENCES TAB ── */}
      {tab === 'preferences' && (
        <div className="space-y-5">
          <section className="card p-6">
            <div className="flex items-center gap-2 mb-4"><Moon className="w-4 h-4 text-ember-400" /><h2 className="font-semibold text-white">Appearance</h2></div>
            <div className="grid grid-cols-3 gap-2">
              {([['dark','Dark',Moon],['light','Light',Sun],['system','System',Monitor]] as const).map(([value, label, Icon]) => (
                <button key={value} onClick={() => applyTheme(value as Theme)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === value ? 'border-ember-500 bg-ember-500/10 text-ember-400' : 'border-ash-700 text-ash-400 hover:border-ash-600 hover:text-ash-300'}`}>
                  <Icon className="w-5 h-5" /><span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-ember-400" /><h2 className="font-semibold text-white">Language</h2></div>
            <p className="text-ash-500 text-sm mb-4">The app will be translated to your selected language.</p>
            <input type="text" value={langSearch} onChange={e => setLangSearch(e.target.value)} placeholder="Search language…" className="input w-full mb-3 text-sm" />
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {LANGUAGES.filter(l => !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.native.toLowerCase().includes(langSearch.toLowerCase())).map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${l.code === lang.code ? 'bg-ember-500/20 border border-ember-500/40 text-ember-300' : 'text-ash-300 hover:bg-ash-800 border border-transparent'}`}>
                  <span className="text-base shrink-0">{l.flag}</span>
                  <div className="min-w-0"><div className="truncate text-xs font-medium">{l.native}</div>{l.code !== 'en' && <div className="truncate text-ash-600 text-xs">{l.name}</div>}</div>
                  {l.code === lang.code && <Check className="w-3 h-3 ml-auto shrink-0 text-ember-400" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
