'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { distanceMiles } from '@/lib/hub-map-distance'
import { geocodeAddressClient } from '@/lib/geocoding-client'

const MATCH_RADIUS_MILES = 0.5

export type UserLocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export type DetectedAnchor = 'work' | 'home' | 'unknown'

async function geocodeUsLine(location: string): Promise<{ lat: number; lon: number } | null> {
  const q = location.trim()
  if (!q) return null
  try {
    const g = await geocodeAddressClient(q)
    return { lat: g.lat, lon: g.lng }
  } catch {
    return null
  }
}

function weekdayWorkHoursLocal(): boolean {
  const d = new Date()
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  const h = d.getHours()
  return h >= 8 && h < 18
}

export interface UseUserLocationOptions {
  homeAddress: string | null | undefined
  workAddress: string | null | undefined
  /** When false, do not call geolocation (e.g. outside hub). */
  enabled?: boolean
}

export function useUserLocation(options: UseUserLocationOptions) {
  const homeAddress = typeof options.homeAddress === 'string' ? options.homeAddress.trim() : ''
  const workAddress = typeof options.workAddress === 'string' ? options.workAddress.trim() : ''
  const enabled = options.enabled !== false

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [permission, setPermission] = useState<UserLocationPermission>('prompt')
  const [homeGeo, setHomeGeo] = useState<{ lat: number; lon: number } | null>(null)
  const [workGeo, setWorkGeo] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!homeAddress) {
      setHomeGeo(null)
      return
    }
    geocodeUsLine(homeAddress).then(g => {
      if (!cancelled) setHomeGeo(g)
    })
    return () => {
      cancelled = true
    }
  }, [homeAddress])

  useEffect(() => {
    let cancelled = false
    if (!workAddress) {
      setWorkGeo(null)
      return
    }
    geocodeUsLine(workAddress).then(g => {
      if (!cancelled) setWorkGeo(g)
    })
    return () => {
      cancelled = true
    }
  }, [workAddress])

  const requestPosition = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermission('unsupported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setPermission('granted')
      },
      () => {
        setLat(null)
        setLng(null)
        setPermission('denied')
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 }
    )
  }, [])

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return
    if (!navigator.geolocation) {
      setPermission('unsupported')
      return
    }
    requestPosition()
  }, [enabled, requestPosition])

  const detected_anchor: DetectedAnchor = useMemo(() => {
    const hasGps = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
    const pt: [number, number] = hasGps ? [lat!, lng!] : [0, 0]

    if (hasGps && workGeo) {
      const dW = distanceMiles(pt, [workGeo.lat, workGeo.lon])
      if (dW <= MATCH_RADIUS_MILES) return 'work'
    }
    if (hasGps && homeGeo) {
      const dH = distanceMiles(pt, [homeGeo.lat, homeGeo.lon])
      if (dH <= MATCH_RADIUS_MILES) return 'home'
    }
    if (hasGps) return 'unknown'

    if (!hasGps && weekdayWorkHoursLocal() && workAddress) return 'work'
    return 'home'
  }, [lat, lng, homeGeo, workGeo, workAddress])

  return {
    lat,
    lng,
    permission,
    detected_anchor,
    /** Call after user acknowledges location prompt copy (optional). */
    refreshPosition: requestPosition,
  }
}
