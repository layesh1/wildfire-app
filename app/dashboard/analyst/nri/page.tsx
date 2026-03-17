'use client'
import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Cell,
} from 'recharts'
import { Shield, AlertTriangle, ChevronDown, ChevronUp, Database, Loader2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NRICounty {
  fips: string
  county: string
  state: string
  nri_score: number
  nri_rating: string
  svi: number
  eal: number
}

interface NRIResponse {
  counties: NRICounty[]
  source: 'api' | 'fallback'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  CA: '#f04a00',
  AZ: '#f59e0b',
  NM: '#ef4444',
  OR: '#22c55e',
  WA: '#3b82f6',
  ID: '#8b5cf6',
  NV: '#06b6d4',
  CO: '#10b981',
  MT: '#f97316',
}

function stateColor(state: string): string {
  return STATE_COLORS[state] ?? '#737068'
}

function ratingBadgeClass(rating: string): string {
  if (rating === 'Very High') return 'text-signal-danger border-signal-danger/40 bg-signal-danger/10'
  if (rating === 'High') return 'text-signal-warn border-signal-warn/40 bg-signal-warn/10'
  if (rating === 'Relatively High') return 'text-ember-400 border-ember-500/40 bg-ember-500/10'
  if (rating === 'Medium') return 'text-ash-300 border-ash-600 bg-ash-800'
  return 'text-ash-500 border-ash-700 bg-ash-900'
}

function formatEAL(eal: number): string {
  if (eal >= 1_000_000_000) return `$${(eal / 1_000_000_000).toFixed(2)}B`
  if (eal >= 1_000_000) return `$${(eal / 1_000_000).toFixed(1)}M`
  if (eal >= 1_000) return `$${(eal / 1_000).toFixed(0)}K`
  return `$${eal.toFixed(0)}`
}

function compoundScore(c: NRICounty): number {
  return (c.nri_score + c.svi * 100) / 2
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-6 w-48 bg-ash-800 rounded mb-4" />
      <div className="h-10 w-96 bg-ash-800 rounded mb-3" />
      <div className="h-4 w-80 bg-ash-800 rounded mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 h-24 bg-ash-800" />
        ))}
      </div>
      <div className="card p-6 mb-6 h-80 bg-ash-800" />
      <div className="card p-6 h-64 bg-ash-800" />
    </div>
  )
}

