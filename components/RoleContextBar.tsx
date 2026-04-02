'use client'
import { useEffect, useState } from 'react'
import { User, Shield } from 'lucide-react'
import { useRoleContext } from '@/components/RoleContext'
import { createClient } from '@/lib/supabase'

export default function RoleContextBar() {
  const { mode, activePerson } = useRoleContext()
  const [profileRole, setProfileRole] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        if (!cancelled) setProfileRole(null)
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (!cancelled) setProfileRole(typeof data?.role === 'string' ? data.role : null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Evacuee-oriented strip — not shown for emergency responder accounts. */
  if (
    (mode === 'self' || !activePerson)
    && profileRole === 'emergency_responder'
  ) {
    return null
  }

  if (mode === 'self' || !activePerson) {
    return (
      <div
        className="flex items-center gap-3 border-b border-green-200/60 bg-green-100/40 px-4 py-2 text-sm font-medium text-green-900 dark:border-green-900/40 dark:bg-green-950/35 dark:text-green-100"
      >
        <Shield className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          My Hub — maps and Flameo use your saved home (and your live location when shared)
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 border-b border-amber-200/70 bg-amber-50/80 px-4 py-2 text-sm font-medium text-amber-950 dark:border-amber-900/35 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <User className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-snug">
        Viewing <span className="mx-1 font-bold">{activePerson.name}</span>
        {activePerson.address ? (
          <span className="text-amber-900/70 dark:text-amber-200/80">· map &amp; alerts use their address</span>
        ) : null}
      </p>
    </div>
  )
}
