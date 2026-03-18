'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Shield, Heart, BarChart3, Lock, Check, ShieldCheck, Globe,
  Settings, Plus, User, Bell, BellOff, Moon, Sun, Monitor, LogOut,
  Trash2, Key, AlertTriangle, Save, CheckCircle, PawPrint, ShieldAlert,
  Activity, Radio
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
function SettingsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { lang, setLanguage } = useLanguage()

  const isOnboarding = searchParams.get('onboarding') === 'true'
  const roleParam = searchParams.get('role') || 'caregiver'
  const dashDest = roleParam === 'emergency_responder' ? '/dashboard/responder' : roleParam === 'data_analyst' ? '/dashboard/analyst' : '/dashboard/caregiver'

  const [tab, setTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<ProfileData>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null)
  const [email, setEmail] = useState('')

  // Roles — localStorage takes priority so Settings knows which dashboard context opened it
  const [myRoles, setMyRoles] = useState<string[]>([])
  const [activeRole, setActiveRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return searchParams.get('role') || localStorage.getItem('wfa_active_role') || ''
    }
    return searchParams.get('role') || ''
  })
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

  // Analyst-specific prefs (localStorage only — no DB needed)
  const [analystSviThreshold, setAnalystSviThreshold] = useState(0.7)
  const [analystDelayThreshold, setAnalystDelayThreshold] = useState(12)
  const [analystExportFormat, setAnalystExportFormat] = useState<'csv' | 'json'>('csv')
  const [analystDefaultRegion, setAnalystDefaultRegion] = useState('all')
  const [analystPrefsLoaded, setAnalystPrefsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setThemeState((localStorage.getItem('wfa_theme') as Theme) || 'dark')
      if ('Notification' in window) setNotifPermission(Notification.permission)
      // Load analyst prefs
      try {
        const ap = JSON.parse(localStorage.getItem('wfa_analyst_prefs') || '{}')
        if (ap.sviThreshold != null) setAnalystSviThreshold(ap.sviThreshold)
        if (ap.delayThreshold != null) setAnalystDelayThreshold(ap.delayThreshold)
        if (ap.exportFormat) setAnalystExportFormat(ap.exportFormat)
        if (ap.defaultRegion) setAnalystDefaultRegion(ap.defaultRegion)
      } catch {}
      setAnalystPrefsLoaded(true)
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
        const dbRoles: string[] = Array.isArray(p.roles) && p.roles.length ? p.roles : p.role ? [p.role] : ['caregiver']
        // Merge with localStorage so claimed roles show as unlocked even if DB hasn't persisted them
        const localRole = localStorage.getItem('wfa_active_role')
        const localClaimedRaw = localStorage.getItem('wfa_claimed_roles')
        const localClaimed: string[] = localClaimedRaw ? JSON.parse(localClaimedRaw) : []
        if (localRole && localRole !== 'caregiver') localClaimed.push(localRole)
        const roles = [...new Set([...dbRoles, ...localClaimed])]
        setMyRoles(roles)
        // Only use DB role if nothing better is available
        if (!searchParams.get('role') && !localStorage.getItem('wfa_active_role')) {
          setActiveRole(p.role || 'caregiver')
        }
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
    if (error) {
      if (error.message.includes('column') || error.message.includes('schema cache') || error.message.includes('address') || error.message.includes('phone')) {
        setSaveError('Database needs updating. Run the migration in supabase/migrations/20260316_ensure_profile_columns.sql in your Supabase SQL editor, then try again.')
      } else {
        setSaveError(error.message)
      }
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  async function requestBrowserNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') update('notify_browser', true)
  }

  function applyTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('wfa_theme', t)
    window.dispatchEvent(new CustomEvent('wfa-theme-change', { detail: t }))
  }

  async function switchActive(role: string) {
    setSavingRole(role)
    localStorage.setItem('wfa_active_role', role)
    try {
      const prev: string[] = JSON.parse(localStorage.getItem('wfa_claimed_roles') || '[]')
      localStorage.setItem('wfa_claimed_roles', JSON.stringify([...new Set([...prev, role])]))
    } catch {}
    await fetch('/api/profile/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    window.location.href = ROLE_DESTINATIONS[role] ?? '/dashboard'
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
    // Persist active role and claimed roles list to localStorage so the
    // role shows as unlocked on next visit even if the Supabase update fails
    localStorage.setItem('wfa_active_role', addingRole)
    try {
      const prev: string[] = JSON.parse(localStorage.getItem('wfa_claimed_roles') || '[]')
      localStorage.setItem('wfa_claimed_roles', JSON.stringify([...new Set([...prev, addingRole])]))
    } catch {}
    setMyRoles(prev => [...new Set([...prev, addingRole])])
    await fetch('/api/profile/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: addingRole }),
    })
    if (codeId) await fetch('/api/invite/consume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code_id: codeId }) })
    window.location.href = ROLE_DESTINATIONS[addingRole] ?? '/dashboard'
  }

  function resetCode() { setAddingRole(null); setCode(''); setCodeVerified(false); setCodeError(''); setOrgName(null); setCodeId(null) }

  const otherRoles = ALL_ROLES.filter(r => !myRoles.includes(r))
  const profileTabLabel = activeRole === 'data_analyst' ? 'Analyst Profile'
    : activeRole === 'emergency_responder' ? 'Responder Profile'
    : 'Emergency Profile'
  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: profileTabLabel },
    { id: 'account', label: 'Account & Roles' },
    { id: 'preferences', label: 'Preferences' },
  ]

  function saveAnalystPrefs() {
    if (typeof window === 'undefined') return
    localStorage.setItem('wfa_analyst_prefs', JSON.stringify({
      sviThreshold: analystSviThreshold,
      delayThreshold: analystDelayThreshold,
      exportFormat: analystExportFormat,
      defaultRegion: analystDefaultRegion,
    }))
    setSaved(true)
  }

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

      {isOnboarding && (
        <div className="bg-ember-500/10 border border-ember-500/30 rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-ember-400 font-semibold text-sm mb-1">Welcome to WildfireAlert</div>
            <p className="text-ash-300 text-sm">Fill out your emergency profile so we can personalize alerts for your location, household, and needs. You can always update this later.</p>
          </div>
          <button
            onClick={() => router.push(dashDest)}
            className="shrink-0 px-3 py-2 bg-ash-800 border border-ash-700 rounded-lg text-ash-400 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            Skip — I'm in an emergency
          </button>
        </div>
      )}

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
      {tab === 'profile' && activeRole === 'emergency_responder' && (
        <div className="space-y-5">
          <Section icon={Shield} title="Responder Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name"><FInput value={profile.full_name} onChange={v => update('full_name', v)} placeholder="Chad Stephenson" /></Field>
              <Field label="Badge / ID number"><FInput value={profile.phone} onChange={v => update('phone', v)} placeholder="e.g. 4821" /></Field>
              <Field label="Station / Agency" hint="Your primary station assignment">
                <FInput value={profile.address} onChange={v => update('address', v)} placeholder="e.g. Clayton Station #1, Johnston County Sheriff" />
              </Field>
              <Field label="Rank / Title"><FInput value={profile.notification_email} onChange={v => update('notification_email', v)} placeholder="e.g. Deputy Sheriff, Lt., FF/EMT" /></Field>
              <Field label="Shift assignment"><FInput value={profile.notification_phone} onChange={v => update('notification_phone', v)} placeholder="e.g. A-Shift, Day shift" /></Field>
              <Field label="Primary specialization"><FInput value={profile.household_languages} onChange={v => update('household_languages', v)} placeholder="e.g. Driver/Pump, EMS, Search & Rescue" /></Field>
            </div>
          </Section>

          <Section icon={Radio} title="Deployment & Mutual Aid">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Field label="Emergency contact (next of kin)" hint="Contacted if you are deployed or incapacitated">
                <FInput value={profile.emergency_contact_name} onChange={v => update('emergency_contact_name', v)} placeholder="Contact name" />
              </Field>
              <Field label="Emergency contact phone">
                <FInput value={profile.emergency_contact_phone} onChange={v => update('emergency_contact_phone', v)} placeholder="+1 (555) 000-0000" type="tel" />
              </Field>
            </div>
            <Field label="FEMA deployment availability" hint="Are you available for state/federal deployment (e.g. Hurricane Helene roster)?">
              <div className="flex flex-wrap gap-2 mt-1">
                {['Available for deployment','On-call only','Not available','Available 72hr notice'].map(opt => {
                  const active = profile.communication_needs.includes(opt)
                  return (
                    <button key={opt} type="button" onClick={() => toggleNeed(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? 'bg-ember-500/20 border-ember-500/50 text-ember-300' : 'bg-ash-800 border-ash-700 text-ash-400 hover:border-ash-500 hover:text-ash-200'}`}>
                      {active ? '✓ ' : ''}{opt}
                    </button>
                  )
                })}
              </div>
            </Field>
            <div className="mt-4">
              <Field label="Mutual aid organizations / agreements" hint="e.g. NC Forestry mutual aid, District 5 agreements">
                <FTextarea value={profile.special_notes} onChange={v => update('special_notes', v)} placeholder="List mutual aid agencies and agreements your station participates in…" rows={2} />
              </Field>
            </div>
          </Section>

          <Section icon={Activity} title="Certifications & Training">
            <Field label="Active certifications" hint="e.g. Firefighter I/II, EMT-Basic, HazMat Ops, Wildland S-130/S-190">
              <FTextarea value={profile.household_languages} onChange={v => update('household_languages', v)} placeholder="List your active certifications and training…" rows={2} />
            </Field>
          </Section>

          <Section icon={Bell} title="Incident Alerts">
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${notifPermission === 'granted' ? 'border-signal-safe/30 bg-signal-safe/5' : 'border-ash-700 bg-ash-800/40'}`}>
                <div className="mt-0.5">{notifPermission === 'granted' ? <Bell className="w-4 h-4 text-signal-safe" /> : <BellOff className="w-4 h-4 text-ash-500" />}</div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">Incident notifications</div>
                  <div className="text-ash-400 text-xs mt-0.5">
                    {notifPermission === 'granted' ? "Enabled — you'll be notified of new incidents and escalations." : 'Get notified when new incidents are reported or status escalates.'}
                  </div>
                </div>
                {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                  <button onClick={requestBrowserNotifications} className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors">Enable</button>
                )}
              </div>
              <Field label="Notification email">
                <FInput value={profile.notification_email} onChange={v => update('notification_email', v)} placeholder="your@agency.gov" type="email" />
              </Field>
            </div>
          </Section>

          <div className="flex items-center gap-4 pb-8">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save profile'}
            </button>
            {saved && <div className="flex items-center gap-2 text-signal-safe text-sm"><CheckCircle className="w-4 h-4" /> Saved</div>}
            {saveError && <div className="text-signal-danger text-sm">{saveError}</div>}
          </div>
        </div>
      )}

      {/* ── ANALYST PROFILE TAB ── */}
      {tab === 'profile' && activeRole === 'data_analyst' && (
        <div className="space-y-5">
          <Section icon={BarChart3} title="Researcher Identity">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name"><FInput value={profile.full_name} onChange={v => update('full_name', v)} placeholder="Dr. Jane Smith" /></Field>
              <Field label="Institution / Organization"><FInput value={profile.phone} onChange={v => update('phone', v)} placeholder="e.g. Stanford University, USGS" /></Field>
              <Field label="Role / Title" hint="e.g. Research Scientist, Data Engineer, Policy Analyst">
                <FInput value={profile.address} onChange={v => update('address', v)} placeholder="Your research role" />
              </Field>
              <Field label="ORCID or professional ID (optional)">
                <FInput value={profile.household_languages} onChange={v => update('household_languages', v)} placeholder="e.g. 0000-0002-1825-0097" />
              </Field>
              <Field label="Analysis notification email" hint="Receive alerts when new WiDS data is released or anomalies are detected">
                <FInput value={profile.notification_email} onChange={v => update('notification_email', v)} placeholder="analyst@org.edu" type="email" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Research focus / notes" hint="e.g. SVI-evacuation equity in tribal lands, WUI fire prediction modeling">
                <FTextarea value={profile.special_notes} onChange={v => update('special_notes', v)} placeholder="Describe your research focus or any notes about how you use this platform…" rows={3} />
              </Field>
            </div>
          </Section>

          <Section icon={Activity} title="Dashboard Defaults">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-ash-300 text-xs font-medium mb-1">Default region / state filter</label>
                <select
                  value={analystDefaultRegion}
                  onChange={e => setAnalystDefaultRegion(e.target.value)}
                  className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60"
                >
                  <option value="all">All states (no filter)</option>
                  {['CA','TX','AZ','NM','OR','WA','MT','CO','ID','NV','UT','WY','OK','FL','AK'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-ash-300 text-xs font-medium mb-1">Preferred export format</label>
                <div className="flex gap-2">
                  {(['csv', 'json'] as const).map(fmt => (
                    <button key={fmt} type="button" onClick={() => setAnalystExportFormat(fmt)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${analystExportFormat === fmt ? 'bg-ember-500/20 border-ember-500/50 text-ember-300' : 'bg-ash-800 border-ash-700 text-ash-400 hover:border-ash-500 hover:text-ash-200'}`}>
                      .{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-ash-300 text-xs font-medium">SVI vulnerability threshold</label>
                  <span className="text-white font-mono text-xs">{analystSviThreshold.toFixed(2)}</span>
                </div>
                <input type="range" min={0.4} max={0.95} step={0.05} value={analystSviThreshold}
                  onChange={e => setAnalystSviThreshold(Number(e.target.value))}
                  className="w-full accent-ember-500" />
                <div className="flex justify-between text-ash-600 text-xs mt-1">
                  <span>0.40 — Low risk flag</span><span>0.95 — High risk only</span>
                </div>
                <p className="text-ash-600 text-xs mt-1">Counties above this SVI score are flagged as high-vulnerability in your reports.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-ash-300 text-xs font-medium">Critical delay threshold</label>
                  <span className="text-white font-mono text-xs">{analystDelayThreshold}h</span>
                </div>
                <input type="range" min={2} max={48} step={1} value={analystDelayThreshold}
                  onChange={e => setAnalystDelayThreshold(Number(e.target.value))}
                  className="w-full accent-ember-500" />
                <div className="flex justify-between text-ash-600 text-xs mt-1">
                  <span>2h</span><span>48h</span>
                </div>
                <p className="text-ash-600 text-xs mt-1">Delays above this threshold are colored red in charts and flagged in the signal gap analysis.</p>
              </div>
            </div>
          </Section>

          <Section icon={Bell} title="Data Alerts">
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${notifPermission === 'granted' ? 'border-signal-safe/30 bg-signal-safe/5' : 'border-ash-700 bg-ash-800/40'}`}>
              <div className="mt-0.5">{notifPermission === 'granted' ? <Bell className="w-4 h-4 text-signal-safe" /> : <BellOff className="w-4 h-4 text-ash-500" />}</div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Dataset update notifications</div>
                <div className="text-ash-400 text-xs mt-0.5">
                  {notifPermission === 'granted' ? 'Enabled — you\'ll be notified when new WiDS incident data is available.' : 'Get notified when new fire incident data is loaded or model anomalies are detected.'}
                </div>
              </div>
              {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                <button onClick={requestBrowserNotifications} className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors">Enable</button>
              )}
            </div>
          </Section>

          <div className="flex items-center gap-4 pb-8">
            <button onClick={async () => { await save(); saveAnalystPrefs() }} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save analyst profile'}
            </button>
            {saved && <div className="flex items-center gap-2 text-signal-safe text-sm"><CheckCircle className="w-4 h-4" /> Saved</div>}
            {saveError && <div className="text-signal-danger text-sm">{saveError}</div>}
          </div>
        </div>
      )}

      {tab === 'profile' && activeRole !== 'emergency_responder' && activeRole !== 'data_analyst' && (
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
            <div className="mb-4 p-3 rounded-lg bg-signal-safe/10 border border-signal-safe/30 flex items-start gap-3">
              <span className="text-signal-safe mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium">Real-time tracking available</p>
                <p className="text-xs text-ash-400 mt-0.5">
                  During an active emergency, use{' '}
                  <a href="/dashboard/caregiver/persons" className="text-ember-400 hover:underline">My Persons</a>
                  {' '}to ping your dependents and confirm they're safe in real time.
                </p>
              </div>
            </div>
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
              className="flex items-center gap-2 px-6 py-3 bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
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
            <div className="flex items-center gap-2 mb-1"><Moon className="w-4 h-4 text-ash-400" /><h2 className="font-semibold text-white">Appearance</h2></div>
            <p className="text-ash-400 text-sm mb-4">Choose how the app looks on your device.</p>
            <div className="flex gap-2">
              {([
                { value: 'light', label: 'Light', Icon: Sun },
                { value: 'dark', label: 'Dark', Icon: Moon },
                { value: 'system', label: 'System', Icon: Monitor },
              ] as { value: Theme; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => applyTheme(value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === value
                      ? 'bg-forest-900/40 border-forest-600/50 text-forest-400'
                      : 'border-ash-700 text-ash-400 hover:border-ash-600 hover:bg-ash-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-signal-safe" /><h2 className="font-semibold text-white">Language</h2></div>
            <p className="text-ash-400 text-sm mb-4">The app will be translated to your selected language.</p>
            <input type="text" value={langSearch} onChange={e => setLangSearch(e.target.value)} placeholder="Search language…" className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 mb-3" />
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {LANGUAGES.filter(l => !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.native.toLowerCase().includes(langSearch.toLowerCase())).map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${l.code === lang.code ? 'bg-forest-900/40 border border-forest-600/50 text-forest-400' : 'text-ash-300 hover:bg-ash-800 border border-transparent'}`}>
                  <span className="text-base shrink-0">{l.flag}</span>
                  <div className="min-w-0"><div className="truncate text-xs font-medium">{l.native}</div>{l.code !== 'en' && <div className="truncate text-ash-500 text-xs">{l.name}</div>}</div>
                  {l.code === lang.code && <Check className="w-3 h-3 ml-auto shrink-0 text-forest-400" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {isOnboarding && (
        <div className="mt-8 pt-6 border-t border-ash-800">
          <button
            onClick={() => router.push(dashDest)}
            className="w-full py-3 rounded-xl bg-forest-600 hover:bg-forest-700 text-white font-semibold transition-colors"
          >
            Continue to Dashboard →
          </button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return <Suspense><SettingsInner /></Suspense>
}
