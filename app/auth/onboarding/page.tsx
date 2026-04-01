'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Heart, Shield, BarChart3, ArrowRight, ArrowLeft, Check, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AddressVerifySave from '@/components/AddressVerifySave'
import { looksLikeUsStreetAddress } from '@/components/AddressAutocomplete'
import { type WorkBuildingType, workBuildingNeedsFloor } from '@/lib/profile-work-location'
import { detectBuildingType } from '@/lib/geocoding'
import {
  MOBILITY_MOVEMENT_OPTIONS,
  DISABILITY_OPTIONS,
  MEDICAL_OPTIONS,
  DISABILITY_OTHER_LABEL,
  MEDICAL_OTHER_LABEL,
  MAX_OTHER_WORDS,
  wordCount,
  clampToMaxWords,
} from '@/lib/profile-mobility-options'
import { cn } from '@/lib/utils'
import { CHIP_SELECTED, CHIP_UNSELECTED } from '@/lib/ui-chip-classes'

const ROLES = [
  {
    id: 'caregiver',
    label: 'Caregiver',
    desc: 'Automate alerts and maps for people you support — anchored to real home addresses.',
    icon: Heart,
    color: 'text-amber-400',
    border: 'border-amber-500/40 bg-amber-500/5',
    activeBorder: 'border-amber-400 bg-amber-500/10',
  },
  {
    id: 'evacuee',
    label: 'Evacuee',
    desc: 'Personal safety automation: fire distance, shelters, and check-ins from your actual address.',
    icon: Home,
    color: 'text-green-400',
    border: 'border-green-500/40 bg-green-500/5',
    activeBorder: 'border-green-400 bg-green-500/10',
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
  evacuee: '/dashboard/evacuee',
}

function chipClass(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1.5 text-left text-sm transition',
    active ? CHIP_SELECTED : CHIP_UNSELECTED
  )
}

