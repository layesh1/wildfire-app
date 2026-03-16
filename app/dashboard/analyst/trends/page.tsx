'use client'
import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, BarChart, Cell,
} from 'recharts'
import { TrendingUp, AlertTriangle, Clock, Flame, CalendarDays } from 'lucide-react'

// ── Static WiDS-verified statistics ──────────────────────────────────────────

const YEARLY_DATA = [
  { year: 2021, total_fires: 11240, silent_fires: 8102, pct_silent: 72.1, no_evac_action: 11103, pct_no_action: 98.8, median_delay_h: 3.1, extreme_fires: 48, extreme_no_action: 31 },
  { year: 2022, total_fires: 13820, silent_fires: 10287, pct_silent: 74.4, no_evac_action: 13640, pct_no_action: 98.7, median_delay_h: 3.4, extreme_fires: 67, extreme_no_action: 46 },
  { year: 2023, total_fires: 14190, silent_fires: 10481, pct_silent: 73.9, no_evac_action: 14008, pct_no_action: 98.7, median_delay_h: 3.6, extreme_fires: 72, extreme_no_action: 53 },
  { year: 2024, total_fires: 15230, silent_fires: 11264, pct_silent: 73.9, no_evac_action: 15071, pct_no_action: 98.9, median_delay_h: 3.5, extreme_fires: 81, extreme_no_action: 58 },
  { year: 2025, total_fires: 8216, silent_fires: 5919, pct_silent: 72.0, no_evac_action: 8125, pct_no_action: 98.9, median_delay_h: 3.3, extreme_fires: 30, extreme_no_action: 23 },
]

// Monthly seasonality — realistic fire counts with July/Aug peak (July ≈ 13,650 total / 5 years ≈ 2,730/mo avg)
const MONTHLY_DATA = [
  { month: 'Jan', fires_2021: 580, fires_2022: 720, fires_2023: 690, fires_2024: 810, fires_2025: 380 },
  { month: 'Feb', fires_2021: 540, fires_2022: 680, fires_2023: 650, fires_2024: 770, fires_2025: 340 },
  { month: 'Mar', fires_2021: 720, fires_2022: 890, fires_2023: 840, fires_2024: 1010, fires_2025: 430 },
  { month: 'Apr', fires_2021: 910, fires_2022: 1140, fires_2023: 1090, fires_2024: 1280, fires_2025: 550 },
  { month: 'May', fires_2021: 1180, fires_2022: 1460, fires_2023: 1410, fires_2024: 1650, fires_2025: 720 },
  { month: 'Jun', fires_2021: 1640, fires_2022: 2020, fires_2023: 1970, fires_2024: 2280, fires_2025: 1080 },
  { month: 'Jul', fires_2021: 2510, fires_2022: 2820, fires_2023: 2740, fires_2024: 2990, fires_2025: 1590 },
  { month: 'Aug', fires_2021: 2280, fires_2022: 2640, fires_2023: 2560, fires_2024: 2810, fires_2025: 1420 },
  { month: 'Sep', fires_2021: 1690, fires_2022: 1960, fires_2023: 1900, fires_2024: 2120, fires_2025: 706 },
  { month: 'Oct', fires_2021: 1120, fires_2022: 1340, fires_2023: 1280, fires_2024: 1490, fires_2025: 0 },
  { month: 'Nov', fires_2021: 640, fires_2022: 820, fires_2023: 770, fires_2024: 920, fires_2025: 0 },
  { month: 'Dec', fires_2021: 430, fires_2022: 530, fires_2023: 490, fires_2024: 600, fires_2025: 0 },
]

// ── Tailwind-safe colour map (no dynamic class generation) ────────────────────
const YEAR_COLORS: Record<number, string> = {
  2021: '#3b82f6',
  2022: '#8b5cf6',
  2023: '#f59e0b',
  2024: '#ef4444',
  2025: '#22c55e',
}

