'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Flame, AlertTriangle } from 'lucide-react'
import { ANALYST_AXIS_TICK, ANALYST_AXIS_TICK_SM } from '@/lib/analyst-charts'

const HIDDEN_DANGER_FIRES = [
  { name: 'Hawley Fire', county: 'Navajo County', state: 'AZ', svi: 0.98, radio_spread: 'extreme', max_acres: 4821 },
  { name: 'Chowchilla Fire', county: 'Madera County', state: 'CA', svi: 0.96, radio_spread: 'extreme', max_acres: 1203 },
  { name: 'Fairview Fire', county: 'Madera County', state: 'CA', svi: 0.96, radio_spread: 'rapid', max_acres: 28935 },
  { name: 'Double Fire', county: 'Coconino County', state: 'AZ', svi: 0.95, radio_spread: 'extreme', max_acres: 8431 },
  { name: 'Cub Creek 2 Fire', county: 'Navajo County', state: 'AZ', svi: 0.94, radio_spread: 'rapid', max_acres: 5621 },
  { name: 'Mineral Fire', county: 'Fresno County', state: 'CA', svi: 0.93, radio_spread: 'extreme', max_acres: 26939 },
  { name: 'Brattain Fire', county: 'Lake County', state: 'OR', svi: 0.91, radio_spread: 'rapid', max_acres: 40342 },
  { name: 'Knob Fire', county: 'Tehama County', state: 'CA', svi: 0.90, radio_spread: 'extreme', max_acres: 311 },
  { name: 'County Line Fire', county: 'Catron County', state: 'NM', svi: 0.90, radio_spread: 'rapid', max_acres: 18203 },
  { name: 'Cedar Creek Fire', county: 'Lane County', state: 'OR', svi: 0.89, radio_spread: 'extreme', max_acres: 127165 },
  { name: 'Patton Meadow Fire', county: 'Siskiyou County', state: 'CA', svi: 0.88, radio_spread: 'rapid', max_acres: 4021 },
  { name: 'Crater Creek Fire', county: 'Okanogan County', state: 'WA', svi: 0.87, radio_spread: 'extreme', max_acres: 31902 },
  { name: 'Rim Rock Fire', county: 'Garfield County', state: 'CO', svi: 0.87, radio_spread: 'rapid', max_acres: 7103 },
  { name: 'Middle Fork Fire', county: 'Lincoln County', state: 'NM', svi: 0.86, radio_spread: 'extreme', max_acres: 58320 },
  { name: 'White Rock Fire', county: 'Apache County', state: 'AZ', svi: 0.86, radio_spread: 'rapid', max_acres: 3041 },
  { name: 'Antelope Fire', county: 'Lassen County', state: 'CA', svi: 0.85, radio_spread: 'extreme', max_acres: 145120 },
  { name: 'Bolt Creek Fire', county: 'Chelan County', state: 'WA', svi: 0.84, radio_spread: 'rapid', max_acres: 10990 },
  { name: 'Taylor Creek Fire', county: 'Josephine County', state: 'OR', svi: 0.83, radio_spread: 'extreme', max_acres: 52790 },
  { name: 'Gold Pan Fire', county: 'Siskiyou County', state: 'CA', svi: 0.83, radio_spread: 'rapid', max_acres: 5021 },
  { name: 'Frog Fire', county: 'Modoc County', state: 'CA', svi: 0.82, radio_spread: 'extreme', max_acres: 14301 },
]

const sviColor = (svi: number) =>
  svi >= 0.9 ? '#ef4444' : svi >= 0.8 ? '#eab308' : '#f97316'

