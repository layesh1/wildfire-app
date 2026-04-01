'use client'

import { useCallback, useEffect, useState } from 'react'
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
 * Station anchor for responder ML maps and weather: profile home address → device GPS → default.
 */
export function useResponderStationAnchor() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [weatherLocation, setWeatherLocation] = useState('')
  const [stationLabel, setStationLabel] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [geoReady, setGeoReady] = useState(false)

  const applyFromCoords = useCallback((lat: number, lon: number, locString: string, label?: string) => {
    setCenter([lat, lon])
    setWeatherLocation(locString)
    if (label) setStationLabel(label)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('address').eq('id', user.id).single()
        if (!cancelled && p?.address?.trim()) {
          const trimmed = p.address.trim()
          setManualInput(trimmed)
          const g = await geocodeAddress(trimmed)
          if (!cancelled && g) {
            applyFromCoords(g.lat, g.lon, trimmed, g.display)
            setGeoReady(true)
            return
          }
        }
      }
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        ;(async () => {
          try {
            const pos = await getBestGeolocationPosition()
            if (cancelled) return
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            const locStr = `${lat.toFixed(4)},${lon.toFixed(4)}`
            let label = 'Device location'
            try {
              const rev = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lon}`)
              const j = await rev.json()
              if (typeof j.formatted === 'string' && j.formatted.trim()) label = j.formatted
            } catch { /* ignore */ }
            applyFromCoords(lat, lon, locStr, label)
            setGeoReady(true)
          } catch {
            if (!cancelled) {
              applyFromCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Nevada, US', 'Default view')
              setGeoReady(true)
            }
          }
        })()
      } else {
        if (!cancelled) {
          applyFromCoords(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'Nevada, US', 'Default view')
          setGeoReady(true)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [applyFromCoords])

  async function applyManualStation() {
    const q = manualInput.trim()
    if (!q) return
    const g = await geocodeAddress(q)
    if (g) applyFromCoords(g.lat, g.lon, q, g.display)
  }

  return {
    center,
    weatherLocation,
    stationLabel,
    manualInput,
    setManualInput,
    applyManualStation,
    geoReady,
  }
}
