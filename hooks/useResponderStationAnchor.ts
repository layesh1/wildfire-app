'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { geocodeAddressClient } from '@/lib/geocoding-client'
import { getBestGeolocationPosition } from '@/lib/geolocation-accuracy'

const DEFAULT_CENTER: [number, number] = [38.5, -115]

async function geocodeAddress(addr: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const g = await geocodeAddressClient(addr)
    return { lat: g.lat, lon: g.lng, display: g.formatted }
  } catch {
    return null
  }
}

/**
 * Station anchor for responder command hub: verified profile `address` (station / base) first.
 * Device GPS is used only when no station address is saved — never as a fallback if geocoding fails.
 */
export function useResponderStationAnchor() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [weatherLocation, setWeatherLocation] = useState('')
  const [stationLabel, setStationLabel] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [geoReady, setGeoReady] = useState(false)
  const [stationAddressGeocodeFailed, setStationAddressGeocodeFailed] = useState(false)
  const runIdRef = useRef(0)

  const applyFromCoords = useCallback((lat: number, lon: number, locString: string, label?: string) => {
    setCenter([lat, lon])
    setWeatherLocation(locString)
    if (label !== undefined) setStationLabel(label)
  }, [])

  const loadStationAnchor = useCallback(async () => {
    const runId = ++runIdRef.current
    setStationAddressGeocodeFailed(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (runId !== runIdRef.current) return

    if (user) {
      const { data: p } = await supabase.from('profiles').select('address').eq('id', user.id).maybeSingle()
      if (runId !== runIdRef.current) return

      if (p?.address?.trim()) {
        const trimmed = p.address.trim()
        setManualInput(trimmed)
        const g = await geocodeAddress(trimmed)
        if (runId !== runIdRef.current) return

        if (g) {
          applyFromCoords(g.lat, g.lon, trimmed, g.display)
          setGeoReady(true)
          return
        }

        // Saved station line exists but could not be geocoded — do not substitute device GPS.
        setStationAddressGeocodeFailed(true)
        applyFromCoords(
          DEFAULT_CENTER[0],
          DEFAULT_CENTER[1],
          trimmed,
          `${trimmed} — could not place on map`
        )
        setGeoReady(true)
        return
      }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await getBestGeolocationPosition()
        if (runId !== runIdRef.current) return
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const locStr = `${lat.toFixed(4)},${lon.toFixed(4)}`
        let label = 'Device location'
        try {
          const rev = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lon}`)
          const j = await rev.json()
          if (typeof j.formatted === 'string' && j.formatted.trim()) label = j.formatted
        } catch {
          /* ignore */
        }
        applyFromCoords(lat, lon, locStr, label)
        setGeoReady(true)
      } catch {
        if (runId !== runIdRef.current) return
        applyFromCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Nevada, US', 'Default view')
        setGeoReady(true)
      }
    } else {
      if (runId !== runIdRef.current) return
      applyFromCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Nevada, US', 'Default view')
      setGeoReady(true)
    }
  }, [applyFromCoords])

  useEffect(() => {
    void loadStationAnchor()
  }, [loadStationAnchor])

  useEffect(() => {
    const onRefresh = () => void loadStationAnchor()
    window.addEventListener('wfa-flameo-context-refresh', onRefresh)
    return () => window.removeEventListener('wfa-flameo-context-refresh', onRefresh)
  }, [loadStationAnchor])

  async function applyManualStation() {
    const q = manualInput.trim()
    if (!q) return
    const g = await geocodeAddress(q)
    if (g) {
      setStationAddressGeocodeFailed(false)
      applyFromCoords(g.lat, g.lon, q, g.display)
    }
  }

  return {
    center,
    weatherLocation,
    stationLabel,
    manualInput,
    setManualInput,
    applyManualStation,
    geoReady,
    stationAddressGeocodeFailed,
  }
}
