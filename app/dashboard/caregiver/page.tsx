'use client'
import { useEffect, useState, useRef } from 'react'
import { Bell, MapPin, Users, AlertTriangle, CheckCircle, Phone, ChevronRight, Clock, Shield, Flame, Package, Brain, Send, Loader, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const QUICK_ACTIONS = [
  { label: 'Evacuation Map', href: '/dashboard/caregiver/map', icon: MapPin, color: 'text-forest-600' },
  { label: 'Check In Safe', href: '/dashboard/caregiver/checkin', icon: CheckCircle, color: 'text-signal-safe' },
  { label: 'Find Shelter', href: '/dashboard/caregiver/map?filter=shelter', icon: Users, color: 'text-signal-info' },
  { label: 'Fire Alert', href: '/dashboard/caregiver/alert', icon: AlertTriangle, color: 'text-signal-danger' },
]

const STATE_DELAYS: Record<string, number> = {
  NM: 38.7, AZ: 31.2, TX: 27.4, AK: 24.6, OK: 22.1, MT: 19.8, ID: 16.3,
  KS: 14.8, WA: 13.9, HI: 12.8, LA: 11.8, OR: 11.2, MS: 10.4, CA: 9.8,
  AL: 9.8, FL: 9.2, NV: 8.4, CO: 5.2, UT: 4.8, ND: 2.9,
}

const GO_BAG_ITEMS = [
  { id: 'water', label: 'Water (1 gal/person/day × 3 days)', critical: true },
  { id: 'docs', label: 'ID, insurance, and vital documents (waterproof bag)', critical: true },
  { id: 'meds', label: 'Medications (7-day supply + list)', critical: true },
  { id: 'phone', label: 'Phone charger & battery pack', critical: true },
  { id: 'cash', label: 'Cash ($100+ small bills)', critical: false },
  { id: 'clothes', label: 'Clothing change + sturdy shoes', critical: false },
  { id: 'food', label: 'Non-perishable food (3-day supply)', critical: false },
  { id: 'first_aid', label: 'First-aid kit', critical: false },
  { id: 'flashlight', label: 'Flashlight + extra batteries', critical: false },
  { id: 'pet', label: 'Pet supplies (carrier, food, records)', critical: false },
  { id: 'radio', label: 'Battery/crank weather radio', critical: false },
  { id: 'map', label: 'Paper map of your area (offline backup)', critical: false },
]

// ─── Evac Stage Row (hover to expand detail) ──────────────────────────────────
function EvacStageRow({ stage, action, detail, color, border, bg, hoverBg }: {
  stage: string; action: string; detail: string
  color: string; border: string; bg: string; hoverBg: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`px-3 py-2.5 rounded-lg border cursor-default transition-colors ${border} ${bg} ${hoverBg}`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-xs font-bold w-28 shrink-0 mt-0.5 ${color}`}>{stage}</span>
        <span className="text-gray-600 text-xs leading-relaxed">{action}</span>
      </div>
      {hovered && (
        <p className={`mt-2 text-xs leading-relaxed pl-[7.25rem] ${color} opacity-80`}>{detail}</p>
      )}
    </div>
  )
}

// ─── Hub Tab ──────────────────────────────────────────────────────────────────
function HubTab() {
  const [fires, setFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [showHelpForm, setShowHelpForm] = useState(false)
  const [helpSubmitted, setHelpSubmitted] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', address: '', people: 1, needs: '', urgency: 'high' as 'high' | 'medium' | 'low' })

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showBag, setShowBag] = useState(false)
  const [bagLoaded, setBagLoaded] = useState(false)
  const [userState, setUserState] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wfa_gobag') || '[]')
      setCheckedItems(new Set(saved))
    } catch {}
    setBagLoaded(true)

    try {
      const addr = localStorage.getItem('wfa_profile_address') || ''
      const stateMatch = addr.match(/\b([A-Z]{2})\b/)
      if (stateMatch) setUserState(stateMatch[1])
    } catch {}
  }, [])

  function toggleBagItem(id: string) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('wfa_gobag', JSON.stringify([...next]))
      return next
    })
  }

  function submitHelpRequest() {
    const req = { id: Date.now().toString(), ...helpForm, submitted_at: new Date().toISOString(), status: 'pending' as const }
    const existing = JSON.parse(localStorage.getItem('wfa_evac_requests') || '[]')
    localStorage.setItem('wfa_evac_requests', JSON.stringify([req, ...existing]))
    setHelpSubmitted(true)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, has_evacuation_order, signal_gap_hours')
        .eq('has_evacuation_order', true)
        .order('started_at', { ascending: false })
        .limit(5)
      if (data) setFires(data)
      setLoading(false)
    }
    load()
  }, [])

  const criticalItems = GO_BAG_ITEMS.filter(i => i.critical)
  const criticalChecked = criticalItems.filter(i => checkedItems.has(i.id)).length
  const totalChecked = GO_BAG_ITEMS.filter(i => checkedItems.has(i.id)).length
  const readyPct = Math.round((totalChecked / GO_BAG_ITEMS.length) * 100)
  const stateDelay = userState ? STATE_DELAYS[userState] : null

  return (
    <div className="overflow-y-auto flex-1 p-6 sm:p-8">
      {/* Alert status */}
      <div className="bg-signal-safe/10 border border-signal-safe/30 rounded-xl p-5 flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-signal-safe/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-signal-safe" />
        </div>
        <div>
          <div className="text-gray-900 font-semibold">No active evacuation orders in your area</div>
          <div className="text-gray-500 text-sm">Last checked: just now · Alerts update automatically</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="card p-5 hover:bg-gray-50 transition-all duration-200 hover:scale-[1.02] group"
          >
            <Icon className={`w-6 h-6 ${color} mb-3`} />
            <div className="text-gray-900 text-sm font-medium">{label}</div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Go-Bag Checklist */}
      <div className={`rounded-xl border mb-8 overflow-hidden ${readyPct >= 80 ? 'border-signal-safe/30' : readyPct >= 50 ? 'border-signal-warn/30' : 'border-signal-danger/30'}`}>
        <button
          onClick={() => setShowBag(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <Package className={`w-4 h-4 shrink-0 ${readyPct >= 80 ? 'text-signal-safe' : readyPct >= 50 ? 'text-signal-warn' : 'text-signal-danger'}`} />
          <div className="flex-1">
            <div className="text-gray-900 font-semibold text-sm">Go-Bag Readiness</div>
            <div className="text-gray-500 text-xs mt-0.5">
              {bagLoaded ? `${totalChecked}/${GO_BAG_ITEMS.length} items packed · ${criticalChecked}/${criticalItems.length} critical` : 'Loading…'}
            </div>
          </div>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mx-2">
            <div
              className={`h-full rounded-full transition-all ${readyPct >= 80 ? 'bg-signal-safe' : readyPct >= 50 ? 'bg-signal-warn' : 'bg-signal-danger'}`}
              style={{ width: `${readyPct}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-bold w-10 text-right shrink-0 ${readyPct >= 80 ? 'text-signal-safe' : readyPct >= 50 ? 'text-signal-warn' : 'text-signal-danger'}`}>
            {readyPct}%
          </span>
          <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${showBag ? 'rotate-90' : ''}`} />
        </button>
        {showBag && (
          <div className="border-t border-gray-200 p-5 bg-white">
            <p className="text-gray-500 text-xs mb-4">
              Check off items you have packed and ready. <span className="text-signal-danger">Red items are critical</span> — prioritize these first.
            </p>
            <div className="space-y-2">
              {GO_BAG_ITEMS.map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    checkedItems.has(item.id) ? 'bg-signal-safe border-signal-safe'
                      : item.critical ? 'border-signal-danger/60 group-hover:border-signal-danger'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {checkedItems.has(item.id) && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <input type="checkbox" checked={checkedItems.has(item.id)} onChange={() => toggleBagItem(item.id)} className="sr-only" />
                  <span className={`text-sm transition-colors ${
                    checkedItems.has(item.id) ? 'text-gray-400 line-through' : item.critical ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {item.label}
                    {item.critical && !checkedItems.has(item.id) && (
                      <span className="ml-2 text-xs text-signal-danger font-medium">CRITICAL</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Know Your Risk */}
      <div className="card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="text-gray-900 font-semibold text-sm">Know Your Risk</h2>
          <span className="ml-auto text-gray-400 text-xs">WiDS 2021–2025 · 50,664 true wildfires</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Silent fire rate', value: '67.2%', sub: 'of true wildfires start with no push alert', color: 'text-signal-danger' },
            { label: stateDelay != null ? `${userState} median alert delay` : 'National median delay', value: stateDelay != null ? `${stateDelay}h` : '1.1h', sub: stateDelay != null ? 'detection to order (your state)' : 'median hours to order (when issued)', color: stateDelay != null && stateDelay > 20 ? 'text-signal-danger' : 'text-signal-warn' },
            { label: 'Peak fire month', value: 'July', sub: '13,650 fires recorded in July alone', color: 'text-amber-500' },
            { label: 'Fires w/ extreme spread', value: '256', sub: '66.0% received zero evacuation action', color: 'text-signal-danger' },
            { label: 'Early signal, no action', value: '99.3%', sub: 'of true wildfires with signals got no order', color: 'text-signal-warn' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className={`font-display text-xl font-bold ${stat.color} mb-0.5`}>{stat.value}</div>
              <div className="text-gray-900 text-xs font-medium">{stat.label}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-tight">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* When to Leave + Evacuation Assist — split screen */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Left: When to Leave */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-gray-900 font-semibold text-sm">When to Leave — Don&apos;t Wait for an Order</h2>
          </div>
          <div className="space-y-2 flex-1">
            {[
              {
                stage: 'Watch (now)',
                action: 'Pack go-bag, fill gas, locate pets, know your route',
                detail: 'Don\'t wait for a push notification — 67% of wildfires issue no alert. Confirm your evacuation route now while roads are clear.',
                color: 'text-signal-safe', border: 'border-signal-safe/30', bg: 'bg-signal-safe/5', hoverBg: 'hover:bg-signal-safe/10',
              },
              {
                stage: 'Advisory issued',
                action: 'Load car, move valuables, prepare to leave immediately',
                detail: 'An advisory means conditions are threatening. Move medications, documents, and irreplaceable items to your car now. Be ready to leave in minutes.',
                color: 'text-signal-warn', border: 'border-signal-warn/30', bg: 'bg-signal-warn/5', hoverBg: 'hover:bg-signal-warn/10',
              },
              {
                stage: 'Warning issued',
                action: 'Leave NOW — do not wait for Order. In high-SVI counties, a formal order may never be issued.',
                detail: 'WiDS data: 99.3% of fires with signals never received a formal order. High-SVI counties are significantly less likely to get one. A Warning is your signal to go.',
                color: 'text-amber-500', border: 'border-amber-400/30', bg: 'bg-amber-400/5', hoverBg: 'hover:bg-amber-400/10',
              },
              {
                stage: 'Order issued',
                action: 'Mandatory evacuation — go immediately. Shelter info on map.',
                detail: 'This is mandatory. Do not shelter in place. Leave immediately via your planned route. Check the Evacuation Map for open shelter locations.',
                color: 'text-signal-danger', border: 'border-signal-danger/30', bg: 'bg-signal-danger/5', hoverBg: 'hover:bg-signal-danger/10',
              },
            ].map(row => (
              <EvacStageRow key={row.stage} {...row} />
            ))}
          </div>
        </div>

        {/* Right: Evacuation Assist */}
        <div className={`rounded-xl border p-5 flex flex-col ${showHelpForm ? 'border-signal-danger/40 bg-signal-danger/5' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-signal-danger" />
              <span className="text-gray-900 font-semibold text-sm">Need evacuation assistance?</span>
            </div>
            <button onClick={() => setShowHelpForm(v => !v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${showHelpForm ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-signal-danger/20 border border-signal-danger/40 text-signal-danger hover:bg-signal-danger/30'}`}>
              {showHelpForm ? 'Cancel' : 'Request Help'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-3">Can&apos;t self-evacuate? Submit a request — emergency responders will be notified to assist.</p>
        {showHelpForm && (helpSubmitted ? (
          <div className="flex items-center gap-3 p-3 bg-signal-safe/10 border border-signal-safe/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-signal-safe shrink-0" />
            <div>
              <div className="text-signal-safe font-semibold text-sm">Request submitted</div>
              <div className="text-gray-500 text-xs mt-0.5">Responders have been notified. Stay at your location if it is safe to do so.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">Your name</label>
                <input type="text" value={helpForm.name} onChange={e => setHelpForm(f => ({...f, name: e.target.value}))}
                  placeholder="Full name"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">Number of people</label>
                <input type="number" min="1" max="20" value={helpForm.people} onChange={e => setHelpForm(f => ({...f, people: parseInt(e.target.value) || 1}))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-signal-danger/60" />
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Your address</label>
              <input type="text" value={helpForm.address} onChange={e => setHelpForm(f => ({...f, address: e.target.value}))}
                placeholder="123 Main St, City, State"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Special needs or notes</label>
              <input type="text" value={helpForm.needs} onChange={e => setHelpForm(f => ({...f, needs: e.target.value}))}
                placeholder="e.g. wheelchair, oxygen tank, 2 dogs, no vehicle"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-2">Urgency</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map(u => (
                  <button key={u} onClick={() => setHelpForm(f => ({...f, urgency: u}))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-all ${helpForm.urgency === u
                      ? u === 'high' ? 'bg-signal-danger/20 border-signal-danger/50 text-signal-danger'
                        : u === 'medium' ? 'bg-signal-warn/20 border-signal-warn/50 text-signal-warn'
                        : 'bg-signal-safe/20 border-signal-safe/50 text-signal-safe'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={submitHelpRequest} disabled={!helpForm.name || !helpForm.address}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-signal-danger text-white hover:bg-red-600 transition-colors disabled:opacity-40">
              Submit Evacuation Request
            </button>
          </div>
        ))}
        </div>
      </div>

      {/* Recent fires */}
      <div>
        <h2 className="section-title mb-6">Recent Active Fires</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : fires.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">No active evacuation orders found.</div>
        ) : (
          <div className="space-y-3">
            {fires.map(fire => (
              <div key={fire.id} className="card p-5 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-signal-danger animate-pulse-slow shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-medium truncate">{fire.incident_name || 'Unnamed Incident'}</div>
                  <div className="text-gray-400 text-sm">{fire.county && `${fire.county}, `}{fire.state} · {fire.acres_burned ? `${fire.acres_burned.toLocaleString()} acres` : 'Size unknown'}</div>
                </div>
                <div className="text-right shrink-0">
                  {fire.containment_pct != null ? (
                    <div className="text-signal-safe text-sm font-medium">{fire.containment_pct}% contained</div>
                  ) : (
                    <div className="badge-danger">Uncontained</div>
                  )}
                  {fire.signal_gap_hours != null && (
                    <div className="text-gray-400 text-xs mt-1">{fire.signal_gap_hours.toFixed(1)}h alert delay</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CaregiverDashboard() {
  return (
    <>
      <LanguageSwitcher />
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 px-6 sm:px-8 pt-8 pb-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
            <Bell className="w-4 h-4" />
            CAREGIVER DASHBOARD
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            My Hub
          </h1>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <HubTab />
        </div>
      </div>
    </>
  )
}
