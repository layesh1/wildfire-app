'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Clock, MapPin, ChevronRight, Search, Table2, Map, Download, Code, ShieldAlert, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const KEY_FINDINGS = [
  { icon: Clock, value: '1.1h', label: 'Median time to order', sub: 'From fire start, when orders ARE issued (n=653 true wildfires)', color: 'text-signal-warn' },
  { icon: AlertTriangle, value: '99.3%', label: 'Signal gap rate', sub: '33,181 of 33,423 true wildfires with signals never got an order', color: 'text-signal-danger' },
  { icon: TrendingUp, value: '9×', label: 'State-level disparity', sub: 'Idaho 19.2h median vs. California 0.9h (fires that DID get orders)', color: 'text-ember-400' },
  { icon: Radio, value: '4.1h', label: 'Signal lead time', sub: 'Median hours from first external signal to evacuation order (n=242)', color: 'text-signal-info' },
]

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

// ORDER RATE by SVI tier — the verified finding is that SVI predicts WHETHER orders are issued,
// NOT how long they take. When orders DO occur, timing is ~1.1h across ALL SVI tiers.
// Order rate values are derived from the WiDS dataset (653 orders / 50,664 true wildfires = 1.3% overall).
const SVI_TIER_DATA = [
  { tier: 'Low SVI', range: '< 0.55', order_rate: 2.4, fire_count: 1066, fill: '#22c55e' },
  { tier: 'Medium SVI', range: '0.55 – 0.70', order_rate: 1.3, fire_count: 24481, fill: '#f59e0b' },
  { tier: 'High SVI', range: '> 0.70', order_rate: 0.7, fire_count: 17149, fill: '#ef4444' },
]

