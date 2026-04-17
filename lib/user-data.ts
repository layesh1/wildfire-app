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

/** Onboarding syncs the account holder as a synthetic row — not someone you monitor. */
export function isPlaceholderSelfMonitoredPerson(p: {
  id?: string
  relationship?: string
  familyRelation?: string
}): boolean {
  if (p.id === 'self-user') return true
  const r = String(p.relationship || '').toLowerCase()
  const fr = String(p.familyRelation || '').toLowerCase()
  return r === 'self' || fr === 'self'
}

export function monitoredPersonsExcludingSelf<
  T extends { id?: string; relationship?: string; familyRelation?: string },
>(persons: T[]): T[] {
  return persons.filter(p => !isPlaceholderSelfMonitoredPerson(p))
}

/**
 * Loads `monitored_persons` then merges anyone linked in `caregiver_family_links` where this user is
 * **either** caregiver or evacuee — so when A adds B, B’s hub shows A even if only the forward row
 * exists or `monitored_persons` JSON was never written on B’s profile.
 */
export async function loadMonitoredPersonsForHub(supabase: SupabaseClient, userId: string): Promise<any[]> {
  const base = await loadPersons(supabase, userId)
  const list = Array.isArray(base) ? base : []
  const byId = new Map<string, Record<string, unknown>>()
  for (const p of list as Record<string, unknown>[]) {
    const id = String(p?.id ?? '').trim()
    if (id) byId.set(id, p)
  }

  const { data: links, error: linkErr } = await supabase
    .from('caregiver_family_links')
    .select('caregiver_user_id, evacuee_user_id')
    .or(`caregiver_user_id.eq.${userId},evacuee_user_id.eq.${userId}`)

  if (linkErr || !Array.isArray(links) || links.length === 0) {
    return list
  }

  const linkedOthers = new Set<string>()
  for (const row of links as { caregiver_user_id?: string; evacuee_user_id?: string }[]) {
    const c = String(row?.caregiver_user_id ?? '').trim()
    const e = String(row?.evacuee_user_id ?? '').trim()
    if (c === userId && e && e !== userId) linkedOthers.add(e)
    else if (e === userId && c && c !== userId) linkedOthers.add(c)
  }

  const linkedIds = [...linkedOthers]

  const missingIds = linkedIds.filter(id => !byId.has(id))
  if (missingIds.length === 0) {
    return list
  }

  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', missingIds)

  let addedFromLinks = 0
  if (!profErr && Array.isArray(profs)) {
    for (const pr of profs as { id?: string; full_name?: string | null }[]) {
      const id = String(pr?.id ?? '').trim()
      if (!id || byId.has(id)) continue
      const name = (typeof pr.full_name === 'string' ? pr.full_name.trim() : '') || 'Family'
      byId.set(id, {
        id,
        name,
        relationship: 'Family',
        familyRelation: 'Family',
        mobility: 'Mobile Adult',
        address: '',
        phone: '',
        email: '',
        notes: '',
      })
      addedFromLinks += 1
    }
  }

  const merged = Array.from(byId.values())
  try {
    localStorage.setItem(PERSONS_LS, JSON.stringify(merged))
  } catch {}

  if (addedFromLinks > 0) {
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ monitored_persons: merged })
      .eq('id', userId)
    if (upErr) {
      console.error('[loadMonitoredPersonsForHub] backfill monitored_persons failed:', upErr.message, upErr)
    }
  }

  return merged
}

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
  const { error } = await supabase.from('profiles').update({ monitored_persons: persons }).eq('id', userId)
  if (error) {
    console.error('[savePersons] profiles update failed:', error.message, error)
  }
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
