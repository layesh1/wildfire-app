'use client'
import { useState } from 'react'
import { Database, CheckCircle, AlertTriangle, XCircle, FlaskConical, TrendingUp, Wifi, Radio, Flame } from 'lucide-react'

// ── Verified stats from 09_enrich_dataset.py run 2026-03-16 ──────────────────
const TOTAL_RECORDS = 62696
const PRESCRIBED    = 11115
const TRUE_WF       = 50664
const SILENT_TRUE   = 34021   // 67.2% of true wildfires
const WITH_SIGNAL   = 33423   // 65.9% of true wildfires
const EVAC_OCCURRED = 653     // 1.3% of true wildfires
const SIGNAL_GAP    = 33181   // 99.3% of fires with signal

const YEAR_DATA = [
  { year: 2021, total: 113,    silent_pct: 0.0,  no_order_pct: 100.0, note: 'WatchDuty app just launched — coverage very limited' },
  { year: 2022, total: 1455,   silent_pct: 51.3, no_order_pct: 100.0, note: 'Rapid user growth; 100% no-order rate (system immature)' },
  { year: 2023, total: 11846,  silent_pct: 64.6, no_order_pct: 100.0, note: 'Major coverage expansion; still no linked orders' },
  { year: 2024, total: 19201,  silent_pct: 68.1, no_order_pct: 98.3,  note: 'First formal evac orders linked; 1.7% response rate' },
  { year: 2025, total: 18049,  silent_pct: 69.5, no_order_pct: 98.2,  note: 'Through mid-year (partial); consistent pattern' },
]

const FIELD_COMPLETENESS = [
  { field: 'geo_event_id',           pct: 100.0, source: 'geo_events',    critical: true  },
  { field: 'latitude / longitude',   pct: 100.0, source: 'geo_events',    critical: true  },
  { field: 'notification_type',      pct: 100.0, source: 'geo_events',    critical: true  },
  { field: 'is_prescribed',          pct: 100.0, source: 'geo_events.data', critical: true },
  { field: 'svi_score',              pct: 100.0, source: 'SVI 2022',      critical: true  },
  { field: 'external signal',        pct: 65.9,  source: 'externalgeoevent', critical: true },
  { field: 'max_acres',              pct: 51.2,  source: 'changelog',     critical: false },
  { field: 'first_order_at',         pct: 1.3,   source: 'changelog',     critical: true  },
  { field: 'first_warning_at',       pct: 1.4,   source: 'changelog',     critical: false },
  { field: 'first_advisory_at',      pct: 0.7,   source: 'changelog',     critical: false },
  { field: 'final_containment_pct',  pct: 49.8,  source: 'changelog',     critical: false },
  { field: 'last_spread_rate',       pct: 13.6,  source: 'changelog',     critical: false },
  { field: 'fire_duration_hours',    pct: 51.2,  source: 'changelog',     critical: false },
  { field: 'n_evac_zones_activated', pct: 0.9,   source: 'evac_zone_map', critical: false },
  { field: 'address',                pct: 62.5,  source: 'geo_events',    critical: false },
]

