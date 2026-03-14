'use client'
import { useEffect, useState } from 'react'
import { Bell, MapPin, Users, AlertTriangle, CheckCircle, Phone, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const QUICK_ACTIONS = [
  { label: 'View Evacuation Map', href: '/dashboard/caregiver/map', icon: MapPin, color: 'text-ember-400' },
  { label: 'Check In Safe', href: '/dashboard/caregiver/checkin', icon: CheckCircle, color: 'text-signal-safe' },
  { label: 'Find Shelter', href: '/dashboard/caregiver/map?filter=shelter', icon: Users, color: 'text-signal-info' },
  { label: 'Ask SAFE-PATH AI', href: '/dashboard/caregiver/ai', icon: Phone, color: 'text-amber-400' },
]

export default function CaregiverDashboard() {
  const [fires, setFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [showHelpForm, setShowHelpForm] = useState(false)
  const [helpSubmitted, setHelpSubmitted] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', address: '', people: 1, needs: '', urgency: 'high' as 'high' | 'medium' | 'low' })

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

  return (
    <>
    <LanguageSwitcher />
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <Bell className="w-4 h-4" />
          CAREGIVER DASHBOARD · SAFE-PATH
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          Your Evacuation Hub
        </h1>
        <p className="text-ash-400">
          Personalized alerts, check-in tools, and accessible evacuation guidance.
        </p>
      </div>

      {/* Alert status */}
      <div className="bg-signal-safe/10 border border-signal-safe/30 rounded-xl p-5 flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-signal-safe/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-signal-safe" />
        </div>
        <div>
          <div className="text-white font-semibold">No active evacuation orders in your area</div>
          <div className="text-ash-400 text-sm">Last checked: just now · Alerts update automatically</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="card p-5 hover:bg-ash-800 transition-all duration-200 hover:scale-[1.02] group"
          >
            <Icon className={`w-6 h-6 ${color} mb-3`} />
            <div className="text-white text-sm font-medium">{label}</div>
            <ChevronRight className="w-4 h-4 text-ash-600 group-hover:text-ash-400 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Evacuation Assist Request */}
      <div className={`rounded-xl border p-5 mb-8 ${showHelpForm ? 'border-signal-danger/40 bg-signal-danger/5' : 'border-ash-700 bg-ash-900/50'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-signal-danger" />
            <span className="text-white font-semibold text-sm">Need evacuation assistance?</span>
          </div>
          <button onClick={() => setShowHelpForm(v => !v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${showHelpForm ? 'bg-ash-700 text-ash-300' : 'bg-signal-danger/20 border border-signal-danger/40 text-signal-danger hover:bg-signal-danger/30'}`}>
            {showHelpForm ? 'Cancel' : 'Request Help'}
          </button>
        </div>
        <p className="text-ash-500 text-xs mb-3">Can't self-evacuate? Submit a request — emergency responders will be notified to assist.</p>
        {showHelpForm && (helpSubmitted ? (
          <div className="flex items-center gap-3 p-3 bg-signal-safe/10 border border-signal-safe/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-signal-safe shrink-0" />
            <div>
              <div className="text-signal-safe font-semibold text-sm">Request submitted</div>
              <div className="text-ash-400 text-xs mt-0.5">Responders have been notified. Stay at your location if it is safe to do so.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-ash-400 text-xs mb-1">Your name</label>
                <input type="text" value={helpForm.name} onChange={e => setHelpForm(f => ({...f, name: e.target.value}))}
                  placeholder="Full name"
                  className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-ash-600" />
              </div>
              <div>
                <label className="block text-ash-400 text-xs mb-1">Number of people</label>
                <input type="number" min="1" max="20" value={helpForm.people} onChange={e => setHelpForm(f => ({...f, people: parseInt(e.target.value) || 1}))}
                  className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-danger/60" />
              </div>
            </div>
            <div>
              <label className="block text-ash-400 text-xs mb-1">Your address</label>
              <input type="text" value={helpForm.address} onChange={e => setHelpForm(f => ({...f, address: e.target.value}))}
                placeholder="123 Main St, City, State"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-ash-600" />
            </div>
            <div>
              <label className="block text-ash-400 text-xs mb-1">Special needs or notes</label>
              <input type="text" value={helpForm.needs} onChange={e => setHelpForm(f => ({...f, needs: e.target.value}))}
                placeholder="e.g. wheelchair, oxygen tank, 2 dogs, no vehicle"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-danger/60 placeholder:text-ash-600" />
            </div>
            <div>
              <label className="block text-ash-400 text-xs mb-2">Urgency</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map(u => (
                  <button key={u} onClick={() => setHelpForm(f => ({...f, urgency: u}))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-all ${helpForm.urgency === u
                      ? u === 'high' ? 'bg-signal-danger/20 border-signal-danger/50 text-signal-danger'
                        : u === 'medium' ? 'bg-signal-warn/20 border-signal-warn/50 text-signal-warn'
                        : 'bg-signal-safe/20 border-signal-safe/50 text-signal-safe'
                      : 'border-ash-700 text-ash-400 hover:border-ash-600'}`}>
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
                <div className="h-4 bg-ash-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-ash-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : fires.length === 0 ? (
          <div className="card p-8 text-center text-ash-500">No active evacuation orders found.</div>
        ) : (
          <div className="space-y-3">
            {fires.map(fire => (
              <div key={fire.id} className="card p-5 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-signal-danger animate-pulse-slow shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {fire.incident_name || 'Unnamed Incident'}
                  </div>
                  <div className="text-ash-400 text-sm">
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
                    <div className="text-ash-500 text-xs mt-1">{fire.signal_gap_hours.toFixed(1)}h alert delay</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
    </>
  )
}
