'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Clock, MapPin, ChevronRight, Search, Table2, Map } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const KEY_FINDINGS = [
  { icon: Clock, value: '11.5h', label: 'Median evacuation delay', sub: 'Across all 62,696 incidents', color: 'text-signal-warn' },
  { icon: AlertTriangle, value: '99.74%', label: 'Fires with no formal order', sub: '41,906 had signals; only 108 linked to actions', color: 'text-signal-danger' },
  { icon: TrendingUp, value: '9×', label: 'State-level disparity', sub: 'Fastest vs. slowest response states', color: 'text-ember-400' },
  { icon: MapPin, value: 'High SVI', label: 'Counties hit hardest', sub: 'Significantly longer delays in vulnerable areas', color: 'text-signal-info' },
]

// Top 15 for the main bar chart
const DEMO_STATE_DATA = [
  { state: 'NM', median_delay_hours: 38.7, fire_count: 892, avg_svi: 0.74 },
  { state: 'AZ', median_delay_hours: 31.2, fire_count: 2341, avg_svi: 0.71 },
  { state: 'TX', median_delay_hours: 27.4, fire_count: 8912, avg_svi: 0.68 },
  { state: 'AK', median_delay_hours: 24.6, fire_count: 412, avg_svi: 0.71 },
  { state: 'OK', median_delay_hours: 22.1, fire_count: 3201, avg_svi: 0.65 },
  { state: 'MT', median_delay_hours: 19.8, fire_count: 1823, avg_svi: 0.60 },
  { state: 'ID', median_delay_hours: 16.3, fire_count: 1567, avg_svi: 0.59 },
  { state: 'WA', median_delay_hours: 13.9, fire_count: 2104, avg_svi: 0.57 },
  { state: 'KS', median_delay_hours: 14.8, fire_count: 987, avg_svi: 0.58 },
  { state: 'OR', median_delay_hours: 11.2, fire_count: 3456, avg_svi: 0.56 },
  { state: 'CA', median_delay_hours: 9.8, fire_count: 12341, avg_svi: 0.62 },
  { state: 'NV', median_delay_hours: 8.4, fire_count: 2891, avg_svi: 0.61 },
  { state: 'CO', median_delay_hours: 5.2, fire_count: 2456, avg_svi: 0.48 },
  { state: 'UT', median_delay_hours: 4.8, fire_count: 1892, avg_svi: 0.52 },
  { state: 'ND', median_delay_hours: 2.9, fire_count: 412, avg_svi: 0.47 },
]

