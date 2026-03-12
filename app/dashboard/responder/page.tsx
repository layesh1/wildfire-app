'use client'
import { useEffect, useState } from 'react'
import { Shield, Flame, AlertTriangle, Activity, TrendingUp, Clock, ChevronRight, Wind, Droplets, Users, Truck, Radio, Map } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const QUICK_NAV = [
  { label: 'Signal Gap Analysis', href: '/dashboard/responder/signals', icon: AlertTriangle, badge: 'CRITICAL', badgeColor: 'badge-danger' },
  { label: 'ML Spread Predictor', href: '/dashboard/responder/ml', icon: Activity, badge: 'AI', badgeColor: 'badge-info' },
  { label: 'Agency Coverage Map', href: '/dashboard/responder/coverage', icon: Shield, badge: 'GAPS', badgeColor: 'badge-warn' },
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
      if (data) setActiveFires(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Shield className="w-4 h-4" />
          EMERGENCY RESPONDER · COMMAND-INTEL
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-2">Incident Command Center</h1>
        <p className="text-ash-400 text-sm">Live fire intelligence, mutual aid coordination, and signal gap analysis.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: '—', label: 'Active incidents', color: 'text-signal-danger' },
          { value: '9×', label: 'Max state disparity', color: 'text-signal-warn' },
          { value: '99.74%', label: 'No-order gap rate', color: 'text-ember-400' },
          { value: '11.5h', label: 'Median delay', color: 'text-signal-info' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-ash-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        <div className="card p-5">
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
        </div>
      </div>
    </div>
  )
}
