'use client'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { Radio, Layers, Flame, ShieldAlert } from 'lucide-react'

// Tab 1: Radio Signals
const RADIO_BY_HOUR = [
  { hour: 0, count: 312 }, { hour: 1, count: 287 }, { hour: 2, count: 241 },
  { hour: 3, count: 198 }, { hour: 4, count: 167 }, { hour: 5, count: 154 },
  { hour: 6, count: 189 }, { hour: 7, count: 243 }, { hour: 8, count: 298 },
  { hour: 9, count: 334 }, { hour: 10, count: 387 }, { hour: 11, count: 412 },
  { hour: 12, count: 445 }, { hour: 13, count: 467 }, { hour: 14, count: 489 },
  { hour: 15, count: 521 }, { hour: 16, count: 556 }, { hour: 17, count: 589 },
  { hour: 18, count: 634 }, { hour: 19, count: 712 }, { hour: 20, count: 834 },
  { hour: 21, count: 1113 }, { hour: 22, count: 987 }, { hour: 23, count: 645 },
]

const SPREAD_RATE_DIST = [
  { name: 'Slow', value: 4059, color: '#22c55e' },
  { name: 'Moderate', value: 4030, color: '#eab308' },
  { name: 'Extreme', value: 650, color: '#ef4444' },
  { name: 'Rapid', value: 418, color: '#f97316' },
]

// Tab 2: Zone Escalation
const ZONE_SKIP_BY_STATE = [
  { state: 'NM', skip_rate: 48.2, total_zones: 45 },
  { state: 'AZ', skip_rate: 44.1, total_zones: 67 },
  { state: 'TX', skip_rate: 39.8, total_zones: 89 },
  { state: 'MT', skip_rate: 38.5, total_zones: 34 },
  { state: 'NV', skip_rate: 36.2, total_zones: 29 },
  { state: 'OR', skip_rate: 33.7, total_zones: 78 },
  { state: 'WA', skip_rate: 31.0, total_zones: 91 },
  { state: 'CA', skip_rate: 28.4, total_zones: 342 },
  { state: 'CO', skip_rate: 26.1, total_zones: 56 },
  { state: 'ID', skip_rate: 24.3, total_zones: 41 },
]

// Tab 3: Fire Causes
const FIRE_CAUSES = [
  { cause: 'Lightning (14)', count: 357, color: '#eab308', avg_svi: 0.58 },
  { cause: 'Equipment Use (10)', count: 15, color: '#f97316', avg_svi: 0.49 },
  { cause: 'Debris Burning (11)', count: 12, color: '#ef4444', avg_svi: 0.62 },
  { cause: 'Arson (7)', count: 6, color: '#dc2626', avg_svi: 0.71 },
  { cause: 'Other', count: 6, color: '#6b7280', avg_svi: 0.55 },
]

// Tab 4: Protocol Inversions
const INVERSIONS = [
  { fire: 'Oak Fire', county: 'Mariposa, CA', gap_min: 142, svi: 0.72 },
  { fire: 'Mill Fire', county: 'Siskiyou, CA', gap_min: 131, svi: 0.69 },
  { fire: 'Mosquito Fire', county: 'Placer, CA', gap_min: 123, svi: 0.61 },
  { fire: 'Mountain Fire', county: 'Ventura, CA', gap_min: 115, svi: 0.55 },
  { fire: 'Park Fire', county: 'Butte, CA', gap_min: 111, svi: 0.68 },
  { fire: 'Caldor Fire', county: 'El Dorado, CA', gap_min: 106, svi: 0.59 },
  { fire: 'Bootleg Fire', county: 'Lake, OR', gap_min: 104, svi: 0.71 },
  { fire: 'Monument Fire', county: 'Trinity, CA', gap_min: 102, svi: 0.76 },
  { fire: 'River Fire', county: 'Placer, CA', gap_min: 98, svi: 0.58 },
  { fire: 'Calf Fire', county: 'Shasta, CA', gap_min: 96, svi: 0.67 },
]

const TABS = [
  { id: 'radio', label: 'Radio Signals', icon: Radio },
  { id: 'zones', label: 'Zone Escalation', icon: Layers },
  { id: 'causes', label: 'Fire Causes', icon: Flame },
  { id: 'inversions', label: 'Protocol Inversions', icon: ShieldAlert },
] as const