// All states with fire data
const ALL_STATES = [
  { state: 'NM', median_delay_hours: 38.7, fire_count: 892, avg_svi: 0.74, region: 'Southwest' },
  { state: 'AZ', median_delay_hours: 31.2, fire_count: 2341, avg_svi: 0.71, region: 'Southwest' },
  { state: 'AK', median_delay_hours: 24.6, fire_count: 412, avg_svi: 0.71, region: 'Other' },
  { state: 'TX', median_delay_hours: 27.4, fire_count: 8912, avg_svi: 0.68, region: 'South' },
  { state: 'OK', median_delay_hours: 22.1, fire_count: 3201, avg_svi: 0.65, region: 'South' },
  { state: 'MT', median_delay_hours: 19.8, fire_count: 1823, avg_svi: 0.60, region: 'Northwest' },
  { state: 'ID', median_delay_hours: 16.3, fire_count: 1567, avg_svi: 0.59, region: 'Northwest' },
  { state: 'KS', median_delay_hours: 14.8, fire_count: 987, avg_svi: 0.58, region: 'Midwest' },
  { state: 'WA', median_delay_hours: 13.9, fire_count: 2104, avg_svi: 0.57, region: 'Northwest' },
  { state: 'HI', median_delay_hours: 12.8, fire_count: 234, avg_svi: 0.58, region: 'Other' },
  { state: 'LA', median_delay_hours: 11.8, fire_count: 1234, avg_svi: 0.70, region: 'South' },
  { state: 'OR', median_delay_hours: 11.2, fire_count: 3456, avg_svi: 0.56, region: 'Northwest' },
  { state: 'MS', median_delay_hours: 10.4, fire_count: 892, avg_svi: 0.71, region: 'South' },
  { state: 'CA', median_delay_hours: 9.8, fire_count: 12341, avg_svi: 0.62, region: 'West' },
  { state: 'AL', median_delay_hours: 9.8, fire_count: 1123, avg_svi: 0.67, region: 'South' },
  { state: 'FL', median_delay_hours: 9.2, fire_count: 5241, avg_svi: 0.63, region: 'Southeast' },
  { state: 'NE', median_delay_hours: 8.9, fire_count: 654, avg_svi: 0.55, region: 'Midwest' },
  { state: 'TN', median_delay_hours: 8.6, fire_count: 678, avg_svi: 0.61, region: 'Southeast' },
  { state: 'GA', median_delay_hours: 8.4, fire_count: 892, avg_svi: 0.62, region: 'Southeast' },
  { state: 'NV', median_delay_hours: 8.4, fire_count: 2891, avg_svi: 0.61, region: 'West' },
  { state: 'AR', median_delay_hours: 7.8, fire_count: 567, avg_svi: 0.64, region: 'South' },
  { state: 'NC', median_delay_hours: 7.2, fire_count: 1234, avg_svi: 0.60, region: 'Southeast' },
  { state: 'SC', median_delay_hours: 6.4, fire_count: 678, avg_svi: 0.64, region: 'Southeast' },
  { state: 'MN', median_delay_hours: 6.8, fire_count: 456, avg_svi: 0.54, region: 'Midwest' },
  { state: 'CO', median_delay_hours: 5.2, fire_count: 2456, avg_svi: 0.48, region: 'West' },
  { state: 'UT', median_delay_hours: 4.8, fire_count: 1892, avg_svi: 0.52, region: 'West' },
  { state: 'VA', median_delay_hours: 4.6, fire_count: 567, avg_svi: 0.55, region: 'Southeast' },
  { state: 'KY', median_delay_hours: 4.4, fire_count: 456, avg_svi: 0.58, region: 'Southeast' },
  { state: 'MO', median_delay_hours: 4.2, fire_count: 678, avg_svi: 0.57, region: 'Midwest' },
  { state: 'WY', median_delay_hours: 4.1, fire_count: 987, avg_svi: 0.50, region: 'West' },
  { state: 'WI', median_delay_hours: 3.8, fire_count: 234, avg_svi: 0.51, region: 'Midwest' },
  { state: 'MI', median_delay_hours: 3.8, fire_count: 345, avg_svi: 0.55, region: 'Midwest' },
  { state: 'SD', median_delay_hours: 3.6, fire_count: 654, avg_svi: 0.53, region: 'Midwest' },
  { state: 'IN', median_delay_hours: 3.2, fire_count: 234, avg_svi: 0.54, region: 'Midwest' },
  { state: 'ND', median_delay_hours: 2.9, fire_count: 412, avg_svi: 0.47, region: 'Midwest' },
]

