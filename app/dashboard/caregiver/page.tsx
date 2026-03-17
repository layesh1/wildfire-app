'use client'
import { useEffect, useState } from 'react'
import { Bell, MapPin, Users, AlertTriangle, CheckCircle, Phone, ChevronRight, Eye, EyeOff, Clock, Shield, Flame, Package, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const QUICK_ACTIONS = [
  { label: 'View Evacuation Map', href: '/dashboard/caregiver/map', icon: MapPin, color: 'text-forest-600' },
  { label: 'Check In Safe', href: '/dashboard/caregiver/checkin', icon: CheckCircle, color: 'text-signal-safe' },
  { label: 'Find Shelter', href: '/dashboard/caregiver/map?filter=shelter', icon: Users, color: 'text-signal-info' },
  { label: 'Ask SAFE-PATH AI', href: '/dashboard/caregiver/ai', icon: Phone, color: 'text-amber-500' },
]

// WiDS-derived signal gap by state (median hours from detection to order)
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

function getPeakRisk(): { hour: boolean; month: boolean; peakHour: string; peakMonth: string } {
  const now = new Date()
  const hour = now.getHours()
  const month = now.getMonth() + 1 // 1-indexed
  return {
    hour: hour >= 20 || hour <= 23, // peak: 21:00 (9PM)
    month: month >= 6 && month <= 9, // peak: June-Sept (July peak)
    peakHour: '9 PM',
    peakMonth: 'July',
  }
}

export default function CaregiverDashboard() {
  const [fires, setFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [showHelpForm, setShowHelpForm] = useState(false)
  const [helpSubmitted, setHelpSubmitted] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', address: '', people: 1, needs: '', urgency: 'high' as 'high' | 'medium' | 'low' })

  // Go-bag checklist (localStorage)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showBag, setShowBag] = useState(false)
  const [bagLoaded, setBagLoaded] = useState(false)

  // User's county/state from settings
  const [userState, setUserState] = useState<string | null>(null)

  const peak = getPeakRisk()

  useEffect(() => {
    // Load go-bag state from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('wfa_gobag') || '[]')
      setCheckedItems(new Set(saved))
    } catch {}
    setBagLoaded(true)

    // Try to get state from profile address
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
    <>
    <LanguageSwitcher />
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
          <Bell className="w-4 h-4" />
          CAREGIVER DASHBOARD · SAFE-PATH
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">
          Your Evacuation Hub
        </h1>
        <p className="text-gray-500">
          Personalized alerts, check-in tools, and accessible evacuation guidance.
        </p>
      </div>

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

      {/* Peak time warning (data-driven) */}
      {(peak.hour || peak.month) && (
        <div className="bg-signal-warn/10 border border-signal-warn/30 rounded-xl p-4 flex items-start gap-3 mb-6">
          <Flame className="w-4 h-4 text-signal-warn mt-0.5 shrink-0" />
          <div>
            <p className="text-signal-warn text-sm font-semibold mb-0.5">
              {peak.hour ? 'Peak Fire Hour Active' : 'Peak Fire Season'}
            </p>
            <p className="text-gray-500 text-xs leading-relaxed">
              {peak.hour
                ? `WiDS data shows wildfires peak around ${peak.peakHour}. Stay alert — keep your phone charged and unlocked.`
                : `${peak.peakMonth} through August is when wildfire incidents peak nationally. Check this app daily.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Silent fire awareness */}
      <div className="card p-5 mb-6 border-l-4 border-signal-warn">
        <div className="flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-signal-warn mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-gray-900 font-semibold text-sm mb-1">
              67.2% of true wildfires start with NO push alert
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              Analysis of 50,664 true wildfire incidents (2021–2025) shows most fires are &quot;silent&quot; — no push notification reaches nearby residents. (17.7% of records are prescribed burns and excluded.)
              {stateDelay != null ? (
                <span className="text-signal-warn font-medium"> In {userState}, the median time between fire detection and an evacuation order is <strong>{stateDelay}h</strong>.</span>
              ) : (
                <span> Even when signals exist, 99.3% of true wildfires result in no formal evacuation order.</span>
              )}
              {' '}Don&apos;t wait for an alert — check this app during fire weather.
            </p>
            <Link href="/dashboard/caregiver/alert" className="mt-2 inline-flex items-center gap-1 text-signal-info text-xs hover:underline">
              <Eye className="w-3 h-3" /> Check fire proximity for my address →
            </Link>
          </div>
        </div>
      </div>

      {/* Digital gap warning */}
      <div className="card p-5 mb-6 border-l-4 border-signal-danger">
        <div className="flex items-start gap-3">
          <Radio className="w-5 h-5 text-signal-danger mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-gray-900 font-semibold text-sm mb-1">
              Digital gap puts you at higher risk
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 mb-2">
              <div className="bg-signal-danger/10 border border-signal-danger/20 rounded-lg p-2.5 text-center">
                <div className="text-signal-danger font-bold text-lg font-mono">93.2%</div>
                <div className="text-gray-500 text-xs">signal gap in counties<br/>with low internet access</div>
              </div>
              <div className="bg-signal-safe/10 border border-signal-safe/20 rounded-lg p-2.5 text-center">
                <div className="text-signal-safe font-bold text-lg font-mono">49.1%</div>
                <div className="text-gray-500 text-xs">signal gap in counties<br/>with high internet access</div>
              </div>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              If you or someone you care for has limited internet or relies on a single channel (99.7% of fires have only one signal source),
              evacuate early — don&apos;t wait for an official order. Sign up for your county&apos;s emergency text alerts as a backup channel.
            </p>
          </div>
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

      {/* Go-Bag Readiness Checklist */}
      <div className={`rounded-xl border mb-8 overflow-hidden ${readyPct >= 80 ? 'border-signal-safe/30' : readyPct >= 50 ? 'border-signal-warn/30' : 'border-signal-danger/30'}`}>
        <button
          onClick={() => setShowBag(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <Package className={`w-4 h-4 shrink-0 ${readyPct >= 80 ? 'text-signal-safe' : readyPct >= 50 ? 'text-signal-warn' : 'text-signal-danger'}`} />
          <div className="flex-1">
            <div className="text-gray-900 font-semibold text-sm">Go-Bag Readiness</div>
            <div className="text-gray-500 text-xs mt-0.5">
              {bagLoaded
                ? `${totalChecked}/${GO_BAG_ITEMS.length} items packed · ${criticalChecked}/${criticalItems.length} critical`
                : 'Loading…'
              }
            </div>
          </div>
          {/* Progress bar */}
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
                    checkedItems.has(item.id)
                      ? 'bg-signal-safe border-signal-safe'
                      : item.critical
                        ? 'border-signal-danger/60 group-hover:border-signal-danger'
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
            {readyPct < 60 && (
              <div className="mt-4 p-3 rounded-lg bg-signal-danger/10 border border-signal-danger/20">
                <p className="text-signal-danger text-xs font-medium">
                  Your bag is not ready for evacuation. In {userState && STATE_DELAYS[userState] ? `${userState}, you may have as little as ${STATE_DELAYS[userState]}h` : 'some areas, you may have under 10h'} between a fire starting and an evacuation order. Pack now.
                </p>
              </div>
            )}
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
            {
              label: 'Silent fire rate',
              value: '67.2%',
              sub: 'of true wildfires start with no push alert',
              color: 'text-signal-danger',
            },
            {
              label: stateDelay != null ? `${userState} median alert delay` : 'National median delay',
              value: stateDelay != null ? `${stateDelay}h` : '1.1h',
              sub: stateDelay != null ? 'detection to order (your state)' : 'median hours to order (when issued, n=653)',
              color: stateDelay != null && stateDelay > 20 ? 'text-signal-danger' : 'text-signal-warn',
            },
            {
              label: 'Peak fire hour',
              value: '9 PM',
              sub: 'when fires are most likely to start',
              color: 'text-amber-500',
            },
            {
              label: 'Peak fire month',
              value: 'July',
              sub: '13,650 fires recorded in July alone',
              color: 'text-amber-500',
            },
            {
              label: 'Fires w/ extreme spread',
              value: '256',
              sub: '66.0% received zero evacuation action',
              color: 'text-signal-danger',
            },
            {
              label: 'Early signal, no action',
              value: '99.3%',
              sub: 'of true wildfires with signals got no order',
              color: 'text-signal-warn',
            },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className={`font-display text-xl font-bold ${stat.color} mb-0.5`}>{stat.value}</div>
              <div className="text-gray-900 text-xs font-medium">{stat.label}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-tight">{stat.sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/caregiver/alert" className="flex items-center gap-1.5 text-xs text-signal-info hover:underline">
            <MapPin className="w-3 h-3" /> Check my address risk →
          </Link>
          <Link href="/dashboard/caregiver/emergency-card" className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline">
            <Package className="w-3 h-3" /> Get my emergency card →
          </Link>
          <Link href="/dashboard/caregiver/persons" className="flex items-center gap-1.5 text-xs text-signal-safe hover:underline">
            <Users className="w-3 h-3" /> Track my household →
          </Link>
        </div>
      </div>

      {/* Evacuation timing guide */}
      <div className="card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-gray-900 font-semibold text-sm">When to Leave — Don&apos;t Wait for an Order</h2>
        </div>
        <div className="space-y-2">
          {[
            { stage: 'Watch (now)', action: 'Pack go-bag, fill gas, locate pets, know your route', color: 'text-signal-safe', border: 'border-signal-safe/30', bg: 'bg-signal-safe/5' },
            { stage: 'Advisory issued', action: 'Load car, move valuables, prepare to leave immediately', color: 'text-signal-warn', border: 'border-signal-warn/30', bg: 'bg-signal-warn/5' },
            { stage: 'Warning issued', action: 'Leave NOW — do not wait for Order. In high-SVI counties, a formal order may never be issued.', color: 'text-amber-500', border: 'border-amber-400/30', bg: 'bg-amber-400/5' },
            { stage: 'Order issued', action: 'Mandatory evacuation — go immediately. Shelter info on map.', color: 'text-signal-danger', border: 'border-signal-danger/30', bg: 'bg-signal-danger/5' },
          ].map(row => (
            <div key={row.stage} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${row.border} ${row.bg}`}>
              <span className={`text-xs font-bold w-28 shrink-0 mt-0.5 ${row.color}`}>{row.stage}</span>
              <span className="text-gray-600 text-xs leading-relaxed">{row.action}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-3">
          Source: WiDS 2021–2025 dataset · High-SVI communities are significantly less likely to receive a formal evacuation order at all
        </p>
      </div>

      {/* Evacuation Assist Request */}
      <div className={`rounded-xl border p-5 mb-8 ${showHelpForm ? 'border-signal-danger/40 bg-signal-danger/5' : 'border-gray-200 bg-gray-50'}`}>
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

      {/* Recent active fires */}
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
                  <div className="text-gray-900 font-medium truncate">
                    {fire.incident_name || 'Unnamed Incident'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {fire.county && `${fire.county}, `}{fire.state} ·{' '}
                    {fire.acres_burned ? `${fire.acres_burned.toLocaleString()} acres` : 'Size unknown'}
                  </div>
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

      {/* Research context */}
      <div className="card p-6 mt-8 border-l-4 border-amber-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-gray-900 font-semibold mb-1">Why delays matter for caregivers</div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Our research found that high-vulnerability counties are significantly less likely to receive a formal evacuation order at all — not just slower to receive one. Caregivers in these areas cannot rely on official orders arriving. SAFE-PATH monitors all signal channels (social media, news, smoke reports) so you don&apos;t have to wait for an order that may never come.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
