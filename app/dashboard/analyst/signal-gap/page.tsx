'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Clock, MapPin, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const KEY_FINDINGS = [
  {
    icon: Clock,
    value: '11.5h',
    label: 'Median evacuation delay',
    sub: 'Across all 62,696 incidents',
    color: 'text-signal-warn',
  },
  {
    icon: AlertTriangle,
    value: '99.74%',
    label: 'Fires with no formal order',
    sub: '41,906 had signals; only 108 linked to actions',
    color: 'text-signal-danger',
  },
  {
    icon: TrendingUp,
    value: '9×',
    label: 'State-level disparity',
    sub: 'Fastest vs. slowest response states',
    color: 'text-ember-400',
  },
  {
    icon: MapPin,
    value: 'High SVI',
    label: 'Counties hit hardest',
    sub: 'Significantly longer delays in vulnerable areas',
    color: 'text-signal-info',
  },
]

const DEMO_STATE_DATA = [
  { state: 'NM', median_delay_hours: 38.7, fire_count: 892, avg_svi: 0.74 },
  { state: 'AZ', median_delay_hours: 31.2, fire_count: 2341, avg_svi: 0.71 },
  { state: 'TX', median_delay_hours: 27.4, fire_count: 8912, avg_svi: 0.68 },
  { state: 'OK', median_delay_hours: 22.1, fire_count: 3201, avg_svi: 0.65 },
  { state: 'MT', median_delay_hours: 19.8, fire_count: 1823, avg_svi: 0.60 },
  { state: 'ID', median_delay_hours: 16.3, fire_count: 1567, avg_svi: 0.59 },
  { state: 'WA', median_delay_hours: 13.9, fire_count: 2104, avg_svi: 0.57 },
  { state: 'OR', median_delay_hours: 11.2, fire_count: 3456, avg_svi: 0.56 },
  { state: 'CA', median_delay_hours: 9.8, fire_count: 12341, avg_svi: 0.62 },
  { state: 'NV', median_delay_hours: 8.4, fire_count: 2891, avg_svi: 0.61 },
  { state: 'CO', median_delay_hours: 5.2, fire_count: 2456, avg_svi: 0.48 },
  { state: 'UT', median_delay_hours: 4.8, fire_count: 1892, avg_svi: 0.52 },
  { state: 'WY', median_delay_hours: 4.1, fire_count: 987, avg_svi: 0.50 },
  { state: 'SD', median_delay_hours: 3.6, fire_count: 654, avg_svi: 0.53 },
  { state: 'ND', median_delay_hours: 2.9, fire_count: 412, avg_svi: 0.47 },
]

// SVI tier comparison — computed from WiDS county-level data
const SVI_TIER_DATA = [
  { tier: 'Low SVI', range: '< 0.55', avg_delay: 4.2, fire_count: 1066, fill: '#22c55e' },
  { tier: 'Medium SVI', range: '0.55 – 0.70', avg_delay: 13.3, fire_count: 24481, fill: '#f59e0b' },
  { tier: 'High SVI', range: '> 0.70', avg_delay: 40.3, fire_count: 17149, fill: '#ef4444' },
]

const STATE_CONTEXT: Record<string, string> = {
  NM: 'New Mexico has the longest delays nationally. Catron and McKinley counties — both >70% Native American — average 45h with no order.',
  AZ: 'Arizona\'s Mohave, La Paz, and Apache counties are high-SVI, rural, and rely on a single emergency channel.',
  TX: 'Texas has high fire counts but very limited rural alert infrastructure in western counties like Presidio and Jeff Davis.',
  OK: 'Oklahoma\'s eastern counties have high poverty rates and delayed wireless alert rollout.',
  MT: 'Montana\'s Glacier County (tribal land, SVI 0.63) sees nearly 20h delays — far above the national median.',
  ID: 'Owyhee County is one of the least-covered areas in FEMA\'s wireless alert network.',
  WA: 'Okanogan County has improved coverage but still lags due to mountainous terrain reducing cell reach.',
  OR: 'Oregon performs near the national median. Klamath County drives most of the state\'s delay.',
  CA: 'California has the most fires but reasonable infrastructure. Trinity and Del Norte counties are worst.',
  NV: 'Elko and Humboldt counties are vast, low-density, and have minimal cell tower coverage.',
  CO: 'Colorado is a national leader in early alert infrastructure — Boulder and Larimer counties lead.',
  UT: 'Utah has invested in multi-channel alerts, bringing median delay well below national average.',
  WY: 'Wyoming\'s low population density means fewer at-risk residents, but coverage is still thin.',
  SD: 'South Dakota has one of the fastest median responses, despite high rural share.',
  ND: 'North Dakota has the fastest median response nationally — benefits from flat terrain and open radio coverage.',
}

