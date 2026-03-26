/**
 * user-data.ts
 *
 * Syncs critical user data (persons, go-bag, check-in status) across
 * devices via Supabase profiles table. localStorage is kept as a cache
 * and fallback so pages still work offline.
 *
 * Usage:
 *   const persons = await loadPersons(supabase, userId)
 *   await savePersons(supabase, userId, persons)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Persons ──────────────────────────────────────────────────────────────────

const PERSONS_LS = 'monitored_persons_v2'

export async function loadPersons(supabase: SupabaseClient, userId: string): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('monitored_persons')
      .eq('id', userId)
      .single()
    const dbPersons: any[] = Array.isArray(data?.monitored_persons) ? data.monitored_persons : []

    // If DB has data, use it and update localStorage cache
    if (dbPersons.length > 0) {
      try { localStorage.setItem(PERSONS_LS, JSON.stringify(dbPersons)) } catch {}
      return dbPersons
    }

    // Fall back to localStorage (migrate up to DB on next save)
    const raw = localStorage.getItem(PERSONS_LS)
    return raw ? JSON.parse(raw) : []
  } catch {
    try {
      const raw = localStorage.getItem(PERSONS_LS)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

export async function savePersons(supabase: SupabaseClient, userId: string, persons: any[]) {
  // Always write localStorage immediately (cache)
  try { localStorage.setItem(PERSONS_LS, JSON.stringify(persons)) } catch {}
  // Write to DB (best effort)
  try {
    await supabase
      .from('profiles')
      .update({ monitored_persons: persons })
      .eq('id', userId)
  } catch {}
}

// ── Go-bag ───────────────────────────────────────────────────────────────────

const GOBAG_LS = 'wfa_gobag'

export async function loadGoBag(supabase: SupabaseClient, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('go_bag_checked')
      .eq('id', userId)
      .single()
    const dbItems: string[] = Array.isArray(data?.go_bag_checked) ? data.go_bag_checked : []

    if (dbItems.length > 0) {
      try { localStorage.setItem(GOBAG_LS, JSON.stringify(dbItems)) } catch {}
      return dbItems
    }

    const raw = localStorage.getItem(GOBAG_LS)
    return raw ? JSON.parse(raw) : []
  } catch {
    try {
      const raw = localStorage.getItem(GOBAG_LS)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

export async function saveGoBag(supabase: SupabaseClient, userId: string, items: string[]) {
  try { localStorage.setItem(GOBAG_LS, JSON.stringify(items)) } catch {}
  try {
    await supabase
      .from('profiles')
      .update({ go_bag_checked: items })
      .eq('id', userId)
  } catch {}
}

// ── Check-in status ───────────────────────────────────────────────────────────

const CHECKIN_LS = 'wfa_checkin_status'

export async function loadCheckinStatus(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('checkin_status')
      .eq('id', userId)
      .single()
    if (data?.checkin_status) {
      try { localStorage.setItem(CHECKIN_LS, data.checkin_status) } catch {}
      return data.checkin_status
    }
    return localStorage.getItem(CHECKIN_LS)
  } catch {
    return localStorage.getItem(CHECKIN_LS)
  }
}

export async function saveCheckinStatus(supabase: SupabaseClient, userId: string, status: string) {
  try { localStorage.setItem(CHECKIN_LS, status) } catch {}
  try {
    await supabase
      .from('profiles')
      .update({ checkin_status: status, checkin_at: new Date().toISOString() })
      .eq('id', userId)
  } catch {}
}

// ── Emergency card (name/address from profiles) ───────────────────────────────

export async function loadProfileCard(supabase: SupabaseClient, userId: string): Promise<{ full_name?: string; address?: string } | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, address')
      .eq('id', userId)
      .single()
    if (data?.full_name || data?.address) {
      // Merge into the localStorage emergency card cache
      try {
        const existing = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
        if (data.full_name) existing.full_name = data.full_name
        if (data.address) existing.address = data.address
        localStorage.setItem('wfa_emergency_card', JSON.stringify(existing))
      } catch {}
      return data
    }
    return null
  } catch {
    return null
  }
}
