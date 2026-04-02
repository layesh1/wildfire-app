'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { describeAuthEmailError, getAuthCallbackUrl } from '@/lib/auth-callback-url'
import { LANGUAGES } from '@/lib/languages'
import AddressAutocomplete, { looksLikeUsStreetAddress } from '@/components/AddressAutocomplete'
import AddressVerifySave from '@/components/AddressVerifySave'

// ── Onboarding state ──────────────────────────────────────────────────────────
interface OnboardingData {
  fullName: string
  phone: string
  address: string
  /** Responder: station / dept; analyst: institution → profiles.org_name */
  orgName: string
  role: 'evacuee' | 'emergency_responder' | 'data_analyst'
  inviteCode: string
  language: string
  emergencyContactName: string
  emergencyContactPhone: string
  communicationNeeds: string[]
  /** Stored as mobility_access_needs / mobility_access_other on profiles */
  mobilityAccessNeeds: string[]
  mobilityAccessOther: string
}

const COMM_OPTIONS = ['Screen reader', 'Large text', 'Translation needed', 'Deaf / hard of hearing', 'Limited English']

const MOBILITY_ACCESS_OPTIONS: { key: string; label: string }[] = [
  { key: 'wheelchair_user', label: 'Wheelchair user' },
  { key: 'disabilities', label: 'Disabilities' },
  { key: 'medical_conditions', label: 'Medical conditions or equipment' },
  { key: 'other', label: 'Other' },
]

/** Basic format check so random text cannot advance past signup step 0. */
function isValidEmailFormat(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(t)
}

const ROLE_INFO = {
  evacuee: {
    label: 'Evacuee',
    desc: 'Add people under My People to track safety and get location alerts — everyone creates their own account. Your home address powers maps and Flameo for your household.',
    restricted: false,
  },
  emergency_responder: {
    label: 'Emergency Responder',
    desc: 'Incident command tools, resource tracking, and field coordination.',
    restricted: true,
  },
  data_analyst: {
    label: 'Data Analyst',
    desc: 'Explore fire datasets, SVI metrics, and evacuation delay analysis.',
    restricted: true,
  },
}

