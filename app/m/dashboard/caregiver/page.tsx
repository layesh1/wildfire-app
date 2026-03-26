'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, MapPin, CheckCircle, Shield, AlertTriangle, Package, ChevronRight, Monitor } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRoleContext } from '@/components/RoleContext'
import { addNotification } from '@/components/NotificationCenter'

type FireEvent = {
  id: string; incident_name: string; county: string; state: string
  acres_burned: number | null; containment_pct: number | null
  started_at: string; signal_gap_hours: number | null; has_evacuation_order: boolean | null
}
type Person = { id: string; name: string; relationship: string; familyRelation?: string; mobility: string; phone?: string }

const GO_BAG_ITEMS = ['water','docs','meds','phone','cash','clothes','food','first_aid','flashlight','pet','radio','map']

type AlertLevel = 'safe' | 'caution' | 'warning' | 'act_now'
function fireLevel(fire: FireEvent | null): AlertLevel {
  if (!fire) return 'safe'
  if (fire.has_evacuation_order) return 'act_now'
  const p = fire.containment_pct
  if (p == null || p < 25) return 'warning'
  if (p < 50) return 'caution'
  return 'caution'
}

const LEVEL_CONFIG: Record<AlertLevel, { bg: string; text: string; label: string; sub: string }> = {
  safe:    { bg: 'linear-gradient(135deg, #16a34a, #15803d)', text: 'white', label: 'All Clear',    sub: 'No active alerts in your area'      },
  caution: { bg: 'linear-gradient(135deg, #d97706, #b45309)', text: 'white', label: 'Caution',      sub: 'Stay alert — monitor conditions'      },
  warning: { bg: 'linear-gradient(135deg, #ea580c, #c2410c)', text: 'white', label: 'Warning',      sub: 'Prepare to leave immediately'          },
  act_now: { bg: 'linear-gradient(135deg, #dc2626, #991b1b)', text: 'white', label: 'Evacuate Now', sub: 'Mandatory evacuation order issued'     },
}

const QUICK_ACTIONS = [
  { label: 'Evac Map',    href: '/m/dashboard/caregiver/map',              icon: MapPin        },
  { label: 'Check In',   href: '/m/dashboard/caregiver/checkin',           icon: CheckCircle   },
  { label: 'Shelter',    href: '/m/dashboard/caregiver/map?filter=shelter', icon: Shield        },
  { label: 'Fire Alert', href: '/m/dashboard/caregiver/alert',             icon: AlertTriangle },
]