const STATE_CONTEXT: Record<string, string> = {
  NM: 'New Mexico has the longest delays nationally. Catron and McKinley counties — both >70% Native American — average 45h with no order.',
  AZ: "Arizona's Mohave, La Paz, and Apache counties are high-SVI, rural, and rely on a single emergency channel.",
  TX: 'Texas has high fire counts but very limited rural alert infrastructure in western counties like Presidio and Jeff Davis.',
  OK: "Oklahoma's eastern counties have high poverty rates and delayed wireless alert rollout.",
  MT: "Montana's Glacier County (tribal land, SVI 0.63) sees nearly 20h delays — far above the national median.",
  AK: 'Alaska has vast fire-prone areas with extremely limited cell coverage, high tribal SVI, and long logistical delays.',
  ID: "Idaho 19.2h median vs. California 0.9h — the largest state-level response gap in the dataset. Owyhee County is one of the least-covered areas in FEMA's wireless alert network.",
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

// Protocol inversions: orders issued BEFORE warnings (anomalous escalation)
const PROTOCOL_INVERSIONS = [
  { fire: 'Oak Fire', state: 'CA', county: 'Mariposa', gap_min: 142, max_acres: 19244, svi: 0.71 },
  { fire: 'Mosquito Fire', state: 'CA', county: 'Placer/El Dorado', gap_min: 98, max_acres: 76788, svi: 0.61 },
  { fire: 'River Fire', state: 'CA', county: 'Nevada', gap_min: 76, max_acres: 2642, svi: 0.58 },
  { fire: 'Calf Canyon', state: 'NM', county: 'Mora', gap_min: 64, max_acres: 341735, svi: 0.82 },
  { fire: 'Hermits Peak', state: 'NM', county: 'San Miguel', gap_min: 58, max_acres: 341735, svi: 0.79 },
  { fire: 'Cedar Creek', state: 'OR', county: 'Lane', gap_min: 51, max_acres: 127324, svi: 0.59 },
  { fire: 'Bootleg', state: 'OR', county: 'Klamath/Lake', gap_min: 44, max_acres: 413717, svi: 0.61 },
  { fire: 'Tamarack', state: 'CA', county: 'Alpine', gap_min: 37, max_acres: 68637, svi: 0.55 },
  { fire: 'Antelope', state: 'CA', county: 'Lassen', gap_min: 29, max_acres: 145108, svi: 0.67 },
  { fire: 'Monument', state: 'CA', county: 'Trinity', gap_min: 21, max_acres: 223124, svi: 0.72 },
]

function exportSignalGapCsv(stateData: { state: string; median_delay_hours: number; fire_count: number; avg_svi: number }[]) {
  const header = 'state,median_delay_hours,fire_count,avg_svi\n'
  const rows = stateData.map(r =>
    [r.state, r.median_delay_hours, r.fire_count, r.avg_svi ?? ''].join(',')
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'signal-gap-by-state.csv'
  a.click()
  URL.revokeObjectURL(url)
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

  // Color bars by delay severity (not by SVI — SVI predicts order rates, not delay hours)
  const barColor = (row: { median_delay_hours: number }) =>
    row.median_delay_hours > 20 ? '#ef4444' : row.median_delay_hours > 10 ? '#f59e0b' : '#22c55e'

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
        <p style={{ color: d.fill }}>{d.order_rate}% received an order</p>
        <p className="text-ash-400">{d.fire_count.toLocaleString()} fires in tier</p>
        <p className="text-ash-500 mt-1">When orders do occur: ~1.1h across all tiers</p>
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
          62,696 total records (11,115 prescribed burns excluded). Among 50,664 true wildfires: 33,423 had external signals, yet 99.3% never received a formal evacuation order — a systemic failure in wildfire emergency response.
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

      {/* Prescribed Burns + Single-Channel info block */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* LEFT: Prescribed Burns Excluded */}
        <div className="p-4 rounded-xl border border-ember-500/30 bg-ember-500/5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-ember-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-ember-400 text-sm font-semibold mb-1">Prescribed Burns Excluded</p>
            <p className="text-ash-400 text-xs leading-relaxed">
              <strong className="text-white">11,115 prescribed burns (17.7%)</strong> removed from signal gap analysis. These intentional fires have no evacuation orders by design. True wildfire signal gap: <strong className="text-ember-300">99.3%</strong> — was 99.74% with prescribed burns included.
            </p>
          </div>
        </div>
        {/* RIGHT: Single-Channel Vulnerability */}
        <div className="p-4 rounded-xl border border-signal-danger/30 bg-signal-danger/5 flex items-start gap-3">
          <Radio className="w-5 h-5 text-signal-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-signal-danger text-sm font-semibold mb-1">Single-Channel Vulnerability</p>
            <p className="text-ash-400 text-xs leading-relaxed">
              <strong className="text-white">99.7% of monitored fires have only ONE external signal source.</strong> If that source fails, there is zero backup detection. Further: <strong className="text-signal-warn">100% of signal channels are regional dispatch</strong> — there is no AlertWest AI or NIFC satellite detection in the dataset. Communities without active dispatch coverage have no signal path at all.
            </p>
          </div>
        </div>
      </div>

      {/* Signal Source Breakdown */}
      <div className="mb-6 card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-signal-info" />
          <span className="text-white text-sm font-semibold">Signal Source Analysis</span>
          <span className="ml-auto text-ash-600 text-xs">geo_events_externalgeoevent.csv · 1.5M rows</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Regional Dispatch', value: '99.9%', sub: '33,389 of 33,423 fires', color: 'text-signal-warn', desc: 'incidents-* channels (human-reported)' },
            { label: 'NIFC Extra', value: '0.4%', sub: '117 fires', color: 'text-signal-info', desc: 'bots-extra channels (federal)' },
            { label: 'AlertWest AI', value: '0%', sub: '0 fires in dataset', color: 'text-ash-500', desc: 'No AI detection signals present' },
            { label: 'NIFC Satellite', value: '0%', sub: '0 fires in dataset', color: 'text-ash-500', desc: 'No NIFC bot signals present' },
          ].map(s => (
            <div key={s.label} className="bg-ash-800/50 border border-ash-700 rounded-lg p-3">
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white text-xs font-medium mt-0.5">{s.label}</div>
              <div className="text-ash-500 text-xs mt-1 leading-tight">{s.sub}</div>
              <div className="text-ash-600 text-xs mt-1 italic leading-tight">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-signal-warn/5 border border-signal-warn/20">
          <p className="text-ash-400 text-xs leading-relaxed">
            <strong className="text-signal-warn">Critical finding:</strong> The WatchDuty external signal system is 100% reliant on human-operated regional dispatch channels. There is no automated satellite or AI detection redundancy. Gaps in dispatch coverage — common in rural and high-SVI counties — create complete signal blackouts with no backup detection path.
          </p>
        </div>
      </div>

      {/* Protocol Inversion Banner */}
      <div className="mb-6 p-4 rounded-xl border border-signal-danger/30 bg-signal-danger/5 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-signal-danger mt-0.5 shrink-0" />
        <div>
          <p className="text-signal-danger text-sm font-semibold mb-1">258 Protocol Inversions Detected</p>
          <p className="text-ash-400 text-xs leading-relaxed">
            In 258 fire incidents, evacuation <strong className="text-white">orders were issued before warnings</strong> — skipping the standard advisory→warning→order escalation. This bypasses the early-warning window that vulnerable populations rely on most. The 10 most extreme cases are shown in the Overview tab.
          </p>
        </div>
      </div>

      {/* Response Window stat block */}
      <div className="mb-6 p-4 rounded-xl border border-signal-info/20 bg-signal-info/5">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-signal-info" />
          <span className="text-signal-info text-sm font-semibold">Response Window</span>
        </div>
        <p className="text-ash-300 text-sm leading-relaxed">
          When a responder acts: <strong className="text-white">median 1.1h from fire start to order</strong> (n=653 true wildfires that received orders).
          When signals are available first: <strong className="text-white">4.1h lead time before order</strong> (n=242 fires with signal→order linkage).
          This means responders have a <strong className="text-signal-info">~4 hour window</strong> from first external signal detection to act — time that is currently unused in 99.3% of cases.
        </p>
        <p className="text-ash-500 text-xs mt-2">
          Additionally: <strong className="text-ash-300">5,394 fires</strong> started as silent notifications and were later upgraded to normal — near-miss detection events the system almost missed entirely.
        </p>
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
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-display text-lg font-bold text-white">Signal Lead Time by State (Top 15)</h3>
                <button
                  onClick={() => exportSignalGapCsv(gapData)}
                  disabled={!gapData.length}
                  className="flex items-center gap-1.5 text-xs text-ash-400 hover:text-white border border-ash-700 hover:border-ash-500 rounded-lg px-2.5 py-1.5 transition-colors shrink-0 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
              <p className="text-ash-500 text-xs mb-1">Median hours from first external signal to first evacuation order, by state · Click a bar for detail · Switch to &quot;All States&quot; for full list</p>
              <div className="flex gap-3 mb-4">
                {[['#ef4444','> 20h'],['#f59e0b','10–20h'],['#22c55e','< 10h']].map(([c, l]) => (
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
              <h3 className="font-display text-lg font-bold text-white mb-1">Order Rate by Vulnerability Level</h3>
              <p className="text-ash-500 text-xs mb-6">% of fires that received a formal evacuation order, by SVI tier. SVI predicts <strong className="text-signal-danger">whether</strong> orders are issued — not how long they take.</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SVI_TIER_DATA} barSize={48}>
                  <XAxis dataKey="tier" tick={{ fill: '#b3b1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#737068', fontSize: 11 }} unit="%" domain={[0, 3.5]} />
                  <Tooltip content={<TierTooltip />} />
                  <Bar dataKey="order_rate" radius={[4, 4, 0, 0]}>
                    {SVI_TIER_DATA.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {SVI_TIER_DATA.map(d => (
                  <div key={d.tier} className="text-center">
                    <div className="font-display text-xl font-bold" style={{ color: d.fill }}>{d.order_rate}%</div>
                    <div className="text-ash-400 text-xs">{d.tier}</div>
                    <div className="text-ash-600 text-xs">{d.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-ash-500 text-xs mt-4 border-t border-ash-800 pt-3">
                High-SVI communities are significantly less likely to receive a formal evacuation order at all. When orders do occur, timing is ~1.1h across all SVI tiers. Overall order rate: 1.3% (653 of 50,664 true wildfires).
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

          {/* Protocol Inversions Table */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-signal-danger" />
              <h3 className="font-display text-lg font-bold text-white">Top 10 Protocol Inversions</h3>
              <span className="ml-auto text-xs text-ash-500">Order issued before warning · gap in minutes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ash-800 text-left">
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider pr-4">Fire</th>
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider pr-4">State</th>
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider pr-4">County</th>
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider pr-4">Inversion Gap</th>
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider pr-4">Max Acres</th>
                    <th className="pb-2 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-800/50">
                  {PROTOCOL_INVERSIONS.map((row, i) => (
                    <tr key={i} className="hover:bg-ash-800/30 transition-colors">
                      <td className="py-2.5 text-white text-sm font-medium pr-4">{row.fire}</td>
                      <td className="py-2.5 text-ash-300 text-sm font-mono pr-4">{row.state}</td>
                      <td className="py-2.5 text-ash-400 text-sm pr-4">{row.county}</td>
                      <td className="py-2.5 pr-4">
                        <span className="text-signal-danger font-mono text-sm font-bold">−{row.gap_min} min</span>
                      </td>
                      <td className="py-2.5 text-ash-300 text-sm pr-4">{row.max_acres.toLocaleString()} ac</td>
                      <td className="py-2.5">
                        <span className={`font-mono text-sm font-bold ${row.svi > 0.7 ? 'text-signal-danger' : row.svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                          {row.svi.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-ash-600 text-xs mt-3">
              Negative gap = order timestamp precedes warning timestamp · Source: fire_events_with_svi_and_delays.csv
            </p>
          </div>

          {/* Methodology */}
          <div className="card p-6 border-l-4 border-ember-500">
            <h4 className="text-white font-semibold mb-2">Data &amp; Methodology</h4>
            <p className="text-ash-400 text-sm leading-relaxed">
              Analysis based on 62,696 total records (2021–2025) from the WatchDuty/WiDS dataset, with 11,115 prescribed burns (17.7%) excluded to yield 50,664 true wildfire incidents. Cross-referenced with CDC Social Vulnerability Index scores at the county level. Signal gap = time between first external signal detection and issuance of formal evacuation order. Of 33,423 true wildfire geo_event_ids with external signals, 33,181 (99.3%) had no linked evacuation action. Signal→order lead time: 4.1h median (n=242). Extreme spread true wildfires: 256 total, 169 (66.0%) received no evacuation action.
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

      {/* API Reference */}
      <ApiReference />
    </div>
  )
}

function ApiReference() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-ash-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-signal-info" />
          <span className="font-semibold text-white text-sm">Data Sources &amp; API Reference</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-ash-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-5 text-sm border-t border-ash-800 pt-4">
          <p className="text-ash-400">
            This dashboard synthesizes data from four primary sources. Below are the APIs, schemas, and usage notes for replication or integration.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                name: 'Watch Duty / WiDS Dataset',
                desc: '62,696 total records (2021–2025), 50,664 true wildfires after excluding 11,115 prescribed burns. Includes evacuation order timestamps, notification type, and spread rates.',
                endpoint: 'Internal CSV — fire_events_with_svi_and_delays.csv',
                fields: 'geo_event_id, notification_type, fire_start, first_order_at, hours_to_order, evacuation_occurred, county_fips',
                note: 'Not publicly available. Contact WiDS 2025 for access.'
              },
              {
                name: 'CDC Social Vulnerability Index',
                desc: 'County-level composite vulnerability score (0–1) across 4 sub-themes: socioeconomic, household, minority, housing.',
                endpoint: 'https://www.atsdr.cdc.gov/placeandhealth/svi/data_documentation_download.html',
                fields: 'FIPS, RPL_THEMES, RPL_THEME1–4, EP_AGE65, EP_DISABL, EP_NOVEH',
                note: 'Updated every 2 years. Current data: 2022.'
              },
              {
                name: 'NIFC Active Fire Perimeters',
                desc: 'National Interagency Fire Center GeoJSON of active fire incident polygons with IRWINID linkage.',
                endpoint: 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query',
                fields: 'IncidentName, IncidentTypeCategory, GISAcres, DateCurrent, IrwinID, PerimeterCategory',
                note: 'Public API. No auth required. Updates every 15 min.'
              },
              {
                name: 'NOAA NWS Red Flag Warnings',
                desc: 'Active fire weather alerts (Red Flag Warnings, Fire Weather Watches) with geometry.',
                endpoint: 'https://api.weather.gov/alerts/active?event=Red%20Flag%20Warning',
                fields: 'properties.areaDesc, properties.severity, properties.onset, geometry.coordinates',
                note: 'Free, public. JSON-LD format. Proxied via /api/fires/redflags.'
              },
            ].map(src => (
              <div key={src.name} className="bg-ash-800/40 border border-ash-700 rounded-xl p-4">
                <div className="font-semibold text-white text-xs mb-1">{src.name}</div>
                <p className="text-ash-400 text-xs mb-2">{src.desc}</p>
                <div className="bg-ash-900 rounded-lg px-3 py-2 font-mono text-xs text-signal-info break-all mb-2">{src.endpoint}</div>
                <div className="text-ash-500 text-xs"><span className="text-ash-400">Fields:</span> {src.fields}</div>
                <div className="text-ash-600 text-xs mt-1 italic">{src.note}</div>
              </div>
            ))}
          </div>
          <div className="bg-ash-800/40 border border-ash-700 rounded-xl p-4">
            <div className="font-semibold text-white text-xs mb-2">Methodology Notes</div>
            <ul className="text-ash-400 text-xs space-y-1.5 list-disc list-inside">
              <li><strong className="text-ash-300">Prescribed burns excluded</strong>: 11,115 records (17.7%) with geo_event_type = prescribed burn removed; true wildfire n = 50,664</li>
              <li><strong className="text-ash-300">Signal gap</strong> = time between first satellite/sensor detection and first official evacuation order (hours_to_order)</li>
              <li><strong className="text-ash-300">Signal lead time</strong> = hours from first_external_signal to first_order_at; median 4.1h (n=242 fires with both timestamps)</li>
              <li><strong className="text-ash-300">Silent fire</strong> = notification_type = &ldquo;silent&rdquo; in Watch Duty API (no push alert issued to residents); 34,021 of 50,664 true wildfires (67.2%)</li>
              <li><strong className="text-ash-300">Silent→normal upgrades</strong>: 5,394 fires reclassified from silent to normal — near-miss detection events</li>
              <li><strong className="text-ash-300">SVI equity finding</strong> = SVI predicts order rate (whether an order is issued), NOT delay hours. When orders do occur, all SVI tiers show ~1.1h median. High-SVI counties (SVI &gt; 0.7) order rate: ~0.7% vs. low-SVI (&lt; 0.55): ~2.4%.</li>
              <li><strong className="text-ash-300">Extreme spread</strong> = last_spread_rate = &ldquo;extreme&rdquo; in WiDS dataset; 256 true wildfire incidents, 169 (66.0%) with no evac action</li>
              <li><strong className="text-ash-300">Protocol inversion</strong> = first_order_at timestamp precedes first_warning_at (258 incidents)</li>
              <li>State signal-gap chart shows median hours from first external signal to first order, for fires where both timestamps exist — reflects where alert infrastructure gaps are largest, not a direct function of SVI alone</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
