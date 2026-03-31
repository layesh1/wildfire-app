'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/** Same token as in email; strips grouping spaces/dashes from pasted “invite code”. */
function normalizeInviteToken(s: string) {
  return s.trim().replace(/[\s-]/g, '')
}

function FamilyInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')?.trim() || ''
  const [inviteCode, setInviteCode] = useState(tokenParam)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (tokenParam) {
      try {
        sessionStorage.setItem('wfa_family_invite_token', tokenParam)
      } catch {
        /* ignore */
      }
      setInviteCode(tokenParam)
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('wfa_family_invite_token')
      if (stored) setInviteCode(stored)
    }
  }, [tokenParam])

  useEffect(() => {
    if (!inviteCode.trim()) return
    try {
      sessionStorage.setItem('wfa_family_invite_token', inviteCode)
    } catch {
      /* ignore */
    }
  }, [inviteCode])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled) {
        setUserId(user?.id ?? null)
        setLoading(false)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  async function accept() {
    const t = normalizeInviteToken(inviteCode)
    if (!t) {
      setError('Paste the invite code from your email, or open the link from the email.')
      return
    }
    setAccepting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/family/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not accept invitation.')
        return
      }
      try {
        sessionStorage.removeItem('wfa_family_invite_token')
      } catch {
        /* ignore */
      }
      setSuccess(data.message || 'Connected in My People.')
      setTimeout(() => {
        router.replace('/dashboard')
      }, 2000)
    } catch {
      setError('Something went wrong.')
    } finally {
      setAccepting(false)
    }
  }

  const loginHref = inviteCode.trim()
    ? `/auth/login?mode=login&next=${encodeURIComponent(`/auth/family-invite?token=${encodeURIComponent(normalizeInviteToken(inviteCode))}`)}`
    : '/auth/login?mode=login'

  const hasCode = Boolean(normalizeInviteToken(inviteCode))

  if (!hasCode && !loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-xl font-bold text-gray-900">My People invite</h1>
        <p className="mt-2 text-sm text-gray-600">
          Paste the <strong>invite code</strong> from your email (or open the link from the email).
        </p>
        <label htmlFor="wfa-invite-code" className="mt-6 block text-left text-xs font-medium text-gray-700">
          Invite code
        </label>
        <input
          id="wfa-invite-code"
          type="text"
          autoComplete="off"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Paste the code from your email"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
        <Link href="/auth/login" className="mt-6 inline-block text-sm font-semibold text-green-700">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-xl font-bold text-gray-900">My People invitation</h1>
      <p className="mt-2 text-sm text-gray-600">
        Accept to connect in My People. You must be signed in with the <strong>same email</strong> this invite was sent
        to.
      </p>
      {hasCode && (
        <div className="mt-4">
          <label htmlFor="wfa-invite-code-edit" className="block text-xs font-medium text-gray-700">
            Invite code (from email)
          </label>
          <input
            id="wfa-invite-code-edit"
            type="text"
            autoComplete="off"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading…</p>
      ) : !userId ? (
        <div className="mt-8 space-y-3">
          <Link
            href={loginHref}
            className="block w-full rounded-xl bg-green-700 py-3 text-center text-sm font-semibold text-white"
          >
            Sign in to accept
          </Link>
          <p className="text-xs text-gray-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/auth/login?mode=signup" className="font-semibold text-green-800 underline">
              Sign up
            </Link>{' '}
            with this email first, then return to this page.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <button
            type="button"
            disabled={accepting || !hasCode}
            onClick={() => accept()}
            className="w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {accepting ? 'Accepting…' : 'Accept invitation'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
        </div>
      )}
    </div>
  )
}

export default function FamilyInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading…</div>}>
      <FamilyInviteInner />
    </Suspense>
  )
}
