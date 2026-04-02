'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

function isEmergencyResponderRole(role: string | null | undefined, roles: string[] | null | undefined): boolean {
  if (role === 'emergency_responder') return true
  return Array.isArray(roles) && roles.includes('emergency_responder')
}

/**
 * Web ER signup saves org_name + address; station row + iOS code are created with that save when a session exists.
 * If the user had no session until email confirm, create the station on first hub load (idempotent with 409).
 */
export function useEnsureResponderStationFromProfile() {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    let cancelled = false

    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: p } = await supabase
        .from('profiles')
        .select('role, roles, org_name')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (!isEmergencyResponderRole(p?.role as string | undefined, p?.roles as string[] | undefined)) return

      const org = typeof p?.org_name === 'string' ? p.org_name.trim().slice(0, 200) : ''
      if (!org) return

      const rs = await fetch('/api/station/roster')
      if (!rs.ok || cancelled) return

      const j = (await rs.json()) as { station?: { id?: string } | null }
      if (j.station?.id) {
        ran.current = true
        return
      }

      const cr = await fetch('/api/station/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station_name: org }),
      })
      if (cancelled) return
      if (cr.ok) {
        ran.current = true
        window.dispatchEvent(new Event('wfa-responder-station-refresh'))
        return
      }
      if (cr.status === 409) ran.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
