'use client'
import { useEffect, useState } from 'react'
import { Bell, MapPin, Users, AlertTriangle, CheckCircle, Phone, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

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

      {/* Research context */}
      <div className="card p-6 mt-8 border-l-4 border-amber-500/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-white font-semibold mb-1">Why delays matter for caregivers</div>
            <p className="text-ash-400 text-sm leading-relaxed">
              Our research found that high-vulnerability counties experience significantly longer delays before receiving formal evacuation orders. Caregivers and evacuees in these areas are more likely to rely on informal signals — which is why SAFE-PATH monitors all signal channels, not just official orders.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
