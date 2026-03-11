'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  User, Home, Phone, Mail, Bell, BellOff, Plus, Trash2,
  Heart, PawPrint, AlertTriangle, CheckCircle, Save, ShieldAlert
} from 'lucide-react'

interface Dependent {
  name: string
  relationship: string
  mobility_needs: string
  medications: string
  other_needs: string
}

interface Pet {
  name: string
  type: string
  notes: string
}

interface ProfileData {
  full_name: string
  phone: string
  address: string
  notification_email: string
  notification_phone: string
  notify_browser: boolean
  dependents: Dependent[]
  pets: Pet[]
  special_notes: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

const EMPTY_DEP: Dependent = { name: '', relationship: '', mobility_needs: '', medications: '', other_needs: '' }
const EMPTY_PET: Pet = { name: '', type: '', notes: '' }

const DEFAULT: ProfileData = {
  full_name: '',
  phone: '',
  address: '',
  notification_email: '',
  notification_phone: '',
  notify_browser: false,
  dependents: [],
  pets: [],
  special_notes: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

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

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600"
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 resize-none"
    />
  )
}

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileData>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
          notification_email: data.notification_email || '',
          notification_phone: data.notification_phone || '',
          notify_browser: data.notify_browser || false,
          dependents: data.dependents || [],
          pets: data.pets || [],
          special_notes: data.special_notes || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function requestBrowserNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') {
      setProfile(p => ({ ...p, notify_browser: true }))
    }
  }

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile(p => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function updateDep(i: number, key: keyof Dependent, val: string) {
    setProfile(p => {
      const deps = [...p.dependents]
      deps[i] = { ...deps[i], [key]: val }
      return { ...p, dependents: deps }
    })
    setSaved(false)
  }

  function addDep() { setProfile(p => ({ ...p, dependents: [...p.dependents, { ...EMPTY_DEP }] })) }
  function removeDep(i: number) {
    setProfile(p => ({ ...p, dependents: p.dependents.filter((_, idx) => idx !== i) }))
  }

  function updatePet(i: number, key: keyof Pet, val: string) {
    setProfile(p => {
      const pets = [...p.pets]
      pets[i] = { ...pets[i], [key]: val }
      return { ...p, pets }
    })
    setSaved(false)
  }

  function addPet() { setProfile(p => ({ ...p, pets: [...p.pets, { ...EMPTY_PET }] })) }
  function removePet(i: number) {
    setProfile(p => ({ ...p, pets: p.pets.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setSaving(false); return }
    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      ...profile,
    })
    if (err) setError(err.message)
    else setSaved(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <User className="w-4 h-4" />
          CAREGIVER · MY PROFILE
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Emergency Profile</h1>
        <p className="text-ash-400 text-sm">
          This information helps emergency personnel assist you and your household during an evacuation.
        </p>
      </div>

      {/* Personal info */}
      <Section icon={User} title="Your Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <Input value={profile.full_name} onChange={v => update('full_name', v)} placeholder="Jane Smith" />
          </Field>
          <Field label="Phone number">
            <Input value={profile.phone} onChange={v => update('phone', v)} placeholder="+1 (555) 000-0000" type="tel" />
          </Field>
          <Field label="Home address" hint="Used to assess your proximity to active fires">
            <Input value={profile.address} onChange={v => update('address', v)} placeholder="123 Main St, City, CA 90210" />
          </Field>
        </div>
      </Section>

      {/* People in your care */}
      <Section icon={Heart} title="People in Your Care">
        <p className="text-ash-500 text-xs mb-4">
          This helps emergency responders prioritize assistance and provide appropriate support.
        </p>
        <div className="space-y-4">
          {profile.dependents.map((dep, i) => (
            <div key={i} className="bg-ash-800/60 rounded-xl p-4 border border-ash-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-ash-300 text-xs font-medium">Person {i + 1}</span>
                <button onClick={() => removeDep(i)} className="text-ash-600 hover:text-signal-danger transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <Input value={dep.name} onChange={v => updateDep(i, 'name', v)} placeholder="Name" />
                </Field>
                <Field label="Relationship">
                  <Input value={dep.relationship} onChange={v => updateDep(i, 'relationship', v)} placeholder="e.g. Mother, Child" />
                </Field>
                <Field label="Mobility / accessibility needs">
                  <Input value={dep.mobility_needs} onChange={v => updateDep(i, 'mobility_needs', v)} placeholder="e.g. wheelchair, oxygen tank" />
                </Field>
                <Field label="Medications">
                  <Input value={dep.medications} onChange={v => updateDep(i, 'medications', v)} placeholder="e.g. insulin (refrigerated)" />
                </Field>
                <Field label="Other needs" >
                  <Textarea value={dep.other_needs} onChange={v => updateDep(i, 'other_needs', v)} placeholder="e.g. non-verbal, hearing impaired, dementia" rows={2} />
                </Field>
              </div>
            </div>
          ))}
          <button
            onClick={addDep}
            className="flex items-center gap-2 text-sm text-ash-400 hover:text-white border border-dashed border-ash-700 hover:border-ash-500 rounded-xl px-4 py-3 w-full justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add person in your care
          </button>
        </div>
      </Section>

      {/* Pets */}
      <Section icon={PawPrint} title="Pets">
        <div className="space-y-3">
          {profile.pets.map((pet, i) => (
            <div key={i} className="bg-ash-800/60 rounded-xl p-4 border border-ash-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-ash-300 text-xs font-medium">Pet {i + 1}</span>
                <button onClick={() => removePet(i)} className="text-ash-600 hover:text-signal-danger transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Name">
                  <Input value={pet.name} onChange={v => updatePet(i, 'name', v)} placeholder="Buddy" />
                </Field>
                <Field label="Type">
                  <Input value={pet.type} onChange={v => updatePet(i, 'type', v)} placeholder="Dog, Cat, Bird…" />
                </Field>
                <Field label="Notes">
                  <Input value={pet.notes} onChange={v => updatePet(i, 'notes', v)} placeholder="e.g. needs carrier" />
                </Field>
              </div>
            </div>
          ))}
          <button
            onClick={addPet}
            className="flex items-center gap-2 text-sm text-ash-400 hover:text-white border border-dashed border-ash-700 hover:border-ash-500 rounded-xl px-4 py-3 w-full justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add a pet
          </button>
        </div>
      </Section>

      {/* Emergency notes */}
      <Section icon={ShieldAlert} title="For Emergency Responders">
        <Field label="Anything else first responders should know" hint="e.g. 'Front door code is 1234', 'Grandfather uses oxygen on 2nd floor', 'Dog may be aggressive when scared'">
          <Textarea
            value={profile.special_notes}
            onChange={v => update('special_notes', v)}
            placeholder="Any information that could help emergency personnel assist your household…"
            rows={4}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Field label="Emergency contact name">
            <Input value={profile.emergency_contact_name} onChange={v => update('emergency_contact_name', v)} placeholder="Contact name" />
          </Field>
          <Field label="Emergency contact phone">
            <Input value={profile.emergency_contact_phone} onChange={v => update('emergency_contact_phone', v)} placeholder="+1 (555) 000-0000" type="tel" />
          </Field>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Fire Alerts & Notifications">
        <div className="space-y-4">
          {/* Browser notifications */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            notifPermission === 'granted'
              ? 'border-signal-safe/30 bg-signal-safe/5'
              : 'border-ash-700 bg-ash-800/40'
          }`}>
            <div className="mt-0.5">
              {notifPermission === 'granted'
                ? <Bell className="w-4 h-4 text-signal-safe" />
                : <BellOff className="w-4 h-4 text-ash-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">Browser notifications</div>
              <div className="text-ash-400 text-xs mt-0.5">
                {notifPermission === 'granted'
                  ? 'Enabled — you\'ll receive alerts when nearby fires change status.'
                  : notifPermission === 'denied'
                  ? 'Blocked — enable in your browser settings to receive fire alerts.'
                  : 'Get notified when fires near you change status, even with this tab in the background.'}
              </div>
            </div>
            {notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <button
                onClick={requestBrowserNotifications}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          {/* Email */}
          <Field label="Email for fire alerts" hint="We'll send you an alert when fires near your address change containment status.">
            <Input
              value={profile.notification_email}
              onChange={v => update('notification_email', v)}
              placeholder="your@email.com"
              type="email"
            />
          </Field>

          {/* SMS */}
          <Field label="Phone for SMS alerts" hint="Text alerts for critical fire updates near your address.">
            <Input
              value={profile.notification_phone}
              onChange={v => update('notification_phone', v)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </Field>

          <div className="flex items-start gap-2 p-3 bg-ash-800/60 rounded-lg text-xs text-ash-500">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-signal-warn" />
            <span>
              Always follow your local emergency management agency for official evacuation orders.
              WildfireAlert supplements — but does not replace — official alerts.
            </span>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4 pb-24">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && (
          <div className="flex items-center gap-2 text-signal-safe text-sm">
            <CheckCircle className="w-4 h-4" />
            Saved
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-signal-danger text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
