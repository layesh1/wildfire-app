'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Heart, Shield, BarChart3, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || '')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const [agency, setAgency] = useState('')
  const [institution, setInstitution] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Pre-fill email from auth
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

    // Build profile payload — only include columns that definitely exist
    const basePayload: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      role: selectedRole,
      roles: [selectedRole],
      full_name: fullName || null,
    }

    // Extended columns (added by migration) — included optimistically
    const extended: Record<string, unknown> = {
      notification_email: notifEmail || null,
    }

    if (selectedRole === 'caregiver') {
      extended.phone = phone || null
      extended.address = address || null
    } else if (selectedRole === 'emergency_responder') {
      extended.phone = agency || null          // reuse phone for agency/badge
    } else if (selectedRole === 'data_analyst') {
      extended.phone = institution || null     // reuse phone for institution
    }

    // Try full upsert first, fall back to base-only if columns are missing
    const { error: e1 } = await supabase.from('profiles').upsert({ ...basePayload, ...extended })
    if (e1) {
      if (e1.message.includes('column') || e1.message.includes('schema cache')) {
        // Extended columns not yet migrated — save base only
        await supabase.from('profiles').upsert(basePayload)
      } else {
        setError(e1.message)
        setSaving(false)
        return
      }
    }

    // Set localStorage for role persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('wfa_active_role', selectedRole)
      localStorage.setItem('wfa_claimed_roles', JSON.stringify([selectedRole]))
    }

    // For protected roles, send to invite code page
    if ((selectedRole === 'emergency_responder' || selectedRole === 'data_analyst')) {
      router.replace(`/auth/add-role?role=${selectedRole}`)
    } else {
      router.replace(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')
    }
  }

  const roleConfig = ROLES.find(r => r.id === selectedRole)

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
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s ? 'bg-signal-safe text-white' : step === s ? 'bg-ember-500 text-white' : 'bg-ash-800 text-ash-500'
              }`}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-xs ${step === s ? 'text-white' : 'text-ash-500'}`}>
                {s === 1 ? 'Choose your role' : 'Set up profile'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-ash-800 mx-1" />}
            </div>
          ))}
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
                        {role.protected && <span className="ml-2 text-xs text-ash-500 font-normal">(requires access code)</span>}
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

        {/* Step 2: Profile */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-ash-400 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2 mb-1">
              {roleConfig && <roleConfig.icon className={`w-4 h-4 ${roleConfig.color}`} />}
              <h1 className="font-display text-2xl font-bold text-white">Set up your profile</h1>
            </div>
            <p className="text-ash-400 text-sm mb-6">
              {selectedRole === 'caregiver'
                ? 'This helps us personalize alerts for your location and household.'
                : selectedRole === 'emergency_responder'
                ? 'We\'ll use this to customize incident intelligence for your agency.'
                : 'Helps us tailor the analyst dashboard to your research context.'}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-ash-300 text-xs font-medium mb-1">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                  className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
              </div>

              {selectedRole === 'caregiver' && (
                <>
                  <div>
                    <label className="block text-ash-300 text-xs font-medium mb-1">Phone number</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" type="tel"
                      className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
                  </div>
                  <div>
                    <label className="block text-ash-300 text-xs font-medium mb-1">Home address <span className="text-ash-600 font-normal">(used for nearby fire alerts)</span></label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, CA"
                      className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
                  </div>
                </>
              )}

              {selectedRole === 'emergency_responder' && (
                <div>
                  <label className="block text-ash-300 text-xs font-medium mb-1">Station / Agency</label>
                  <input value={agency} onChange={e => setAgency(e.target.value)} placeholder="e.g. Clayton Station #1, Johnston County Sheriff"
                    className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
                </div>
              )}

              {selectedRole === 'data_analyst' && (
                <div>
                  <label className="block text-ash-300 text-xs font-medium mb-1">Institution / Organization</label>
                  <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Stanford University, USGS"
                    className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
                </div>
              )}

              <div>
                <label className="block text-ash-300 text-xs font-medium mb-1">Email for alerts</label>
                <input value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="you@example.com" type="email"
                  className="w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border border-ash-700 focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600" />
              </div>
            </div>

            {error && <p className="text-signal-danger text-sm mb-4">{error}</p>}

            {(selectedRole === 'emergency_responder' || selectedRole === 'data_analyst') && (
              <div className="bg-ash-800/60 border border-ash-700 rounded-xl p-3 mb-4 text-ash-400 text-xs">
                You'll need an access code from your organization on the next step to unlock this role.
              </div>
            )}

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