type TabId = typeof TABS[number]['id']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-white font-medium">{label}</p>
      <p className="text-ember-400">{payload[0]?.value?.toLocaleString()}</p>
    </div>
  )
}

export default function FirePatternsPage() {
  const [tab, setTab] = useState<TabId>('radio')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <Layers className="w-4 h-4" /> FIRE PATTERNS · ANALYST
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Fire Pattern Analysis</h1>
        <p className="text-ash-400 text-lg">
          Radio dispatch signals, zone escalation skip rates, fire cause distribution, and protocol inversion detection.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-8 bg-ash-900 rounded-xl p-1 border border-ash-800 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${tab === id ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Radio Signals ── */}
      {tab === 'radio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '9,157', label: 'Total radio spread rate events', color: 'text-white' },
              { value: '21:00', label: 'Peak hour for radio dispatch activity', color: 'text-signal-warn' },
              { value: '100', label: 'Extreme/rapid radio + silent + no evac', color: 'text-signal-danger' },
              { value: '645', label: 'Fires with structure threat logged', color: 'text-ember-400' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-ash-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-1">Radio Activity by Hour of Day</h3>
              <p className="text-ash-500 text-xs mb-5">Events logged in dispatch changelog — peak at 9pm</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={RADIO_BY_HOUR}>
                  <XAxis dataKey="hour" tick={{ fill: '#737068', fontSize: 10 }}
                    tickFormatter={h => `${h}:00`} interval={2} />
                  <YAxis tick={{ fill: '#737068', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {RADIO_BY_HOUR.map((d, i) => (
                      <Cell key={i} fill={d.hour >= 20 || d.hour <= 1 ? '#ef4444' : '#ff6a20'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="text-white font-semibold mb-1">Spread Rate Distribution</h3>
              <p className="text-ash-500 text-xs mb-5">9,157 radio dispatch spread rate events</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={SPREAD_RATE_DIST} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {SPREAD_RATE_DIST.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-signal-warn">
            <p className="text-ash-400 text-sm leading-relaxed">
              <strong className="text-white">Key finding:</strong> Radio traffic peaks between 8pm–1am — overnight hours when most alert systems have lower staffing and residents are asleep.
              1,068 extreme/rapid events (11.7% of all radio reports) occurred during these peak hours.
              The 100 &ldquo;hidden danger&rdquo; fires with extreme radio + silent notification all occurred during this window.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 2: Zone Escalation ── */}
      {tab === 'zones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '31.4%', label: 'Zones that skipped warnings → straight to orders', color: 'text-signal-danger' },
              { value: '1,463', label: 'Zones with recorded status changes', color: 'text-white' },
              { value: '413', label: 'Stepped through warnings before orders', color: 'text-signal-safe' },
              { value: '189', label: 'Jumped directly from normal to orders', color: 'text-signal-danger' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-ash-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h3 className="text-white font-semibold mb-1">Zone Escalation Skip Rate by State</h3>
            <p className="text-ash-500 text-xs mb-5">% of zones that went normal → mandatory order, skipping the warning tier</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ZONE_SKIP_BY_STATE} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fill: '#737068', fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="state" tick={{ fill: '#b3b1aa', fontSize: 11 }} width={35} />
                <Tooltip
                  formatter={(v: any) => `${v}%`}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs">
                        <p className="text-white font-medium">{d.state}</p>
                        <p className="text-signal-danger">{d.skip_rate}% skip rate</p>
                        <p className="text-ash-400">{d.total_zones} total zones</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="skip_rate" radius={[0, 4, 4, 0]}>
                  {ZONE_SKIP_BY_STATE.map((d, i) => (
                    <Cell key={i} fill={d.skip_rate > 40 ? '#ef4444' : d.skip_rate > 30 ? '#eab308' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5 border border-signal-danger/20 bg-signal-danger/5">
            <p className="text-ash-400 text-sm leading-relaxed">
              <strong className="text-signal-danger">States with the most rural infrastructure gaps skip warnings most often.</strong> New Mexico and Arizona
              skip warnings at 48.2% and 44.1% respectively — meaning nearly half of all escalations gave residents
              zero advance notice. They went from normal zone status to mandatory evacuation with no warning tier.
              Note: these states also have high SVI scores, but zone skip rates reflect infrastructure and terrain constraints, not SVI directly.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 3: Fire Causes ── */}
      {tab === 'causes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '396', label: 'Fires with coded cause data (NIFC perimeters)', color: 'text-white' },
              { value: '90.2%', label: 'Lightning-caused fires', color: 'text-signal-warn' },
              { value: '9.8%', label: 'Human-caused fires', color: 'text-signal-danger' },
              { value: '0.71', label: 'Avg SVI for arson-caused fires (highest)', color: 'text-signal-danger' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-ash-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-1">Fire Cause Distribution</h3>
              <p className="text-ash-500 text-xs mb-5">Source: NIFC perimeter source_extra_data CAUSE codes</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={FIRE_CAUSES} dataKey="count" nameKey="cause"
                    cx="50%" cy="50%" outerRadius={100}
                    label={({ cause, percent }) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''}>
                    {FIRE_CAUSES.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend formatter={(v) => <span className="text-ash-400 text-xs">{v}</span>} />
                  <Tooltip formatter={(v: any) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="text-white font-semibold mb-1">Avg SVI Score by Cause Type</h3>
              <p className="text-ash-500 text-xs mb-5">Human-caused fires (arson, debris) hit more vulnerable areas</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={FIRE_CAUSES} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 1]} tick={{ fill: '#737068', fontSize: 11 }} />
                  <YAxis type="category" dataKey="cause" tick={{ fill: '#b3b1aa', fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v: any) => v.toFixed(2)} />
                  <Bar dataKey="avg_svi" radius={[0, 4, 4, 0]}>
                    {FIRE_CAUSES.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-signal-warn">
            <p className="text-ash-400 text-sm leading-relaxed">
              Lightning-caused fires (90.2%) tend to occur in less populated wilderness areas (avg SVI 0.58).
              Human-caused fires — particularly arson (avg SVI 0.71) and debris burning (0.62) — cluster in
              more populated, higher-vulnerability areas. CAUSE codes extracted from NIFC perimeter{' '}
              <code className="text-ash-500">source_extra_data</code> JSON field (396 of 6,207 perimeters coded).
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 4: Protocol Inversions ── */}
      {tab === 'inversions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { value: '258', label: 'Fires with order issued before warning', color: 'text-signal-danger' },
              { value: '39.5%', label: 'Of all evacuation-ordered fires had inversions', color: 'text-signal-warn' },
              { value: '112 min', label: 'Average time order preceded warning', color: 'text-ember-400' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-ash-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card p-5 border border-signal-warn/30 bg-signal-warn/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-signal-warn shrink-0 mt-0.5" />
              <p className="text-ash-300 text-sm leading-relaxed">
                <strong className="text-signal-warn">Protocol:</strong> The correct sequence is Advisory → Warning → Evacuation Order.
                A protocol inversion occurs when an order is issued <em>before</em> a warning.
                This means residents in the &ldquo;warning zone&rdquo; received zero intermediate notice —
                they went from normal status directly to mandatory evacuation.
                258 fires (39.5% of all evacuation-ordered fires) exhibited this pattern.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-ash-800">
              <h3 className="text-white font-semibold text-sm">Top 10 Protocol Inversions by Gap (minutes)</h3>
              <p className="text-ash-500 text-xs mt-0.5">Time between out-of-order order issuance and belated warning</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-ash-800 text-left">
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Fire</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">County, State</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Order Preceded Warning By</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {INVERSIONS.map((inv, i) => (
                  <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-white font-semibold text-sm">{inv.fire}</td>
                    <td className="px-5 py-3.5 text-ash-300 text-sm">{inv.county}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-mono font-bold text-sm ${inv.gap_min > 100 ? 'text-signal-danger' : inv.gap_min > 70 ? 'text-signal-warn' : 'text-amber-400'}`}>
                        {inv.gap_min} min
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-mono text-sm ${inv.svi > 0.7 ? 'text-signal-danger' : 'text-signal-warn'}`}>
                        {inv.svi.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-ash-900/50 border border-ash-800 rounded-lg">
            <p className="text-ash-500 text-xs">
              <span className="text-ash-400 font-medium">Methodology:</span> Inversions detected by comparing{' '}
              <code className="text-ash-400">first_order_at</code> &lt; <code className="text-ash-400">first_warning_at</code>{' '}
              in <code className="text-ash-400">fire_events_with_svi_and_delays.csv</code> for fires where both timestamps exist (n=653 orders, n=715 warnings).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
