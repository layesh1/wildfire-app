'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import ResponderEvacuationMap from '@/components/responder/ResponderEvacuationMap'
import ResponderDataConsent from '@/components/responder/ResponderDataConsent'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { useResponderStationAnchor } from '@/hooks/useResponderStationAnchor'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'

/**
 * Full command hub: consent gate + evacuation map + Flameo COMMAND + station anchor.
 * Used at /dashboard/responder (canonical); /dashboard/responder/evacuation redirects here.
 */
export default function ResponderCommandHubShell() {
  const [consentReady, setConsentReady] = useState(false)
  const [consentOk, setConsentOk] = useState(false)
  const [incidentRadiusMiles, setIncidentRadiusMiles] = useState(50)
  const [stationAddressLine, setStationAddressLine] = useState<string | null>(null)
  const supabase = createClient()
  const flameoAgent = useFlameoContext({ role: 'emergency_responder' })
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()
  const { center, stationLabel, geoReady, stationAddressGeocodeFailed } = useResponderStationAnchor()

  useEffect(() => {
    setFlameoHubAgentPayload({
      context: flameoAgent.context,
      status: flameoAgent.status,
      flameoRole: 'responder',
    })
  }, [flameoAgent.context, flameoAgent.status, setFlameoHubAgentPayload])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        if (!cancelled) setConsentReady(true)
        return
      }
      const { data: p } = await supabase
        .from('profiles')
        .select('responder_consent_accepted, responder_consent_version, address, alert_radius_miles')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setConsentOk(isResponderConsentSatisfied(p))
      const addr = typeof p?.address === 'string' ? p.address.trim() : ''
      setStationAddressLine(addr.length > 0 ? addr : null)
      const r = p?.alert_radius_miles
      if (typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 500) {
        setIncidentRadiusMiles(Math.round(r))
      }
      setConsentReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const showConsentGate = consentReady && !consentOk
  const directionsOrigin = stationAddressLine?.trim() || stationLabel?.trim() || null

  return (
    <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <ResponderDataConsent open={showConsentGate} onAgreed={() => setConsentOk(true)} />
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          showConsentGate && 'pointer-events-none select-none blur-[3px] opacity-40'
        )}
      >
        <ResponderEvacuationMap
          mapCenter={center}
          mapZoom={11}
          flameoContext={flameoAgent.context}
          canAccessEvacueeData={consentOk}
          incidentRadiusMiles={incidentRadiusMiles}
          stationAddressForDirections={directionsOrigin}
          stationGeoReady={geoReady}
          stationProfileAddressMissing={!stationAddressLine?.trim()}
          stationAddressGeocodeFailed={stationAddressGeocodeFailed}
        />
      </div>
    </div>
  )
}
