'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame, Lock, ShieldCheck, Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const ROLE_LABELS: Record<string, { label: string; placeholder: string; hint: string }> = {
  data_analyst: {
    label: 'Data Analyst',
    placeholder: 'DA-XXXX-XXXX',
    hint: 'Enter the invite code sent to your institutional or work email.',
  },
  emergency_responder: {
    label: 'Emergency Responder',
    placeholder: 'ER-ORG-XXXX',
    hint: 'Enter the organization code provided by your agency or department.',
  },
}

const ROLE_DESTINATIONS: Record<string, string> = {
  data_analyst: '/dashboard/analyst',
  emergency_responder: '/dashboard/responder',
}

function AddRoleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? ''
  const roleInfo = ROLE_LABELS[role]

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (role && !roleInfo) router.replace('/dashboard')
  }, [role, roleInfo])

  if (!role || !roleInfo) return (
    <main className="min-h-screen bg-ash-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-ember-500/40 border-t-ember-400 rounded-full animate-spin" />
    </main>
  )

  async function verify() {
    setVerifying(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/invite/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), email: user?.email, role }),
    })
    const data = await res.json()

    if (!res.ok || !data.valid) {
      setError(data.error || 'Invalid code.')
    } else if (data.role !== role) {
      setError(`This code is for ${data.role.replace('_', ' ')}, not ${role.replace('_', ' ')}.`)
    } else {
      setVerified(true)
      setOrgName(data.org_name)

      // Apply the role to the user's profile
      setSaving(true)
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const { data: profile } = await supabase.from('profiles').select('role, roles').eq('id', u.id).single()
        const existingRoles: string[] = Array.isArray(profile?.roles) && profile.roles.length
          ? profile.roles : profile?.role ? [profile.role] : []
        const updatedRoles = [...new Set([...existingRoles, role])]

        await supabase.from('profiles').update({
          roles: updatedRoles,
          role,              // set as active role
        }).eq('id', u.id)

        // Always persist to localStorage — reliable even if Supabase roles column is missing
        try {
          localStorage.setItem('wfa_roles', JSON.stringify(updatedRoles))
          localStorage.setItem('wfa_active_role', role)
        } catch { /* ignore */ }

        // Consume invite code
        await fetch('/api/invite/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code_id: data.code_id }),
        })
      }
      setSaving(false)
    }
    setVerifying(false)
  }

  function proceed() {
    window.location.href = ROLE_DESTINATIONS[role] ?? '/dashboard'
  }

  return (
    <main className="min-h-screen bg-ash-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ember-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-ash-500 hover:text-ash-300 mb-8 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

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
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-signal-warn" />
            <h2 className="font-display text-2xl font-bold text-white">Verify access</h2>
          </div>
          <p className="text-ash-400 text-sm mb-6">
            You're requesting <span className="text-white font-medium">{roleInfo.label}</span> access.
            {' '}{roleInfo.hint}
          </p>

          {!verified ? (
            <>
              <label className="block text-ash-300 text-xs font-medium mb-1.5">Access code</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input flex-1 font-mono uppercase tracking-wider"
                  placeholder={roleInfo.placeholder}
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && verify()}
                  disabled={verifying}
                />
                <button
                  onClick={verify}
                  disabled={!code.trim() || verifying}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-ember-500/20 border border-ember-500/40 text-ember-400 hover:bg-ember-500/30 transition-colors disabled:opacity-40 shrink-0"
                >
                  {verifying ? (
                    <div className="w-4 h-4 border border-ember-400/40 border-t-ember-400 rounded-full animate-spin" />
                  ) : 'Verify'}
                </button>
              </div>
              {error && (
                <p className="text-signal-danger text-sm mt-2">{error}</p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-signal-safe/10 border border-signal-safe/30 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-signal-safe shrink-0" />
                <div>
                  <div className="text-signal-safe font-semibold text-sm">
                    {orgName ? `${orgName} access granted` : `${roleInfo.label} access granted`}
                  </div>
                  <div className="text-ash-400 text-xs mt-0.5">
                    This role has been added to your account.
                  </div>
                </div>
              </div>

              <button
                onClick={proceed}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Open {roleInfo.label} dashboard
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function AddRolePage() {
  return <Suspense><AddRoleForm /></Suspense>
}
