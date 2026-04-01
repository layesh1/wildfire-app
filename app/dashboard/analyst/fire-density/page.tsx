'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, CartesianGrid, LabelList,
} from 'recharts'
import { MapPin } from 'lucide-react'
import { ANALYST_AXIS_TICK, ANALYST_AXIS_TICK_SM, ANALYST_CHART_GRID } from '@/lib/analyst-charts'

const DENSITY_DATA = [
  { state: 'CA', fires: 18234, area_sqmi: 163696, density: 111.4, avg_svi: 0.61 },
  { state: 'WA', fires: 3421, area_sqmi: 71298, density: 48.0, avg_svi: 0.52 },
  { state: 'OR', fires: 3988, area_sqmi: 98379, density: 40.5, avg_svi: 0.55 },
  { state: 'AZ', fires: 4521, area_sqmi: 113990, density: 39.7, avg_svi: 0.71 },
  { state: 'TX', fires: 9812, area_sqmi: 268596, density: 36.5, avg_svi: 0.67 },
  { state: 'ID', fires: 1987, area_sqmi: 83569, density: 23.8, avg_svi: 0.58 },
  { state: 'CO', fires: 2341, area_sqmi: 104094, density: 22.5, avg_svi: 0.48 },
  { state: 'MT', fires: 2876, area_sqmi: 147040, density: 19.6, avg_svi: 0.63 },
  { state: 'NM', fires: 2108, area_sqmi: 121590, density: 17.3, avg_svi: 0.74 },
  { state: 'NV', fires: 1654, area_sqmi: 110572, density: 15.0, avg_svi: 0.62 },
]

const sorted = [...DENSITY_DATA].sort((a, b) => b.density - a.density)

const scatterData = DENSITY_DATA.map(d => ({
  x: d.density,
  y: d.avg_svi,
  r: Math.sqrt(d.fires) / 3,
  state: d.state,
  fires: d.fires,
  compound: (d.density * d.avg_svi).toFixed(1),
}))

const densityColor = (d: typeof DENSITY_DATA[0]) =>
  d.avg_svi > 0.7 ? '#ef4444' : d.avg_svi > 0.6 ? '#eab308' : '#22c55e'

export default function FireDensityPage() {
  const topCompound = [...DENSITY_DATA].sort((a, b) => b.density * b.avg_svi - a.density * a.avg_svi)

  return (
    <div className="p-8 max-w-6xl mx-auto text-gray-700 dark:text-gray-300">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <MapPin className="w-4 h-4" /> FIRE DENSITY · ANALYST
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-3">Fire Density & Coverage Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Fires per 1,000 sq miles by state. Combines fire exposure with social vulnerability to identify
          the highest compound-risk regions.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: '111.4', label: 'Fires / 1,000 sq mi — California (highest)', color: 'text-signal-danger' },
          { value: '36.5', label: 'Texas density with SVI 0.67 — high compound risk', color: 'text-signal-warn' },
          { value: '0.74', label: 'NM avg SVI — most vulnerable state with fire exposure', color: 'text-signal-danger' },
          { value: '48%', label: 'Counties with single-channel alert coverage', color: 'text-ember-400' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card p-6 mb-6">
        <h2 className="text-gray-900 dark:text-white font-semibold mb-1">Fires per 1,000 Sq Miles by State</h2>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-5">
          Color = avg SVI level (green &lt;0.6 / amber 0.6–0.7 / red &gt;0.7). Height = fire density.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" tick={ANALYST_AXIS_TICK} />
            <YAxis type="category" dataKey="state" tick={ANALYST_AXIS_TICK_SM} width={35} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300">
                    <p className="text-white font-medium">{d.state}</p>
                    <p className="text-ember-400">{d.density} fires / 1,000 sq mi</p>
                    <p className="text-gray-400">{d.fires.toLocaleString()} total fires</p>
                    <p className="text-signal-info">SVI: {d.avg_svi.toFixed(2)}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="density" radius={[0, 4, 4, 0]}>
              {sorted.map((d, i) => <Cell key={i} fill={densityColor(d)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-gray-600 dark:text-gray-400 text-xs mt-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-signal-safe inline-block" /> SVI &lt;0.6 (lower vulnerability)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-signal-warn inline-block" /> SVI 0.6–0.7</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-signal-danger inline-block" /> SVI &gt;0.7 (highest vulnerability)</span>
        </div>
      </div>

      {/* Compound risk scatter */}
      <div className="card p-6 mb-6">
        <h2 className="text-gray-900 dark:text-white font-semibold mb-1">Compound Risk: Density × Vulnerability</h2>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-5">
          X = fire density (fires/1,000 sq mi), Y = avg SVI score. Top-right = highest compound risk.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" {...ANALYST_CHART_GRID} />
            <XAxis dataKey="x" name="Fire Density" tick={ANALYST_AXIS_TICK}
              label={{ value: 'Fires / 1,000 sq mi', fill: '#6b7280', fontSize: 11, position: 'insideBottom', offset: -10 }} />
            <YAxis dataKey="y" name="Avg SVI" tick={ANALYST_AXIS_TICK}
              label={{ value: 'Avg SVI', fill: '#6b7280', fontSize: 11, angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300">
                    <p className="text-white font-bold">{d?.state}</p>
                    <p className="text-ember-400">Density: {d?.x} fires/1k sqmi</p>
                    <p className="text-signal-info">SVI: {d?.y?.toFixed(2)}</p>
                    <p className="text-gray-400">{d?.fires?.toLocaleString()} total fires</p>
                    <p className="text-signal-warn">Compound risk: {d?.compound}</p>
                  </div>
                )
              }}
            />
            <Scatter data={scatterData} fill="#ff6a2060" stroke="#ff6a20" strokeWidth={1}>
              <LabelList dataKey="state" position="top" style={{ fill: '#6b7280', fontSize: 11 }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Data table */}
      <div className="card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left bg-gray-100 dark:bg-gray-800">
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">State</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Total Fires</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Area (sq mi)</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Fires / 1K sq mi</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Avg SVI</th>
              <th className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Compound Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {topCompound.map((row, i) => {
              const compound = row.density * row.avg_svi
              const maxCompound = topCompound[0].density * topCompound[0].avg_svi
              return (
                <tr key={i} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-gray-900 dark:text-white font-bold">{row.state}</td>
                  <td className="px-5 py-3.5 text-gray-800 dark:text-gray-300 text-sm">{row.fires.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 text-sm font-mono">{row.area_sqmi.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-mono font-bold text-sm ${row.density > 50 ? 'text-signal-danger' : row.density > 25 ? 'text-signal-warn' : 'text-gray-800 dark:text-gray-300'}`}>
                      {row.density}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`font-mono text-sm ${row.avg_svi > 0.7 ? 'text-signal-danger' : row.avg_svi > 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                      {row.avg_svi.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-ember-400 rounded-full" style={{ width: `${(compound / maxCompound) * 100}%` }} />
                      </div>
                      <span className="text-gray-800 dark:text-gray-300 text-xs font-mono">{compound.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Callout */}
      <div className="card p-6 border border-signal-warn/20 bg-signal-warn/5">
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          <strong className="text-gray-900 dark:text-white">Key finding:</strong> New Mexico combines the highest SVI (0.74) with
          elevated fire density (17.3/1,000 sq mi) — highest compound risk by vulnerability.
          California&apos;s extreme density (111.4/1,000 sq mi) with SVI 0.61 creates the highest absolute fire
          exposure. Texas combines moderate density with high SVI, making it the third most at-risk state overall.
        </p>
      </div>
    </div>
  )
}