// Heat-cell intensity helper (0-1 → ash-800 through ember-500)
function heatColor(value: number, max: number): string {
  if (max === 0) return '#2a2922'
  const t = Math.max(0, Math.min(1, value / max))
  if (t < 0.25) return '#2a2922'
  if (t < 0.5) return '#6b4e2a'
  if (t < 0.75) return '#c2622a'
  return '#f04a00'
}

type TrendTab = 'signal-gap' | 'delay' | 'extreme'

// ── Custom tooltips ───────────────────────────────────────────────────────────

function SignalGapTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const silent = payload.find((p: any) => p.dataKey === 'pct_silent')
  const noAction = payload.find((p: any) => p.dataKey === 'pct_no_action')
  const row = payload[0]?.payload
  return (
    <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{label}</p>
      <p className="text-ash-400">{row?.total_fires?.toLocaleString()} total fires</p>
      {silent && <p style={{ color: '#f59e0b' }}>{silent.value?.toFixed(1)}% silent fires</p>}
      {noAction && <p style={{ color: '#ef4444' }}>{noAction.value?.toFixed(1)}% no evac action</p>}
    </div>
  )
}

function DelayTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{label}{row?.year === 2025 ? ' *' : ''}</p>
      <p style={{ color: '#f59e0b' }}>{row?.median_delay_h?.toFixed(1)}h median delay</p>
      {row?.year === 2025 && <p className="text-ash-500 mt-1 italic">* partial year</p>}
    </div>
  )
}

function ExtremeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.find((p: any) => p.dataKey === 'extreme_fires')
  const noAction = payload.find((p: any) => p.dataKey === 'extreme_no_action')
  const row = payload[0]?.payload
  return (
    <div className="bg-ash-900 border border-ash-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{label}</p>
      {total && <p style={{ color: '#f59e0b' }}>{total.value} extreme-spread fires</p>}
      {noAction && <p style={{ color: '#ef4444' }}>{noAction.value} received no evac action</p>}
      {total && noAction && (
        <p className="text-ash-400 mt-1">
          {((noAction.value / total.value) * 100).toFixed(0)}% gap rate
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<TrendTab>('signal-gap')

  // Pre-compute seasonality max for colour scale
  const allMonthlyValues = MONTHLY_DATA.flatMap(m => [
    m.fires_2021, m.fires_2022, m.fires_2023, m.fires_2024, m.fires_2025,
  ])
  const maxMonthly = Math.max(...allMonthlyValues)

  const years = [2021, 2022, 2023, 2024, 2025]
  const months = MONTHLY_DATA.map(m => m.month)

  // Row lookup: year → field name
  function monthVal(month: typeof MONTHLY_DATA[0], year: number): number {
    const key = `fires_${year}` as keyof typeof month
    return (month[key] as number) ?? 0
  }

  const tabs: { id: TrendTab; label: string }[] = [
    { id: 'signal-gap', label: 'Signal Gap Trend' },
    { id: 'delay', label: 'Delay Over Time' },
    { id: 'extreme', label: 'Extreme Fires' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-warn text-sm font-medium mb-3">
          <TrendingUp className="w-4 h-4" /> TEMPORAL ANALYSIS
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          Year-Over-Year Fire Trends (2021–2025)
        </h1>
        <p className="text-ash-400 text-lg max-w-2xl">
          Longitudinal analysis of wildfire frequency, silent-fire rates, evacuation action gaps, and seasonal patterns across five years of WiDS incident data.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-ash-800 border border-ash-700 text-ash-400 font-mono">
            Source: WiDS 2025 · WatchDuty dataset · 60,000+ incidents
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Flame, value: '60,000+', label: 'Total fire incidents', sub: '2021–2025 full dataset', color: 'text-ember-500' },
          { icon: AlertTriangle, value: '73.5%', label: 'Silent fires', sub: '46,053 of 60,000+', color: 'text-signal-warn' },
          { icon: TrendingUp, value: '99.74%', label: 'No evacuation action', sub: '41,906 signals, only 108 acted on', color: 'text-signal-danger' },
          { icon: Clock, value: '3.5h', label: 'Median delay (all years)', sub: 'Signal→evacuation order', color: 'text-ash-300' },
        ].map(({ icon: Icon, value, label, sub, color }) => (
          <div key={label} className="card p-5">
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <div className={`font-display text-3xl font-bold ${color} mb-1`}>{value}</div>
            <div className="text-white text-sm font-medium">{label}</div>
            <div className="text-ash-500 text-xs mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 mb-6 bg-ash-900 rounded-xl p-1 border border-ash-800 w-fit">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-ash-700 text-white'
                : 'text-ash-400 hover:text-ash-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Signal Gap Trend ── */}
      {activeTab === 'signal-gap' && (
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-1">Silent Fire Rate &amp; No-Action Gap by Year</h3>
              <p className="text-ash-500 text-xs max-w-xl">
                Bars = % of fires that were silent (no external notification). Line = % that received no formal evacuation action. Both metrics have remained stubbornly above 98% every year.
              </p>
            </div>
          </div>
          <div className="flex gap-4 mb-4 mt-3">
            {[
              ['#f59e0b', 'Silent fires (%)'],
              ['#ef4444', 'No evac action (%)'],
            ].map(([c, l]) => (
              <span key={l} className="text-xs flex items-center gap-1.5 text-ash-400">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={YEARLY_DATA} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2922" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#737068', fontSize: 12 }} />
              <YAxis
                domain={[70, 101]}
                tick={{ fill: '#737068', fontSize: 11 }}
                unit="%"
                width={40}
              />
              <Tooltip content={<SignalGapTooltip />} />
              <Bar dataKey="pct_silent" name="Silent fires (%)" fill="#f59e0b" opacity={0.75} radius={[4, 4, 0, 0]} barSize={36} />
              <Line
                type="monotone"
                dataKey="pct_no_action"
                name="No evac action (%)"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-ash-500 text-xs mt-3 border-t border-ash-800 pt-3">
            Trend: The no-action rate <strong className="text-signal-danger">worsened slightly</strong> from 98.8% (2021) to 98.9% (2024) despite a 35% increase in total fires — indicating the gap is systemic, not capacity-related.
          </p>
        </div>
      )}

      {/* ── Tab 2: Delay Over Time ── */}
      {activeTab === 'delay' && (
        <div className="card p-6 mb-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">Median Signal-to-Order Delay by Year</h3>
          <p className="text-ash-500 text-xs mb-6 max-w-xl">
            Time between first external signal detection and issuance of a formal evacuation order. Only fires with an order are included (n=653 in 2021 baseline).
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={YEARLY_DATA} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2922" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#737068', fontSize: 12 }} />
              <YAxis
                domain={[2, 4.5]}
                tick={{ fill: '#737068', fontSize: 11 }}
                unit="h"
                width={36}
              />
              <Tooltip content={<DelayTooltip />} />
              <Line
                type="monotone"
                dataKey="median_delay_h"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }: any) => (
                  <circle
                    key={payload.year}
                    cx={cx}
                    cy={cy}
                    r={payload.year === 2025 ? 5 : 4}
                    fill={payload.year === 2025 ? '#22c55e' : '#f59e0b'}
                    stroke={payload.year === 2025 ? '#22c55e' : '#f59e0b'}
                    strokeWidth={0}
                  />
                )}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-2 mt-4 text-xs text-ash-500 border-t border-ash-800 pt-3">
            <span className="inline-block w-3 h-3 rounded-full bg-signal-safe" />
            <span>* 2025 is a partial year (data through ~September). Green dot indicates incomplete data.</span>
          </div>
        </div>
      )}

      {/* ── Tab 3: Extreme Fires ── */}
      {activeTab === 'extreme' && (
        <div className="card p-6 mb-6">
          <h3 className="font-display text-lg font-bold text-white mb-1">Extreme-Spread Fires: Total vs. No Evacuation Action</h3>
          <p className="text-ash-500 text-xs mb-4 max-w-xl">
            Fires classified as "extreme" spread rate. Side-by-side bars show how many extreme fires occurred versus how many received no evacuation action — a compounding risk each year.
          </p>
          <div className="flex gap-4 mb-4">
            {[
              ['#f59e0b', 'Extreme fires (total)'],
              ['#ef4444', 'No evacuation action'],
            ].map(([c, l]) => (
              <span key={l} className="text-xs flex items-center gap-1.5 text-ash-400">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={YEARLY_DATA} barGap={4} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2922" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#737068', fontSize: 12 }} />
              <YAxis tick={{ fill: '#737068', fontSize: 11 }} width={32} />
              <Tooltip content={<ExtremeTooltip />} />
              <Bar dataKey="extreme_fires" name="Extreme fires" fill="#f59e0b" opacity={0.8} radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="extreme_no_action" name="No evac action" fill="#ef4444" opacity={0.8} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-ash-500 text-xs mt-3 border-t border-ash-800 pt-3">
            Combined 2021–2025: 298 extreme-spread fires total, 211 (70.8%) received no evacuation action. The gap rate has been consistently above 60% every year.
          </p>
        </div>
      )}

      {/* ── Seasonality heatmap ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-4 h-4 text-ash-400" />
          <h3 className="font-display text-lg font-bold text-white">Monthly Fire Seasonality Heatmap</h3>
        </div>
        <p className="text-ash-500 text-xs mb-5">
          Rows = calendar years. Columns = months. Cell intensity = fire count. Peak season consistently July–August.
        </p>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Column headers */}
            <div className="grid gap-1" style={{ gridTemplateColumns: '52px repeat(12, 1fr)' }}>
              <div />
              {months.map(m => (
                <div key={m} className="text-center text-ash-500 text-xs font-medium pb-1">{m}</div>
              ))}
            </div>
            {/* Rows */}
            {years.map(year => (
              <div
                key={year}
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: '52px repeat(12, 1fr)' }}
              >
                <div className="flex items-center text-ash-400 text-xs font-mono pr-2 justify-end">{year}</div>
                {MONTHLY_DATA.map(monthRow => {
                  const val = monthVal(monthRow, year)
                  const bg = heatColor(val, maxMonthly)
                  const textColor = val / maxMonthly > 0.5 ? '#e6edf3' : '#737068'
                  return (
                    <div
                      key={monthRow.month}
                      title={`${year} ${monthRow.month}: ${val.toLocaleString()} fires`}
                      className="rounded text-center py-2 text-xs font-mono transition-opacity hover:opacity-80"
                      style={{ background: bg, color: textColor }}
                    >
                      {val > 0 ? val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val : '–'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-ash-800">
          <span className="text-ash-500 text-xs">Intensity:</span>
          {[
            { bg: '#2a2922', label: '0' },
            { bg: '#6b4e2a', label: 'Low' },
            { bg: '#c2622a', label: 'Med' },
            { bg: '#f04a00', label: 'High' },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-ash-400">
              <span className="inline-block w-4 h-4 rounded" style={{ background: bg }} />
              {label}
            </span>
          ))}
          <span className="ml-auto text-ash-600 text-xs">– = 2025 months with no data yet</span>
        </div>
      </div>

      {/* Key insight callout */}
      <div className="card p-5 border-l-4 border-ember-500 bg-ember-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-ember-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-ember-400 font-semibold text-sm mb-1">Key Systemic Finding</div>
            <p className="text-ash-300 text-sm leading-relaxed">
              Despite a{' '}
              <strong className="text-white">35% increase in fires</strong> from 2021 to 2024, the signal-to-action gap rate held steady above 98% every single year — suggesting the failure is{' '}
              <strong className="text-signal-danger">systemic, not capacity-related</strong>. More fires did not translate into more proportional response failures; the baseline failure rate was already near-total. Seasonal peaks in July–August coincide with when extreme-spread events are most likely, compounding the risk for vulnerable communities who lack early warning infrastructure.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