// ── Main login form ───────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )

  // login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  // signup onboarding: 0 = credentials, 1–3 = profile/prefs, 4 = terms (evacuee only), 5 = check email
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [ob, setOb] = useState<OnboardingData>({
    fullName: '', phone: '', address: '', orgName: '',
    role: 'evacuee', inviteCode: '',
    language: 'en',
    emergencyContactName: '', emergencyContactPhone: '',
    communicationNeeds: [],
    mobilityAccessNeeds: [],
    mobilityAccessOther: '',
  })
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [emailFormatError, setEmailFormatError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const [showLangDrop, setShowLangDrop] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  /** Evacuee email signup — same agreements as /auth/onboarding before account is created. */
  const [locationConsent, setLocationConsent] = useState(false)
  const [evacuationConsent, setEvacuationConsent] = useState(false)
  const [healthConsent, setHealthConsent] = useState(false)
  const [consentError, setConsentError] = useState('')
  const [loginResendable, setLoginResendable] = useState(false)
  const [loginResendNotice, setLoginResendNotice] = useState('')
  const [resendBusy, setResendBusy] = useState(false)
  const [signupResendMsg, setSignupResendMsg] = useState('')
  /** Emergency responder signup: verifiable station line (profiles.address) after Verify & Save */
  const [responderStationDraft, setResponderStationDraft] = useState('')
  const [verifiedResponderStationLine, setVerifiedResponderStationLine] = useState<string | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const errorParam = searchParams.get('error')
  const emailNotConfirmedFromOAuth = errorParam === 'email_not_confirmed'
  const oauthErrorMessage =
    emailNotConfirmedFromOAuth
      ? 'Confirm your email before using the app. Check your inbox and spam folder.'
      : errorParam
  /** Show resend on sign-in after password error or OAuth/middleware redirect. */
  const loginResendEligible = loginResendable || emailNotConfirmedFromOAuth

  /** Deep link e.g. /auth/login?mode=signup&role=emergency_responder — align signup role with invite */
  const roleFromUrlApplied = useRef(false)
  useEffect(() => {
    if (roleFromUrlApplied.current) return
    const r = searchParams.get('role')
    if (r === 'evacuee' || r === 'emergency_responder' || r === 'data_analyst') {
      setOb(prev => ({ ...prev, role: r }))
      roleFromUrlApplied.current = true
    }
  }, [searchParams])

  const filteredLangs = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  )

  const signupStepTotal = ob.role === 'evacuee' ? 4 : 3

  const selectedLang = LANGUAGES.find(l => l.code === ob.language)

  function obSet<K extends keyof OnboardingData>(key: K, val: OnboardingData[K]) {
    setOb(prev => ({ ...prev, [key]: val }))
  }

  function toggleComm(need: string) {
    setOb(prev => ({
      ...prev,
      communicationNeeds: prev.communicationNeeds.includes(need)
        ? prev.communicationNeeds.filter(n => n !== need)
        : [...prev.communicationNeeds, need],
    }))
  }

  function toggleMobility(key: string) {
    setOb(prev => {
      const next = prev.mobilityAccessNeeds.includes(key)
        ? prev.mobilityAccessNeeds.filter(k => k !== key)
        : [...prev.mobilityAccessNeeds, key]
      if (key === 'other' && next.includes('other') === false) {
        return { ...prev, mobilityAccessNeeds: next, mobilityAccessOther: '' }
      }
      return { ...prev, mobilityAccessNeeds: next }
    })
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      if (typeof document !== 'undefined') {
        const maxAge = 30 * 60
        if (mode === 'signup') {
          document.cookie = `wfa_pending_consumer_role=evacuee; path=/; max-age=${maxAge}; SameSite=Lax`
        } else {
          document.cookie = 'wfa_pending_consumer_role=; path=/; max-age=0'
        }
      }
    } catch {
      /* ignore cookie failures */
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthCallbackUrl() },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  // Step 0 → 1: validate credentials, move to onboarding
  async function handleCredentialsNext() {
    if (!email || !password) return
    setEmailFormatError('')
    if (!isValidEmailFormat(email)) {
      setEmailFormatError('Invalid email format. Please enter a real email address (for example you@example.com).')
      return
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setOnboardingStep(1)
  }

  /** Step 2 (profile): home address for evacuee; station name + verified base for responder. */
  function profileStepValid() {
    if (!ob.fullName.trim()) return false
    if (ob.role === 'evacuee') {
      const a = ob.address.trim()
      if (a.length < 8 || !looksLikeUsStreetAddress(a)) return false
    }
    if (ob.role === 'emergency_responder') {
      if (!ob.orgName.trim()) return false
      const line = verifiedResponderStationLine?.trim() || ''
      if (!line || !looksLikeUsStreetAddress(line)) return false
    }
    return true
  }

  // Step 1 validation (role + invite code if restricted)
  async function validateStep2(): Promise<boolean> {
    if (!ROLE_INFO[ob.role].restricted) return true
    if (!ob.inviteCode.trim()) {
      setCodeError(
        ob.role === 'emergency_responder' ? 'Enter your organization access code.' : 'Enter your invite code.'
      )
      return false
    }
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch('/api/invite/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ob.inviteCode.trim(), email, role: ob.role }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = [data.error, typeof data.hint === 'string' ? data.hint : '']
          .filter(Boolean)
          .join(' ')
        setCodeError(msg || 'Invalid code.')
        return false
      }
      if (data.role !== ob.role) {
        setCodeError(`This code is for ${data.role.replace('_', ' ')}, not ${ob.role.replace('_', ' ')}.`)
        return false
      }
      return true
    } catch {
      setCodeError('Could not verify code. Try again.')
      return false
    } finally {
      setCodeLoading(false)
    }
  }

  async function handleNext() {
    if (onboardingStep === 1) {
      const ok = await validateStep2()
      if (ok) setOnboardingStep(2)
    } else if (onboardingStep === 2) {
      if (!profileStepValid()) {
        if (ob.role === 'evacuee') {
          setError('Add a full street address with a number (not a city or county alone) to enable safety automations.')
        } else if (ob.role === 'emergency_responder') {
          setError(
            'Enter your station name and verify & save your station / command post street address (search, pick a suggestion, then Verify & Save).'
          )
        } else {
          setError('Please enter your full name.')
        }
        return
      }
      setError('')
      setOnboardingStep(3)
    } else if (onboardingStep === 3) {
      if (ob.role === 'evacuee') {
        setConsentError('')
        setOnboardingStep(4)
      } else {
        await handleSignup()
      }
    }
  }

  // Final signup
  async function handleSignup() {
    if (ob.role === 'evacuee') {
      if (!locationConsent || !evacuationConsent || !healthConsent) {
        setConsentError('Please agree to all terms to continue')
        return
      }
      setConsentError('')
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      })
      if (signupErr) throw signupErr

      const signedUser = data.user
      const hasEmailIdentity = Boolean(
        signedUser?.identities?.some(i => i.provider === 'email')
      )
      const emailConfirmed = Boolean(signedUser?.email_confirmed_at)

      // Save profile data immediately (works before email confirmation)
      if (signedUser) {
        const mobilityNeeds = ob.mobilityAccessNeeds.filter(k => k !== 'other')
        if (ob.mobilityAccessNeeds.includes('other')) mobilityNeeds.push('other')
        const profilePayload: Record<string, unknown> = {
          full_name: ob.fullName.trim(),
          phone: ob.phone.trim(),
          address:
            ob.role === 'emergency_responder'
              ? (verifiedResponderStationLine || '').trim()
              : ob.address.trim(),
          role: ob.role,
          roles: [ob.role],
          ...(ob.orgName.trim() && (ob.role === 'emergency_responder' || ob.role === 'data_analyst')
            ? { org_name: ob.orgName.trim() }
            : {}),
          language_preference: ob.language,
          communication_needs: ob.communicationNeeds,
          mobility_access_needs: mobilityNeeds,
          mobility_access_other:
            ob.mobilityAccessNeeds.includes('other') && ob.mobilityAccessOther.trim()
              ? ob.mobilityAccessOther.trim()
              : null,
          ...(ob.emergencyContactName && { emergency_contact_name: ob.emergencyContactName.trim() }),
          ...(ob.emergencyContactPhone && { emergency_contact_phone: ob.emergencyContactPhone.trim() }),
          ...(ob.role === 'evacuee' && {
            location_sharing_consent: locationConsent,
            evacuation_status_consent: evacuationConsent,
            health_data_consent: healthConsent,
            terms_accepted_at: new Date().toISOString(),
            responder_data_consent: locationConsent && evacuationConsent,
            responder_data_consent_at:
              locationConsent && evacuationConsent ? new Date().toISOString() : null,
          }),
        }
        await supabase.from('profiles').upsert({ id: signedUser.id, ...profilePayload })
      }

      // If Supabase returns a session before the address is confirmed (misconfiguration or
      // rare edge case), sign out so we never skip the "check your email" step for email signups.
      if (data.session && hasEmailIdentity && !emailConfirmed) {
        await supabase.auth.signOut()
        setSignupResendMsg('')
        setOnboardingStep(5)
        return
      }

      if (data.session) {
        window.location.href = '/dashboard'
      } else {
        setSignupResendMsg('')
        setOnboardingStep(5)
      }
    } catch (err: any) {
      const msg: string = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
        setEmailTaken(true)
        setOnboardingStep(0)
      } else {
        setError(msg)
        setOnboardingStep(0)
      }
    } finally {
      setLoading(false)
    }
  }

  // Login
  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setLoginResendable(false)
    setLoginResendNotice('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const next = searchParams.get('next')
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        window.location.href = next
        return
      }
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
        setError(
          'Confirm your email before signing in. Check your inbox and spam folder, or resend the link below.'
        )
        setLoginResendable(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function resendConfirmationEmail() {
    const em = email.trim()
    if (!em) return
    setResendBusy(true)
    setSignupResendMsg('')
    setLoginResendNotice('')
    const showResendError = (raw: string) => {
      const shown = describeAuthEmailError(raw)
      if (mode === 'login' && loginResendEligible) setError(shown)
      else setSignupResendMsg(shown)
    }
    try {
      const redirect = getAuthCallbackUrl()
      const withRedirect = {
        type: 'signup' as const,
        email: em,
        options: { emailRedirectTo: redirect },
      }
      const minimal = { type: 'signup' as const, email: em }

      let { error: e } = await supabase.auth.resend(withRedirect)
      const lower = (e?.message || '').toLowerCase()
      if (
        e &&
        (lower.includes('redirect') ||
          lower.includes('callback') ||
          (lower.includes('url') && lower.includes('invalid')))
      ) {
        const second = await supabase.auth.resend(minimal)
        e = second.error
      }
      if (e) {
        showResendError(e.message)
      } else {
        const ok =
          'If this email is registered and not yet confirmed, we sent a new confirmation link.'
        if (mode === 'login' && loginResendEligible) {
          setError('')
          setLoginResendNotice(ok)
        } else {
          setSignupResendMsg(ok)
        }
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      showResendError(raw)
    } finally {
      setResendBusy(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        <img src="/hero-forest.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" style={{ transform: 'scaleX(-1)', filter: 'brightness(0.55)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,20,10,0.65)' }} />
        <button onClick={() => router.push('/')} className="relative flex items-center gap-2 text-green-200/70 hover:text-white transition-colors text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
        <div className="relative">
          <div className="mb-8">
            <div className="font-display font-bold text-white text-xl leading-none">Minutes Matter</div>
            <div className="text-green-300/70 text-xs">Wildfire evacuation intelligence</div>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="font-display font-bold text-white leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}>
                Good to have<br/>you back.
              </h2>
              <p className="text-green-200/70 text-base leading-relaxed mb-10">
                Your evacuation plan, alerts, and check-in tools are waiting. Sign in to pick up where you left off.
              </p>
              <div className="space-y-5">
                {[
                  { stat: '1.1h', label: 'median time from fire start to evacuation order (when orders ARE issued)' },
                  { stat: '99.3%', label: 'of true wildfires with signals had no formal evacuation order' },
                  { stat: '9×', label: 'disparity between fastest and slowest-alerted states' },
                ].map(({ stat, label }) => (
                  <div key={stat} className="flex items-start gap-4 border-l-2 border-green-500/40 pl-4">
                    <div className="font-display font-bold text-white text-2xl leading-none shrink-0">{stat}</div>
                    <div className="text-green-200/60 text-sm leading-relaxed">{label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-white leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}>
                {onboardingStep === 0 && <>Wildfire alerts<br/>when it matters most.</>}
                {onboardingStep === 1 && <>Caregiver or<br/>evacuee?</>}
                {onboardingStep === 2 && <>Your home<br/>on the map.</>}
                {onboardingStep === 3 && <>Almost done.</>}
                {onboardingStep === 4 && ob.role === 'evacuee' && <>Agree to<br/>sharing terms.</>}
                {onboardingStep === 5 && <>You&apos;re all set.</>}
              </h2>
              <p className="text-green-200/70 text-base leading-relaxed mb-10">
                {onboardingStep === 0 && 'Get personalized evacuation intelligence, plan safe routes, and automate distance-to-fire awareness for the people in your care.'}
                {onboardingStep === 1 && 'Choose Caregiver to coordinate others, or Evacuee for your own household. Both paths use home-address automation to safety — not city- or county-level guesses.'}
                {onboardingStep === 2 && 'Enter a numbered street address. Our search filters out cities and counties so alerts and Flameo stay tied to a real location.'}
                {onboardingStep === 3 && 'Set your language and emergency contact so we can reach the right people the right way.'}
                {onboardingStep === 4 && ob.role === 'evacuee' && 'Review how location, evacuation status, and optional health details are shared with responders during active incidents — required to create your account.'}
                {onboardingStep === 5 && 'Check your inbox to confirm your email, then sign in to access your dashboard.'}
              </p>
              {/* Step indicators */}
              {onboardingStep > 0 && onboardingStep <= signupStepTotal && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: signupStepTotal }, (_, i) => i + 1).map(s => (
                    <div
                      key={s}
                      className={`h-1 rounded-full flex-1 transition-all ${s <= onboardingStep ? 'bg-green-400' : 'bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="relative text-green-200/40 text-xs">
          WiDS Datathon 2026 · 60,000+ incidents analyzed
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col bg-gray-50 wfa-auth-typography">
        <div className="lg:hidden px-6 pt-6">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <div className="font-display font-bold text-gray-900 text-xl leading-none">Minutes Matter</div>
              <div className="text-gray-400 text-xs">Equity-driven evacuation intelligence</div>
            </div>

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-1 text-center">Welcome back</h2>
                <p className="mb-6 text-center text-base text-gray-500 dark:text-gray-400">Sign in to your dashboard.</p>

                <button onClick={handleGoogleLogin} disabled={googleLoading}
                  className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                  {googleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-sm"><span className="bg-gray-50 px-3 text-gray-500 dark:bg-gray-800 dark:text-gray-400">or use email</span></div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" className="input" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} className="input pr-11"
                        placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {loginResendNotice && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {loginResendNotice}
                  </div>
                )}
                {(error || oauthErrorMessage) && (
                  <div className="mb-4 space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    <p>{error || oauthErrorMessage}</p>
                    {loginResendEligible && (
                      <button
                        type="button"
                        disabled={resendBusy || !email.trim()}
                        onClick={() => void resendConfirmationEmail()}
                        className="text-sm font-semibold text-red-800 underline underline-offset-2 hover:text-red-950 disabled:opacity-50 dark:text-red-300 dark:hover:text-red-100"
                      >
                        {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                      </button>
                    )}
                  </div>
                )}
                {loginResendNotice && loginResendEligible && (
                  <div className="mb-4">
                    <button
                      type="button"
                      disabled={resendBusy || !email.trim()}
                      onClick={() => void resendConfirmationEmail()}
                      className="text-sm font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950 disabled:opacity-50 dark:text-emerald-300 dark:hover:text-emerald-100"
                    >
                      {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                    </button>
                  </div>
                )}

                <button onClick={handleLogin} disabled={loading || !email || !password} className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : 'Sign in'}
                </button>

                <p className="mt-6 text-center text-base text-gray-500 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button onClick={() => {
                    setMode('signup')
                    setError('')
                    setLoginResendable(false)
                    setLoginResendNotice('')
                    setEmailFormatError('')
                    setEmailTaken(false)
                    setOnboardingStep(0)
                    setLocationConsent(false)
                    setEvacuationConsent(false)
                    setHealthConsent(false)
                    setConsentError('')
                  }}
                    className="font-medium text-forest-600 transition-colors hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300">
                    Sign up free
                  </button>
                </p>
              </>
            )}

            {/* ── SIGNUP — Step 0: Credentials ── */}
            {mode === 'signup' && onboardingStep === 0 && (
              <>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-6 text-center">Create your account</h2>

                <button onClick={handleGoogleLogin} disabled={googleLoading}
                  className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                  {googleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-sm"><span className="bg-gray-50 px-3 text-gray-500 dark:bg-gray-800 dark:text-gray-400">or use email</span></div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="label" htmlFor="signup-email">Email address</label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={emailFormatError ? true : undefined}
                      aria-describedby={emailFormatError ? 'signup-email-error' : undefined}
                      className={`input ${emailFormatError ? 'border-red-400 ring-1 ring-red-200 focus:border-red-500 focus:ring-red-200' : ''}`}
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        setEmailFormatError('')
                      }}
                    />
                    {emailFormatError && (
                      <p id="signup-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                        {emailFormatError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} className="input pr-11"
                        placeholder="At least 6 characters" value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCredentialsNext()} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {emailTaken && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                    An account with this email already exists.{' '}
                    <button onClick={() => { setMode('login'); setEmailTaken(false); setError('') }}
                      className="font-semibold underline hover:no-underline">
                      Sign in instead
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>
                )}

                <button onClick={handleCredentialsNext} disabled={!email || !password}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-gray-500 text-sm mt-6">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); setEmailFormatError('') }}
                    className="text-forest-600 hover:text-forest-700 transition-colors font-medium">
                    Sign in
                  </button>
                </p>
              </>
            )}

            {/* ── SIGNUP — Step 1: Role ── */}
            {mode === 'signup' && onboardingStep === 1 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setOnboardingStep(0)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">How you&apos;ll use the app</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Step 1 of {signupStepTotal}</p>
                  </div>
                </div>

                <p className="mb-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  <strong className="text-gray-800">Evacuees</strong> use a real home street address to automate distance alerts, maps, and notifications — and you can add people under My People to watch out for family or others you support.
                </p>

                <div className="space-y-3 mb-6">
                  {(Object.entries(ROLE_INFO) as [keyof typeof ROLE_INFO, typeof ROLE_INFO[keyof typeof ROLE_INFO]][]).map(([key, info]) => (
                    <button key={key} onClick={() => { obSet('role', key); setCodeError('') }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        ob.role === key
                          ? 'border-forest-600 bg-forest-50 ring-1 ring-forest-600 dark:bg-forest-950/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">{info.label}</div>
                          <div className="mt-0.5 text-base text-gray-500 dark:text-gray-400">{info.desc}</div>
                        </div>
                        <div className="mt-0.5 flex shrink-0 items-center gap-2">
                          {info.restricted && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Invite only</span>
                          )}
                          {ob.role === key && <Check className="w-4 h-4 text-forest-600" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {ROLE_INFO[ob.role].restricted && (
                  <div className="mb-6">
                    <label className="label">
                      {ob.role === 'emergency_responder' ? 'Organization access code' : 'Invite code'}
                    </label>
                    {ob.role === 'emergency_responder' && (
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        From your department or admin — unlocks the <strong className="text-gray-700 dark:text-gray-300">Emergency
                        Responder Command Hub</strong> on the web. This is <strong className="text-gray-700 dark:text-gray-300">not</strong>{' '}
                        a station join code (e.g. STATION-ABC123). Your station gets <strong className="text-gray-700 dark:text-gray-300">one</strong> join code for firefighters to <strong className="text-gray-700 dark:text-gray-300">sign up</strong> on the <strong className="text-gray-700 dark:text-gray-300">Minutes Matter iOS app</strong> — the <strong className="text-gray-700 dark:text-gray-300">only</strong> signup path for that flow.
                      </p>
                    )}
                    <input
                      type="text"
                      className="input font-mono"
                      placeholder={ob.role === 'emergency_responder' ? 'ER-ORG-XXXX' : 'XXXX-XXXX'}
                      value={ob.inviteCode}
                      onChange={e => { obSet('inviteCode', e.target.value); setCodeError('') }}
                    />
                    {codeError && <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{codeError}</p>}
                  </div>
                )}

                <button onClick={handleNext} disabled={codeLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {codeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 2: Profile + street address ── */}
            {mode === 'signup' && onboardingStep === 2 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setOnboardingStep(1); setError('') }} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">About you</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Step 2 of {signupStepTotal}</p>
                  </div>
                </div>

                <p className="mb-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {ob.role === 'evacuee' && (
                    <>Your <strong>home street address</strong> anchors maps, Flameo, and alerts for your household — and lets you add people to your dashboard for shared status and notifications.</>
                  )}
                  {ob.role === 'emergency_responder' && (
                    <>
                      Your <strong>station name</strong> and <strong>verified command post address</strong> anchor the Command Hub
                      map, incident radius, and directions. The <strong>organization access code</strong> you entered unlocks the
                      Command Hub. You&apos;ll create <strong>one station join code</strong> under Station &amp; setup for
                      firefighters to sign up on <strong>Minutes Matter iOS</strong> — the <strong>only</strong> way to join your
                      roster from the app.
                    </>
                  )}
                  {ob.role === 'data_analyst' && (
                    <>Optional organization name and contact details for your analyst account.</>
                  )}
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="label">Full name <span className="text-red-400">*</span></label>
                    <input type="text" className="input" placeholder="Jane Smith"
                      value={ob.fullName} onChange={e => obSet('fullName', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="tel" className="input" placeholder="+1 (555) 000-0000"
                      value={ob.phone} onChange={e => obSet('phone', e.target.value)} />
                  </div>
                  {ob.role === 'emergency_responder' && (
                    <>
                      <div>
                        <label className="label">
                          Station / department name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Clayton Fire Station #1"
                          value={ob.orgName}
                          onChange={e => { obSet('orgName', e.target.value); setError('') }}
                        />
                      </div>
                      <div>
                        <label className="label">
                          Station / command post address <span className="text-red-400">*</span>
                        </label>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          Search, pick a suggestion, then use Verify &amp; Save — same as the in-app onboarding flow.
                        </p>
                        <AddressVerifySave
                          variant="light"
                          hint="Fire station, staging area, or command post — numbered street address required."
                          value={responderStationDraft}
                          onChange={v => {
                            setResponderStationDraft(v)
                            setError('')
                          }}
                          savedAddress={verifiedResponderStationLine}
                          onVerifiedSave={async (line: string) => {
                            setVerifiedResponderStationLine(line)
                            setResponderStationDraft(line)
                          }}
                        />
                      </div>
                    </>
                  )}
                  {ob.role === 'data_analyst' && (
                    <div>
                      <label className="label">Institution / organization <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Stanford University, USGS"
                        value={ob.orgName}
                        onChange={e => obSet('orgName', e.target.value)}
                      />
                    </div>
                  )}
                  {ob.role === 'evacuee' && (
                    <div>
                      <label className="label">Home address <span className="text-red-400">*</span></label>
                      <AddressAutocomplete
                        value={ob.address}
                        onChange={v => { obSet('address', v); setError('') }}
                        variant="light"
                        placeholder="123 Main Street, City, ST 12345"
                        required
                      />
                    </div>
                  )}
                </div>

                {error && onboardingStep === 2 && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>
                )}

                <button onClick={handleNext}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 3: Preferences + Emergency Contact ── */}
            {mode === 'signup' && onboardingStep === 3 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setOnboardingStep(2); setError('') }} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">Preferences</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Step 3 of {signupStepTotal}</p>
                  </div>
                </div>

                <div className="mb-6 space-y-5">
                  {/* Language */}
                  <div>
                    <label className="label">Preferred language</label>
                    <div ref={langRef} className="relative">
                      <button onClick={() => setShowLangDrop(v => !v)}
                        className="input w-full flex items-center justify-between text-left">
                        <span>{selectedLang ? `${selectedLang.name} — ${selectedLang.native}` : 'English'}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>
                      {showLangDrop && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                          <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                            <input type="text" className="input py-2" placeholder="Search languages..."
                              value={langSearch} onChange={e => setLangSearch(e.target.value)} autoFocus />
                          </div>
                          <ul className="max-h-48 overflow-y-auto">
                            {filteredLangs.map(l => (
                              <li key={l.code}
                                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-base hover:bg-gray-50 dark:hover:bg-gray-700 ${l.code === ob.language ? 'font-medium text-forest-600 dark:text-forest-400' : 'text-gray-700 dark:text-gray-200'}`}
                                onMouseDown={() => { obSet('language', l.code); setShowLangDrop(false); setLangSearch('') }}>
                                <span>{l.name}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{l.native}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Communication needs */}
                  <div>
                    <label className="label">Communication needs <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {COMM_OPTIONS.map(opt => (
                        <button key={opt} type="button" onClick={() => toggleComm(opt)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                            ob.communicationNeeds.includes(opt)
                              ? 'border-forest-600 bg-forest-50 text-forest-800 dark:bg-forest-950/40 dark:text-forest-200'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ob.role === 'evacuee' && (
                    <div>
                      <label className="label">
                        Mobility, access &amp; health <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        Helps responders and family understand what might affect evacuation or check-ins.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {MOBILITY_ACCESS_OPTIONS.map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleMobility(key)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                              ob.mobilityAccessNeeds.includes(key)
                                ? 'border-forest-600 bg-forest-50 text-forest-800 dark:bg-forest-950/40 dark:text-forest-200'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {ob.mobilityAccessNeeds.includes('other') && (
                        <label className="block mt-3">
                          <span className="label">Describe your situation</span>
                          <textarea
                            className="input mt-1 min-h-[88px] resize-y"
                            placeholder="Anything unique we should know (optional)"
                            value={ob.mobilityAccessOther}
                            onChange={e => obSet('mobilityAccessOther', e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Emergency contact */}
                  <div>
                    <label className="label">Emergency contact <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="space-y-2">
                      <input type="text" className="input" placeholder="Contact name"
                        value={ob.emergencyContactName} onChange={e => obSet('emergencyContactName', e.target.value)} />
                      <input type="tel" className="input" placeholder="Contact phone"
                        value={ob.emergencyContactPhone} onChange={e => obSet('emergencyContactPhone', e.target.value)} />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>
                )}

                <button onClick={handleNext} disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {ob.role === 'evacuee' ? 'Loading…' : 'Creating account...'}
                    </span>
                  ) : ob.role === 'evacuee' ? (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Create account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 4: Terms & consent (evacuee only) ── */}
            {mode === 'signup' && onboardingStep === 4 && ob.role === 'evacuee' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(3)
                      setConsentError('')
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">Before you continue</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Step 4 of 4</p>
                  </div>
                </div>

                <p className="mb-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  Please review and agree to the following to use WildfireAlert. Read our{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-800 underline underline-offset-2 hover:text-green-950 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-800 underline underline-offset-2 hover:text-green-950 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    Privacy Policy
                  </Link>
                  {' '}
                  (each opens in a new tab).
                </p>
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                  Your health information is encrypted and only shared with emergency responders during active incidents in your area. You control what you share and can remove it anytime in Settings.
                </div>

                <div className="mb-6 space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 accent-forest-600"
                      checked={locationConsent}
                      onChange={e => {
                        setLocationConsent(e.target.checked)
                        if (e.target.checked) setConsentError('')
                      }}
                    />
                    <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                      I agree that my home address and general location will be shared with emergency responders in my area during an active wildfire incident.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 accent-forest-600"
                      checked={evacuationConsent}
                      onChange={e => {
                        setEvacuationConsent(e.target.checked)
                        if (e.target.checked) setConsentError('')
                      }}
                    />
                    <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                      I agree that my evacuation status will be visible to emergency responders during an active incident.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 accent-forest-600"
                      checked={healthConsent}
                      onChange={e => {
                        setHealthConsent(e.target.checked)
                        if (e.target.checked) setConsentError('')
                      }}
                    />
                    <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                      I agree that any health or mobility information I choose to share will be visible to emergency responders to help them assist me safely.
                    </span>
                  </label>
                </div>

                {(!locationConsent || !evacuationConsent || !healthConsent) && (
                  <p className="mb-3 text-sm text-red-600 dark:text-red-400">Please agree to all terms to continue</p>
                )}
                {consentError && (
                  <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                    {consentError}
                  </p>
                )}
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!locationConsent || !evacuationConsent || !healthConsent) {
                      setConsentError('Please agree to all terms to continue')
                      return
                    }
                    setConsentError('')
                    void handleSignup()
                  }}
                  disabled={loading || !locationConsent || !evacuationConsent || !healthConsent}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <>Create account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 5: Check email ── */}
            {mode === 'signup' && onboardingStep === 5 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-forest-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Check your inbox</h2>
                <p className="mb-6 text-base leading-relaxed text-gray-500 dark:text-gray-400">
                  We sent a confirmation link to <strong className="text-gray-800 dark:text-gray-200">{email}</strong>. Click it to activate your account, then come back to sign in.
                </p>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Don&apos;t see it? Check your spam folder.</p>
                {signupResendMsg && (
                  <p className="mb-4 text-sm text-forest-800 dark:text-forest-300">{signupResendMsg}</p>
                )}
                <button
                  type="button"
                  disabled={resendBusy || !email.trim()}
                  onClick={() => void resendConfirmationEmail()}
                  className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                </button>
                <button
                  onClick={() => {
                    setMode('login')
                    setOnboardingStep(0)
                    setError('')
                    setSignupResendMsg('')
                    setLocationConsent(false)
                    setEvacuationConsent(false)
                    setHealthConsent(false)
                    setConsentError('')
                  }}
                  className="btn-primary w-full"
                >
                  Go to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
