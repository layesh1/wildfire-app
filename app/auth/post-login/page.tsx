'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'

const PROTECTED_ROLES = ['data_analyst', 'emergency_responder']

const CONSUMER_ROLES = new Set(['caregiver', 'evacuee'])

function normalizeConsumerRole(r: string): string {
  return r === 'caregiver' ? 'evacuee' : r
}

const ROLE_DESTINATIONS: Record<string, string> = {
  emergency_responder: '/dashboard/responder',
  data_analyst: '/dashboard/analyst',
  caregiver: '/dashboard/home',
  evacuee: '/dashboard/home',
}

function PostLoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function route() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      // Primary: localStorage (set by login page before OAuth)
      // Fallback: ?role= query param (set by callback, works for email confirmations)
      const stored = typeof window !== 'undefined' ? localStorage.getItem('wfa_pending_role') : null
      const queryRole = searchParams.get('role')
      const intendedRole = normalizeConsumerRole(stored || queryRole || 'evacuee')
      if (stored) localStorage.removeItem('wfa_pending_role')

      // Fetch current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, roles')
        .eq('id', user.id)
        .single()

      const existingRolesRaw: string[] = Array.isArray(profile?.roles) && profile.roles.length
        ? profile.roles
        : profile?.role ? [profile.role] : []
      const existingRoles = [...new Set(existingRolesRaw.map(normalizeConsumerRole))]

      const alreadyHasRole =
        existingRoles.includes(intendedRole) ||
        (intendedRole === 'evacuee' && existingRolesRaw.some(r => CONSUMER_ROLES.has(r)))

      if (alreadyHasRole) {
        // Just switch active role
        await supabase.from('profiles').update({ role: intendedRole }).eq('id', user.id)
        router.replace(ROLE_DESTINATIONS[intendedRole] ?? '/dashboard')
      } else if (PROTECTED_ROLES.includes(intendedRole)) {
        // Needs invite code verification
        router.replace(`/auth/add-role?role=${intendedRole}`)
      } else {
        // Open role — add it
        const updatedRoles = [...new Set([...existingRoles, intendedRole])]
        const isNewUser = !profile || !profile.role
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? null,
            role: intendedRole,
            roles: updatedRoles,
          })
        } else {
          await supabase.from('profiles').update({ role: intendedRole, roles: updatedRoles }).eq('id', user.id)
        }
        // New users go through onboarding wizard; returning users go straight to dashboard
        if (isNewUser) {
          router.replace(`/auth/onboarding?role=${intendedRole}`)
        } else {
          router.replace(ROLE_DESTINATIONS[intendedRole] ?? '/dashboard')
        }
      }
    }
    route()
  }, [])

  return (
    <main className="min-h-screen bg-ash-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-ember-500/40 border-t-ember-400 rounded-full animate-spin" />
        <p className="text-ash-500 text-sm">Setting up your dashboard…</p>
      </div>
    </main>
  )
}

export default function PostLoginPage() {
  return <Suspense><PostLoginRedirect /></Suspense>
}
