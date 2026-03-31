import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import {
  computeEscalationLevel,
  escalationCopy,
  shouldSendEscalationPush,
  shouldSendStatusPrompt,
} from '@/lib/flameo-push-escalation'
import { geocodeAddress } from '@/lib/geocoding'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wildfire-app-three.vercel.app'
const DEFAULT_RADIUS_MI = 50

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const g = await geocodeAddress(address)
    return { lat: g.lat, lon: g.lng }
  } catch {
    return null
  }
}

interface FirmsPoint { lat: number; lon: number; brightness: number; frp: number }

async function getFirmsPoints(): Promise<FirmsPoint[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/fires/firms`)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json?.data) ? json.data : []
  } catch { return [] }
}

type FireRow = {
  latitude: number
  longitude: number
  has_evacuation_order: boolean | null
  containment_pct: number | null
}

function analyzeFireEvents(
  lat: number,
  lon: number,
  radiusMi: number,
  rows: FireRow[]
): { minMi: number | null; hasOrder: boolean; severe: boolean } {
  let minMi = Infinity
  let hasOrder = false
  let severe = false
  for (const r of rows) {
    if (r.latitude == null || r.longitude == null) continue
    const km = haversineKm(lat, lon, r.latitude, r.longitude)
    const mi = km / 1.609344
    if (mi > radiusMi) continue
    if (mi < minMi) minMi = mi
    if (r.has_evacuation_order === true) hasOrder = true
    if (r.has_evacuation_order !== true && (r.containment_pct == null || r.containment_pct < 25)) {
      severe = true
    }
  }
  return {
    minMi: minMi === Infinity ? null : minMi,
    hasOrder,
    severe,
  }
}

function nearestFirmsMiles(lat: number, lon: number, firms: FirmsPoint[], radiusMi: number): number | null {
  let minKm = Infinity
  for (const p of firms) {
    const km = haversineKm(lat, lon, p.lat, p.lon)
    const mi = km / 1.609344
    if (mi <= radiusMi && km < minKm) minKm = km
  }
  if (minKm === Infinity) return null
  return minKm / 1.609344
}

async function sendPush(subscription: object, payload: object) {
  try {
    await webpush.sendNotification(
      subscription as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify(payload)
    )
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode === 410) return 'gone'
    logger.error('push send failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

function hubPathForProfileRole(_role: string | null | undefined): string {
  return '/dashboard/home?flameoBriefing=1'
}

// Vercel cron calls this every ~15 minutes
export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
  )
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription_json')

  if (!subs || subs.length === 0) {
    logger.info('push/check: no subscriptions', { route: 'push/check' })
    return NextResponse.json({ sent: 0 })
  }

  const firmsPoints = await getFirmsPoints()

  const { data: fireRowsRaw } = await supabase
    .from('fire_events')
    .select('latitude, longitude, has_evacuation_order, containment_pct')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(1200)

  const fireRows: FireRow[] = (fireRowsRaw ?? []).filter(
    (r): r is FireRow =>
      typeof r.latitude === 'number'
      && typeof r.longitude === 'number'
  )

  if (firmsPoints.length === 0 && fireRows.length === 0) {
    logger.warn('push/check: no FIRMS or fire_events rows', { route: 'push/check' })
    return NextResponse.json({ sent: 0, note: 'No fire data sources' })
  }

  const userIds = [...new Set(subs.map(s => s.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id, address, role,
      alert_radius_miles,
      last_flameo_push_at, last_flameo_push_level, last_flameo_status_prompt_at
    `)
    .in('id', userIds)

  const profileByUser: Record<string, {
    address: string
    role: string | null
    radiusMi: number
    last_flameo_push_at: string | null
    last_flameo_push_level: number | null
    last_flameo_status_prompt_at: string | null
  }> = {}

  for (const p of profiles ?? []) {
    const addr = (p.address || '').trim()
    if (!addr) continue
    const rawR = p.alert_radius_miles
    const radiusMi =
      typeof rawR === 'number' && rawR > 0 && rawR <= 500 ? rawR : DEFAULT_RADIUS_MI
    profileByUser[p.id] = {
      address: addr,
      role: typeof p.role === 'string' ? p.role : null,
      radiusMi,
      last_flameo_push_at: p.last_flameo_push_at ?? null,
      last_flameo_push_level: p.last_flameo_push_level ?? null,
      last_flameo_status_prompt_at: p.last_flameo_status_prompt_at ?? null,
    }
  }

  const geoCache = new Map<string, { lat: number; lon: number } | null>()
  async function coordsFor(addr: string) {
    if (geoCache.has(addr)) return geoCache.get(addr)!
    const c = await geocode(addr)
    // Batch pacing for geocoding loops.
    await new Promise(resolve => setTimeout(resolve, 1000))
    geoCache.set(addr, c)
    return c
  }

  type ParsedSub = { user_id: string; endpoint: string; subscription: object }
  const parsedSubs: ParsedSub[] = []
  for (const sub of subs) {
    try {
      parsedSubs.push({
        user_id: sub.user_id,
        endpoint: sub.endpoint,
        subscription: JSON.parse(sub.subscription_json),
      })
    } catch { /* skip */ }
  }

  const subsByUser = new Map<string, ParsedSub[]>()
  for (const row of parsedSubs) {
    if (!profileByUser[row.user_id]) continue
    const list = subsByUser.get(row.user_id) ?? []
    list.push(row)
    subsByUser.set(row.user_id, list)
  }

  let sent = 0
  const expiredEndpoints: string[] = []
  const nowMs = Date.now()

  for (const [userId, userSubs] of subsByUser) {
    const prof = profileByUser[userId]
    if (!prof || userSubs.length === 0) continue

    const coords = await coordsFor(prof.address)
    if (!coords) continue

    const fe = analyzeFireEvents(coords.lat, coords.lon, prof.radiusMi, fireRows)
    const firmsMi = firmsPoints.length
      ? nearestFirmsMiles(coords.lat, coords.lon, firmsPoints, prof.radiusMi)
      : null

    const mileCandidates = [fe.minMi, firmsMi].filter((v): v is number => v != null && Number.isFinite(v))
    const milesInRadius = mileCandidates.length > 0 ? Math.min(...mileCandidates) : null

    if (milesInRadius == null && !fe.hasOrder && !fe.severe) continue

    const level = computeEscalationLevel({
      milesInRadius: milesInRadius ?? fe.minMi ?? firmsMi ?? null,
      hasMandatoryOrderInRadius: fe.hasOrder,
      hasSevereUncontainedInRadius: fe.severe,
    })
    if (level == null) continue

    const milesForCopy = milesInRadius ?? fe.minMi ?? firmsMi ?? 1
    const { title, body } = escalationCopy(level, milesForCopy)
    const hubUrl = hubPathForProfileRole(prof.role)

    const lastPushAtMs = prof.last_flameo_push_at
      ? new Date(prof.last_flameo_push_at).getTime()
      : 0
    const lastStatusAtMs = prof.last_flameo_status_prompt_at
      ? new Date(prof.last_flameo_status_prompt_at).getTime()
      : 0

    const sendMain = shouldSendEscalationPush({
      level,
      nowMs,
      lastPushAtMs,
      lastLevel: prof.last_flameo_push_level,
    })

    const activeIncident = level >= 1 && level <= 4
    const sendStatus = shouldSendStatusPrompt({
      activeIncident,
      nowMs,
      lastStatusPromptAtMs: lastStatusAtMs,
    })

    const profilePatch: Record<string, string | number> = {}
    const isoNow = new Date().toISOString()

    for (const sub of userSubs) {
      if (sendMain) {
        const payload = {
          title,
          body,
          tag: `flameo-escalation-${level}`,
          url: hubUrl,
        }
        const result = await sendPush(sub.subscription, payload)
        if (result === 'gone') {
          expiredEndpoints.push(sub.endpoint)
        } else {
          sent++
          profilePatch.last_flameo_push_at = isoNow
          profilePatch.last_flameo_push_level = level
        }
      }

      if (sendStatus) {
        const statusPayload = {
          title: 'Update your evacuation status',
          body: 'Open your hub and let Flameo know if you are safe or need help.',
          tag: 'flameo-status-prompt',
          url: hubUrl,
        }
        const result = await sendPush(sub.subscription, statusPayload)
        if (result === 'gone') {
          expiredEndpoints.push(sub.endpoint)
        } else {
          sent++
          profilePatch.last_flameo_status_prompt_at = isoNow
        }
      }
    }

    if (Object.keys(profilePatch).length > 0) {
      await supabase.from('profiles').update(profilePatch).eq('id', userId)
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  logger.info('push/check complete', { route: 'push/check', sent, expired: expiredEndpoints.length, subscribers: subs.length })
  return NextResponse.json({ sent, expired: expiredEndpoints.length })
}