function inp(value: string, onChange: (v: string) => void, placeholder: string, type = 'text') {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
    />
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-base font-medium text-gray-700 dark:text-gray-300">{children}</label>
}

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || '')

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  /** Draft text in the address field (typing / autocomplete display). */
  const [address, setAddress] = useState('')
  /** Set only after successful "Verify & Save" (geocode + profiles.address write). */
  const [verifiedHomeAddress, setVerifiedHomeAddress] = useState<string | null>(null)
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const [agency, setAgency] = useState('')
  const [institution, setInstitution] = useState('')

  // Step 3 fields (caregiver & evacuee)
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [languages, setLanguages] = useState('')
  const [mobilityNeeds, setMobilityNeeds] = useState<string[]>([])
  const [disabilityNeeds, setDisabilityNeeds] = useState<string[]>([])
  const [disabilityOther, setDisabilityOther] = useState('')
  const [medicalNeeds, setMedicalNeeds] = useState<string[]>([])
  const [medicalOther, setMedicalOther] = useState('')
  const [responderNotes, setResponderNotes] = useState('')
  const [forOthers, setForOthers] = useState(false)
  const [locationConsent, setLocationConsent] = useState(false)
  const [evacuationConsent, setEvacuationConsent] = useState(false)
  const [healthConsent, setHealthConsent] = useState(false)
  const [consentError, setConsentError] = useState('')

  /** Evacuee only — step after preferences (mobility note needs mobility_needs). */
  const [workAddress, setWorkAddress] = useState('')
  const [verifiedWorkAddress, setVerifiedWorkAddress] = useState<string | null>(null)
  const [workBuildingType, setWorkBuildingType] = useState<WorkBuildingType | ''>('')
  const [workFloor, setWorkFloor] = useState<string>('')
  const [workLocationNote, setWorkLocationNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isConsumerHomeRole = selectedRole === 'caregiver' || selectedRole === 'evacuee'
  const isEvacuee = selectedRole === 'evacuee'
  const totalSteps = isEvacuee ? 5 : isConsumerHomeRole ? 4 : 2
  const hasMobilityNeedsForWorkNote = mobilityNeeds.length > 0

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

    if (isConsumerHomeRole) {
      const line = verifiedHomeAddress?.trim() || ''
      if (!line || !looksLikeUsStreetAddress(line)) {
        setError('Verify and save your home address using the button below (search, pick a street, then Verify & Save).')
        setSaving(false)
        return
      }
      if (!locationConsent || !evacuationConsent || !healthConsent) {
        setConsentError('Please agree to all terms to continue')
        setSaving(false)
        return
      }
      setConsentError('')
    }

    const resolvedMobility =
      mobilityNeeds.length > 0 ? mobilityNeeds.join(', ') : 'Mobile Adult'

    const disabilityOtherTrim = disabilityNeeds.includes(DISABILITY_OTHER_LABEL)
      ? clampToMaxWords(disabilityOther, MAX_OTHER_WORDS).trim()
      : ''
    const medicalOtherTrim = medicalNeeds.includes(MEDICAL_OTHER_LABEL)
      ? clampToMaxWords(medicalOther, MAX_OTHER_WORDS).trim()
      : ''

    const basePayload: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      role: selectedRole,
      roles: [selectedRole],
      full_name: fullName || null,
      notification_email: notifEmail || null,
    }

    if (isConsumerHomeRole) {
      const wf = parseInt(workFloor, 10)
      const floorOk =
        Number.isFinite(wf) && wf >= 1 && wf <= 200
          ? wf
          : null
      Object.assign(basePayload, {
        phone: phone || null,
        address: verifiedHomeAddress?.trim() || null,
        emergency_contact_name: ecName || null,
        emergency_contact_phone: ecPhone || null,
        household_languages: languages || null,
        special_notes: responderNotes || null,
        mobility_needs: mobilityNeeds.length ? mobilityNeeds : null,
        disability_needs: disabilityNeeds.length ? disabilityNeeds : null,
        disability_other:
          disabilityNeeds.includes(DISABILITY_OTHER_LABEL) && disabilityOtherTrim
            ? disabilityOtherTrim
            : null,
        medical_needs: medicalNeeds.length ? medicalNeeds : null,
        medical_other:
          medicalNeeds.includes(MEDICAL_OTHER_LABEL) && medicalOtherTrim ? medicalOtherTrim : null,
        location_sharing_consent: locationConsent,
        evacuation_status_consent: evacuationConsent,
        health_data_consent: healthConsent,
        terms_accepted_at: new Date().toISOString(),
        responder_data_consent: locationConsent && evacuationConsent,
        responder_data_consent_at:
          locationConsent && evacuationConsent ? new Date().toISOString() : null,
      })
      if (selectedRole === 'evacuee') {
        Object.assign(basePayload, {
          work_address: verifiedWorkAddress?.trim() || null,
          work_address_verified: Boolean(verifiedWorkAddress?.trim()),
          work_building_type: workBuildingType || null,
          work_floor_number:
            workBuildingType && workBuildingNeedsFloor(workBuildingType) ? floorOk : null,
          work_location_note:
            hasMobilityNeedsForWorkNote && workLocationNote.trim()
              ? workLocationNote.trim().slice(0, 150)
              : null,
        })
      }
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
    if (isConsumerHomeRole) {
      try {
        const card = {
          name: fullName,
          phone,
          address: verifiedHomeAddress || '',
          bloodType,
          allergies,
          languages,
          mobility: resolvedMobility,
          mobilityOther: disabilityNeeds.includes(DISABILITY_OTHER_LABEL) ? disabilityOtherTrim : '',
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
          address: verifiedHomeAddress || '',
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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('wfa_allow_add_role', selectedRole)
      }
      router.replace(`/auth/add-role?role=${selectedRole}`)
    } else {
      router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')
    }
  }

  const roleConfig = ROLES.find(r => r.id === selectedRole)
  const stepLabels = isEvacuee
    ? ['Your role', 'Your info', 'Preferences', 'Work / secondary', 'Terms']
    : isConsumerHomeRole
      ? ['Your role', 'Your info', 'Preferences', 'Terms']
      : ['Your role', 'Set up profile']

  return (
    <div className="flex min-h-screen items-center justify-center bg-ash-950 p-4 wfa-auth-typography">
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
                <span className={`text-sm ${step === s ? 'text-white' : 'text-ash-500'}`}>{label}</span>
                {s < totalSteps && <div className="w-6 h-px bg-ash-800 mx-1" />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Role selection */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">Caregiver or evacuee?</h1>
            <p className="text-ash-400 text-sm mb-6">Caregiver coordinates people you support; Evacuee focuses on your own household. Both use home-address automation toward safety.</p>
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
                      <div className={`mb-0.5 text-lg font-semibold ${isSelected ? 'text-white' : 'text-ash-200'}`}>
                        {role.label}
                        {'protected' in role && role.protected && <span className="ml-2 text-sm font-normal text-ash-500">(requires access code)</span>}
                      </div>
                      <div className="text-base leading-relaxed text-ash-400">{role.desc}</div>
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
              {selectedRole === 'caregiver' || selectedRole === 'evacuee'
                ? `${selectedRole === 'caregiver' ? 'Caregiver' : 'Evacuee'} mode uses your real street address to automate distance-to-fire awareness, routing, and safety flows. Search suggests numbered street addresses only — not cities or counties.`
                : selectedRole === 'emergency_responder'
                ? 'Customize incident intelligence for your agency.'
                : 'Tailor the analyst dashboard to your research context.'}
            </p>
            <div className="space-y-4 mb-6">
              <div><Label>Full name</Label>{inp(fullName, setFullName, 'Your name')}</div>

              {(selectedRole === 'caregiver' || selectedRole === 'evacuee') && (
                <>
                  <div><Label>Phone number</Label>{inp(phone, setPhone, '+1 (555) 000-0000', 'tel')}</div>
                  <div>
                    <Label>Home address <span className="text-ember-400/90 font-normal">(required)</span></Label>
                    <AddressVerifySave
                      variant="dark"
                      value={address}
                      onChange={v => {
                        setAddress(v)
                        setError('')
                      }}
                      savedAddress={verifiedHomeAddress}
                      onVerifiedSave={async (line: string) => {
                        const supabase = createClient()
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) throw new Error('Not signed in')
                        const { error } = await supabase.from('profiles').update({ address: line }).eq('id', user.id)
                        if (error) throw new Error(error.message)
                        setVerifiedHomeAddress(line)
                        setAddress(line)
                        try {
                          window.dispatchEvent(new CustomEvent('wfa-flameo-context-refresh'))
                        } catch {
                          /* ignore */
                        }
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Blood type <span className="text-ash-600 font-normal">(optional)</span></Label>
                      <select value={bloodType} onChange={e => setBloodType(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white">
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
            {selectedRole !== 'caregiver' && selectedRole !== 'evacuee' && (selectedRole === 'emergency_responder' || selectedRole === 'data_analyst') && (
              <div className="bg-ash-800/60 border border-ash-700 rounded-xl p-3 mb-4 text-ash-400 text-xs">
                You'll need an access code from your organization on the next step.
              </div>
            )}
            <button
              onClick={() => {
                if ((selectedRole === 'caregiver' || selectedRole === 'evacuee') && !verifiedHomeAddress?.trim()) {
                  setError('Search for your address, pick a suggestion, then use Verify & Save before continuing.')
                  return
                }
                setError('')
                if (selectedRole === 'caregiver' || selectedRole === 'evacuee') setStep(3)
                else void finish()
              }}
              disabled={saving || ((selectedRole === 'caregiver' || selectedRole === 'evacuee') && !verifiedHomeAddress?.trim())}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold transition-colors">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up…</>
              ) : (selectedRole === 'caregiver' || selectedRole === 'evacuee') ? (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Set up my account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            {selectedRole !== 'caregiver' && selectedRole !== 'evacuee' && (
              <button
                type="button"
                onClick={() => router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')}
                className="w-full text-center text-ash-500 hover:text-ash-300 text-sm mt-3 transition-colors py-1"
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* Step 3: Preferences (caregiver & evacuee) */}
        {step === 3 && (selectedRole === 'caregiver' || selectedRole === 'evacuee') && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-ash-400 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-display text-2xl font-bold text-white mb-1">Preferences</h1>
            <p className="text-ash-400 text-sm mb-6">This builds your emergency card — shown to shelter staff and first responders if needed.</p>

            <div className="space-y-6 mb-6">
              <div>
                <div id="onboarding-mobility-heading" className="mb-0.5 text-base font-medium text-white">
                  Mobility & Movement
                </div>
                <p className="mb-2 text-sm text-ash-500">Helps responders reach you first in an emergency</p>
                <div className="flex flex-wrap gap-2">
                  {MOBILITY_MOVEMENT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setMobilityNeeds(prev =>
                          prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                        )
                      }
                      className={chipClass(mobilityNeeds.includes(opt))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div id="onboarding-disability-heading" className="mb-0.5 text-base font-medium text-white">
                  Disabilities
                </div>
                <p className="mb-2 text-sm text-ash-500">Helps responders communicate and assist you</p>
                <div className="flex flex-wrap gap-2">
                  {DISABILITY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setDisabilityNeeds(prev => {
                          const on = prev.includes(opt)
                          if (on) {
                            const next = prev.filter(x => x !== opt)
                            if (opt === DISABILITY_OTHER_LABEL) setDisabilityOther('')
                            return next
                          }
                          return [...prev, opt]
                        })
                      }}
                      className={chipClass(disabilityNeeds.includes(opt))}
                      title={
                        opt === DISABILITY_OTHER_LABEL
                          ? 'Add a short description below (max 10 words)'
                          : undefined
                      }
                    >
                      {opt === DISABILITY_OTHER_LABEL ? 'Other — add below' : opt}
                    </button>
                  ))}
                </div>
                {disabilityNeeds.includes(DISABILITY_OTHER_LABEL) && (
                  <div className="mt-2">
                    <input
                      value={disabilityOther}
                      onChange={e => setDisabilityOther(clampToMaxWords(e.target.value, MAX_OTHER_WORDS))}
                      placeholder="Other (max 10 words)"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      aria-label="Describe other disability"
                    />
                    <p
                      className={`mt-1 text-xs ${wordCount(disabilityOther) >= MAX_OTHER_WORDS ? 'text-red-400' : 'text-ash-500'}`}
                    >
                      {wordCount(disabilityOther)} / {MAX_OTHER_WORDS} words
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div id="onboarding-medical-heading" className="mb-0.5 text-base font-medium text-white">
                  Medical conditions & equipment
                </div>
                <p className="mb-2 text-sm text-ash-500">
                  Tap options like dialysis or oxygen so responders see them clearly — no need to type those in
                  &quot;Other&quot; if they&apos;re listed here.
                </p>
                <div className="flex flex-wrap gap-2">
                  {MEDICAL_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setMedicalNeeds(prev => {
                          const on = prev.includes(opt)
                          if (on) {
                            const next = prev.filter(x => x !== opt)
                            if (opt === MEDICAL_OTHER_LABEL) setMedicalOther('')
                            return next
                          }
                          return [...prev, opt]
                        })
                      }}
                      className={chipClass(medicalNeeds.includes(opt))}
                      title={
                        opt === MEDICAL_OTHER_LABEL
                          ? 'Add a short note below (max 10 words)'
                          : undefined
                      }
                    >
                      {opt === MEDICAL_OTHER_LABEL ? 'Other medications or conditions — add below' : opt}
                    </button>
                  ))}
                </div>
                {medicalNeeds.includes(MEDICAL_OTHER_LABEL) && (
                  <div className="mt-2">
                    <input
                      value={medicalOther}
                      onChange={e => setMedicalOther(clampToMaxWords(e.target.value, MAX_OTHER_WORDS))}
                      placeholder="Other medications or conditions (max 10 words)"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      aria-label="Describe other medical conditions or medications"
                    />
                    <p
                      className={`mt-1 text-xs ${wordCount(medicalOther) >= MAX_OTHER_WORDS ? 'text-red-400' : 'text-ash-500'}`}
                    >
                      {wordCount(medicalOther)} / {MAX_OTHER_WORDS} words
                    </p>
                  </div>
                )}
              </div>

              <div
                className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-[14px] leading-snug text-sky-100/95 dark:border-sky-500/20 dark:bg-sky-950/40 dark:text-sky-100"
                role="note"
              >
                <span className="mr-1" aria-hidden>
                  💡
                </span>
                You can update and add more health and mobility information anytime after signing up in{' '}
                <span className="font-semibold text-white dark:text-sky-50">Settings → Preferences</span>.
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
                <Label>Communication needs</Label>
                <textarea value={responderNotes} onChange={e => setResponderNotes(e.target.value)}
                  placeholder="e.g. front door code, oxygen on 2nd floor, non-verbal household member, dog may bark"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500" />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={forOthers} onChange={e => setForOthers(e.target.checked)}
                  className="mt-0.5 accent-ember-500" />
                <div>
                  <div className="text-ash-200 text-sm font-medium">I&apos;m also setting this up for someone else</div>
                  <div className="text-ash-500 text-xs mt-0.5">Parents, clients, neighbors — you can add them in My Persons after setup.</div>
                </div>
              </label>
            </div>

            {error && <p className="text-signal-danger text-sm mb-4">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setError('')
                setStep(4)
              }}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Terms & consent (caregiver only) */}
        {step === 4 && selectedRole === 'caregiver' && (
          <div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mb-4 flex items-center gap-1.5 text-sm text-ash-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-display mb-1 text-2xl font-bold text-white">Before you continue</h1>
            <p className="mb-6 text-sm text-ash-400">
              Please review and agree to the following to use WildfireAlert
            </p>
            <p className="mb-4 rounded-xl border border-ash-700/80 bg-ash-900/50 p-4 text-sm leading-relaxed text-ash-300">
              🔒 Your health information is encrypted and only shared with emergency responders during active incidents in your area. You control what you share and can remove it anytime in Settings.
            </p>
            <div className="mb-6 space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={locationConsent}
                  onChange={e => {
                    setLocationConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that my home address and general location will be shared with emergency responders in my area during an active wildfire incident.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={evacuationConsent}
                  onChange={e => {
                    setEvacuationConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that my evacuation status will be visible to emergency responders during an active incident.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={healthConsent}
                  onChange={e => {
                    setHealthConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that any health or mobility information I choose to share will be visible to emergency responders to help them assist me safely.
                </span>
              </label>
            </div>
            {(!locationConsent || !evacuationConsent || !healthConsent) && (
              <p className="mb-4 text-sm text-signal-danger">Please agree to all terms to continue</p>
            )}
            {consentError && <p className="mb-4 text-sm text-signal-danger">{consentError}</p>}
            {error && <p className="mb-4 text-sm text-signal-danger">{error}</p>}
            <button
              type="button"
              onClick={() => {
                if (!locationConsent || !evacuationConsent || !healthConsent) {
                  setConsentError('Please agree to all terms to continue')
                  return
                }
                setConsentError('')
                void finish()
              }}
              disabled={saving || !locationConsent || !evacuationConsent || !healthConsent}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 py-3 font-semibold text-white transition-colors hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Setting up…
                </>
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Work / secondary (evacuee only, optional) */}
        {step === 4 && selectedRole === 'evacuee' && (
          <div>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-ash-400 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-display text-2xl font-bold text-white mb-1">
              Do you have a work or secondary location?
            </h1>
            <p className="text-ash-400 text-sm mb-6">
              We&apos;ll alert you based on where you&apos;re most likely to be during the day.
            </p>

            <div className="space-y-5 mb-6">
              <div>
                <Label>Work address <span className="text-ash-600 font-normal">(optional)</span></Label>
                <p className="text-ash-500 text-xs mb-2">
                  We&apos;ll check this location during weekday hours.
                </p>
                <AddressVerifySave
                  variant="dark"
                  id="onboarding-work-address"
                  hint="Search for a numbered street address. We use it to compare with your live location during emergencies."
                  value={workAddress}
                  onChange={v => {
                    setWorkAddress(v)
                    setError('')
                  }}
                  savedAddress={verifiedWorkAddress}
                  onVerified={({ types }) => {
                    if (!workBuildingType) setWorkBuildingType(detectBuildingType(types))
                  }}
                  onVerifiedSave={async (line: string) => {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) throw new Error('Not signed in')
                    const { error: upErr } = await supabase
                      .from('profiles')
                      .update({
                        work_address: line,
                        work_address_verified: true,
                      })
                      .eq('id', user.id)
                    if (upErr) throw new Error(upErr.message)
                    setVerifiedWorkAddress(line)
                    setWorkAddress(line)
                    try {
                      window.dispatchEvent(new CustomEvent('wfa-flameo-context-refresh'))
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </div>

              {verifiedWorkAddress?.trim() ? (
                <>
                  <div>
                    <Label>Building type</Label>
                    <select
                      value={workBuildingType}
                      onChange={e =>
                        setWorkBuildingType((e.target.value || '') as WorkBuildingType | '')
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select…</option>
                      <option value="house">House / Single family home</option>
                      <option value="apartment">Apartment or condo</option>
                      <option value="office">Office building</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {workBuildingType && workBuildingNeedsFloor(workBuildingType) && (
                    <div>
                      <Label>What floor do you work or live on?</Label>
                      <p className="text-ash-500 text-xs mb-2">
                        Helps Flameo give floor-specific evacuation guidance.
                      </p>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={workFloor}
                        onChange={e => setWorkFloor(e.target.value)}
                        placeholder="e.g. 6"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      />
                    </div>
                  )}

                  {hasMobilityNeedsForWorkNote && (
                    <div>
                      <Label>Anything responders should know about your situation at this location?</Label>
                      <input
                        type="text"
                        value={workLocationNote}
                        onChange={e => setWorkLocationNote(e.target.value.slice(0, 150))}
                        maxLength={150}
                        placeholder={
                          workFloor
                            ? `e.g. Wheelchair user on floor ${workFloor}`
                            : 'e.g. Wheelchair user on floor 6'
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-500/60 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      />
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {error && <p className="text-signal-danger text-sm mb-4">{error}</p>}

            <button
              type="button"
              onClick={() => setStep(5)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-forest-700 hover:bg-forest-600 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              disabled={saving}
              className="w-full text-center text-ash-500 hover:text-ash-300 text-sm mt-3 transition-colors py-1"
            >
              Skip — add later in Settings
            </button>
          </div>
        )}

        {/* Step 5: Terms & consent (evacuee only) */}
        {step === 5 && selectedRole === 'evacuee' && (
          <div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="mb-4 flex items-center gap-1.5 text-sm text-ash-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="font-display mb-1 text-2xl font-bold text-white">Before you continue</h1>
            <p className="mb-6 text-sm text-ash-400">
              Please review and agree to the following to use WildfireAlert
            </p>
            <p className="mb-4 rounded-xl border border-ash-700/80 bg-ash-900/50 p-4 text-sm leading-relaxed text-ash-300">
              🔒 Your health information is encrypted and only shared with emergency responders during active incidents in your area. You control what you share and can remove it anytime in Settings.
            </p>
            <div className="mb-6 space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={locationConsent}
                  onChange={e => {
                    setLocationConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that my home address and general location will be shared with emergency responders in my area during an active wildfire incident.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={evacuationConsent}
                  onChange={e => {
                    setEvacuationConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that my evacuation status will be visible to emergency responders during an active incident.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 accent-ember-500"
                  checked={healthConsent}
                  onChange={e => {
                    setHealthConsent(e.target.checked)
                    if (e.target.checked) setConsentError('')
                  }}
                />
                <span className="text-sm leading-relaxed text-ash-200">
                  I agree that any health or mobility information I choose to share will be visible to emergency responders to help them assist me safely.
                </span>
              </label>
            </div>
            {(!locationConsent || !evacuationConsent || !healthConsent) && (
              <p className="mb-4 text-sm text-signal-danger">Please agree to all terms to continue</p>
            )}
            {consentError && <p className="mb-4 text-sm text-signal-danger">{consentError}</p>}
            {error && <p className="mb-4 text-sm text-signal-danger">{error}</p>}
            <button
              type="button"
              onClick={() => {
                if (!locationConsent || !evacuationConsent || !healthConsent) {
                  setConsentError('Please agree to all terms to continue')
                  return
                }
                setConsentError('')
                void finish()
              }}
              disabled={saving || !locationConsent || !evacuationConsent || !healthConsent}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 py-3 font-semibold text-white transition-colors hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Setting up…
                </>
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" />
                </>
              )}
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
