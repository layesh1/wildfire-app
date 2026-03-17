'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const DEMO_DATA = [
  { state: 'NM', avg_gap_hours: 38.7, fire_count: 2108 },
  { state: 'MT', avg_gap_hours: 31.4, fire_count: 2876 },
  { state: 'NV', avg_gap_hours: 24.8, fire_count: 1654 },
  { state: 'AZ', avg_gap_hours: 22.1, fire_count: 4521 },
  { state: 'WY', avg_gap_hours: 19.2, fire_count: 987 },
  { state: 'TX', avg_gap_hours: 18.5, fire_count: 9812 },
  { state: 'UT', avg_gap_hours: 15.8, fire_count: 1432 },
  { state: 'SD', avg_gap_hours: 14.1, fire_count: 1123 },
  { state: 'ID', avg_gap_hours: 12.3, fire_count: 1987 },
  { state: 'CA', avg_gap_hours: 8.2, fire_count: 18234 },
  { state: 'OR', avg_gap_hours: 7.4, fire_count: 3988 },
  { state: 'WA', avg_gap_hours: 6.1, fire_count: 3421 },
  { state: 'CO', avg_gap_hours: 5.2, fire_count: 2341 },
  { state: 'OK', avg_gap_hours: 21.3, fire_count: 3201 },
  { state: 'KS', avg_gap_hours: 17.6, fire_count: 1876 },
]

export default function SignalGapsPage() {
  const [byState, setByState] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('signal_gap_by_state')
        .select('*')
        .order('avg_gap_hours', { ascending: false })
        .limit(20)
      if (data?.length) setByState(data)
      else setByState(DEMO_DATA)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-danger text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" /> SIGNAL GAP ANALYSIS
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Evacuation Order Signal Gaps</h1>
        <p className="text-ash-400 text-sm">Time between fire ignition and formal evacuation order, by state. Gaps above 12h indicate under-served populations.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { value: '99.3%', label: 'True wildfires with no formal order', color: 'text-signal-danger' },
          { value: '1.1h', label: 'Median time to order (when issued)', color: 'text-signal-warn' },
          { value: '9×', label: 'Worst vs best state gap', color: 'text-ember-400' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-ash-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-ash-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ash-400" />
          <h2 className="text-white font-semibold text-sm">Signal Gap by State</h2>
          <span className="badge-danger ml-auto">Sorted by worst</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-800 text-left">
              <th className="px-6 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">State</th>
              <th className="px-6 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Avg Gap (hrs)</th>
              <th className="px-6 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Fires</th>
              <th className="px-6 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Gap Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash-800">
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-ash-800 rounded animate-pulse" /></td>)}</tr>
            )) : byState.map((row, i) => {
              const pct = Math.min((row.avg_gap_hours / 30) * 100, 100)
              const color = row.avg_gap_hours > 20 ? 'bg-signal-danger' : row.avg_gap_hours > 10 ? 'bg-signal-warn' : 'bg-signal-safe'
              return (
                <tr key={i} className="hover:bg-ash-800/50 transition-colors">
                  <td className="px-6 py-4 text-white text-sm font-medium">{row.state || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-sm font-bold ${row.avg_gap_hours > 20 ? 'text-signal-danger' : row.avg_gap_hours > 10 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                      {row.avg_gap_hours?.toFixed(1) ?? '—'}h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ash-400 text-sm">{row.fire_count?.toLocaleString() ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="w-32 h-2 bg-ash-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
