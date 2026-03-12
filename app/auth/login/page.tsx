'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Eye, EyeOff, ArrowLeft, ShieldCheck, Lock, Check, Heart, Shield, BarChart3, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const PROTECTED_ROLES = ['data_analyst', 'emergency_responder']

const ROLE_OPTIONS = [
  {
    value: 'caregiver',
    label: 'Caregiver / Evacuee',
    description: 'Evacuation alerts, safety check-ins, emergency profile',
    icon: Heart,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    activeBorder: 'border-amber-500 bg-amber-500/10',
  },
  {
    value: 'emergency_responder',
    label: 'Emergency Responder',
    description: 'Live incident map, COMMAND-INTEL AI, signal gap analysis',
    icon: Shield,
    color: 'text-red-400',
    border: 'border-red-500/40',
    activeBorder: 'border-red-500 bg-red-500/10',
  },
  {
    value: 'data_analyst',
    label: 'Data Analyst',
    description: 'Signal gap analysis, equity metrics, ML models',
    icon: BarChart3,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    activeBorder: 'border-blue-500 bg-blue-500/10',
  },
]

const ROLE_LABELS: Record<string, { label: string; hint: string }> = {
  data_analyst: {
    label: 'Data Analyst',
    hint: 'Requires an invite code sent to your institutional or work email.',
  },
  emergency_responder: {
    label: 'Emergency Responder',
    hint: 'Requires an organization access code from your agency or department.',
  },
  caregiver: { label: 'Caregiver / Evacuee', hint: '' },
}