export default function HiddenDangerPage() {
  const avgSvi = (HIDDEN_DANGER_FIRES.reduce((s, f) => s + f.svi, 0) / HIDDEN_DANGER_FIRES.length).toFixed(2)
  const totalAcres = HIDDEN_DANGER_FIRES.reduce((s, f) => s + f.max_acres, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto text-gray-700 dark:text-gray-300">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-danger text-sm font-medium mb-3">
          <Flame className="w-4 h-4" /> HIDDEN DANGER · ANALYST
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Silent Fires With Extreme Spread
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-3xl">
          100 fires classified as &ldquo;silent&rdquo; (no official notification) where radio traffic explicitly
          reported extreme or rapid spread — yet received <strong className="text-signal-danger">zero evacuation action</strong>.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: '100', label: 'Silent fires with extreme radio spread', color: 'text-signal-danger' },
          { value: avgSvi, label: 'Average SVI score (most vulnerable counties)', color: 'text-signal-danger' },
          { value: `${(totalAcres / 1000).toFixed(0)}K`, label: 'Total acres burned with no evac alert', color: 'text-signal-warn' },
          { value: '0', label: 'Evacuation actions taken across all 100 fires', color: 'text-ember-400' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SVI bar chart */}
      <div className="card p-6 mb-6">
        <h2 className="text-gray-900 dark:text-white font-semibold mb-1">SVI Score by Fire (Top 20)</h2>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-5">All fires had radio-reported extreme/rapid spread AND zero evacuation action. Red = SVI &gt;0.9, amber = &gt;0.8</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={HIDDEN_DANGER_FIRES} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" domain={[0.7, 1]} tick={ANALYST_AXIS_TICK} />
            <YAxis type="category" dataKey="name" tick={ANALYST_AXIS_TICK_SM} width={120} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
                    <p className="text-white font-medium">{d.name}</p>
                    <p className="text-gray-400">{d.county}, {d.state}</p>
                    <p className="text-signal-danger">SVI: {d.svi.toFixed(2)}</p>
                    <p className="text-signal-warn">Radio: {d.radio_spread}</p>
                    <p className="text-gray-400">{d.max_acres.toLocaleString()} max acres</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="svi" radius={[0, 4, 4, 0]}>
              {HIDDEN_DANGER_FIRES.map((f, i) => (
                <Cell key={i} fill={sviColor(f.svi)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left bg-gray-100 dark:bg-gray-800">
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Fire Name</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">County, State</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">SVI</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Radio Spread</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Max Acres</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Evac Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {HIDDEN_DANGER_FIRES.map((fire, i) => (
              <tr
                key={i}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/80"
              >
                <td className="px-5 py-3.5 text-gray-900 dark:text-white font-semibold text-sm">{fire.name}</td>
                <td className="px-5 py-3.5 text-gray-800 dark:text-gray-300 text-sm">{fire.county}, {fire.state}</td>
                <td className="px-5 py-3.5">
                  <span className={`font-mono font-bold text-sm ${fire.svi >= 0.9 ? 'text-signal-danger' : fire.svi >= 0.8 ? 'text-signal-warn' : 'text-amber-400'}`}>
                    {fire.svi.toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${fire.radio_spread === 'extreme' ? 'bg-signal-danger/20 text-signal-danger' : 'bg-orange-500/20 text-orange-400'}`}>
                    {fire.radio_spread}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-800 dark:text-gray-300 text-sm font-mono">{fire.max_acres.toLocaleString()}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">None</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warning callout */}
      <div className="card p-6 border border-signal-danger/30 bg-signal-danger/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-signal-danger font-semibold mb-2">Systemic Alerting Failure</div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              These 100 fires represent the clearest equity signal in the dataset: radio dispatchers explicitly
              flagged extreme or rapid spread conditions, yet the official notification system never escalated
              to formal evacuation alerts. Communities with SVI &gt; 0.8 were disproportionately affected —
              the highest-vulnerability counties were the most likely to be left in the dark during dangerous fire behavior.
              The Hawley Fire (Navajo County, AZ — SVI 0.98) is the most extreme example.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-500 text-xs">
          <span className="text-gray-700 dark:text-gray-400 font-medium">Methodology:</span> Fires identified by cross-referencing{' '}
          <code className="text-gray-700 dark:text-gray-400">geo_events_geoeventchangelog.radio_traffic_indicates_rate_of_spread</code> (9,157 events)
          with <code className="text-gray-700 dark:text-gray-400">notification_type = &apos;silent&apos;</code> and <code className="text-gray-700 dark:text-gray-400">evacuation_occurred = 0</code>.
          Source: WiDS 2025 WatchDuty dataset.
        </p>
      </div>
    </div>
  )
}
