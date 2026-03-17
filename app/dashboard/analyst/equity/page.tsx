'use client'
import { useState } from 'react'
import { Scale, AlertTriangle, TrendingUp, Users, Globe, WifiOff } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const EQUITY_DATA = [
  { state: 'CA', avg_svi: 0.61, fires: 18234, pct_with_order: 0.8, median_gap: 8.2, high_svi_fires: 6821 },
  { state: 'TX', avg_svi: 0.67, fires: 9812, pct_with_order: 0.4, median_gap: 18.5, high_svi_fires: 4201 },
  { state: 'AZ', avg_svi: 0.71, fires: 4521, pct_with_order: 0.3, median_gap: 22.1, high_svi_fires: 2341 },
  { state: 'OR', avg_svi: 0.55, fires: 3988, pct_with_order: 1.1, median_gap: 7.4, high_svi_fires: 1102 },
  { state: 'WA', avg_svi: 0.52, fires: 3421, pct_with_order: 1.4, median_gap: 6.1, high_svi_fires: 891 },
  { state: 'MT', avg_svi: 0.63, fires: 2876, pct_with_order: 0.2, median_gap: 31.4, high_svi_fires: 1243 },
  { state: 'CO', avg_svi: 0.48, fires: 2341, pct_with_order: 1.8, median_gap: 5.2, high_svi_fires: 612 },
  { state: 'NM', avg_svi: 0.74, fires: 2108, pct_with_order: 0.1, median_gap: 38.7, high_svi_fires: 1421 },
  { state: 'ID', avg_svi: 0.58, fires: 1987, pct_with_order: 0.6, median_gap: 12.3, high_svi_fires: 734 },
  { state: 'NV', avg_svi: 0.62, fires: 1654, pct_with_order: 0.3, median_gap: 24.8, high_svi_fires: 721 },
]
const MAX_GAP = 40
const BAR_MAX_PX = 96

const LANGUAGE_GAP_DATA = [
  { county: 'Webb County, TX', pct_limeng: 19.8, fires: 89, svi: 0.83 },
  { county: 'Monterey County', pct_limeng: 16.9, fires: 240, svi: 0.72 },
  { county: 'Imperial County', pct_limeng: 15.3, fires: 134, svi: 0.81 },
  { county: 'Fresno County', pct_limeng: 14.2, fires: 812, svi: 0.76 },
  { county: 'Merced County', pct_limeng: 13.7, fires: 299, svi: 0.78 },
  { county: 'Santa Clara County', pct_limeng: 12.1, fires: 445, svi: 0.61 },
  { county: 'San Joaquin County', pct_limeng: 11.8, fires: 376, svi: 0.71 },
  { county: 'Madera County', pct_limeng: 10.2, fires: 521, svi: 0.73 },
  { county: 'Navajo County', pct_limeng: 8.7, fires: 312, svi: 0.91 },
]

const NO_INTERNET_DATA = [
  { county: 'Apache County, AZ', pct_noint: 52.5, fires: 212, svi: 0.91 },
  { county: 'Harding County, NM', pct_noint: 41.2, fires: 67, svi: 0.87 },
  { county: 'Shannon County, SD', pct_noint: 38.1, fires: 34, svi: 0.96 },
  { county: 'Catron County, NM', pct_noint: 37.0, fires: 389, svi: 0.84 },
  { county: 'San Juan County, UT', pct_noint: 35.4, fires: 145, svi: 0.82 },
  { county: 'McIntosh County, OK', pct_noint: 32.7, fires: 112, svi: 0.79 },
  { county: 'Presidio County, TX', pct_noint: 31.8, fires: 56, svi: 0.84 },
  { county: 'Owyhee County, ID', pct_noint: 27.1, fires: 167, svi: 0.68 },
]

