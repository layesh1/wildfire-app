import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wildfire-app-three.vercel.app'

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function urgencyLabel(hours: number) {
  if (hours < 1) return 'CRITICAL'
  if (hours < 3) return 'HIGH'
  if (hours < 6) return 'ELEVATED'
  return 'WATCH'
}

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'WildfireApp/1.0' } }
    )
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {}
  return null
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

function estimateHours(distKm: number, windMph: number) {
  const R0 = 0.75
  const phi = 0.55 * Math.pow(windMph / 10, 1.3)
  const rKmHr = R0 * (1 + phi) * 0.06
  return distKm / Math.max(rKmHr, 0.01)
}

async function checkAddress(
  address: string,
  firmsPoints: FirmsPoint[]
): Promise<{ level: string; miles: number; hours: number } | null> {
  const coords = await geocode(address)
  if (!coords) return null

  const nearby = firmsPoints
    .map(p => ({ ...p, km: haversineKm(coords.lat, coords.lon, p.lat, p.lon) }))
    .filter(p => p.km <= 80)
    .sort((a, b) => a.km - b.km)

  if (nearby.length === 0) return null

  const nearest = nearby[0]
  const hours = estimateHours(nearest.km, 15) // assume 15 mph wind for background check
  if (hours > 12) return null // not urgent enough

  return {
    level: urgencyLabel(hours),
    miles: Math.round(nearest.km / 1.609),
    hours,
  }
}

async function sendPush(subscription: object, payload: object) {
  try {
    await webpush.sendNotification(
      subscription as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify(payload)
    )
  } catch (err: unknown) {
    // 410 Gone = subscription expired/unsubscribed
    if ((err as { statusCode?: number })?.statusCode === 410) return 'gone'
    logger.error('push send failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

// Vercel cron calls this every 15 minutes
export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
  )
  // Basic auth: only Vercel cron or admin secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all active push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, subscription_json')

  if (!subs || subs.length === 0) {
    logger.info('push/check: no subscriptions', { route: 'push/check' })
    return NextResponse.json({ sent: 0 })
  }

  const firmsPoints = await getFirmsPoints()
  if (firmsPoints.length === 0) {
    logger.warn('push/check: no FIRMS data available', { route: 'push/check' })
    return NextResponse.json({ sent: 0, note: 'No FIRMS data' })
  }

  // Get user profiles for their home addresses
  const userIds = [...new Set(subs.map(s => s.user_id))]
  const { data: cards } = await supabase
    .from('profiles')
    .select('id, address')
    .in('id', userIds)

  const addressByUser: Record<string, string> = {}
  for (const c of cards ?? []) {
    if (c.address) addressByUser[c.id] = c.address
  }

  // Also load monitored persons per user from push_subscriptions metadata
  let sent = 0
  const expiredEndpoints: string[] = []

  for (const sub of subs) {
    let subscription: object
    try {
      subscription = JSON.parse(sub.subscription_json)
    } catch { continue }

    const userAddress = addressByUser[sub.user_id]
    if (!userAddress) continue

    const alert = await checkAddress(userAddress, firmsPoints)
    if (!alert) continue

    const isUrgent = alert.level === 'CRITICAL' || alert.level === 'HIGH'

    const payload = {
      title: `${alert.level} — Fire Alert`,
      body: `A fire is ${alert.miles} mi away${alert.hours < 1 ? ' — leave now' : ` · ~${alert.hours.toFixed(1)}h to reach you`}. Open the app for your evacuation plan.`,
      tag: 'wildfire-alert',
      urgent: isUrgent,
      url: '/dashboard/caregiver/alert',
    }

    const result = await sendPush(subscription, payload)
    if (result === 'gone') {
      expiredEndpoints.push(sub.endpoint)
    } else {
      sent++
    }
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  logger.info('push/check complete', { route: 'push/check', sent, expired: expiredEndpoints.length, subscribers: subs.length })
  return NextResponse.json({ sent, expired: expiredEndpoints.length })
}
