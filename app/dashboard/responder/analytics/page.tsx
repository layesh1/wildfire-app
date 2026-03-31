'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Activity, Brain, ChevronLeft, MapPin, Radio, ShieldAlert, ClipboardList, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useResponderStationAnchor } from '@/hooks/useResponderStationAnchor'
import AssistCoveragePanel from '@/components/responder/AssistCoveragePanel'
import SignalGapsPanel from '@/components/responder/SignalGapsPanel'
import {
  FireBehaviorSection,
  PredictionMapSection,
  WiDSIntelligencePanel,
} from '@/components/responder/ResponderAnalyticsSections'

const DEMO_FIRES = [
  { id: 'd1', incident_name: 'Dixie Fire', county: 'Plumas', state: 'CA', acres_burned: 963309, containment_pct: null, svi_score: 0.69, signal_gap_hours: 3.5 },
  { id: 'd2', incident_name: 'Bootleg Fire', county: 'Klamath', state: 'OR', acres_burned: 401279, containment_pct: null, svi_score: 0.58, signal_gap_hours: 2.1 },
  { id: 'd3', incident_name: 'Wallow Fire', county: 'Greenlee', state: 'AZ', acres_burned: 538049, containment_pct: null, svi_score: 0.74, signal_gap_hours: 18.4 },
  { id: 'd4', incident_name: 'Creek Fire', county: 'Fresno', state: 'CA', acres_burned: 379895, containment_pct: null, svi_score: 0.72, signal_gap_hours: 4.2 },
  { id: 'd5', incident_name: 'Caldor Fire', county: 'El Dorado', state: 'CA', acres_burned: 221774, containment_pct: null, svi_score: 0.61, signal_gap_hours: 6.8 },
]

const TABS = [
  { id: 'ml' as const, label: 'ML fire prediction', short: 'ML', icon: Brain },
  { id: 'spread' as const, label: 'Fire spread & tactical', short: 'Spread', icon: Activity },
  { id: 'assist' as const, label: 'Assist & coverage', short: 'Assist', icon: Radio },
  { id: 'signals' as const, label: 'Signal gap analysis', short: 'Signals', icon: ShieldAlert },
  { id: 'ics' as const, label: 'ICS board', short: 'ICS', icon: ClipboardList },
]

type TabId = (typeof TABS)[number]['id']

function CommandAnalyticsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('tab') || 'ml'
  const tab = TABS.some(t => t.id === raw) ? (raw as TabId) : 'ml'

  const { center, stationLabel, manualInput, setManualInput, applyManualStation, geoReady } = useResponderStationAnchor()
  const [activeFires, setActiveFires] = useState<any[]>([])
  const [loadingFires, setLoadingFires] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, svi_score, signal_gap_hours')
        .is('containment_pct', null)
        .order('acres_burned', { ascending: false })
        .limit(8)
      if (data && data.length > 0) setActiveFires(data)
      else setActiveFires(DEMO_FIRES as any[])
      setLoadingFires(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount once

  function setTab(next: TabId) {
    router.replace(`/dashboard/responder/analytics?tab=${next}`, { scroll: false })
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <Link
        href="/dashboard/responder"
        className="inline-flex items-center gap-1.5 text-ash-500 hover:text-ash-300 text-sm mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Command Hub
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-ember-400 text-xs font-medium mb-2">
          <Activity className="w-3.5 h-3.5" />
          COMMAND ANALYTICS
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">Analytics dashboard</h1>
        <p className="text-ash-400 text-sm max-w-2xl">
          ML prediction, spread simulation, assist requests, and signal-gap intel in one place. Map views use your station anchor (profile address → device location → default).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl bg-ash-900/80 border border-ash-800">
        {TABS.map(({ id, label, short, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-ember-500/90 text-white shadow-md'
                : 'text-ash-400 hover:text-white hover:bg-ash-800/80'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{short}</span>
          </button>
        ))}
      </div>

      {(tab === 'ml' || tab === 'spread') && (
        <div className="card p-4 mb-8 border border-ash-700">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-ash-500 text-xs font-medium uppercase tracking-wider mb-1">Station anchor</div>
              <p className="text-ash-400 text-xs mb-2">
                {geoReady ? (stationLabel || 'Location set') : 'Resolving profile or device location…'}
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyManualStation()}
                  placeholder="Override: city, address, or zip…"
                  className="flex-1 min-w-[12rem] bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-ember-500/50 placeholder:text-ash-600"
                />
                <button
                  type="button"
                  onClick={() => applyManualStation()}
                  className="px-4 py-2 rounded-lg text-sm bg-ember-500/20 border border-ember-500/40 text-ember-300 hover:bg-ember-500/30 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-ash-600 text-xs font-mono shrink-0">
              <MapPin className="w-3.5 h-3.5" />
              {center[0].toFixed(3)}, {center[1].toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {tab === 'ml' && <PredictionMapSection center={center} />}
      {tab === 'spread' && <FireBehaviorSection />}
      {tab === 'assist' && <AssistCoveragePanel embedded />}
      {tab === 'signals' && (
        <>
          <WiDSIntelligencePanel activeFires={activeFires} loading={loadingFires} />
          <SignalGapsPanel embedded />
        </>
      )}
      {tab === 'ics' && (
        <div className="card p-6 border border-ash-700">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-ember-400" />
            <h2 className="text-white font-semibold text-sm">ICS Board</h2>
          </div>
          <p className="text-ash-400 text-sm mb-4">
            ICS board is part of Command Analytics. Open it here for incident command workflow.
          </p>
          <Link
            href="/dashboard/responder/ics"
            className="inline-flex items-center gap-1 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-ember-300 text-sm font-medium hover:bg-ember-500/20"
          >
            Open ICS Board <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CommandAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ash-500 text-sm">Loading analytics…</div>}>
      <CommandAnalyticsInner />
    </Suspense>
  )
}