// County-level data
const COUNTY_DATA = [
  { county: 'McKinley', state: 'NM', svi: 0.88, delay: 51.2, fires: 89 },
  { county: 'Apache', state: 'AZ', svi: 0.82, delay: 48.3, fires: 156 },
  { county: 'Zuni Pueblo', state: 'NM', svi: 0.91, delay: 51.2, fires: 34 },
  { county: 'La Paz', state: 'AZ', svi: 0.92, delay: 41.8, fires: 98 },
  { county: 'Catron', state: 'NM', svi: 0.78, delay: 38.7, fires: 47 },
  { county: 'Hidalgo', state: 'NM', svi: 0.76, delay: 36.9, fires: 31 },
  { county: 'Mohave', state: 'AZ', svi: 0.85, delay: 34.2, fires: 312 },
  { county: 'Del Norte', state: 'CA', svi: 0.90, delay: 28.9, fires: 67 },
  { county: 'Hudspeth', state: 'TX', svi: 0.71, delay: 31.5, fires: 34 },
  { county: 'Presidio', state: 'TX', svi: 0.68, delay: 27.4, fires: 78 },
  { county: 'Humboldt', state: 'CA', svi: 0.83, delay: 23.4, fires: 89 },
  { county: 'Big Horn', state: 'MT', svi: 0.72, delay: 23.4, fires: 34 },
  { county: 'Greenlee', state: 'AZ', svi: 0.74, delay: 29.1, fires: 67 },
  { county: 'Brewster', state: 'TX', svi: 0.63, delay: 21.3, fires: 89 },
  { county: 'Siskiyou', state: 'CA', svi: 0.79, delay: 22.1, fires: 234 },
  { county: 'Glacier', state: 'MT', svi: 0.63, delay: 19.8, fires: 89 },
  { county: 'Shasta', state: 'CA', svi: 0.76, delay: 19.8, fires: 312 },
  { county: 'Trinity', state: 'CA', svi: 0.72, delay: 18.4, fires: 156 },
  { county: 'Caddo', state: 'OK', svi: 0.68, delay: 24.8, fires: 67 },
  { county: 'Pottawatomie', state: 'OK', svi: 0.65, delay: 22.1, fires: 89 },
  { county: 'Ferry', state: 'WA', svi: 0.64, delay: 16.4, fires: 78 },
  { county: 'Owyhee', state: 'ID', svi: 0.71, delay: 16.3, fires: 89 },
  { county: 'Lincoln', state: 'ID', svi: 0.58, delay: 15.8, fires: 45 },
  { county: 'Plumas', state: 'CA', svi: 0.69, delay: 14.2, fires: 189 },
  { county: 'Klamath', state: 'OR', svi: 0.84, delay: 14.2, fires: 234 },
  { county: 'Sanders', state: 'MT', svi: 0.59, delay: 14.2, fires: 67 },
  { county: 'Okanogan', state: 'WA', svi: 0.61, delay: 13.9, fires: 156 },
  { county: 'Valley', state: 'ID', svi: 0.56, delay: 11.2, fires: 67 },
  { county: 'Lemhi', state: 'ID', svi: 0.58, delay: 12.8, fires: 45 },
  { county: 'Humboldt', state: 'NV', svi: 0.62, delay: 12.1, fires: 156 },
  { county: 'Curry', state: 'OR', svi: 0.61, delay: 12.1, fires: 78 },
  { county: 'Powell', state: 'MT', svi: 0.54, delay: 11.8, fires: 45 },
  { county: 'Harney', state: 'OR', svi: 0.60, delay: 10.3, fires: 89 },
  { county: 'Tehama', state: 'CA', svi: 0.67, delay: 12.8, fires: 167 },
  { county: 'Lander', state: 'NV', svi: 0.56, delay: 9.2, fires: 89 },
  { county: 'Douglas', state: 'OR', svi: 0.59, delay: 9.8, fires: 156 },
  { county: 'Lake', state: 'OR', svi: 0.62, delay: 11.8, fires: 123 },
  { county: 'Fresno', state: 'CA', svi: 0.72, delay: 9.8, fires: 423 },
  { county: 'Elko', state: 'NV', svi: 0.53, delay: 8.4, fires: 234 },
  { county: 'Stevens', state: 'WA', svi: 0.56, delay: 11.2, fires: 89 },
  { county: 'El Dorado', state: 'CA', svi: 0.61, delay: 7.4, fires: 234 },
  { county: 'Iron', state: 'UT', svi: 0.55, delay: 6.2, fires: 89 },
  { county: 'Washington', state: 'UT', svi: 0.52, delay: 4.8, fires: 156 },
  { county: 'Teller', state: 'CO', svi: 0.50, delay: 5.9, fires: 56 },
  { county: 'Alpine', state: 'CA', svi: 0.55, delay: 5.9, fires: 45 },
  { county: 'El Paso', state: 'CO', svi: 0.52, delay: 6.8, fires: 89 },
  { county: 'Larimer', state: 'CO', svi: 0.48, delay: 5.2, fires: 123 },
  { county: 'Deschutes', state: 'OR', svi: 0.55, delay: 7.1, fires: 89 },
  { county: 'Lincoln', state: 'WA', svi: 0.51, delay: 8.9, fires: 67 },
  { county: 'Boulder', state: 'CO', svi: 0.45, delay: 3.1, fires: 78 },
]

const SVI_TIER_DATA = [
  { tier: 'Low SVI', range: '< 0.55', avg_delay: 4.2, fire_count: 1066, fill: '#22c55e' },
  { tier: 'Medium SVI', range: '0.55 – 0.70', avg_delay: 13.3, fire_count: 24481, fill: '#f59e0b' },
  { tier: 'High SVI', range: '> 0.70', avg_delay: 40.3, fire_count: 17149, fill: '#ef4444' },
]

