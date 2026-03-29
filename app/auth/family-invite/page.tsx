'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function FamilyInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')?.trim() || ''
  const [token, setToken] = useState(tokenParam)
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
      setToken(tokenParam)
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('wfa_family_invite_token')
      if (stored) setToken(stored)
    }
  }, [tokenParam])

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
    const t = token.trim()
    if (!t) {
      setError('Missing invitation link. Ask your family member to send the invite again.')
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
      setSuccess(data.message || 'Connected in My Family.')
      setTimeout(() => {
        router.replace('/dashboard')
      }, 2000)
    } catch {
      setError('Something went wrong.')
    } finally {
      setAccepting(false)
    }
  }

  const loginHref = token
    ? `/auth/login?mode=login&next=${encodeURIComponent(`/auth/family-invite?token=${encodeURIComponent(token)}`)}`
    : '/auth/login?mode=login'

  if (!token && !loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-gray-900">Family invite</h1>
        <p className="mt-2 text-sm text-gray-600">This link is missing a token. Open the link from your email.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-sm font-semibold text-green-700">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-xl font-bold text-gray-900">Family invitation</h1>
      <p className="mt-2 text-sm text-gray-600">
        Accept to connect in My Family. You must be signed in with the <strong>same email</strong> this invite was sent
        to.
      </p>

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
            disabled={accepting || !token}
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
