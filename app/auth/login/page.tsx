'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') || 'caregiver'

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${defaultRole}`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { role: defaultRole } }
        })
        if (error) throw error
        setError('Check your email to confirm your account.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ash-950 bg-noise flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ember-radial pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-ash-500 hover:text-ash-300 mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
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

        <div className="card p-8">
          <h2 className="font-display text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-ash-400 text-sm mb-8">
            {mode === 'login' ? 'Sign in to access your dashboard.' : 'Join the WildfireAlert network.'}
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium px-4 py-3 rounded-lg transition-all duration-200 mb-6 disabled:opacity-50"
          >
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

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ash-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-ash-900 px-3 text-ash-500">or use password</span>
            </div>
          </div>

          {/* Email + Password */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ash-500 hover:text-ash-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-4 ${
              error.includes('Check your email')
                ? 'bg-signal-safe/10 text-signal-safe border border-signal-safe/30'
                : 'bg-signal-danger/10 text-signal-danger border border-signal-danger/30'
            }`}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>

          <p className="text-center text-ash-500 text-sm mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-ember-400 hover:text-ember-300 transition-colors font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