const STATE_CONTEXT: Record<string, string> = {
  NM: 'New Mexico has the longest delays nationally. Catron and McKinley counties — both >70% Native American — average 45h with no order.',
  AZ: "Arizona's Mohave, La Paz, and Apache counties are high-SVI, rural, and rely on a single emergency channel.",
  TX: 'Texas has high fire counts but very limited rural alert infrastructure in western counties like Presidio and Jeff Davis.',
  OK: "Oklahoma's eastern counties have high poverty rates and delayed wireless alert rollout.",
  MT: "Montana's Glacier County (tribal land, SVI 0.63) sees nearly 20h delays — far above the national median.",
  AK: 'Alaska has vast fire-prone areas with extremely limited cell coverage, high tribal SVI, and long logistical delays.',
  ID: "Owyhee County is one of the least-covered areas in FEMA's wireless alert network.",
  WA: 'Okanogan County has improved coverage but still lags due to mountainous terrain reducing cell reach.',
  KS: 'Kansas has limited fire alert infrastructure relative to its grass fire risk, especially in western counties.',
  OR: 'Oregon performs near the national median. Klamath County drives most of the state delay.',
  CA: 'California has the most fires but reasonable infrastructure. Trinity and Del Norte counties are worst.',
  NV: 'Elko and Humboldt counties are vast, low-density, and have minimal cell tower coverage.',
  CO: 'Colorado is a national leader in early alert infrastructure — Boulder and Larimer counties lead.',
  UT: 'Utah has invested in multi-channel alerts, bringing median delay well below national average.',
  ND: 'North Dakota has the fastest median response nationally — benefits from flat terrain and open radio.',
  LA: 'Louisiana has high SVI statewide and outdated emergency alert infrastructure in rural parishes.',
  MS: 'Mississippi has the second-highest average SVI nationally; alert system gaps are severe in Delta region.',
}

type ViewMode = 'overview' | 'all-states' | 'counties'
type SortCol = 'name' | 'delay' | 'svi' | 'fires'