// ── Scatter tooltip ───────────────────────────────────────────────────────────

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: NRICounty = payload[0]?.payload
  if (!d) return null
  const isCompound = d.nri_score > 75 && d.svi > 0.75
  return (
    <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg max-w-[200px]">
      <p className="text-white font-semibold mb-1">{d.county}, {d.state}</p>
      <p style={{ color: stateColor(d.state) }}>NRI Score: {d.nri_score.toFixed(1)}</p>
      <p className="text-ash-300">SVI: {d.svi.toFixed(2)}</p>
      <p className="text-ash-400">EAL: {formatEAL(d.eal)}</p>
      <p className={`mt-1 text-xs font-medium ${isCompound ? 'text-signal-danger' : 'text-ash-500'}`}>
        {isCompound ? 'COMPOUND RISK' : d.nri_rating}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NRIPage() {
  const [data, setData] = useState<NRIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [stateFilter, setStateFilter] = useState<string>('All')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/nri')
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const json: NRIResponse = await res.json()
        setData(json)
      } catch (e: any) {
        setError(e.message ?? 'Failed to load NRI data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Skeleton />

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="card p-6 border border-signal-danger/30 bg-signal-danger/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-danger shrink-0" />
          <div>
            <div className="text-signal-danger font-semibold text-sm">Failed to load NRI data</div>
            <p className="text-ash-400 text-xs mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const { counties, source } = data

  // Derived
  const allStates = Array.from(new Set(counties.map(c => c.state))).sort()
  const filtered = stateFilter === 'All' ? counties : counties.filter(c => c.state === stateFilter)

  const compoundCounties = counties
    .filter(c => c.nri_score > 75 && c.svi > 0.75)
    .sort((a, b) => compoundScore(b) - compoundScore(a))
    .slice(0, 20)

  const veryHighCount = counties.filter(c => c.nri_rating === 'Very High').length
  const compoundCount = counties.filter(c => c.nri_score > 75 && c.svi > 0.75).length
  const maxEAL = Math.max(...counties.map(c => c.eal))
  const topEALCounty = counties.find(c => c.eal === maxEAL)

  const sourceBadge = source === 'api'
    ? { label: 'Source: FEMA NRI API', color: 'text-signal-safe border-signal-safe/30 bg-signal-safe/10' }
    : { label: 'Source: FEMA NRI (cached fallback)', color: 'text-signal-warn border-signal-warn/30 bg-signal-warn/10' }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-danger text-sm font-medium mb-3">
          <Shield className="w-4 h-4" /> COMPOUND VULNERABILITY
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          FEMA National Risk Index — Compound Vulnerability
        </h1>
        <p className="text-ash-400 text-lg max-w-2xl">
          Counties with both high wildfire NRI scores and high Social Vulnerability Index face the greatest gap between threat and emergency response capacity.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${sourceBadge.color}`}>
            {sourceBadge.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-ash-800 border border-ash-700 text-ash-400 font-mono">
            {counties.length} counties · {allStates.length} states
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: String(veryHighCount), label: 'Very High NRI counties', sub: 'Wildfire NRI score band', color: 'text-signal-danger' },
          { value: String(compoundCount), label: 'Compound risk counties', sub: 'NRI > 75 AND SVI > 0.75', color: 'text-ember-500' },
          { value: topEALCounty ? formatEAL(topEALCounty.eal) : '—', label: 'Highest annual loss', sub: topEALCounty ? `${topEALCounty.county}, ${topEALCounty.state}` : '', color: 'text-signal-warn' },
          { value: String(allStates.length), label: 'High-risk states covered', sub: 'CA · AZ · NM · OR · WA · ID · NV · CO · MT', color: 'text-ash-300' },
        ].map(({ value, label, sub, color }) => (
          <div key={label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${color} mb-1`}>{value}</div>
            <div className="text-white text-sm font-medium">{label}</div>
            <div className="text-ash-500 text-xs mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white mb-1">NRI Score vs. Social Vulnerability Index</h3>
            <p className="text-ash-500 text-xs max-w-xl">
              Each dot = one county. Reference lines mark compound-risk thresholds. Top-right quadrant = highest urgency.
            </p>
          </div>
          {/* State filter */}
          <div className="flex flex-wrap gap-1.5">
            {['All', ...allStates].map(s => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  stateFilter === s
                    ? 'bg-ash-700 border-ash-600 text-white'
                    : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'
                }`}
                style={stateFilter !== s && s !== 'All' ? { color: stateColor(s) } : undefined}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* State colour legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {allStates.map(s => (
            <span key={s} className="flex items-center gap-1 text-xs text-ash-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: stateColor(s) }} />
              {s}
            </span>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2922" />
            <XAxis
              type="number"
              dataKey="nri_score"
              domain={[0, 105]}
              tick={{ fill: '#737068', fontSize: 11 }}
              label={{ value: 'NRI Wildfire Score', position: 'insideBottom', offset: -4, fill: '#737068', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="svi"
              domain={[0, 1.05]}
              tick={{ fill: '#737068', fontSize: 11 }}
              width={36}
              label={{ value: 'SVI', angle: -90, position: 'insideLeft', fill: '#737068', fontSize: 11 }}
            />
            <Tooltip content={<ScatterTooltip />} />
            {/* Threshold reference lines */}
            <ReferenceLine
              x={75}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'NRI 75', position: 'top', fill: '#f59e0b', fontSize: 10 }}
            />
            <ReferenceLine
              y={0.75}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'SVI 0.75', position: 'right', fill: '#f59e0b', fontSize: 10 }}
            />
            <Scatter data={filtered} opacity={0.8}>
              {filtered.map((c, i) => (
                <Cell key={i} fill={stateColor(c.state)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-ash-800">
          <div className="card p-3 border border-signal-danger/20 bg-signal-danger/5">
            <div className="text-signal-danger text-xs font-semibold mb-1">Top-right quadrant: COMPOUND RISK</div>
            <p className="text-ash-500 text-xs">High wildfire NRI AND high social vulnerability — greatest urgency for early warning infrastructure investment.</p>
          </div>
          <div className="card p-3">
            <div className="text-ash-400 text-xs font-semibold mb-1">Bottom-left quadrant: Lower Risk</div>
            <p className="text-ash-500 text-xs">Low NRI AND low SVI — communities with both lower physical risk and greater adaptive capacity.</p>
          </div>
        </div>
      </div>

      {/* Compound vulnerability table */}
      <div className="card overflow-hidden mb-6">
        <div className="p-5 border-b border-ash-800">
          <h3 className="font-display text-lg font-bold text-white mb-1">
            Compound Vulnerability — Top {compoundCounties.length} Counties
          </h3>
          <p className="text-ash-500 text-xs">
            Filtered to NRI score &gt; 75 AND SVI &gt; 0.75 · Sorted by composite score ((NRI + SVI×100) / 2) desc.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ash-800 text-left">
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">County</th>
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">State</th>
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">NRI Score</th>
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">NRI Rating</th>
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Expected Annual Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {compoundCounties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ash-500 text-sm">
                    No counties meet the compound risk threshold (NRI &gt; 75 AND SVI &gt; 0.75) in this dataset.
                  </td>
                </tr>
              ) : (
                compoundCounties.map((c, i) => (
                  <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                    <td className="px-5 py-3 text-white font-medium text-sm">{c.county}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold" style={{ color: stateColor(c.state) }}>
                        {c.state}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-ash-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-signal-danger"
                            style={{ width: `${Math.min(100, c.nri_score)}%` }}
                          />
                        </div>
                        <span className="text-signal-danger font-mono text-sm font-bold">{c.nri_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ratingBadgeClass(c.nri_rating)}`}>
                        {c.nri_rating}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm font-bold text-signal-warn">
                        {c.svi.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ash-300 text-sm font-mono">{formatEAL(c.eal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology expander */}
      <div className="card overflow-hidden mb-6">
        <button
          onClick={() => setMethodOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ash-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ash-400" />
            <span className="text-white font-semibold text-sm">Methodology &amp; Data Definitions</span>
          </div>
          {methodOpen
            ? <ChevronUp className="w-4 h-4 text-ash-500" />
            : <ChevronDown className="w-4 h-4 text-ash-500" />}
        </button>
        {methodOpen && (
          <div className="px-5 pb-5 border-t border-ash-800 pt-4 space-y-4">
            <div>
              <div className="text-white font-semibold text-sm mb-1">Expected Annual Loss (EAL)</div>
              <p className="text-ash-400 text-sm leading-relaxed">
                EAL represents the estimated average economic loss due to wildfires each year, expressed in USD. It is derived from historical exposure, annualized frequency, and estimated impact on buildings, agriculture, and population. Higher EAL counties represent greater aggregate economic risk, though this does not directly measure human vulnerability.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-1">WLDF_RISKR Rating Scale</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Very High', 'High', 'Relatively High', 'Medium', 'Relatively Low', 'Low', 'Very Low'].map(r => (
                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full border ${ratingBadgeClass(r)}`}>{r}</span>
                ))}
              </div>
              <p className="text-ash-400 text-sm leading-relaxed mt-2">
                Ratings are derived by converting the composite NRI score into percentile bands. "Very High" corresponds to the top 10% of counties nationally for wildfire risk.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-1">Why Compound Vulnerability Matters</div>
              <p className="text-ash-400 text-sm leading-relaxed">
                A county with high wildfire risk AND high social vulnerability faces the greatest gap between threat and response capacity. Social vulnerability (SVI) captures factors like poverty, disability, language barriers, and lack of vehicle access — all of which impede self-evacuation and reduce resilience to delayed official alerts. When both dimensions are elevated, the human cost of an inadequate warning system is maximized. The WiDS dataset confirms that high-SVI counties are significantly less likely to receive a formal evacuation order at all — SVI predicts whether orders happen, not how long they take. When orders do occur, the median time is ~1.1h across all SVI tiers.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-1">Data Sources</div>
              <ul className="text-ash-400 text-sm space-y-0.5 list-disc list-inside">
                <li>FEMA National Risk Index (NRI) v2.5 — hazards.fema.gov/nri</li>
                <li>CDC Social Vulnerability Index (SVI) 2022 — at.cdc.gov/svi</li>
                <li>WiDS 2025 Datathon dataset — WatchDuty/IRWIN fire records, 60,000+ incidents (2021–2025)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* API source footer */}
      <div className="flex items-center gap-2 text-ash-500 text-xs">
        <Database className="w-3.5 h-3.5" />
        <span>{sourceBadge.label}</span>
        {source === 'fallback' && (
          <span className="text-ash-600">
            · Live API unavailable — showing representative NRI estimates for top high-risk counties
          </span>
        )}
      </div>
    </div>
  )
}