const KNOWN_ISSUES = [
  {
    severity: 'critical',
    title: '17.7% of records are prescribed burns',
    detail: '11,115 of 62,696 records are intentional prescribed burns — not wildfires. These have NO evacuation orders by design and inflate the "no-order" rate from 99.3% → 99.7% when included. All analysis should filter to is_prescribed = false.',
    fix: 'Use is_true_wildfire = 1 column (already computed in enriched dataset)',
  },
  {
    severity: 'critical',
    title: 'Data coverage severely uneven by year',
    detail: '2021 has only 113 records (vs 18-19K in 2024-2025) because WatchDuty was a new app. Year-over-year comparisons of 2021-2022 data are not statistically valid. Year-on-year trend analysis should start from 2023 at earliest.',
    fix: 'Filter to date_created >= 2023-01-01 for trend analysis',
  },
  {
    severity: 'high',
    title: '99.7% of fires monitored through only ONE channel',
    detail: 'Of 33,423 true wildfires with external signals, 99.7% are single-channel. This means if that one monitoring channel fails, there is zero redundancy. High-risk fires should have 3+ independent confirmation sources before an all-clear is issued.',
    fix: 'Use n_signal_channels column; flag fires where n_signal_channels < 2',
  },
  {
    severity: 'high',
    title: 'Evacuation order linkage is incomplete',
    detail: 'Only 242 fires have a computable signal→order lead time (both first_external_signal_at and first_order_at present). The 653 fires with orders may have orders from systems not captured in WatchDuty. True response rate may be slightly higher than 1.3%.',
    fix: 'Cross-reference with IRWIN system (4,767 perimeters have IRWINID)',
  },
  {
    severity: 'medium',
    title: 'SVI data is county-level, not parcel-level',
    detail: 'SVI scores are assigned by nearest county centroid. Fires in large counties (e.g., San Bernardino, CA = 20,000 sq mi) may be in low-vulnerability areas despite the county having a high average SVI.',
    fix: 'Use census tract-level SVI when available (smaller geographic unit)',
  },
  {
    severity: 'medium',
    title: 'No internet / limited English data is from 2022',
    detail: 'The SVI dataset used is from 2022. Areas with significant infrastructure investment since 2022 may have improved connectivity. The no-internet gap metric is conservative (likely an overestimate of the current problem).',
    fix: 'Update SVI source to latest available year annually',
  },
  {
    severity: 'low',
    title: 'Spread rate data only 13.6% coverage',
    detail: 'Radio-reported spread rate (slow/moderate/rapid/extreme) is only available for 6,968 of 50,664 true wildfires (13.6%). Extreme spread findings are directionally correct but may undercount actual extreme events.',
    fix: 'Supplement with NIFC ROS (Rate of Spread) field when perimeter data is available',
  },
]

const STAT_IMPACT = [
  { metric: 'Total fire records',         all: '62,696',   wildfire: '50,664',  change: '−17.7%', severity: 'warn' },
  { metric: 'Signal gap rate',            all: '66.5%',    wildfire: '65.5%',   change: '−1.0pp', severity: 'ok'   },
  { metric: 'Silent notification rate',   all: '73.5%',    wildfire: '67.2%',   change: '−6.3pp', severity: 'warn' },
  { metric: 'Extreme spread count',       all: '298',      wildfire: '256',     change: '−14.1%', severity: 'warn' },
  { metric: '% extreme with no evac',     all: '70.8%',    wildfire: '66.0%',   change: '−4.8pp', severity: 'ok'   },
  { metric: 'Evac order rate',            all: '1.1%',     wildfire: '1.3%',    change: '+0.2pp', severity: 'ok'   },
  { metric: 'Signal gap (has signal, no order)', all: '66.5%', wildfire: '99.3%', change: 'N/A — denominator changes', severity: 'critical' },
]

function SeverityBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-amber-100 text-amber-700 border-amber-200',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:      'bg-gray-100 text-gray-600 border-gray-200',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold uppercase ${map[s]}`}>{s}</span>
}