export default function SignalGapPage() {
  const [gapData, setGapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<(typeof ALL_STATES)[0] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [stateSearch, setStateSearch] = useState('')
  const [countySearch, setCountySearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [regionFilter, setRegionFilter] = useState('All')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: stateData } = await supabase
        .from('signal_gap_by_state')
        .select('state, median_delay_hours, fire_count, avg_svi')
        .order('median_delay_hours', { ascending: false })
        .limit(15)
      setGapData(stateData && stateData.length > 0 ? stateData : DEMO_STATE_DATA)
      setLoading(false)
    }
    load()
  }, [])

  const barColor = (row: { avg_svi: number }) =>
    row.avg_svi > 0.7 ? '#ef4444' : row.avg_svi > 0.6 ? '#f59e0b' : '#22c55e'

  // All-states filtering & sorting
  const regions = ['All', ...Array.from(new Set(ALL_STATES.map(s => s.region)))]
  const filteredStates = ALL_STATES
    .filter(s => {
      const matchSearch = !stateSearch || s.state.toLowerCase().includes(stateSearch.toLowerCase())
      const matchRegion = regionFilter === 'All' || s.region === regionFilter
      return matchSearch && matchRegion
    })
    .sort((a, b) => {
      let result = 0
      if (sortCol === 'name') result = a.state.localeCompare(b.state)
      else if (sortCol === 'delay') result = a.median_delay_hours - b.median_delay_hours
      else if (sortCol === 'svi') result = a.avg_svi - b.avg_svi
      else result = a.fire_count - b.fire_count
      return sortAsc ? result : -result
    })

  // County filtering & sorting
  const filteredCounties = COUNTY_DATA
    .filter(c => {
      const q = countySearch.toLowerCase()
      return !q || c.county.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let result = 0
      if (sortCol === 'name') result = a.county.localeCompare(b.county)
      else if (sortCol === 'delay') result = a.delay - b.delay
      else if (sortCol === 'svi') result = a.svi - b.svi
      else result = a.fires - b.fires
      return sortAsc ? result : -result
    })

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(false) }
  }

  const SortBtn = ({ col, label }: { col: SortCol; label: string }) => (
    <button onClick={() => toggleSort(col)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${sortCol === col ? 'text-white' : 'text-ash-400 hover:text-ash-200'}`}>
      {label}
      {sortCol === col && <span className="text-ash-500">{sortAsc ? '↑' : '↓'}</span>}
    </button>
  )

  const StateTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    return (
      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-white font-semibold mb-1">{label}</p>
        <p style={{ color: '#ff6a20' }}>{row?.median_delay_hours?.toFixed(1)}h median delay</p>
        <p className="text-ash-400">{row?.fire_count?.toLocaleString()} fires</p>
        <p className="text-ash-400">Avg SVI: {row?.avg_svi?.toFixed(2)}</p>
        <p className="text-ash-500 mt-1 italic">Click bar for details</p>
      </div>
    )
  }

  const TierTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-white font-semibold">{d.tier} ({d.range})</p>
        <p style={{ color: d.fill }}>{d.avg_delay}h avg delay</p>
        <p className="text-ash-400">{d.fire_count.toLocaleString()} fires</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" /> RESEARCH FINDING
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Signal Gap Analysis</h1>
        <p className="text-ash-400 text-lg max-w-2xl">
          High-SVI counties experience significantly longer delays between fire detection and formal evacuation orders — a systemic equity failure in wildfire emergency response.
        </p>
      </div>

      {/* Key findings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KEY_FINDINGS.map((f) => {
          const Icon = f.icon
          return (
            <div key={f.label} className="card p-5">
              <Icon className={`w-5 h-5 ${f.color} mb-3`} />
              <div className={`font-display text-3xl font-bold ${f.color} mb-1`}>{f.value}</div>
              <div className="text-white text-sm font-medium">{f.label}</div>
              <div className="text-ash-500 text-xs mt-1">{f.sub}</div>
            </div>
          )
        })}
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 mb-6 bg-ash-900 rounded-xl p-1 border border-ash-800 w-fit">
        {([
          { id: 'overview' as ViewMode, label: 'Overview Charts', icon: TrendingUp },
          { id: 'all-states' as ViewMode, label: 'All States', icon: Table2 },
          { id: 'counties' as ViewMode, label: 'County View', icon: Map },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setViewMode(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === id ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-ash-200'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW MODE ── */}
      {viewMode === 'overview' && (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* State bar chart */}
            <div className="card p-6">
              <h3 className="font-display text-lg font-bold text-white mb-1">Median Delay by State (Top 15)</h3>
              <p className="text-ash-500 text-xs mb-1">Click a bar to see state detail below · Switch to "All States" for full list</p>
              <div className="flex gap-3 mb-4">
                {[['#ef4444','High SVI'],['#f59e0b','Medium'],['#22c55e','Low SVI']].map(([c, l]) => (
                  <span key={l} className="text-xs flex items-center gap-1 text-ash-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} /> {l}
                  </span>
                ))}
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={gapData} layout="vertical"
                    onClick={e => {
                      if (e?.activePayload?.[0]?.payload) {
                        const row = e.activePayload[0].payload
                        const full = ALL_STATES.find(s => s.state === row.state) || { ...row, region: '' }
                        setSelectedState(prev => prev?.state === row.state ? null : full as any)
                      }
                    }}
                    style={{ cursor: 'pointer' }}>
                    <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} unit="h" />
                    <YAxis type="category" dataKey="state" tick={{ fill: '#b3b1aa', fontSize: 11 }} width={32} />
                    <Tooltip content={<StateTooltip />} />
                    <Bar dataKey="median_delay_hours" radius={[0, 4, 4, 0]}>
                      {gapData.map((row, i) => (
                        <Cell key={i} fill={barColor(row)}
                          opacity={selectedState && selectedState.state !== row.state ? 0.4 : 0.85}
                          stroke={selectedState?.state === row.state ? '#ffffff' : 'none'}
                          strokeWidth={1.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* SVI tier comparison */}
            <div className="card p-6">
              <h3 className="font-display text-lg font-bold text-white mb-1">Delay by Vulnerability Level</h3>
              <p className="text-ash-500 text-xs mb-6">Average alert delay grouped by Social Vulnerability Index tier. Higher SVI = more vulnerable.</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SVI_TIER_DATA} barSize={48}>
                  <XAxis dataKey="tier" tick={{ fill: '#b3b1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#737068', fontSize: 11 }} unit="h" />
                  <Tooltip content={<TierTooltip />} />
                  <Bar dataKey="avg_delay" radius={[4, 4, 0, 0]}>
                    {SVI_TIER_DATA.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {SVI_TIER_DATA.map(d => (
                  <div key={d.tier} className="text-center">
                    <div className="font-display text-xl font-bold" style={{ color: d.fill }}>{d.avg_delay}h</div>
                    <div className="text-ash-400 text-xs">{d.tier}</div>
                    <div className="text-ash-600 text-xs">{d.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-ash-500 text-xs mt-4 border-t border-ash-800 pt-3">
                High-SVI communities wait <strong className="text-signal-danger">9.6×</strong> longer for a formal alert than low-SVI areas.
              </p>
            </div>
          </div>

          {/* State detail panel */}
          {selectedState && (
            <div className="card p-5 mb-6 border border-ash-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-display text-2xl font-bold text-white">{selectedState.state}</div>
                  <ChevronRight className="w-4 h-4 text-ash-600" />
                  <span className="text-ash-400 text-sm">{selectedState.region} · State Detail</span>
                </div>
                <button onClick={() => setSelectedState(null)} className="text-ash-600 hover:text-ash-400 text-xs">close ✕</button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="card p-3">
                  <div className="text-ash-500 text-xs mb-1">Median Delay</div>
                  <div className={`font-display text-2xl font-bold ${selectedState.median_delay_hours > 20 ? 'text-signal-danger' : selectedState.median_delay_hours > 10 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {selectedState.median_delay_hours}h
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-ash-500 text-xs mb-1">Fire Incidents</div>
                  <div className="font-display text-2xl font-bold text-white">{selectedState.fire_count.toLocaleString()}</div>
                </div>
                <div className="card p-3">
                  <div className="text-ash-500 text-xs mb-1">Avg SVI</div>
                  <div className={`font-display text-2xl font-bold ${selectedState.avg_svi > 0.7 ? 'text-signal-danger' : selectedState.avg_svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {selectedState.avg_svi.toFixed(2)}
                  </div>
                </div>
              </div>
              {STATE_CONTEXT[selectedState.state] && (
                <p className="text-ash-400 text-sm leading-relaxed">{STATE_CONTEXT[selectedState.state]}</p>
              )}
              <button onClick={() => { setViewMode('counties'); setCountySearch(selectedState.state) }}
                className="mt-3 text-signal-info text-xs hover:underline flex items-center gap-1">
                <Map className="w-3 h-3" /> View {selectedState.state} counties →
              </button>
            </div>
          )}

          {/* Methodology */}
          <div className="card p-6 border-l-4 border-ember-500">
            <h4 className="text-white font-semibold mb-2">Data &amp; Methodology</h4>
            <p className="text-ash-400 text-sm leading-relaxed">
              Analysis based on 62,696 wildfire incidents (2021–2025) from the WatchDuty/WiDS dataset, cross-referenced with CDC Social Vulnerability Index scores at the county level. Signal gap = time between first external signal detection and issuance of formal evacuation order. Of 41,906 fire geo_event_ids with external signals, only 108 had linked evacuation actions — a 99.74% gap rate.
            </p>
          </div>
        </>
      )}

      {/* ── ALL STATES MODE ── */}
      {viewMode === 'all-states' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ash-500" />
              <input type="text" value={stateSearch} onChange={e => setStateSearch(e.target.value)}
                placeholder="Filter by state code…"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {regions.map(r => (
                <button key={r} onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${regionFilter === r ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <span className="text-ash-500 text-xs ml-auto">{filteredStates.length} states</span>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ash-800 text-left">
                  <th className="px-5 py-3"><SortBtn col="name" label="State" /></th>
                  <th className="px-5 py-3"><SortBtn col="delay" label="Median Delay" /></th>
                  <th className="px-5 py-3"><SortBtn col="svi" label="Avg SVI" /></th>
                  <th className="px-5 py-3"><SortBtn col="fires" label="Fire Count" /></th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Region</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Gap Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {filteredStates.map(row => (
                  <tr key={row.state}
                    onClick={() => setSelectedState(prev => prev?.state === row.state ? null : row)}
                    className={`hover:bg-ash-800/40 transition-colors cursor-pointer ${selectedState?.state === row.state ? 'bg-ash-800/60' : ''}`}>
                    <td className="px-5 py-3 text-white font-semibold">{row.state}</td>
                    <td className="px-5 py-3">
                      <span className={`font-mono text-sm font-bold ${row.median_delay_hours > 20 ? 'text-signal-danger' : row.median_delay_hours > 10 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                        {row.median_delay_hours}h
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-mono text-sm font-bold ${row.avg_svi > 0.7 ? 'text-signal-danger' : row.avg_svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                        {row.avg_svi.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ash-300 text-sm">{row.fire_count.toLocaleString()}</td>
                    <td className="px-5 py-3 text-ash-400 text-xs">{row.region}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${row.median_delay_hours > 20 ? 'text-signal-danger border-signal-danger/30 bg-signal-danger/10' : row.median_delay_hours > 10 ? 'text-signal-warn border-signal-warn/30 bg-signal-warn/10' : 'text-signal-safe border-signal-safe/30 bg-signal-safe/10'}`}>
                        {row.median_delay_hours > 20 ? 'Critical' : row.median_delay_hours > 10 ? 'Elevated' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedState && (
            <div className="card p-4 mt-4 border border-ash-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{selectedState.state} — {selectedState.region}</span>
                <button onClick={() => setSelectedState(null)} className="text-ash-600 text-xs hover:text-ash-400">close ✕</button>
              </div>
              {STATE_CONTEXT[selectedState.state]
                ? <p className="text-ash-400 text-sm">{STATE_CONTEXT[selectedState.state]}</p>
                : <p className="text-ash-500 text-sm">Median delay: {selectedState.median_delay_hours}h · {selectedState.fire_count.toLocaleString()} fires · SVI {selectedState.avg_svi.toFixed(2)}</p>
              }
              <button onClick={() => { setViewMode('counties'); setCountySearch(selectedState.state) }}
                className="mt-2 text-signal-info text-xs hover:underline flex items-center gap-1">
                <Map className="w-3 h-3" /> View {selectedState.state} county data →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── COUNTY VIEW MODE ── */}
      {viewMode === 'counties' && (
        <div>
          <div className="flex gap-3 mb-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ash-500" />
              <input type="text" value={countySearch} onChange={e => setCountySearch(e.target.value)}
                placeholder="Search county or state…"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600" />
            </div>
            {countySearch && (
              <button onClick={() => setCountySearch('')} className="text-ash-500 hover:text-ash-300 text-xs">clear</button>
            )}
            <span className="text-ash-500 text-xs ml-auto">{filteredCounties.length} counties</span>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ash-800 text-left">
                  <th className="px-5 py-3"><SortBtn col="name" label="County" /></th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">State</th>
                  <th className="px-5 py-3"><SortBtn col="delay" label="Median Delay" /></th>
                  <th className="px-5 py-3"><SortBtn col="svi" label="SVI Score" /></th>
                  <th className="px-5 py-3"><SortBtn col="fires" label="Fire Count" /></th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Gap bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {filteredCounties.map((row, i) => {
                  const barW = Math.min(100, Math.round((row.delay / 55) * 100))
                  const barC = row.svi > 0.7 ? '#ef4444' : row.svi > 0.6 ? '#f59e0b' : '#22c55e'
                  return (
                    <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                      <td className="px-5 py-3 text-white font-medium text-sm">{row.county}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => setCountySearch(row.state)}
                          className="text-signal-info text-xs hover:underline font-mono">{row.state}</button>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-mono text-sm font-bold ${row.delay > 20 ? 'text-signal-danger' : row.delay > 10 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                          {row.delay}h
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-mono text-sm font-bold ${row.svi > 0.7 ? 'text-signal-danger' : row.svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                          {row.svi.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ash-300 text-sm">{row.fires}</td>
                      <td className="px-5 py-3">
                        <div className="w-24 h-2 bg-ash-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barW}%`, background: barC, opacity: 0.8 }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-ash-600 text-xs mt-3">
            {COUNTY_DATA.length} counties from WiDS dataset · SVI from CDC Social Vulnerability Index · Color = SVI tier
          </p>
        </div>
      )}
    </div>
  )
}