export default function MobileCaregiverHub() {
  const { mode, activePerson } = useRoleContext()
  const isCaregiverMode = mode === 'caregiver' && activePerson !== null
  const [fires, setFires] = useState<FireEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [bagChecked, setBagChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    try { setPersons(JSON.parse(localStorage.getItem('monitored_persons_v2') || '[]')) } catch {}
    try { setBagChecked(new Set(JSON.parse(localStorage.getItem('wfa_gobag') || '[]'))) } catch {}
    try {
      const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
      if (card.full_name) setUserName(card.full_name.split(' ')[0])
    } catch {}

    const supabase = createClient()
    async function load() {
      try {
        const { data } = await supabase.from('fire_events')
          .select('id,incident_name,county,state,acres_burned,containment_pct,started_at,signal_gap_hours,has_evacuation_order')
          .order('started_at', { ascending: false }).limit(5)
        if (data) {
          setFires(data)
          const urgent = data.filter((f: any) => f.has_evacuation_order)
          const uncontained = data.filter((f: any) => !f.has_evacuation_order && (f.containment_pct == null || f.containment_pct < 25))
          if (urgent.length > 0) {
            addNotification({
              title: `Evacuation Order: ${urgent[0].incident_name || 'Active Fire'}`,
              body: `${urgent[0].county ? urgent[0].county + ', ' : ''}${urgent[0].state || ''} — mandatory evacuation order issued.`,
            })
          }
          if (uncontained.length > 0 && urgent.length === 0) {
            addNotification({
              title: `${uncontained.length} Active Fire${uncontained.length > 1 ? 's' : ''} Nearby`,
              body: `${uncontained[0].incident_name || 'Fire'} is less than 25% contained. Monitor alerts.`,
            })
          }
          // Notify for monitored persons if evacuation orders exist
          try {
            const storedPersons: Person[] = JSON.parse(localStorage.getItem('monitored_persons_v2') || '[]')
            if (storedPersons.length > 0 && urgent.length > 0) {
              for (const person of storedPersons) {
                addNotification({
                  title: `Alert for ${person.name}`,
                  body: `Evacuation order issued near monitored person. Check on ${person.name.split(' ')[0]} immediately.`,
                })
              }
            }
          } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const topFire = fires[0] ?? null
  const level = fireLevel(topFire)
  const cfg = LEVEL_CONFIG[level]
  const readyPct = Math.round((bagChecked.size / GO_BAG_ITEMS.length) * 100)

  return (
    <div className="min-h-full">
      {/* Hero alert card */}
      <div className="relative px-4 pt-12 pb-8" style={{ background: cfg.bg }}>
        {/* Desktop switch link */}
        <Link
          href="/dashboard/caregiver"
          className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-white/60 hover:text-white/90 transition-colors"
          prefetch={false}
        >
          <Monitor className="w-3 h-3" /> Desktop
        </Link>

        <div className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
          {isCaregiverMode ? `Caring for ${activePerson!.name.split(' ')[0]}` : `Hi${userName ? ` ${userName}` : ''} ·`} My Safety
        </div>
        <h1 className="font-display font-bold text-3xl text-white mb-1">
          {isCaregiverMode ? `${activePerson!.name.split(' ')[0]}'s Hub` : 'My Hub'}
        </h1>

        {/* Big status pill */}
        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5">
          {level === 'safe'
            ? <CheckCircle className="w-5 h-5 text-white" />
            : <Flame className="w-5 h-5 text-white animate-pulse" />
          }
          <div>
            <div className="text-white font-bold text-base leading-tight">{cfg.label}</div>
            <div className="text-white/70 text-xs">{cfg.sub}</div>
          </div>
        </div>

        {topFire && (
          <div className="mt-4 bg-white/10 rounded-2xl p-3 text-white">
            <div className="font-semibold text-sm truncate">{topFire.incident_name}</div>
            <div className="text-white/60 text-xs mt-0.5">{[topFire.county, topFire.state].filter(Boolean).join(', ')}</div>
            <div className="flex gap-4 mt-2 text-xs">
              {topFire.acres_burned != null && <span><strong>{topFire.acres_burned.toLocaleString()}</strong> ac</span>}
              {topFire.containment_pct != null && <span><strong>{topFire.containment_pct}%</strong> contained</span>}
              {topFire.signal_gap_hours != null && <span><strong>{topFire.signal_gap_hours.toFixed(1)}h</strong> gap</span>}
            </div>
          </div>
        )}

        {loading && <div className="mt-4 h-16 rounded-2xl bg-white/10 animate-pulse" />}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.label} href={a.href} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-4 border border-gray-200 shadow-sm active:scale-95 transition-transform">
              <a.icon className="w-5 h-5 text-green-700" />
              <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Go-bag progress */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Package className="w-4 h-4 text-green-700" /> Go-Bag Ready
            </div>
            <span className="text-sm font-bold" style={{ color: readyPct >= 80 ? '#16a34a' : readyPct >= 50 ? '#d97706' : '#dc2626' }}>
              {readyPct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${readyPct}%`, background: readyPct >= 80 ? '#16a34a' : readyPct >= 50 ? '#d97706' : '#dc2626' }} />
          </div>
          <div className="text-xs text-gray-400 mt-1.5">{bagChecked.size} / {GO_BAG_ITEMS.length} items packed</div>
        </div>

        {/* Monitored persons */}
        {persons.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-2">Monitored Persons</h2>
            <div className="space-y-2">
              {persons.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-800">{p.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.familyRelation || p.relationship}</div>
                  </div>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-1.5">
                      Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other fires */}
        {fires.slice(1).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-2">Other Active Fires</h2>
            <div className="space-y-2">
              {fires.slice(1).map(f => (
                <div key={f.id} className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{f.incident_name || 'Unnamed Fire'}</div>
                    <div className="text-xs text-gray-500">{[f.county, f.state].filter(Boolean).join(', ')}</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0" style={{ color: (f.containment_pct ?? 0) >= 50 ? '#16a34a' : '#dc2626' }}>
                    {f.containment_pct != null ? `${f.containment_pct}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Early fire alert CTA */}
        <Link
          href="/m/dashboard/caregiver/alert"
          className="flex items-center gap-3 rounded-2xl px-4 py-4 text-white"
          style={{ background: 'linear-gradient(135deg, #7a2e0e, #c86432)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Early Fire Alert</div>
            <div className="text-white/60 text-xs">Monitor nearby fires before orders are issued</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </Link>
      </div>
    </div>
  )
}
