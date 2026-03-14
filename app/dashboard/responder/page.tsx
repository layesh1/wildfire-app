'use client'
import { useEffect, useState } from 'react'
import { Shield, Flame, AlertTriangle, Activity, TrendingUp, Clock, ChevronRight, Wind, Droplets, Users, Truck, Radio, Map, ChevronDown, ChevronUp, Building2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const QUICK_NAV = [
  { label: 'ML Spread Predictor', href: '/dashboard/responder/ml', icon: Activity, badge: 'AI', badgeColor: 'badge-info' },
  { label: 'COMMAND-INTEL AI', href: '/dashboard/responder/ai', icon: Activity, badge: 'LIVE', badgeColor: 'badge-safe' },
]

// NFDRS standardized risk levels (National Fire Danger Rating System)
const NFDRS = [
  { level: 'Low', color: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30', desc: 'Fires not likely' },
  { level: 'Moderate', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', desc: 'Some fires possible' },
  { level: 'High', color: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400/30', desc: 'Fires start easily' },
  { level: 'Very High', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', desc: 'Rapid spread expected' },
  { level: 'Extreme', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', desc: 'Extreme spread, mass ignition' },
]

const MUTUAL_AID = [
  { agency: 'NC State Forestry', type: 'Air support + ground crews', status: 'available', eta: '45 min' },
  { agency: 'Johnston County FD', type: 'Engine + crew (3)', status: 'available', eta: '20 min' },
  { agency: 'Wake County Emergency', type: 'EMS + command unit', status: 'deployed', eta: 'On scene' },
  { agency: 'FEMA Region 4', type: 'Type I Incident Management', status: 'pending', eta: '6–12 hr' },
]

const STAFFING = [
  { shift: 'A-Shift (On duty)', crew: ['Lt. Morris (OIC)', 'FF Garcia (Driver/Pump)', 'FF Patel (EMS)', 'FF Kim (S&R)'], truck: 'Engine 1 + Rescue 1' },
  { shift: 'B-Shift (On call)', crew: ['Capt. Rhodes', 'FF Johnson', 'FF Davis'], truck: 'Engine 2' },
]

const DEMO_FIRES = [
  { id: 'd1', incident_name: 'Dixie Fire', county: 'Plumas', state: 'CA', acres_burned: 963309, containment_pct: null, svi_score: 0.69, signal_gap_hours: 3.5 },
  { id: 'd2', incident_name: 'Bootleg Fire', county: 'Klamath', state: 'OR', acres_burned: 401279, containment_pct: null, svi_score: 0.58, signal_gap_hours: 2.1 },
  { id: 'd3', incident_name: 'Wallow Fire', county: 'Greenlee', state: 'AZ', acres_burned: 538049, containment_pct: null, svi_score: 0.74, signal_gap_hours: 18.4 },
  { id: 'd4', incident_name: 'Creek Fire', county: 'Fresno', state: 'CA', acres_burned: 379895, containment_pct: null, svi_score: 0.72, signal_gap_hours: 4.2 },
  { id: 'd5', incident_name: 'Caldor Fire', county: 'El Dorado', state: 'CA', acres_burned: 221774, containment_pct: null, svi_score: 0.61, signal_gap_hours: 6.8 },
  { id: 'd6', incident_name: 'Monument Fire', county: 'Trinity', state: 'CA', acres_burned: 223124, containment_pct: null, svi_score: 0.63, signal_gap_hours: null },
  { id: 'd7', incident_name: 'Snake River Complex', county: 'Owyhee', state: 'ID', acres_burned: 481838, containment_pct: null, svi_score: 0.71, signal_gap_hours: null },
  { id: 'd8', incident_name: 'Whitewater-Baldy', county: 'Catron', state: 'NM', acres_burned: 297845, containment_pct: null, svi_score: 0.78, signal_gap_hours: null },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface RedFlagWarning {
  zone: string
  headline: string
  onset: string
  expires: string
  lat: number
  lon: number
  description: string
}

interface NifcFire {
  id: string
  fire_name: string
  latitude: number
  longitude: number
  acres: number | null
  containment: number | null
  source: string
}

interface Shelter {
  name: string
  county: string
  state: string
  lat: number
  lon: number
  capacity: number | null
  occupancy: number | null
  pct_full: number | null
}

// ─── Helper: format ISO date ──────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Sub-component: Situation Report Header ──────────────────────────────────

function SituationReportHeader() {
  const [incidentName, setIncidentName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [nifcCount, setNifcCount] = useState<number | null>(null)
  const [shelterWarn, setShelterWarn] = useState<number | null>(null)
  const [redFlagLoaded, setRedFlagLoaded] = useState(false)
  const [nifcLoaded, setNifcLoaded] = useState(false)
  const [shelterLoaded, setShelterLoaded] = useState(false)

  // Load saved incident name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active_incident_name')
      if (saved) setIncidentName(saved)
    } catch {}
  }, [])

  // Tick clock every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Fetch status chips
  useEffect(() => {
    fetch('/api/fires/redflags')
      .then(r => r.json())
      .then(d => setRedFlagCount(d.count ?? 0))
      .catch(() => setRedFlagCount(0))
      .finally(() => setRedFlagLoaded(true))

    fetch('/api/fires/nifc')
      .then(r => r.json())
      .then(d => setNifcCount(Array.isArray(d.data) ? d.data.length : 0))
      .catch(() => setNifcCount(0))
      .finally(() => setNifcLoaded(true))

    fetch('/api/shelters')
      .then(r => r.json())
      .then(d => setShelterWarn(d.near_capacity ?? 0))
      .catch(() => setShelterWarn(0))
      .finally(() => setShelterLoaded(true))
  }, [])

  function saveIncident(name: string) {
    setIncidentName(name)
    try { localStorage.setItem('active_incident_name', name) } catch {}
  }

  const timeStr = currentTime.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 text-ember-400 text-xs font-medium mb-4">
        <Shield className="w-3.5 h-3.5" />
        SITUATION REPORT
        <span className="ml-auto flex items-center gap-1.5 text-ash-500 font-mono text-xs">
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
      </div>

      {/* Incident name */}
      <input
        type="text"
        value={incidentName}
        onChange={e => saveIncident(e.target.value)}
        placeholder="Active incident name (e.g. Caldor Fire)…"
        className="w-full bg-ash-800 border border-ash-700 rounded-lg px-4 py-2.5 text-white text-base font-semibold focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 transition-colors mb-4"
      />

      {/* Status chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Red Flag */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !redFlagLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          redFlagCount && redFlagCount > 0
            ? 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {!redFlagLoaded ? 'Loading…' : redFlagCount && redFlagCount > 0
            ? `${redFlagCount} Red Flag Warning${redFlagCount !== 1 ? 's' : ''}`
            : 'No Red Flag Warnings'
          }
        </div>

        {/* NIFC Active */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !nifcLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          nifcCount && nifcCount > 0
            ? 'bg-ember-500/10 border-ember-500/30 text-ember-400'
            : 'bg-ash-900 border-ash-800 text-ash-400'
        }`}>
          <Flame className="w-3.5 h-3.5 shrink-0" />
          {!nifcLoaded ? 'Loading…' : `${nifcCount ?? 0} NIFC Active`}
        </div>

        {/* Nearest Weather */}
        <Link
          href="#weather"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-signal-info/30 bg-signal-info/10 text-signal-info text-xs font-medium hover:bg-signal-info/20 transition-colors"
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          View Weather ↓
        </Link>

        {/* Shelters */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !shelterLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          shelterWarn && shelterWarn > 0
            ? 'bg-signal-warn/10 border-signal-warn/30 text-signal-warn'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {!shelterLoaded ? 'Loading…' : shelterWarn && shelterWarn > 0
            ? `${shelterWarn} shelter${shelterWarn !== 1 ? 's' : ''} near capacity`
            : 'Shelters OK'
          }
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component: Red Flag Warnings ────────────────────────────────────────

function RedFlagSection() {
  const [warnings, setWarnings] = useState<RedFlagWarning[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/fires/redflags')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(true); setCount(0) }
        else { setWarnings(d.warnings ?? []); setCount(d.count ?? 0) }
      })
      .catch(() => { setError(true); setCount(0) })
      .finally(() => setLoading(false))
  }, [])

  const SHOW_LIMIT = 3
  const shown = warnings.slice(0, SHOW_LIMIT)
  const overflow = warnings.length - SHOW_LIMIT

  if (loading) {
    return (
      <div className="card p-4 mb-6 animate-pulse">
        <div className="h-4 bg-ash-800 rounded w-48" />
      </div>
    )
  }

  return (
    <div className="mb-8">
      {/* Banner */}
      {error || count === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium mb-4">
          <Shield className="w-4 h-4 shrink-0" />
          No active Red Flag Warnings
        </div>
      ) : (
        <div className="px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/10 mb-4">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            ⚠️ {count} Active Red Flag Warning{count !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {shown.map((w, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-300 truncate max-w-[200px]" title={w.zone}>
                {w.zone || 'Unknown zone'}
              </span>
            ))}
            {overflow > 0 && (
              <span className="px-2 py-0.5 rounded bg-ash-800 border border-ash-700 text-ash-400 text-xs">
                +{overflow} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsible detail table */}
      {warnings.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-ash-800/50 transition-colors"
          >
            <span className="text-white text-sm font-medium">Red Flag Warning Details</span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-ash-400" />
              : <ChevronDown className="w-4 h-4 text-ash-400" />}
          </button>
          {expanded && (
            <div className="overflow-x-auto border-t border-ash-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ash-800 text-left">
                    <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">Zone</th>
                    <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">Headline</th>
                    <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash-800">
                  {warnings.map((w, i) => (
                    <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                      <td className="px-5 py-3 text-ash-300 max-w-[200px]">
                        <span className="truncate block" title={w.zone}>{w.zone || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-white max-w-[320px]">
                        <span className="truncate block" title={w.headline}>{w.headline || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-ash-400 font-mono whitespace-nowrap">{fmtDate(w.expires)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: Live NIFC Incidents ──────────────────────────────────────

function NifcSection() {
  const [fires, setFires] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/fires/nifc')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(true)
        else setFires(d.data ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const totalAcres = fires.reduce((s, f) => s + (f.acres ?? 0), 0)
  const withContainment = fires.filter(f => f.containment !== null)
  const avgContainment =
    withContainment.length > 0
      ? Math.round(withContainment.reduce((s, f) => s + (f.containment ?? 0), 0) / withContainment.length)
      : null

  const tableRows = fires.slice(0, 10)

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Flame className="w-4 h-4 text-ember-400" />
        <h2 className="text-white font-semibold text-sm">Live NIFC Incidents</h2>
        <span className="ml-auto text-ash-600 text-xs">NIFC ArcGIS live</span>
      </div>

      {/* 3 KPI metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
          <div className="font-display text-2xl font-bold text-signal-danger">
            {loading ? '…' : error ? '—' : fires.length.toLocaleString()}
          </div>
          <div className="text-ash-500 text-xs mt-0.5">Active incidents</div>
        </div>
        <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
          <div className="font-display text-2xl font-bold text-ember-400">
            {loading ? '…' : error ? '—' : totalAcres > 0 ? `${(totalAcres / 1000).toFixed(1)}K` : '0'}
          </div>
          <div className="text-ash-500 text-xs mt-0.5">Total acres</div>
        </div>
        <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
          <div className="font-display text-2xl font-bold text-signal-info">
            {loading ? '…' : error ? '—' : avgContainment !== null ? `${avgContainment}%` : '—'}
          </div>
          <div className="text-ash-500 text-xs mt-0.5">Avg containment</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-ash-800 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-ash-600 text-xs">NIFC data unavailable</div>
      ) : tableRows.length === 0 ? (
        <div className="text-center py-6 text-ash-600 text-xs">No active incidents reported</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ash-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ash-800 text-left">
                <th className="px-4 py-2.5 text-ash-400 font-medium uppercase tracking-wider">Incident</th>
                <th className="px-4 py-2.5 text-ash-400 font-medium uppercase tracking-wider">State</th>
                <th className="px-4 py-2.5 text-ash-400 font-medium uppercase tracking-wider">Acres</th>
                <th className="px-4 py-2.5 text-ash-400 font-medium uppercase tracking-wider">Containment</th>
                <th className="px-4 py-2.5 text-ash-400 font-medium uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {tableRows.map(fire => (
                <tr key={fire.id} className="hover:bg-ash-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-ember-400 shrink-0" />
                      <span className="text-white truncate max-w-[160px]" title={fire.fire_name}>{fire.fire_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ash-400 font-mono">
                    {/* latitude/longitude present but no state field — show coords */}
                    {`${fire.latitude.toFixed(1)}°N`}
                  </td>
                  <td className="px-4 py-2.5 text-ash-300 font-mono">
                    {fire.acres != null ? fire.acres.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {fire.containment != null ? (
                      <span className={`font-mono font-bold ${fire.containment >= 75 ? 'text-signal-safe' : fire.containment >= 30 ? 'text-signal-warn' : 'text-signal-danger'}`}>
                        {fire.containment}%
                      </span>
                    ) : (
                      <span className="text-ash-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-ash-800 border border-ash-700 text-ash-500 text-xs">
                      {fire.source === 'nifc_perimeter' ? 'perimeter' : 'incident'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-ash-600 text-xs">
          {fires.length > 10 ? `Showing 10 of ${fires.length} incidents` : `${fires.length} incident${fires.length !== 1 ? 's' : ''} total`}
        </p>
        <Link href="/dashboard/responder/signals" className="flex items-center gap-1 text-xs text-signal-info hover:text-signal-info/80 transition-colors">
          View all on map <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Sub-component: Shelter Capacity ─────────────────────────────────────────

function ShelterSection() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [nearCapacity, setNearCapacity] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/shelters')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(true)
        else {
          setShelters(d.shelters ?? [])
          setNearCapacity(d.near_capacity ?? 0)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function pctColor(pct: number | null): string {
    if (pct === null) return 'text-ash-500'
    if (pct >= 80) return 'text-signal-danger'
    if (pct >= 60) return 'text-signal-warn'
    return 'text-signal-safe'
  }

  function pctBg(pct: number | null): string {
    if (pct === null) return 'bg-ash-800'
    if (pct >= 80) return 'bg-signal-danger/20 border border-signal-danger/30'
    if (pct >= 60) return 'bg-signal-warn/20 border border-signal-warn/30'
    return 'bg-signal-safe/20 border border-signal-safe/30'
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-ash-400" />
        <h2 className="section-title">FEMA Shelter Capacity</h2>
      </div>

      {/* Near-capacity warning */}
      {!loading && !error && nearCapacity > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 text-sm font-medium mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {nearCapacity} shelter{nearCapacity !== 1 ? 's' : ''} near capacity (&gt;80%)
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-ash-800 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-ash-600 text-sm">Shelter data unavailable</div>
        ) : shelters.length === 0 ? (
          <div className="text-center py-8 text-ash-600 text-sm">No shelter data reported</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ash-800 text-left">
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">Shelter</th>
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">County</th>
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider">State</th>
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider text-right">Capacity</th>
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider text-right">Occupancy</th>
                  <th className="px-5 py-3 text-ash-400 font-medium uppercase tracking-wider text-right">% Full</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {shelters.map((s, i) => (
                  <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                    <td className="px-5 py-3 text-white max-w-[200px]">
                      <span className="truncate block" title={s.name}>{s.name}</span>
                    </td>
                    <td className="px-5 py-3 text-ash-400">{s.county || '—'}</td>
                    <td className="px-5 py-3 text-ash-400 font-mono">{s.state || '—'}</td>
                    <td className="px-5 py-3 text-ash-300 font-mono text-right">
                      {s.capacity != null ? s.capacity.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-ash-300 font-mono text-right">
                      {s.occupancy != null ? s.occupancy.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.pct_full != null ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${pctBg(s.pct_full)} ${pctColor(s.pct_full)}`}>
                          {s.pct_full}%
                        </span>
                      ) : (
                        <span className="text-ash-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-ash-600 text-xs px-5 py-3 border-t border-ash-800">
          FEMA National Shelter System · Green &lt;60% · Amber 60–80% · Red &gt;80% · CONUS only
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResponderDashboard() {
  const [activeFires, setActiveFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [weatherLocation, setWeatherLocation] = useState('')
  const [weather, setWeather] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  async function fetchWeather() {
    if (!weatherLocation.trim()) return
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(weatherLocation)}`)
      if (res.ok) setWeather(await res.json())
    } catch {}
    setWeatherLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, svi_score, signal_gap_hours')
        .is('containment_pct', null)
        .order('acres_burned', { ascending: false })
        .limit(8)
      if (data && data.length > 0) setActiveFires(data)
      else setActiveFires(DEMO_FIRES as any[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Situation Report Header */}
      <SituationReportHeader />

      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Shield className="w-4 h-4" />
          EMERGENCY RESPONDER · COMMAND-INTEL
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-2">Incident Command Center</h1>
        <p className="text-ash-400 text-sm">Live fire intelligence, mutual aid coordination, and signal gap analysis.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-signal-danger font-display text-3xl font-bold">—</div>
          <div className="text-ash-400 text-sm mt-1">Active incidents in jurisdiction</div>
        </div>
        <Link href="/dashboard/responder/ics" className="card p-5 hover:bg-ash-800 transition-colors">
          <div className="text-ember-400 font-display text-3xl font-bold">ICS</div>
          <div className="text-ash-400 text-sm mt-1">Open Incident Board</div>
        </Link>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {QUICK_NAV.map(({ label, href, icon: Icon, badge, badgeColor }) => (
          <Link key={href} href={href} className="card p-5 hover:bg-ash-800 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-ash-400 group-hover:text-white transition-colors" />
              <span className={badgeColor}>{badge}</span>
            </div>
            <div className="text-white text-sm font-medium">{label}</div>
            <ChevronRight className="w-4 h-4 text-ash-600 group-hover:text-ash-300 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Red Flag Warnings — TIME-CRITICAL: shown above NFDRS scale */}
      <RedFlagSection />

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* NFDRS Risk Scale */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-ember-400" />
            <h2 className="text-white font-semibold text-sm">NFDRS Fire Danger Scale</h2>
            <span className="ml-auto text-ash-600 text-xs">NWCG Standard</span>
          </div>
          <div className="space-y-2">
            {NFDRS.map(n => (
              <div key={n.level} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${n.border} bg-ash-900`}>
                <div className={`w-3 h-3 rounded-full ${n.color} shrink-0`} />
                <span className={`text-sm font-semibold w-20 shrink-0 ${n.text}`}>{n.level}</span>
                <span className="text-ash-500 text-xs">{n.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">Standardized by NWCG. Active hotspots: bright red (0–12h), orange (12–24h), dark red (24h+). Contained perimeters: black lines. Uncontained: red lines.</p>
        </div>

        {/* Mutual Aid Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-signal-info" />
            <h2 className="text-white font-semibold text-sm">Mutual Aid & FEMA Resources</h2>
            <span className="ml-auto text-ash-600 text-xs">WebEOC sync</span>
          </div>
          <div className="space-y-2">
            {MUTUAL_AID.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-ash-900 border border-ash-800">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.status === 'available' ? 'bg-signal-safe' : a.status === 'deployed' ? 'bg-signal-info' : 'bg-signal-warn'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{a.agency}</div>
                  <div className="text-ash-500 text-xs">{a.type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-mono font-bold ${a.status === 'available' ? 'text-signal-safe' : a.status === 'deployed' ? 'text-signal-info' : 'text-signal-warn'}`}>{a.eta}</div>
                  <div className="text-ash-600 text-xs capitalize">{a.status}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">FEMA orders processed via state-level ICS. Mutual aid agreements active per district protocols.</p>
        </div>

        {/* Staffing & Engine Assignments */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-signal-warn" />
            <h2 className="text-white font-semibold text-sm">Staffing & Engine Assignments</h2>
          </div>
          <div className="space-y-3">
            {STAFFING.map((s, i) => (
              <div key={i} className="rounded-lg border border-ash-800 bg-ash-900 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-white text-xs font-semibold">{s.shift}</span>
                  <span className="ml-auto text-ash-500 text-xs">{s.truck}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.crew.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-ash-800 border border-ash-700 rounded text-ash-300 text-xs">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">Critical Task Analysis determines pumper, driver, EMS, and S&R assignments based on incident need vs. available resources.</p>
        </div>

        {/* Weather Conditions */}
        <div id="weather" className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wind className="w-4 h-4 text-signal-info" />
            <h2 className="text-white font-semibold text-sm">Current Conditions</h2>
            <span className="ml-auto text-ash-600 text-xs">NOAA live</span>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={weatherLocation}
              onChange={e => setWeatherLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchWeather()}
              placeholder="City, zip, or county…"
              className="flex-1 bg-ash-800 border border-ash-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600"
            />
            <button onClick={fetchWeather} disabled={weatherLoading}
              className="px-3 py-1.5 rounded-lg text-xs bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors disabled:opacity-50">
              {weatherLoading ? '…' : 'Fetch'}
            </button>
          </div>
          {weather ? (
            <>
              <div className="text-ash-500 text-xs mb-3 truncate">{weather.location}</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Temp', value: weather.temp_f != null ? `${weather.temp_f}°F` : '—', icon: Flame, color: weather.temp_f != null && weather.temp_f > 90 ? 'text-ember-400' : 'text-ash-300' },
                  { label: 'Wind', value: weather.wind_mph != null ? `${weather.wind_mph} mph${weather.wind_dir ? ' ' + weather.wind_dir : ''}` : '—', icon: Wind, color: weather.wind_mph != null && weather.wind_mph > 20 ? 'text-signal-warn' : 'text-ash-300' },
                  { label: 'Humidity', value: weather.humidity_pct != null ? `${weather.humidity_pct}%` : '—', icon: Droplets, color: weather.humidity_pct != null && weather.humidity_pct < 20 ? 'text-signal-danger' : 'text-ash-300' },
                  { label: 'Visibility', value: weather.visibility_miles != null ? `${weather.visibility_miles} mi` : '—', icon: Map, color: 'text-ash-300' },
                ].map(c => (
                  <div key={c.label} className="bg-ash-900 rounded-lg p-2.5 border border-ash-800">
                    <div className="flex items-center gap-1 mb-1">
                      <c.icon className={`w-3 h-3 ${c.color}`} />
                      <span className="text-ash-500 text-xs">{c.label}</span>
                    </div>
                    <div className={`font-mono text-sm font-bold ${c.color}`}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium ${
                weather.fire_risk_color === 'signal-danger' ? 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger' :
                weather.fire_risk_color === 'signal-warn' ? 'bg-signal-warn/10 border-signal-warn/30 text-signal-warn' :
                'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
              }`}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Fire risk: {weather.fire_risk}{weather.red_flag ? ' · Red Flag Warning' : ''}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-ash-600 text-xs">Enter a location to see live NOAA conditions</div>
          )}
        </div>
      </div>

      {/* Live NIFC Incidents — added section */}
      <NifcSection />

      {/* Active fires table */}
      <div>
        <h2 className="section-title mb-4">Largest Active Incidents</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ash-800 text-left">
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Incident</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Acres</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Alert Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-ash-800 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : activeFires.length > 0 ? activeFires.map(fire => (
                <tr key={fire.id} className="hover:bg-ash-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-signal-danger animate-pulse-slow" />
                      <span className="text-white text-sm font-medium truncate max-w-[160px]">{fire.incident_name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ash-400 text-sm">{fire.county ? `${fire.county}, ` : ''}{fire.state || '—'}</td>
                  <td className="px-6 py-4 text-ash-300 text-sm font-mono">{fire.acres_burned ? fire.acres_burned.toLocaleString() : '—'}</td>
                  <td className="px-6 py-4">
                    {fire.svi_score != null ? (
                      <span className={fire.svi_score > 0.75 ? 'badge-danger' : fire.svi_score > 0.5 ? 'badge-warn' : 'badge-safe'}>{fire.svi_score.toFixed(2)}</span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {fire.signal_gap_hours != null ? (
                      <span className={fire.signal_gap_hours > 12 ? 'text-signal-danger' : fire.signal_gap_hours > 6 ? 'text-signal-warn' : 'text-signal-safe'}>{fire.signal_gap_hours.toFixed(1)}h</span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-ash-500 text-sm">No active incident data. Connect to live data feed to populate.</td></tr>
              )}
            </tbody>
          </table>
          <p className="text-ash-600 text-xs px-6 py-3 border-t border-ash-800">
            WiDS 2021–2025 historical record · Live incidents require connected data feed · Sorted by max acreage
          </p>
        </div>
      </div>

      {/* Shelter Capacity — added section */}
      <ShelterSection />
    </div>
  )
}