const ROLE_DESTINATIONS: Record<string, string> = {
  emergency_responder: '/dashboard/responder',
  data_analyst: '/dashboard/analyst',
  caregiver: '/dashboard/caregiver',
  evacuee: '/dashboard/caregiver',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Step 1: pick role. Step 2: authenticate.
  const [step, setStep] = useState<1 | 2>(searchParams.get('role') ? 2 : 1)
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || '')

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [error, setError] = useState('')

  const [inviteCode, setInviteCode] = useState('')
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifiedOrgName, setVerifiedOrgName] = useState<string | null>(null)
  const [verifiedCodeId, setVerifiedCodeId] = useState<string | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)

  const needsCode = mode === 'signup' && PROTECTED_ROLES.includes(selectedRole)
  const roleInfo = ROLE_LABELS[selectedRole] ?? ROLE_LABELS.caregiver
  const roleOption = ROLE_OPTIONS.find(r => r.value === selectedRole)

  function pickRole(role: string) {
    setSelectedRole(role)
    setCodeVerified(false)
    setInviteCode('')
    setError('')
  }

  function confirmRole() {
    if (!selectedRole) return
    setError('')
    setStep(2)
  }

  async function verifyCode() {
    if (!inviteCode.trim()) return
    setCodeLoading(true)
    setError('')
    const res = await fetch('/api/invite/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode.trim(), email }),
    })
    const data = await res.json()
    if (!res.ok || !data.valid) {
      setError(data.error || 'Invalid code.')
      setCodeVerified(false)
    } else {
      setCodeVerified(true)
      setVerifiedOrgName(data.org_name)
      setVerifiedCodeId(data.code_id)
      setError('')
    }
    setCodeLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    // Also set a cookie so server-side callback can read the role reliably
    document.cookie = `pending_role=${selectedRole};path=/;max-age=300`
    const redirectTo = `${window.location.origin}/auth/callback?role=${selectedRole}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const handleGithubLogin = async () => {
    setGithubLoading(true)
    setError('')
    document.cookie = `pending_role=${selectedRole};path=/;max-age=300`
    const redirectTo = `${window.location.origin}/auth/callback?role=${selectedRole}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    })
    if (error) { setError(error.message); setGithubLoading(false) }
  }

  const handleSubmit = async () => {
    if (needsCode && !codeVerified) {
      setError('Please verify your access code first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, roles')
            .eq('id', authData.user.id)
            .single()

          const existingRoles: string[] = Array.isArray(profile?.roles) && profile.roles.length
            ? profile.roles
            : profile?.role ? [profile.role] : ['caregiver']

          const alreadyHasRole = existingRoles.includes(selectedRole)

          if (alreadyHasRole) {
            await supabase.from('profiles').update({ role: selectedRole }).eq('id', authData.user.id)
            router.push(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')
          } else if (PROTECTED_ROLES.includes(selectedRole)) {
            router.push(`/auth/add-role?role=${selectedRole}`)
          } else {
            const updatedRoles = [...new Set([...existingRoles, selectedRole])]
            await supabase.from('profiles').upsert(
              { id: authData.user.id, email: authData.user.email, role: selectedRole, roles: updatedRoles },
              { onConflict: 'id' }
            )
            router.push(ROLE_DESTINATIONS[selectedRole] ?? '/dashboard')
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { role: selectedRole, org_name: verifiedOrgName ?? undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}${verifiedCodeId ? `&code_id=${verifiedCodeId}` : ''}`,
          },
        })
        if (error) throw error
        if (verifiedCodeId) {
          await fetch('/api/invite/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code_id: verifiedCodeId }),
          })
        }
        setError('Check your email to confirm your account.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email && password && (!needsCode || codeVerified)

  return (
    <main className="min-h-screen bg-ash-950 bg-noise flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ember-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/')}
          className="flex items-center gap-2 text-ash-500 hover:text-ash-300 mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 2 ? 'Change role' : 'Back'}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ember-500/20 border border-ember-500/40 flex items-center justify-center">
            <Flame className="w-5 h-5 text-ember-400" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-xl leading-none">WildfireAlert</div>
            <div className="text-ash-500 text-xs">Equity-driven evacuation intelligence</div>
          </div>
        </div>

        {/* ── STEP 1: Role picker ── */}
        {step === 1 && (
          <div className="card p-8">
            <h2 className="font-display text-2xl font-bold text-white mb-1">Who are you?</h2>
            <p className="text-ash-400 text-sm mb-6">Select your role to get started.</p>

            <div className="space-y-3 mb-6">
              {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, color, border, activeBorder }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => pickRole(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-ash-900 transition-all text-left ${
                    selectedRole === value ? activeBorder : `${border} hover:border-ash-600 hover:bg-ash-800/50`
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    selectedRole === value ? 'bg-ash-800 border-ash-600' : 'bg-ash-800/50 border-ash-700'
                  }`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${selectedRole === value ? color : 'text-white'}`}>{label}</div>
                    <div className="text-ash-500 text-xs mt-0.5">{description}</div>
                  </div>
                  {selectedRole === value
                    ? <Check className={`w-4 h-4 shrink-0 ${color}`} />
                    : <ChevronRight className="w-4 h-4 text-ash-700 shrink-0" />
                  }
                </button>
              ))}
            </div>

            <button
              onClick={confirmRole}
              disabled={!selectedRole}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2: Auth ── */}
        {step === 2 && (
          <div className="card p-8">
            {/* Selected role badge */}
            {roleOption && (
              <div className={`flex items-center gap-2 mb-5 px-3 py-2 rounded-lg border w-fit ${roleOption.activeBorder}`}>
                <roleOption.icon className={`w-4 h-4 ${roleOption.color}`} />
                <span className={`text-sm font-medium ${roleOption.color}`}>{roleOption.label}</span>
              </div>
            )}

            <h2 className="font-display text-2xl font-bold text-white mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-ash-500 text-sm mb-6">
              {mode === 'login' ? 'Sign in to your dashboard.' : 'Create your account to get started.'}
            </p>

            {/* Google */}
            <button onClick={handleGoogleLogin} disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium px-4 py-3 rounded-lg transition-all duration-200 mb-3 disabled:opacity-50">
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* GitHub */}
            <button onClick={handleGithubLogin} disabled={githubLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-medium px-4 py-3 rounded-lg transition-all duration-200 mb-6 disabled:opacity-50 border border-white/10">
              {githubLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              )}
              Continue with GitHub
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ash-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-ash-900 px-3 text-ash-500">or use password</span>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={email} onChange={e => { setEmail(e.target.value); setCodeVerified(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input pr-11"
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ash-500 hover:text-ash-300 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {needsCode && (
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-signal-warn" />
                    Access code
                  </label>
                  <p className="text-ash-500 text-xs mb-2">{roleInfo.hint}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input flex-1 font-mono uppercase tracking-wider"
                      placeholder={selectedRole === 'data_analyst' ? 'DA-XXXX-XXXX' : 'ER-ORG-XXXX'}
                      value={inviteCode}
                      onChange={e => { setInviteCode(e.target.value.toUpperCase()); setCodeVerified(false) }}
                      onKeyDown={e => e.key === 'Enter' && verifyCode()}
                    />
                    <button
                      type="button"
                      onClick={verifyCode}
                      disabled={!inviteCode.trim() || codeLoading}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all shrink-0 ${
                        codeVerified
                          ? 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe'
                          : 'bg-ash-800 border-ash-600 text-ash-300 hover:text-white hover:border-ash-500 disabled:opacity-40'
                      }`}
                    >
                      {codeLoading ? (
                        <div className="w-4 h-4 border border-ash-400/40 border-t-ash-300 rounded-full animate-spin" />
                      ) : codeVerified ? (
                        <Check className="w-4 h-4" />
                      ) : 'Verify'}
                    </button>
                  </div>
                  {codeVerified && (
                    <div className="flex items-center gap-2 mt-2 text-signal-safe text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {verifiedOrgName ? `Verified — ${verifiedOrgName}` : `${roleInfo.label} access verified`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className={`text-sm px-4 py-3 rounded-lg mb-4 ${
                error.includes('Check your email')
                  ? 'bg-signal-safe/10 text-signal-safe border border-signal-safe/30'
                  : 'bg-signal-danger/10 text-signal-danger border border-signal-danger/30'
              }`}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading || !canSubmit} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>

            <p className="text-center text-ash-500 text-sm mt-6">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setCodeVerified(false) }}
                className="text-ember-400 hover:text-ember-300 transition-colors font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
