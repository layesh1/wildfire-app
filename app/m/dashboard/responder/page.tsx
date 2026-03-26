'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, Flame, MapPin, Radio, AlertTriangle, ChevronRight, Monitor } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type FireEvent = {
  id: string; incident_name: string; county: string; state: string
  acres_burned: number | null; containment_pct: number | null
  started_at: string; has_evacuation_order: boolean | null
}

const QUICK_ACTIONS = [
  { label: 'Fire Map',    href: '/m/dashboard/caregiver/map', icon: MapPin        },
  { label: 'Alerts',     href: '/m/dashboard/responder/alerts', icon: AlertTriangle },
  { label: 'Radio Log',  href: '/m/dashboard/responder/log',  icon: Radio         },
]

export default function MobileResponderHub() {
  const [fires, setFires] = useState<FireEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data } = await supabase.from('fire_events')
          .select('id,incident_name,county,state,acres_burned,containment_pct,started_at,has_evacuation_order')
          .order('started_at', { ascending: false }).limit(10)
        if (data) setFires(data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const activeCount = fires.filter(f => (f.containment_pct ?? 0) < 100).length
  const withOrders = fires.filter(f => f.has_evacuation_order).length

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative px-4 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af)' }}>
        <Link
          href="/dashboard/responder"
          className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-white/60 hover:text-white/90 transition-colors"
          prefetch={false}
        >
          <Monitor className="w-3 h-3" /> Desktop
        </Link>
        <div className="flex items-center gap-2 text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
          <Shield className="w-3.5 h-3.5" /> Incident Command
        </div>
        <h1 className="font-display font-bold text-3xl text-white">Command Hub</h1>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{loading ? '—' : activeCount}</div>
            <div className="text-white/60 text-xs mt-0.5">Active Fires</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-red-300">{loading ? '—' : withOrders}</div>
            <div className="text-white/60 text-xs mt-0.5">Evac Orders</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-300">{loading ? '—' : fires.length - withOrders}</div>
            <div className="text-white/60 text-xs mt-0.5">Monitoring</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.label} href={a.href} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-4 border border-gray-200 shadow-sm active:scale-95 transition-transform">
              <a.icon className="w-5 h-5 text-blue-700" />
              <span className="text-[11px] font-semibold text-gray-700 text-center">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Incident list */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-2">Active Incidents</h2>
          {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>}
          <div className="space-y-2">
            {fires.map(f => {
              const contained = (f.containment_pct ?? 0) >= 100
              return (
                <div key={f.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: contained ? '#16a34a' : '#dc2626' }} />
                        <span className="font-semibold text-sm text-gray-900 truncate">{f.incident_name || 'Unnamed Fire'}</span>
                      </div>
                      <div className="text-xs text-gray-500">{[f.county, f.state].filter(Boolean).join(', ')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {f.has_evacuation_order && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">EVA ORDER</span>
                      )}
                      <div className="text-sm font-bold mt-1" style={{ color: (f.containment_pct ?? 0) >= 50 ? '#16a34a' : '#dc2626' }}>
                        {f.containment_pct != null ? `${f.containment_pct}%` : '—'}
                      </div>
                    </div>
                  </div>
                  {f.acres_burned != null && (
                    <div className="text-xs text-gray-400 mt-1.5">{f.acres_burned.toLocaleString()} acres</div>
                  )}
                </div>
              )
            })}
            {!loading && fires.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">No incidents found</div>
            )}
          </div>
        </div>

        {/* Flameo CTA */}
        <Link
          href="#"
          onClick={e => { e.preventDefault(); document.querySelector<HTMLButtonElement>('[aria-label="Open Flameo chat"]')?.click() }}
          className="flex items-center gap-3 rounded-2xl px-4 py-4 text-white"
          style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <img src="/flameo1.png" alt="Flameo" width={24} height={24} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Ask Flameo</div>
            <div className="text-white/60 text-xs">Routes, resources, situational updates</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </Link>
      </div>
    </div>
  )
}
