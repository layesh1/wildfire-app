'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Heart, Shield, BarChart3, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ── Address autocomplete (Nominatim / OpenStreetMap, no API key) ────────────
interface NominatimResult { place_id: number; display_name: string }

function AddressInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length < 4) { setSuggestions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&addressdetails=0&limit=5&countrycodes=us`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setShowDrop(data.length > 0)
      } catch { setSuggestions([]) }
    }, 400)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        placeholder={placeholder}
        className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600"
      />
      {showDrop && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-ash-800 border border-ash-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-ash-200 hover:bg-ash-700 hover:text-white transition-colors truncate"
                onMouseDown={() => { onChange(s.display_name); setSuggestions([]); setShowDrop(false) }}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ROLES = [
  {
    id: 'caregiver',
    label: 'Caregiver / Family',
    desc: 'I want to monitor fires, set up alerts, and keep track of people I care for during evacuations.',
    icon: Heart,
    color: 'text-amber-400',
    border: 'border-amber-500/40 bg-amber-500/5',
    activeBorder: 'border-amber-400 bg-amber-500/10',
  },
  {
    id: 'emergency_responder',
    label: 'Emergency Responder',
    desc: 'I work in fire, EMS, law enforcement, or emergency management and need incident intelligence.',
    icon: Shield,
    color: 'text-red-400',
    border: 'border-red-500/40 bg-red-500/5',
    activeBorder: 'border-red-400 bg-red-500/10',
    protected: true,
  },
  {
    id: 'data_analyst',
    label: 'Data Analyst / Researcher',
    desc: 'I analyze wildfire data, equity gaps, and evacuation patterns for research or policy work.',
    icon: BarChart3,
    color: 'text-blue-400',
    border: 'border-blue-500/40 bg-blue-500/5',
    activeBorder: 'border-blue-400 bg-blue-500/10',
    protected: true,
  },
]

const ROLE_DESTINATIONS: Record<string, string> = {
  emergency_responder: '/dashboard/responder',
  data_analyst: '/dashboard/analyst',
  caregiver: '/dashboard/caregiver',
}

const MOBILITY_OPTIONS = ['Mobile Adult', 'Elderly', 'Elderly (needs driver)', 'Disabled', 'Wheelchair', 'No Vehicle', 'Medical Equipment', 'Other']

function inp(value: string, onChange: (v: string) => void, placeholder: string, type = 'text') {
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

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-ash-300 text-xs font-medium mb-1">{children}</label>
}

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || '')

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const [agency, setAgency] = useState('')
  const [institution, setInstitution] = useState('')

  // Step 3 fields (caregiver only)
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [languages, setLanguages] = useState('')
  const [mobility, setMobility] = useState('Mobile Adult')
  const [mobilityOther, setMobilityOther] = useState('')
  const [responderNotes, setResponderNotes] = useState('')
  const [forOthers, setForOthers] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalSteps = selectedRole === 'caregiver' ? 3 : 2

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/login'); return }
      if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name)
      setNotifEmail(user.email || '')
    })
  }, [])

  async function finish() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setSaving(false); return }

    const resolvedMobility = mobility === 'Other' && mobilityOther.trim() ? mobilityOther.trim() : mobility

    const basePayload: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      role: selectedRole,
      roles: [selectedRole],
      full_name: fullName || null,
      notification_email: notifEmail || null,
    }

    if (selectedRole === 'caregiver') {
      Object.assign(basePayload, {
        phone: phone || null,
        address: address || null,
        emergency_contact_name: ecName || null,
        emergency_contact_phone: ecPhone || null,
        household_languages: languages || null,
        special_notes: responderNotes || null,
      })
    } else if (selectedRole === 'emergency_responder') {
      basePayload.phone = agency || null
    } else if (selectedRole === 'data_analyst') {
      basePayload.phone = institution || null
    }

    const { error: e1 } = await supabase.from('profiles').upsert(basePayload)
    if (e1) {
      const fallback = { id: user.id, email: user.email, role: selectedRole, roles: [selectedRole], full_name: fullName || null, notification_email: notifEmail || null }
      const { error: e2 } = await supabase.from('profiles').upsert(fallback)
      if (e2) { setError(e2.message); setSaving(false); return }
    }

    // Pre-populate emergency card in localStorage
    if (selectedRole === 'caregiver') {
      try {
        const card = {
          name: fullName,
          phone,
          address,
          bloodType,
          allergies,
          languages,
          mobility: resolvedMobility,
          mobilityOther: mobility === 'Other' ? mobilityOther : '',
          medications: '',
          medicalEquipment: '',
          pets: '',
          evacuationRoute: '',
          destinationAddress: '',
          emergencyContacts: ecName ? [{ name: ecName, phone: ecPhone, relationship: '' }] : [{ name: '', phone: '', relationship: '' }],
        }
        localStorage.setItem('wfa_emergency_card', JSON.stringify(card))
      } catch {}

      // Sync self into My Persons so hub + persons list are pre-populated
      try {
        const selfPerson = {
          id: 'self-user',
          name: fullName || 'Me',
          address: address || '',
          relationship: 'Self',
          mobility: resolvedMobility || 'Mobile Adult',
          phone: phone || '',
          languages: languages
            ? languages.split(',').map((l: string) => l.trim()).filter(Boolean)
            : ['en'],
          notes: responderNotes || '',
          status: 'unknown',
          last_confirmed: null,
          checkin_token: null,
          ping_sent_at: null,
          justConfirmed: false,
        }
        const existing = JSON.parse(localStorage.getItem('monitored_persons_v2') || '[]')
        const without = existing.filter((p: { id: string }) => p.id !== 'self-user')
        localStorage.setItem('monitored_persons_v2', JSON.stringify([selfPerson, ...without]))
      } catch {}
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('wfa_active_role', selectedRole)
      localStorage.setItem('wfa_claimed_roles', JSON.stringify([selectedRole]))
      localStorage.setItem('wfa_user_id', user.id)
    }

    if (selectedRole === 'emergency_responder' || selectedRole === 'data_analyst') {
      router.replace(`/auth/add-role?role=${selectedRole}`)
    } else {
      router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')
    }
  }

  const roleConfig = ROLES.find(r => r.id === selectedRole)
  const stepLabels = selectedRole === 'caregiver'
    ? ['Your role', 'Your info', 'Emergency setup']
    : ['Your role', 'Set up profile']

  return (
    <div className="min-h-screen bg-ash-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ember-500/10 border border-ember-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-ember-400" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none">Minutes Matter</div>
            <div className="text-ash-500 text-xs">Account setup</div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, idx) => {
            const s = idx + 1
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s ? 'bg-signal-safe text-white' : step === s ? 'bg-ember-500 text-white' : 'bg-ash-800 text-ash-500'
                }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs ${step === s ? 'text-white' : 'text-ash-500'}`}>{label}</span>
                {s < totalSteps && <div className="w-6 h-px bg-ash-800 mx-1" />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Role selection */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">What brings you here?</h1>
            <p className="text-ash-400 text-sm mb-6">Choose the role that best describes you. You can add more roles later.</p>
            <div className="space-y-3 mb-8">
              {ROLES.map(role => {
                const Icon = role.icon
                const isSelected = selectedRole === role.id
                return (
                  <button key={role.id} onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${isSelected ? role.activeBorder : role.border + ' hover:opacity-90'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/10' : 'bg-ash-900'}`}>
                      <Icon className={`w-5 h-5 ${role.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm mb-0.5 ${isSelected ? 'text-white' : 'text-ash-200'}`}>
                        {role.label}
                        {'protected' in role && role.protected && <span className="ml-2 text-xs text-ash-500 font-normal">(requires access code)</span>}
                      </div>
                      <div className="text-ash-400 text-xs leading-relaxed">{role.desc}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center transition-all ${isSelected ? 'border-white bg-white' : 'border-ash-600'}`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-ash-900" />}
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep(2)} disabled={!selectedRole}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Basic profile */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-ash-400 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2 mb-1">
              {roleConfig && <roleConfig.icon className={`w-4 h-4 ${roleConfig.color}`} />}
              <h1 className="font-display text-2xl font-bold text-white">Your information</h1>
            </div>
            <p className="text-ash-400 text-sm mb-6">
              {selectedRole === 'caregiver'
                ? 'Used to personalize fire alerts and pre-fill your emergency card.'
                : selectedRole === 'emergency_responder'
                ? 'Customize incident intelligence for your agency.'
                : 'Tailor the analyst dashboard to your research context.'}
            </p>
            <div className="space-y-4 mb-6">
              <div><Label>Full name</Label>{inp(fullName, setFullName, 'Your name')}</div>

              {selectedRole === 'caregiver' && (
                <>
                  <div><Label>Phone number</Label>{inp(phone, setPhone, '+1 (555) 000-0000', 'tel')}</div>
                  <div>
                    <Label>Home address <span className="text-ash-600 font-normal">(used for nearby fire alerts)</span></Label>
                    <AddressInput value={address} onChange={setAddress} placeholder="123 Main St, City, CA" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Blood type <span className="text-ash-600 font-normal">(optional)</span></Label>
                      <select value={bloodType} onChange={e => setBloodType(e.target.value)}
                        className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60">
                        <option value="">Unknown</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><Label>Allergies <span className="text-ash-600 font-normal">(optional)</span></Label>{inp(allergies, setAllergies, 'e.g. penicillin, latex')}</div>
                  </div>
                </>
              )}

              {selectedRole === 'emergency_responder' && (
                <div><Label>Station / Agency</Label>{inp(agency, setAgency, 'e.g. Clayton Station #1')}</div>
              )}
              {selectedRole === 'data_analyst' && (
                <div><Label>Institution / Organization</Label>{inp(institution, setInstitution, 'e.g. Stanford University, USGS')}</div>
              )}
              <div><Label>Email for alerts</Label>{inp(notifEmail, setNotifEmail, 'you@example.com', 'email')}</div>
            </div>
            {error && <p className="text-signal-danger text-sm mb-4">{error}</p>}
            {selectedRole !== 'caregiver' && (selectedRole === 'emergency_responder' || selectedRole === 'data_analyst') && (
              <div className="bg-ash-800/60 border border-ash-700 rounded-xl p-3 mb-4 text-ash-400 text-xs">
                You'll need an access code from your organization on the next step.
              </div>
            )}
            <button
              onClick={() => selectedRole === 'caregiver' ? setStep(3) : finish()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold transition-colors">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up…</>
              ) : selectedRole === 'caregiver' ? (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Set up my account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            <button onClick={() => router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')}
              className="w-full text-center text-ash-500 hover:text-ash-300 text-sm mt-3 transition-colors py-1">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Emergency setup (caregiver only) */}
        {step === 3 && selectedRole === 'caregiver' && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-ash-400 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-display text-2xl font-bold text-white mb-1">Emergency setup</h1>
            <p className="text-ash-400 text-sm mb-6">This builds your emergency card — shown to shelter staff and first responders if needed.</p>

            <div className="space-y-4 mb-6">
              <div>
                <Label>Mobility level</Label>
                <select value={mobility} onChange={e => setMobility(e.target.value)}
                  className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60">
                  {MOBILITY_OPTIONS.map(m => <option key={m}>{m}</option>)}
                </select>
                {mobility === 'Other' && (
                  <input value={mobilityOther} onChange={e => setMobilityOther(e.target.value)}
                    placeholder="Describe your mobility needs…"
                    className="w-full mt-2 bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
                )}
              </div>

              <div>
                <Label>Languages spoken <span className="text-ash-600 font-normal">(besides English)</span></Label>
                {inp(languages, setLanguages, 'e.g. Spanish, Cantonese, Arabic')}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Emergency contact name</Label>{inp(ecName, setEcName, 'Contact name')}</div>
                <div><Label>Their phone</Label>{inp(ecPhone, setEcPhone, '+1 (555) 000-0000', 'tel')}</div>
              </div>

              <div>
                <Label>Notes for first responders <span className="text-ash-600 font-normal">(optional)</span></Label>
                <textarea value={responderNotes} onChange={e => setResponderNotes(e.target.value)}
                  placeholder="e.g. front door code, oxygen on 2nd floor, non-verbal household member, dog may bark"
                  rows={2}
                  className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 resize-none" />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={forOthers} onChange={e => setForOthers(e.target.checked)}
                  className="mt-0.5 accent-ember-500" />
                <div>
                  <div className="text-ash-200 text-sm font-medium">I'm also setting this up for someone else</div>
                  <div className="text-ash-500 text-xs mt-0.5">Parents, clients, neighbors — you can add them in My Persons after setup.</div>
                </div>
              </label>
            </div>

            {error && <p className="text-signal-danger text-sm mb-4">{error}</p>}

            <button onClick={finish} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold transition-colors">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up…</>
              ) : (
                <>Set up my account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            <button onClick={() => router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')}
              className="w-full text-center text-ash-500 hover:text-ash-300 text-sm mt-3 transition-colors py-1">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <Suspense><OnboardingInner /></Suspense>
}
