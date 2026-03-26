'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const WFA_USER_KEYS = [
  'wfa_active_role', 'wfa_claimed_roles', 'wfa_pending_role',
  'wfa_emergency_card', 'wfa_emergency_card_owners',
  'monitored_persons_v2', 'wfa_analyst_prefs',
]

export default function UserSessionGuard() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const storedId = localStorage.getItem('wfa_user_id')
      if (storedId && storedId !== user.id) {
        // Different user logged in — clear all user-specific data
        WFA_USER_KEYS.forEach(k => localStorage.removeItem(k))
        // Also clear any dynamic emergency card keys
        Object.keys(localStorage)
          .filter(k => k.startsWith('wfa_emergency_card_'))
          .forEach(k => localStorage.removeItem(k))
      }
      localStorage.setItem('wfa_user_id', user.id)
    }).catch(err => console.warn('[UserSessionGuard]', err))
  }, [])
  return null
}
