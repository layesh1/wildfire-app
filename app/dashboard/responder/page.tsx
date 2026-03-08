'use client'
import { useEffect, useState } from 'react'
import { Shield, Flame, AlertTriangle, Activity, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const QUICK_NAV = [
  { label: 'Signal Gap Analysis', href: '/dashboard/responder/signals', icon: AlertTriangle, badge: 'CRITICAL', badgeColor: 'badge-danger' },
  { label: 'ML Spread Predictor', href: '/dashboard/responder/ml', icon: Activity, badge: 'AI', badgeColor: 'badge-info' },
  { label: 'Agency Coverage Map', href: '/dashboard/responder/coverage', icon: Shield, badge: 'GAPS', badgeColor: 'badge-warn' },
  { label: 'COMMAND-INTEL AI', href: '/dashboard/responder/ai', icon: Activity, badge: 'LIVE', badgeColor: 'badge-safe' },
]

export default function ResponderDashboard() {
  const [activeFires, setActiveFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, svi_score, signal_gap_hours')
        .is('containment_pct', null)
        .order('acres_burned', { ascending: false })
        .limit(8)
      if (data) setActiveFires(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Shield className="w-4 h-4" />
          EMERGENCY RESPONDER · COMMAND-INTEL
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          Incident Command Center
        </h1>
        <p className="text-ash-400">
          Live fire tracking, ML predictions, and signal gap intelligence.
        </p>
      </div>

      {/* Situational stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: '—', label: 'Active incidents', color: 'text-signal-danger' },
          { value: '9×', label: 'Max state disparity', color: 'text-signal-warn' },
          { value: '99.74%', label: 'No-order gap rate', color: 'text-ember-400' },
          { value: '11.5h', label: 'Median delay', color: 'text-signal-info' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-ash-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {QUICK_NAV.map(({ label, href, icon: Icon, badge, badgeColor }) => (
          <Link key={href} href={href} className="card p-5 hover:bg-ash-800 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-ash-400 group-hover:text-white transition-colors" />
              <span className={badgeColor}>{badge}</span>
            </div>
            <div className="text-white text-sm font-medium">{label}</div>
            <ChevronRight className="w-4 h-4 text-ash-600 group-hover:text-ash-300 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Active fires table */}
      <div>
        <h2 className="section-title mb-6">Largest Active Incidents</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ash-800 text-left">
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Incident</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Acres</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Alert Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-ash-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : activeFires.map(fire => (
                <tr key={fire.id} className="hover:bg-ash-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-signal-danger animate-pulse-slow" />
                      <span className="text-white text-sm font-medium truncate max-w-[160px]">
                        {fire.incident_name || 'Unnamed'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ash-400 text-sm">
                    {fire.county ? `${fire.county}, ` : ''}{fire.state || '—'}
                  </td>
                  <td className="px-6 py-4 text-ash-300 text-sm font-mono">
                    {fire.acres_burned ? fire.acres_burned.toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {fire.svi_score != null ? (
                      <span className={fire.svi_score > 0.75 ? 'badge-danger' : fire.svi_score > 0.5 ? 'badge-warn' : 'badge-safe'}>
                        {fire.svi_score.toFixed(2)}
                      </span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {fire.signal_gap_hours != null ? (
                      <span className={fire.signal_gap_hours > 12 ? 'text-signal-danger' : fire.signal_gap_hours > 6 ? 'text-signal-warn' : 'text-signal-safe'}>
                        {fire.signal_gap_hours.toFixed(1)}h
                      </span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
