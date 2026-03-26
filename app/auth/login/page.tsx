'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/languages'

// ── Address autocomplete (Nominatim) ─────────────────────────────────────────
interface NominatimResult { place_id: number; display_name: string }

function AddressInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
        const data = await res.json()
        setSuggestions(data)
        setShowDrop(data.length > 0)
      } catch { /* ignore */ }
    }, 400)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        className="input"
        placeholder="123 Main St, City, CA"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        autoComplete="off"
      />
      {showDrop && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
          {suggestions.map(s => (
            <li
              key={s.place_id}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 border-b border-gray-100 last:border-0"
              onMouseDown={() => { onChange(s.display_name); setSuggestions([]); setShowDrop(false) }}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Onboarding state ──────────────────────────────────────────────────────────
interface OnboardingData {
  fullName: string
  phone: string
  address: string
  role: 'caregiver' | 'emergency_responder' | 'data_analyst'
  inviteCode: string
  language: string
  emergencyContactName: string
  emergencyContactPhone: string
  communicationNeeds: string[]
}

const COMM_OPTIONS = ['Screen reader', 'Large text', 'Translation needed', 'Deaf / hard of hearing', 'Limited English']

const ROLE_INFO = {
  caregiver: {
    label: 'Caregiver / Evacuee',
    desc: 'Monitor wildfires, plan evacuations, and keep your people safe.',
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

  // signup onboarding
  const [onboardingStep, setOnboardingStep] = useState(0) // 0 = credentials, 1-3 = steps, 4 = done
  const [ob, setOb] = useState<OnboardingData>({
    fullName: '', phone: '', address: '',
    role: 'caregiver', inviteCode: '',
    language: 'en',
    emergencyContactName: '', emergencyContactPhone: '',
    communicationNeeds: [],
  })
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [langSearch, setLangSearch] = useState('')
  const [showLangDrop, setShowLangDrop] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const errorParam = searchParams.get('error')

  const filteredLangs = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  )

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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  // Step 0 → 1: validate credentials, move to onboarding
  async function handleCredentialsNext() {
    if (!email || !password) return
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setOnboardingStep(1)
  }

  // Step 1 validation
  function step1Valid() { return ob.fullName.trim().length > 0 }

  // Step 2 validation (role + invite code if restricted)
  async function validateStep2(): Promise<boolean> {
    if (!ROLE_INFO[ob.role].restricted) return true
    if (!ob.inviteCode.trim()) { setCodeError('Enter your invite code.'); return false }
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await fetch('/api/invite/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ob.inviteCode.trim(), email, role: ob.role }),
      })
      const data = await res.json()
      if (!res.ok) { setCodeError(data.error || 'Invalid code.'); return false }
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
      if (!step1Valid()) return
      setOnboardingStep(2)
    } else if (onboardingStep === 2) {
      const ok = await validateStep2()
      if (ok) setOnboardingStep(3)
    } else if (onboardingStep === 3) {
      await handleSignup()
    }
  }

  // Final signup
  async function handleSignup() {
    setLoading(true)
    setError('')
    try {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signupErr) throw signupErr

      // Save profile data immediately (works before email confirmation)
      if (data.user) {
        const profilePayload: Record<string, unknown> = {
          full_name: ob.fullName.trim(),
          phone: ob.phone.trim(),
          address: ob.address.trim(),
          role: ob.role,
          roles: [ob.role],
          language_preference: ob.language,
          communication_needs: ob.communicationNeeds,
          ...(ob.emergencyContactName && { emergency_contact_name: ob.emergencyContactName.trim() }),
          ...(ob.emergencyContactPhone && { emergency_contact_phone: ob.emergencyContactPhone.trim() }),
        }
        await supabase.from('profiles').upsert({ id: data.user.id, ...profilePayload })
      }

      if (data.session) {
        window.location.href = '/dashboard'
      } else {
        setOnboardingStep(4)
      }
    } catch (err: any) {
      setError(err.message)
      setOnboardingStep(0)
    } finally {
      setLoading(false)
    }
  }

  // Login
  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
                {onboardingStep === 1 && <>Tell us about<br/>yourself.</>}
                {onboardingStep === 2 && <>How will you<br/>use this?</>}
                {onboardingStep === 3 && <>Almost done.</>}
                {onboardingStep === 4 && <>You're all set.</>}
              </h2>
              <p className="text-green-200/70 text-base leading-relaxed mb-10">
                {onboardingStep === 0 && 'Get personalized evacuation alerts, plan safe routes, and protect the people in your care before the fire reaches you.'}
                {onboardingStep === 1 && 'This helps us pre-fill your emergency profile so you\'re ready to act when every minute counts.'}
                {onboardingStep === 2 && 'Your role determines which tools and dashboards you\'ll see. You can always add more roles later.'}
                {onboardingStep === 3 && 'Set your language and emergency contact so we can reach the right people the right way.'}
                {onboardingStep === 4 && 'Check your inbox to confirm your email, then sign in to access your dashboard.'}
              </p>
              {/* Step indicators */}
              {onboardingStep > 0 && onboardingStep < 4 && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`h-1 rounded-full flex-1 transition-all ${s <= onboardingStep ? 'bg-green-400' : 'bg-white/20'}`} />
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
      <div className="flex-1 flex flex-col bg-gray-50">
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
                <p className="text-gray-500 text-sm mb-6 text-center">Sign in to your dashboard.</p>

                <button onClick={handleGoogleLogin} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium px-4 py-3 rounded-lg transition-all duration-200 mb-6 disabled:opacity-50 border border-gray-200 shadow-sm">
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
                  <div className="relative flex justify-center text-xs"><span className="bg-gray-50 px-3 text-gray-400">or use email</span></div>
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

                {(error || errorParam) && (
                  <div className="text-sm px-4 py-3 rounded-lg mb-4 bg-red-50 text-red-600 border border-red-200">
                    {error || errorParam}
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

                <p className="text-center text-gray-500 text-sm mt-6">
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); setOnboardingStep(0) }}
                    className="text-forest-600 hover:text-forest-700 transition-colors font-medium">
                    Sign up free
                  </button>
                </p>
              </>
            )}

            {/* ── SIGNUP — Step 0: Credentials ── */}
            {mode === 'signup' && onboardingStep === 0 && (
              <>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-1 text-center">Create your account</h2>
                <p className="text-gray-500 text-sm mb-6 text-center">Free to use. No credit card required.</p>

                <button onClick={handleGoogleLogin} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium px-4 py-3 rounded-lg transition-all duration-200 mb-6 disabled:opacity-50 border border-gray-200 shadow-sm">
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
                  <div className="relative flex justify-center text-xs"><span className="bg-gray-50 px-3 text-gray-400">or use email</span></div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" className="input" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} />
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

                {error && (
                  <div className="text-sm px-4 py-3 rounded-lg mb-4 bg-red-50 text-red-600 border border-red-200">{error}</div>
                )}

                <button onClick={handleCredentialsNext} disabled={!email || !password}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-gray-500 text-sm mt-6">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError('') }}
                    className="text-forest-600 hover:text-forest-700 transition-colors font-medium">
                    Sign in
                  </button>
                </p>
              </>
            )}

            {/* ── SIGNUP — Step 1: Basic Info ── */}
            {mode === 'signup' && onboardingStep === 1 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setOnboardingStep(0)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">About you</h2>
                    <p className="text-gray-400 text-xs">Step 1 of 3</p>
                  </div>
                </div>

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
                  <div>
                    <label className="label">Home address <span className="text-gray-400 font-normal">(optional)</span></label>
                    <AddressInput value={ob.address} onChange={v => obSet('address', v)} />
                    <p className="text-xs text-gray-400 mt-1">Used to monitor nearby fires and pre-fill your emergency profile.</p>
                  </div>
                </div>

                <button onClick={handleNext} disabled={!step1Valid()}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 2: Role ── */}
            {mode === 'signup' && onboardingStep === 2 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setOnboardingStep(1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">Your role</h2>
                    <p className="text-gray-400 text-xs">Step 2 of 3</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {(Object.entries(ROLE_INFO) as [keyof typeof ROLE_INFO, typeof ROLE_INFO[keyof typeof ROLE_INFO]][]).map(([key, info]) => (
                    <button key={key} onClick={() => { obSet('role', key); setCodeError('') }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        ob.role === key
                          ? 'border-forest-600 bg-forest-50 ring-1 ring-forest-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{info.label}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{info.desc}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          {info.restricted && (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Invite only</span>
                          )}
                          {ob.role === key && <Check className="w-4 h-4 text-forest-600" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {ROLE_INFO[ob.role].restricted && (
                  <div className="mb-6">
                    <label className="label">Invite code</label>
                    <input type="text" className="input font-mono" placeholder="XXXX-XXXX"
                      value={ob.inviteCode} onChange={e => { obSet('inviteCode', e.target.value); setCodeError('') }} />
                    {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
                  </div>
                )}

                <button onClick={handleNext} disabled={codeLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {codeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 3: Preferences + Emergency Contact ── */}
            {mode === 'signup' && onboardingStep === 3 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setOnboardingStep(2)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-bold text-gray-900">Preferences</h2>
                    <p className="text-gray-400 text-xs">Step 3 of 3</p>
                  </div>
                </div>

                <div className="space-y-5 mb-6">
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
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-2 border-b border-gray-100">
                            <input type="text" className="input text-sm py-1.5" placeholder="Search languages..."
                              value={langSearch} onChange={e => setLangSearch(e.target.value)} autoFocus />
                          </div>
                          <ul className="max-h-48 overflow-y-auto">
                            {filteredLangs.map(l => (
                              <li key={l.code}
                                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 ${l.code === ob.language ? 'text-forest-600 font-medium' : 'text-gray-700'}`}
                                onMouseDown={() => { obSet('language', l.code); setShowLangDrop(false); setLangSearch('') }}>
                                <span>{l.name}</span>
                                <span className="text-gray-400 text-xs">{l.native}</span>
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
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            ob.communicationNeeds.includes(opt)
                              ? 'border-forest-600 bg-forest-50 text-forest-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

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
                  <div className="text-sm px-4 py-3 rounded-lg mb-4 bg-red-50 text-red-600 border border-red-200">{error}</div>
                )}

                <button onClick={handleNext} disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : <>Create account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </>
            )}

            {/* ── SIGNUP — Step 4: Check email ── */}
            {mode === 'signup' && onboardingStep === 4 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-forest-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Check your inbox</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  We sent a confirmation link to <strong className="text-gray-700">{email}</strong>. Click it to activate your account, then come back to sign in.
                </p>
                <p className="text-xs text-gray-400 mb-6">Don't see it? Check your spam folder.</p>
                <button onClick={() => { setMode('login'); setOnboardingStep(0); setError('') }}
                  className="btn-primary w-full">
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
