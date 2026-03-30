'use client'

import { useEffect, useState } from 'react'
import type {
  FlameoContext,
  FlameoContextApiResponse,
  FlameoContextStatus,
} from '@/lib/flameo-context-types'

function readFallbackAddressFromStorage(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem('wfa_emergency_card')
    if (!raw) return ''
    const card = JSON.parse(raw) as { address?: string }
    if (card?.address && typeof card.address === 'string') return card.address.trim()
  } catch {
    /* ignore */
  }
  return ''
}

export interface UseFlameoContextOptions {
  /** Flameo persona — consumer hub always uses `evacuee`. */
  role?: 'evacuee' | 'emergency_responder'
  /**
   * Live GPS [lat, lng] from the browser. When sent, the API compares it to the saved home
   * address; if they differ by more than about 0.35 mi, Flameo gets two anchors (home vs current location).
   */
  liveLocation?: [number, number] | null
  /**
   * When set (e.g. My People row selected), passed as `fallbackAddress` so Flameo anchors on that
   * address instead of the signed-in user’s profile home.
   */
  contextAddress?: string | null
}

export function useFlameoContext(options?: UseFlameoContextOptions) {
  const [context, setContext] = useState<FlameoContext | null>(null)
  const [status, setStatus] = useState<FlameoContextStatus | null>(null)
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const role = options?.role
  const live = options?.liveLocation
  const liveKey =
    live && Number.isFinite(live[0]) && Number.isFinite(live[1])
      ? `${live[0].toFixed(5)},${live[1].toFixed(5)}`
      : ''
  const ctxAddr =
    typeof options?.contextAddress === 'string' && options.contextAddress.trim()
      ? options.contextAddress.trim()
      : ''
  const contextKey = ctxAddr || ''

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (role) params.set('role', role)
        if (ctxAddr) params.set('contextAddress', ctxAddr)
        else {
          const fallback = readFallbackAddressFromStorage()
          if (fallback) params.set('fallbackAddress', fallback)
        }
        if (live && Number.isFinite(live[0]) && Number.isFinite(live[1])) {
          params.set('liveLat', String(live[0]))
          params.set('liveLon', String(live[1]))
        }

        const qs = params.toString()
        const url = qs ? `/api/flameo/context?${qs}` : '/api/flameo/context'
        const res = await fetch(url, { credentials: 'include' })

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Sign in required for Flameo context.')
          }
          const errJson = await res.json().catch(() => ({}))
          throw new Error(typeof errJson.error === 'string' ? errJson.error : `Request failed (${res.status})`)
        }

        const data = (await res.json()) as FlameoContextApiResponse
        if (cancelled) return

        setContext(data.context)
        setStatus(data.status)
        setMessage(data.message)
      } catch (e) {
        if (!cancelled) {
          setContext(null)
          setStatus(null)
          setMessage(undefined)
          setError(e instanceof Error ? e.message : 'Failed to load Flameo context')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [role, refreshTick, liveKey, contextKey])

  useEffect(() => {
    function onRefresh() {
      setRefreshTick(t => t + 1)
    }
    if (typeof window === 'undefined') return
    window.addEventListener('wfa-flameo-context-refresh', onRefresh)
    return () => window.removeEventListener('wfa-flameo-context-refresh', onRefresh)
  }, [])

  return { context, loading, error, status, message }
}