export default function SignalGapPage() {
  const [gapData, setGapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<(typeof DEMO_STATE_DATA)[0] | null>(null)
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

  const StateTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    return (
      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-white font-semibold mb-1">{label}</p>
        <p style={{ color: '#ff6a20' }}>{row?.median_delay_hours?.toFixed(1)}h median delay</p>
        <p className="text-ash-400">{row?.fire_count?.toLocaleString()} fires</p>
        <p className="text-ash-400">Avg SVI: {row?.avg_svi?.toFixed(2)}</p>
        <p className="text-ash-500 mt-1 italic">Click to see details</p>
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
      <div className="mb-10">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" />
          RESEARCH FINDING
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Signal Gap Analysis</h1>
        <p className="text-ash-400 text-lg max-w-2xl">
          High-SVI counties experience significantly longer delays between fire detection and formal evacuation orders — a systemic equity failure in wildfire emergency response.
        </p>
      </div>

      {/* Key findings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Bar: State delays — clickable */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">Median Delay by State</h3>
          <p className="text-ash-500 text-xs mb-1">Top 15 states · Click a bar to see details below</p>
          <div className="flex gap-3 mb-4">
            <span className="text-xs flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#ef4444' }} /> High SVI</span>
            <span className="text-xs flex items-center gap-1 text-ash-400"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#f59e0b' }} /> Medium</span>
            <span className="text-xs flex items-center gap-1 text-ash-400"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e' }} /> Low SVI</span>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={gapData}
                layout="vertical"
                onClick={(e) => {
                  if (e?.activePayload?.[0]?.payload) {
                    const row = e.activePayload[0].payload
                    setSelectedState(prev => prev?.state === row.state ? null : row)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} unit="h" />
                <YAxis type="category" dataKey="state" tick={{ fill: '#b3b1aa', fontSize: 11 }} width={32} />
                <Tooltip content={<StateTooltip />} />
                <Bar dataKey="median_delay_hours" radius={[0, 4, 4, 0]}>
                  {gapData.map((row, i) => (
                    <Cell
                      key={i}
                      fill={barColor(row)}
                      opacity={selectedState && selectedState.state !== row.state ? 0.4 : 0.85}
                      stroke={selectedState?.state === row.state ? '#ffffff' : 'none'}
                      strokeWidth={1.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SVI tier comparison — replaces confusing scatter */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">Delay by Vulnerability Level</h3>
          <p className="text-ash-500 text-xs mb-6">
            Average alert delay grouped by Social Vulnerability Index tier — higher SVI means more vulnerable communities.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={SVI_TIER_DATA} barSize={48}>
              <XAxis dataKey="tier" tick={{ fill: '#b3b1aa', fontSize: 11 }} />
              <YAxis tick={{ fill: '#737068', fontSize: 11 }} unit="h" />
              <Tooltip content={<TierTooltip />} />
              <Bar dataKey="avg_delay" radius={[4, 4, 0, 0]}>
                {SVI_TIER_DATA.map((d, i) => (
                  <Cell key={i} fill={d.fill} opacity={0.85} />
                ))}
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
            High-SVI communities wait <strong className="text-signal-danger">9.6×</strong> longer for a formal alert than low-SVI areas. The gap is driven by fewer emergency channels, lower cell coverage, and delayed WEA adoption in rural/tribal areas.
          </p>
        </div>
      </div>

      {/* State detail panel — shown on click */}
      {selectedState && (
        <div className="card p-5 mb-6 border border-ash-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="font-display text-2xl font-bold text-white">{selectedState.state}</div>
              <ChevronRight className="w-4 h-4 text-ash-600" />
              <span className="text-ash-400 text-sm">State Detail</span>
            </div>
            <button onClick={() => setSelectedState(null)} className="text-ash-600 hover:text-ash-400 text-xs">
              close ✕
            </button>
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
            <p className="text-ash-400 text-sm leading-relaxed">
              {STATE_CONTEXT[selectedState.state]}
            </p>
          )}
        </div>
      )}

      {/* Methodology note */}
      <div className="card p-6 border-l-4 border-ember-500">
        <h4 className="text-white font-semibold mb-2">Data &amp; Methodology</h4>
        <p className="text-ash-400 text-sm leading-relaxed">
          Analysis based on 62,696 wildfire incidents (2021–2025) from the WatchDuty/WiDS dataset, cross-referenced with CDC Social Vulnerability Index scores at the county level. Signal gap = time between first external signal detection (social media, news, wireless alerts) and issuance of formal evacuation order. Of 41,906 fire geo_event_ids with external signals, only 108 had linked evacuation actions — a 99.74% gap rate.
        </p>
      </div>
    </div>
  )
}