export default function EquityMetricsPage() {
  const [sort, setSort] = useState<'svi' | 'gap' | 'order'>('gap')

  const sorted = [...EQUITY_DATA].sort((a, b) => {
    if (sort === 'svi') return b.avg_svi - a.avg_svi
    if (sort === 'gap') return b.median_gap - a.median_gap
    return a.pct_with_order - b.pct_with_order
  })

  const totalHighSvi = EQUITY_DATA.reduce((s, r) => s + r.high_svi_fires, 0)
  const totalFires = EQUITY_DATA.reduce((s, r) => s + r.fires, 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <Scale className="w-4 h-4" /> EQUITY METRICS · ANALYST
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Equity &amp; Vulnerability Analysis</h1>
        <p className="text-ash-400 text-sm">Correlating Social Vulnerability Index (SVI) with evacuation order rates and signal gaps across states.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { value: '0.26', label: 'SVI spread (best vs worst state)', color: 'text-signal-info' },
          { value: '40.4%', label: '20,488 of 50,664 true wildfires in high-SVI ≥0.75 counties', color: 'text-signal-warn' },
          { value: '0.1%', label: 'NM order rate (worst state) vs 1.8% in CO — an 18× disparity', color: 'text-signal-danger' },
          { value: '18×', label: 'Evacuation order rate disparity (worst vs best state)', color: 'text-ember-400' },
          { value: '19.8%', label: 'Highest limited-English county (Webb, TX) — CDC SVI EP_LIMENG; max 36.4% in dataset', color: 'text-signal-warn' },
          { value: '93.2%', label: 'Signal gap in no-internet counties vs 49.1% in connected counties', color: 'text-signal-danger' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-ash-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-ash-400" />
          <h2 className="text-white font-semibold text-sm">SVI vs Evacuation Order Rate</h2>
          <span className="ml-auto text-ash-500 text-xs">SVI predicts WHETHER orders are issued — not how long they take</span>
        </div>
        <div className="flex gap-1.5" style={{ height: 120 }}>
          {sorted.map(row => {
            const barH = Math.max(4, Math.round((row.pct_with_order / 2) * BAR_MAX_PX))
            const bg = row.avg_svi > 0.7 ? '#ef4444' : row.avg_svi > 0.6 ? '#f59e0b' : '#22c55e'
            return (
              <div key={row.state} className="flex-1 flex flex-col items-center">
                <div className="flex-1" />
                <div className="w-full rounded-t-sm transition-all" style={{ height: barH, background: bg, opacity: 0.85 }}
                  title={`${row.state}: ${row.pct_with_order}% order rate, SVI ${row.avg_svi}`} />
                <span className="text-ash-500 text-xs mt-1">{row.state}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-ash-600 text-xs mt-2">
          <span>Color: green = SVI &lt;0.6 / amber = 0.6-0.7 / red = &gt;0.7</span>
          <span>Bar height = % of fires that received an evacuation order (higher = better)</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4 items-center">
        <span className="text-ash-500 text-xs">Sort by:</span>
        {(['gap', 'svi', 'order'] as const).map(s => (
          <button key={s} onClick={() => setSort(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${sort === s ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
            {s === 'gap' ? 'Signal Gap' : s === 'svi' ? 'SVI Score' : 'Order Rate'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-800 text-left">
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">State</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Avg SVI</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Median Gap</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Order Rate</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">High-SVI Fires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash-800">
            {sorted.map((row, i) => (
              <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                <td className="px-5 py-4 text-white font-semibold">{row.state}</td>
                <td className="px-5 py-4">
                  <span className={`font-mono text-sm font-bold ${row.avg_svi > 0.7 ? 'text-signal-danger' : row.avg_svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {row.avg_svi.toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`font-mono text-sm font-bold ${row.median_gap > 20 ? 'text-signal-danger' : row.median_gap > 10 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {row.median_gap}h
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-ash-800 rounded-full overflow-hidden">
                      <div className="h-full bg-signal-info rounded-full" style={{ width: `${Math.min(row.pct_with_order * 50, 100)}%` }} />
                    </div>
                    <span className="text-ash-400 text-xs">{row.pct_with_order.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-ash-600" />
                    <span className="text-ash-300 text-sm">{row.high_svi_fires.toLocaleString()}</span>
                    <span className="text-ash-600 text-xs">({((row.high_svi_fires / row.fires) * 100).toFixed(0)}%)</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5 mt-6 border border-signal-warn/20 bg-signal-warn/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-warn shrink-0 mt-0.5" />
          <div>
            <div className="text-signal-warn font-semibold text-sm mb-1">Key Finding: SVI Predicts Whether Orders Are Issued at All</div>
            <p className="text-ash-400 text-sm leading-relaxed">
              States with higher SVI scores show dramatically lower evacuation order rates.
              New Mexico (SVI 0.74) has only a 0.1% order rate vs Colorado (SVI 0.48) at 1.8% — an 18× disparity.
              When orders DO occur, timing is ~1.1h across all SVI tiers. High-SVI communities don't get slower service — they get NO service.
              This suggests systemic underinvestment in early warning infrastructure for vulnerable communities.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4 border border-signal-danger/30 bg-signal-danger/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-signal-danger font-semibold text-sm mb-1">Critical: SVI Does NOT Predict How Long Orders Take</div>
            <p className="text-ash-400 text-sm leading-relaxed">
              SVI score does NOT predict delay hours — all SVI tiers average ~1.1h when orders DO happen. SVI predicts WHETHER an order is issued at all.
              High-SVI counties don't get slower service — they get NO service.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-signal-warn" />
          <h2 className="text-white font-semibold text-sm">Language Access Gap</h2>
          <span className="ml-auto text-ash-500 text-xs">Source: CDC SVI EP_LIMENG</span>
        </div>
        <p className="text-ash-500 text-xs mb-5">
          Counties with more than 8% limited-English-proficiency AND significant wildfire exposure.
          Max limited-English exposure: 36.4% of county population. These residents cannot act on English-only emergency alerts regardless of delivery method.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={LANGUAGE_GAP_DATA} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="county" tick={{ fill: '#b3b1aa', fontSize: 10 }} width={140} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs">
                  <p className="text-white font-medium">{d.county}</p>
                  <p className="text-signal-warn">{d.pct_limeng}% limited English</p>
                  <p className="text-ash-400">{d.fires} fires - SVI {d.svi.toFixed(2)}</p>
                </div>
              )
            }} />
            <Bar dataKey="pct_limeng" radius={[0, 4, 4, 0]}>
              {LANGUAGE_GAP_DATA.map((d, i) => (
                <Cell key={i} fill={d.pct_limeng > 15 ? '#ef4444' : d.pct_limeng > 10 ? '#eab308' : '#f97316'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-ash-600 text-xs mt-3">
          Fresno County, CA: 14.2% limited English + 812 fires. Monterey County, CA: 16.9% + 240 fires.
        </p>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <WifiOff className="w-4 h-4 text-signal-danger" />
          <h2 className="text-white font-semibold text-sm">No-Internet Coverage Gap</h2>
          <span className="ml-auto text-ash-500 text-xs">Source: CDC SVI EP_NOINT</span>
        </div>
        <p className="text-ash-500 text-xs mb-2">
          Counties where digital alert systems cannot reach residents -- only broadcast radio and in-person outreach work here.
        </p>
        <div className="p-3 rounded-lg bg-signal-danger/10 border border-signal-danger/20 mb-5">
          <p className="text-signal-danger text-xs font-medium">Signal gap by internet access: counties in the top 25% for no-internet have a 93.2% signal gap rate — nearly double the 49.1% rate in well-connected counties. Digital-only alert systems structurally fail these communities.</p>
          <p className="text-ash-500 text-xs mt-1">Median pct_no_internet: 12.3% · P90: 23.0%</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={NO_INTERNET_DATA} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="county" tick={{ fill: '#b3b1aa', fontSize: 10 }} width={160} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs">
                  <p className="text-white font-medium">{d.county}</p>
                  <p className="text-signal-danger">{d.pct_noint}% no internet access</p>
                  <p className="text-ash-400">{d.fires} fires - SVI {d.svi.toFixed(2)}</p>
                </div>
              )
            }} />
            <Bar dataKey="pct_noint" radius={[0, 4, 4, 0]}>
              {NO_INTERNET_DATA.map((d, i) => (
                <Cell key={i} fill={d.pct_noint > 40 ? '#ef4444' : d.pct_noint > 30 ? '#eab308' : '#f97316'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 p-3 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
          <p className="text-signal-danger text-sm font-medium">Apache County, AZ: 52.5% no internet + 212 fires</p>
          <p className="text-ash-400 text-xs mt-1">
            The most extreme compound failure: the majority of the population cannot receive any digital alert.
          </p>
        </div>
      </div>
    </div>
  )
}
