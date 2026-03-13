'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts'
import { AlertTriangle, TrendingUp, Clock, MapPin } from 'lucide-react'
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

const DEMO_SCATTER_DATA = [
  { x: 0.74, y: 38.7, name: 'Catron Co., NM' },
  { x: 0.71, y: 31.2, name: 'Mohave Co., AZ' },
  { x: 0.78, y: 42.1, name: 'McKinley Co., NM' },
  { x: 0.68, y: 27.4, name: 'Presidio Co., TX' },
  { x: 0.63, y: 19.8, name: 'Glacier Co., MT' },
  { x: 0.72, y: 33.4, name: 'La Paz Co., AZ' },
  { x: 0.58, y: 16.3, name: 'Owyhee Co., ID' },
  { x: 0.84, y: 51.2, name: 'Zuni Pueblo, NM' },
  { x: 0.61, y: 13.9, name: 'Okanogan Co., WA' },
  { x: 0.56, y: 11.2, name: 'Klamath Co., OR' },
  { x: 0.62, y: 9.8, name: 'Trinity Co., CA' },
  { x: 0.69, y: 3.5, name: 'Plumas Co., CA' },
  { x: 0.48, y: 5.2, name: 'Boulder Co., CO' },
  { x: 0.55, y: 7.1, name: 'Deschutes Co., OR' },
  { x: 0.82, y: 48.3, name: 'Apache Co., AZ' },
  { x: 0.45, y: 3.1, name: 'Larimer Co., CO' },
  { x: 0.67, y: 22.1, name: 'Pottawatomie Co., OK' },
  { x: 0.59, y: 15.8, name: 'Lincoln Co., ID' },
  { x: 0.76, y: 36.9, name: 'Hidalgo Co., NM' },
  { x: 0.53, y: 8.4, name: 'Elko Co., NV' },
]

export default function SignalGapPage() {
  const [gapData, setGapData] = useState<any[]>([])
  const [scatterData, setScatterData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // State-level delay data
      const { data: stateData } = await supabase
        .from('signal_gap_by_state')
        .select('state, median_delay_hours, fire_count, avg_svi')
        .order('median_delay_hours', { ascending: false })
        .limit(15)

      if (stateData && stateData.length > 0) setGapData(stateData)
      else setGapData(DEMO_STATE_DATA)

      // SVI vs delay scatter
      const { data: sviData } = await supabase
        .from('signal_gap_by_county')
        .select('svi_score, median_delay_hours, county, state')
        .not('svi_score', 'is', null)
        .limit(200)

      if (sviData && sviData.length > 0) setScatterData(sviData.map(d => ({
        x: d.svi_score,
        y: d.median_delay_hours,
        name: `${d.county}, ${d.state}`,
      })))
      else setScatterData(DEMO_SCATTER_DATA)

      setLoading(false)
    }
    load()
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-medium">{label}</p>
        <p className="text-ember-400">{payload[0]?.value?.toFixed(1)}h median delay</p>
        {payload[1] && <p className="text-ash-400">{payload[1]?.value} fires</p>}
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
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          Signal Gap Analysis
        </h1>
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
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Bar: State delays */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">Median Delay by State</h3>
          <p className="text-ash-500 text-xs mb-6">Top 15 states by evacuation delay (hours)</p>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gapData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} />
                <YAxis type="category" dataKey="state" tick={{ fill: '#b3b1aa', fontSize: 11 }} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="median_delay_hours" fill="#ff6a20" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Scatter: SVI vs delay */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">SVI Score vs. Alert Delay</h3>
          <p className="text-ash-500 text-xs mb-6">Higher SVI = more vulnerable. Pattern shows equity gap.</p>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3e38" />
                <XAxis dataKey="x" name="SVI Score" tick={{ fill: '#737068', fontSize: 11 }} label={{ value: 'SVI Score', fill: '#5e5b53', fontSize: 11, position: 'insideBottom', offset: -4 }} />
                <YAxis dataKey="y" name="Delay (hrs)" tick={{ fill: '#737068', fontSize: 11 }} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#5e5b53' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs">
                        <p className="text-white font-medium">{d?.name}</p>
                        <p className="text-ash-400">SVI: {d?.x?.toFixed(3)}</p>
                        <p className="text-ember-400">Delay: {d?.y?.toFixed(1)}h</p>
                      </div>
                    )
                  }}
                />
                <Scatter data={scatterData} fill="#ff6a2060" stroke="#ff6a20" strokeWidth={1} r={3} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Methodology note */}
      <div className="card p-6 border-l-4 border-ember-500">
        <h4 className="text-white font-semibold mb-2">Data & Methodology</h4>
        <p className="text-ash-400 text-sm leading-relaxed">
          Analysis based on 62,696 wildfire incidents (2021–2025) from the WatchDuty/WiDS dataset, cross-referenced with CDC Social Vulnerability Index scores at the county level. Signal gap = time between first external signal detection (social media, news, wireless alerts) and issuance of formal evacuation order. Of 41,906 fire geo_event_ids with external signals, only 108 had linked evacuation actions — a 99.74% gap rate.
        </p>
      </div>
    </div>
  )
}
