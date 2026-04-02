'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ResponderEvacuationMap from '@/components/responder/ResponderEvacuationMap'
import ResponderDataConsent from '@/components/responder/ResponderDataConsent'
import { isResponderConsentSatisfied } from '@/lib/responder-data-consent'
import { useResponderStationAnchor } from '@/hooks/useResponderStationAnchor'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'

export default function ResponderEvacuationPage() {
  const [consentReady, setConsentReady] = useState(false)
  const [consentOk, setConsentOk] = useState(false)
  const supabase = createClient()
  const flameoAgent = useFlameoContext({ role: 'emergency_responder' })
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()
  const { center } = useResponderStationAnchor()

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
        .select('responder_consent_accepted, responder_consent_version')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setConsentOk(isResponderConsentSatisfied(p))
      setConsentReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const showConsentGate = consentReady && !consentOk

  return (
    <div className="relative w-full min-w-0 max-w-none mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/responder"
          className="inline-flex items-center gap-1 rounded-lg border border-ash-700 px-2.5 py-1.5 text-ash-300 text-xs hover:text-white hover:border-ash-500"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Command Hub
        </Link>
      </div>
      <ResponderDataConsent open={showConsentGate} onAgreed={() => setConsentOk(true)} />
      <div className={showConsentGate ? 'pointer-events-none select-none blur-[3px] opacity-40' : ''}>
        <ResponderEvacuationMap
          mapCenter={center}
          flameoContext={flameoAgent.context}
          canAccessEvacueeData={consentOk}
        />
      </div>
    </div>
  )
}