export default function DataHealthPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'completeness' | 'issues' | 'impact'>('overview')
  const maxYear = Math.max(...YEAR_DATA.map(d => d.total))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">
          <Database className="w-4 h-4" /> DATA HEALTH · ANALYST
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Data Quality & Accuracy Report</h1>
        <p className="text-gray-500 text-sm">Verified statistics from <code className="bg-gray-100 px-1 rounded text-xs">fire_events_enriched.csv</code> — 90 columns, computed 2026-03-16 from all 9 raw datasets.</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { value: '62,696', label: 'Raw records', sub: '2021–2025', color: 'text-gray-900' },
          { value: '11,115', label: 'Prescribed burns excluded', sub: '17.7% of all records', color: 'text-amber-600' },
          { value: '50,664', label: 'True wildfires', sub: 'Basis for all analysis', color: 'text-forest-600' },
          { value: '9', label: 'Raw datasets joined', sub: 'WatchDuty + CDC SVI', color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-700 text-sm font-medium mt-1">{s.label}</div>
            <div className="text-gray-400 text-xs mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['overview', 'completeness', 'issues', 'impact'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t === 'issues' ? `Known Issues (${KNOWN_ISSUES.length})` : t === 'impact' ? 'Prescribed Burn Impact' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab: Overview — data by year */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-semibold text-sm">Data Growth by Year — True Wildfires</h2>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              WatchDuty was a new app in 2021 — only 113 wildfire records that year. Coverage grew dramatically as user base expanded.
              <strong className="text-amber-600"> Do not compare 2021–2022 data to later years.</strong>
            </p>
            <div className="space-y-3">
              {YEAR_DATA.map(row => (
                <div key={row.year} className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm font-mono w-10">{row.year}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-2 transition-all ${row.total < 1000 ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${Math.max(2, (row.total / maxYear) * 100)}%` }}
                    >
                      <span className="text-white text-xs font-bold">{row.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-48 text-right">
                    <span className={`text-xs font-medium ${row.no_order_pct === 100 ? 'text-red-500' : 'text-amber-600'}`}>
                      {row.no_order_pct}% no order
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {YEAR_DATA.map(row => (
                <div key={row.year} className="flex gap-2 text-xs text-gray-400">
                  <span className="font-mono text-gray-500 shrink-0">{row.year}:</span>
                  <span>{row.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Radio, title: '99.7% single-channel', desc: 'Of 33,423 fires with external signals, 99.7% are monitored by only ONE source. Zero redundancy.', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              { icon: Wifi, title: '93.2% signal gap in digital dead zones', desc: 'Fires in high-no-internet counties have a 93.2% signal gap — nearly double the 49.1% rate in connected areas.', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
              { icon: Flame, title: '5,394 silent fires upgraded', desc: '5,394 fires started as silent notifications and were later upgraded to normal — these are the near-misses the system almost missed.', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
            ].map(c => (
              <div key={c.title} className={`card p-5 border ${c.bg}`}>
                <c.icon className={`w-5 h-5 ${c.color} mb-3`} />
                <div className={`font-semibold text-sm ${c.color} mb-1`}>{c.title}</div>
                <p className="text-gray-600 text-xs leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="text-gray-900 font-semibold text-sm mb-4">Dataset Sources Joined</h2>
            <div className="space-y-2">
              {[
                { name: 'geo_events_geoevent',              rows: '62,696',    used: 'All fire events — core table' },
                { name: 'geo_events_geoeventchangelog',     rows: '178,696',   used: 'Evac orders, warnings, acreage, spread rate timeline' },
                { name: 'geo_events_externalgeoevent',      rows: '1,502,495', used: 'External signals per fire — first arrival, channel type, count' },
                { name: 'geo_events_externalgeoeventchangelog', rows: '438,888', used: 'Signal updates (date_closed, revisions)' },
                { name: 'evac_zones_gis_evaczone',          rows: '37,457',    used: 'GIS boundaries for evacuation zone mapping' },
                { name: 'evac_zone_status_geo_event_map',   rows: '4,428',     used: 'Zones activated per fire (468 fires, median 4 zones)' },
                { name: 'fire_perimeters_gis_fireperimeter', rows: '6,206',    used: 'Official NIFC fire boundary polygons + IRWINID' },
                { name: 'SVI_2022_US_county',               rows: '3,144',     used: '39 columns: SVI sub-themes, race, internet, language, housing' },
              ].map(r => (
                <div key={r.name} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <code className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{r.name}</code>
                  </div>
                  <span className="text-gray-400 text-xs font-mono w-20 text-right">{r.rows}</span>
                  <span className="text-gray-500 text-xs w-72 text-right">{r.used}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Field Completeness */}
      {activeTab === 'completeness' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-gray-500 text-xs uppercase tracking-wider">Field</th>
                <th className="px-5 py-3 text-left text-gray-500 text-xs uppercase tracking-wider">Source Dataset</th>
                <th className="px-5 py-3 text-left text-gray-500 text-xs uppercase tracking-wider">Coverage</th>
                <th className="px-5 py-3 text-left text-gray-500 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FIELD_COMPLETENESS.map(f => {
                const Icon = f.pct === 100 ? CheckCircle : f.pct > 50 ? AlertTriangle : XCircle
                const color = f.pct === 100 ? 'text-green-600' : f.pct > 50 ? 'text-amber-500' : 'text-red-500'
                const barColor = f.pct === 100 ? 'bg-green-500' : f.pct > 50 ? 'bg-amber-400' : 'bg-red-400'
                return (
                  <tr key={f.field} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-700">{f.field}</code>
                        {f.critical && <span className="text-xs text-red-600 font-medium">critical</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-gray-400 text-xs">{f.source}</span>
                    </td>
                    <td className="px-5 py-3 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className={`text-xs font-mono font-bold ${color}`}>{f.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-gray-500 text-xs">
              Low coverage on <code>first_order_at</code> (1.3%) is expected — only 1.3% of true wildfires ever received a formal evacuation order.
              Low <code>last_spread_rate</code> (13.6%) reflects that radio-reported spread is only captured for significant fires.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Known Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          {KNOWN_ISSUES.map((issue, i) => (
            <div key={i} className={`card p-5 border ${issue.severity === 'critical' ? 'border-red-200 bg-red-50' : issue.severity === 'high' ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><SeverityBadge s={issue.severity} /></div>
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold text-sm mb-1">{issue.title}</div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-2">{issue.detail}</p>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-green-700 text-xs font-medium">{issue.fix}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Prescribed Burn Impact */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          <div className="card p-5 border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <FlaskConical className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-amber-800 font-semibold text-sm mb-1">Why This Matters</div>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Prescribed burns are intentionally set fires used for land management. They are NOT emergencies — evacuations are pre-planned and communities are informed in advance.
                  Including them in wildfire analysis inflates "no evacuation order" rates and makes the signal gap problem appear even larger than it actually is.
                  The analysis below shows the corrected figures with and without prescribed burns.
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left text-gray-500 text-xs uppercase tracking-wider">Metric</th>
                  <th className="px-5 py-3 text-center text-gray-500 text-xs uppercase tracking-wider">All Records (incl. prescribed)</th>
                  <th className="px-5 py-3 text-center text-gray-500 text-xs uppercase tracking-wider">True Wildfires Only</th>
                  <th className="px-5 py-3 text-center text-gray-500 text-xs uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {STAT_IMPACT.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-800 text-sm font-medium">{r.metric}</td>
                    <td className="px-5 py-4 text-center text-gray-500 font-mono text-sm">{r.all}</td>
                    <td className="px-5 py-4 text-center font-mono text-sm font-bold text-gray-900">{r.wildfire}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.severity === 'critical' ? 'bg-red-100 text-red-700'
                        : r.severity === 'warn'   ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                      }`}>{r.change}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-5">
            <h2 className="text-gray-900 font-semibold text-sm mb-3">Recommended Standard for All Analysis</h2>
            <div className="space-y-2">
              {[
                { icon: CheckCircle, text: 'Always filter: is_true_wildfire = 1 (excludes 11,115 prescribed burns)', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Report 50,664 true wildfires, not 62,696 total records', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Signal gap = 99.3% of true wildfires with signal (not 99.74%)', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Silent notification rate = 67.2% (not 73.5%)', color: 'text-green-600' },
                { icon: CheckCircle, text: 'Trend analysis: start from 2023 only (2021-2022 has inadequate coverage)', color: 'text-green-600' },
                { icon: AlertTriangle, text: 'The core finding is STRONGER after filtering: prescribed burns do not explain the gap', color: 'text-amber-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
                  <span className="text-gray-700 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
