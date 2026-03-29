'use client'
import { useEffect, useMemo, useState } from 'react'
import { firesWithinRadius } from '@/lib/hub-nearby'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import { isAlertsAiDeploymentEnabled } from '@/lib/alerts-ai-feature'
import { milesToKm, type AiAlertSummary, type NifcProximityItem } from '@/lib/consumer-alerts'

export function useConsumerAlerts(
  nifc: NifcFire[],
  mapAnchor: [number, number] | null,
  radiusMiles: number,
  aiEnabled: boolean,
  /** Label for AI summary (e.g. "Your home" vs "Your map anchor"). */
  anchorLabelForAi = 'Your map anchor'
) {
  const proximityItems: NifcProximityItem[] = useMemo(() => {
    const km = milesToKm(radiusMiles || 25)
    return firesWithinRadius(nifc, mapAnchor, km) as NifcProximityItem[]
  }, [nifc, mapAnchor, radiusMiles])

  const [aiSummary, setAiSummary] = useState<AiAlertSummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    const deployOk = isAlertsAiDeploymentEnabled()
    if (!deployOk || !aiEnabled || proximityItems.length === 0) {
      setAiSummary(null)
      setAiError(null)
      setAiLoading(false)
      return
    }

    const ac = new AbortController()
    setAiLoading(true)
    setAiError(null)

    const incidents = proximityItems.slice(0, 10).map(f => ({
      id: f.id,
      name: f.fire_name || 'Fire',
      distanceKm: f.distanceKm,
      containment: f.containment,
      acres: f.acres,
    }))

    fetch('/api/alerts/ai-summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidents, anchorLabel: anchorLabelForAi }),
      signal: ac.signal,
    })
      .then(async res => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || res.statusText)
        }
        return res.json()
      })
      .then((data: AiAlertSummary) => setAiSummary(data))
      .catch(e => {
        if (e.name === 'AbortError') return
        setAiSummary(null)
        setAiError(e instanceof Error ? e.message : 'Summary unavailable')
      })
      .finally(() => setAiLoading(false))

    return () => ac.abort()
  }, [aiEnabled, proximityItems, anchorLabelForAi])

  return { proximityItems, aiSummary, aiLoading, aiError }
}
