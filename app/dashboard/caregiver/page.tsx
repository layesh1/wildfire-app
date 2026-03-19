'use client'
import { useEffect, useState } from 'react'
import {
  Flame, MapPin, Phone, AlertTriangle, CheckCircle,
  Clock, Shield, ChevronRight, Package, User, Users, Bell
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// ── Constants ─────────────────────────────────────────────────────────────────
const GO_BAG_ITEMS = [
  { id: 'water',     label: 'Water (1 gal/person/day × 3 days)',          critical: true  },
  { id: 'docs',      label: 'ID, insurance & vital documents',             critical: true  },
  { id: 'meds',      label: 'Medications (7-day supply + list)',           critical: true  },
  { id: 'phone',     label: 'Phone charger & battery pack',                critical: true  },
  { id: 'cash',      label: 'Cash ($100+ small bills)',                    critical: false },
  { id: 'clothes',   label: 'Clothing change + sturdy shoes',              critical: false },
  { id: 'food',      label: 'Non-perishable food (3-day supply)',          critical: false },
  { id: 'first_aid', label: 'First-aid kit',                               critical: false },
  { id: 'flashlight',label: 'Flashlight + extra batteries',               critical: false },
  { id: 'pet',       label: 'Pet supplies (carrier, food, records)',       critical: false },
  { id: 'radio',     label: 'Battery/crank weather radio',                 critical: false },
  { id: 'map',       label: 'Paper map of your area',                      critical: false },
]

// ── Types ─────────────────────────────────────────────────────────────────────
type MonitoredPerson = {
  id: string
  name: string
  relationship: string
  familyRelation?: string
  mobility: string
  mobilityOther?: string
  address?: string
  phone?: string
  email?: string
  notes?: string
}

type FireEvent = {
  id: string
  incident_name: string
  county: string
  state: string
  acres_burned: number | null
  containment_pct: number | null
  started_at: string
  signal_gap_hours: number | null
  has_evacuation_order: boolean | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
type EvacStage = 'Order issued' | 'Warning issued' | 'Advisory issued' | 'Watch (now)'

function evacuationStage(fire: FireEvent): EvacStage {
  if (fire.has_evacuation_order) return 'Order issued'
  const pct = fire.containment_pct
  if (pct == null || pct < 25) return 'Warning issued'
  if (pct < 50) return 'Advisory issued'
  return 'Watch (now)'
}

const STAGE_META: Record<EvacStage, { bg: string; text: string; action: string }> = {
  'Order issued':    { bg: '#c86432', text: 'white',    action: 'Mandatory evacuation — go immediately. Shelter info on map.' },
  'Warning issued':  { bg: '#d97706', text: 'white',    action: 'Leave NOW — do not wait for Order. In high-SVI counties, a formal order may never be issued.' },
  'Advisory issued': { bg: '#d4a574', text: '#3e2723',  action: 'Load car, move valuables, prepare to leave immediately.' },
  'Watch (now)':     { bg: '#7cb342', text: 'white',    action: 'Pack go-bag, fill gas, locate pets, know your route.' },
}

function mobilityStatus(m: string): 'safe' | 'caution' | 'danger' {
  const l = (m || '').toLowerCase()
  if (l.includes('oxygen') || l.includes('bedridden') || l.includes('medical')) return 'danger'
  if (l.includes('wheelchair') || l.includes('limited') || l.includes('walker')) return 'caution'
  return 'safe'
}

const STATUS_COLORS = {
  safe:    '#7cb342',
  caution: '#d4a574',
  danger:  '#c86432',
}

// ── Person tracking card ──────────────────────────────────────────────────────
function PersonCard({ person, index }: { person: MonitoredPerson; index: number }) {
  const status  = mobilityStatus(person.mobility)
  const color   = STATUS_COLORS[status]
  const isPrimary = index === 0

  return (
    <div
      className="rounded-2xl p-4 transition-shadow hover:shadow-md"
      style={{
        background: isPrimary
          ? 'linear-gradient(135deg, #c86432 0%, #8b3a1a 100%)'
          : 'white',
        border: isPrimary ? 'none' : `1.5px solid ${color}40`,
      }}
    >
      {/* Name + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className={`font-semibold text-sm truncate ${isPrimary ? 'text-white' : 'text-[#3e2723]'}`}>
            {person.name}
          </div>
          <div className={`text-xs mt-0.5 ${isPrimary ? 'text-white/60' : 'text-[#3e2723]/50'}`}>
            {person.familyRelation || person.relationship}
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
          style={{
            background: isPrimary ? 'rgba(255,255,255,0.2)' : color + '20',
            color: isPrimary ? 'white' : color,
            border: `1px solid ${isPrimary ? 'rgba(255,255,255,0.3)' : color + '50'}`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Mobility pill */}
      {person.mobility && (
        <div
          className="inline-block text-[11px] px-2.5 py-1 rounded-xl mb-3"
          style={{
            background: isPrimary ? 'rgba(255,255,255,0.15)' : '#f5f1e8',
            color: isPrimary ? 'rgba(255,255,255,0.8)' : '#3e2723',
          }}
        >
          {person.mobilityOther || person.mobility}
        </div>
      )}

      {/* Timeline dots */}
      <div className="space-y-1.5">
        {person.address && (
          <div className={`flex items-center gap-2 text-xs ${isPrimary ? 'text-white/55' : 'text-gray-400'}`}>
            <div className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color }} />
            <span className="truncate">{person.address}</span>
          </div>
        )}
        {person.phone && (
          <div className={`flex items-center gap-2 text-xs ${isPrimary ? 'text-white/55' : 'text-gray-400'}`}>
            <div className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
            <span>{person.phone}</span>
          </div>
        )}
      </div>

      {/* Quick call on featured card */}
      {isPrimary && person.phone && (
        <a
          href={`tel:${person.phone}`}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#c86432] transition-colors hover:bg-white/90"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <Phone className="w-3 h-3" />
          Call {person.name.split(' ')[0]}
        </a>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function CaregiverDashboard() {
  const [fires, setFires]     = useState<FireEvent[]>([])
  const [persons, setPersons] = useState<MonitoredPerson[]>([])
  const [userProfile, setUserProfile] = useState<{ full_name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [bagChecked, setBagChecked] = useState<Set<string>>(new Set())

  const supabase = createClient()

  useEffect(() => {
    // Load localStorage data
    try {
      const saved = JSON.parse(localStorage.getItem('monitored_persons_v2') || '[]')
      setPersons(saved)
    } catch {}

    try {
      const saved = JSON.parse(localStorage.getItem('wfa_gobag') || '[]')
      setBagChecked(new Set(saved))
    } catch {}

    // Supabase data
    async function load() {
      const [{ data: firesData }, { data: { user } }] = await Promise.all([
        supabase
          .from('fire_events')
          .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, signal_gap_hours, has_evacuation_order')
          .order('started_at', { ascending: false })
          .limit(6),
        supabase.auth.getUser(),
      ])
      if (firesData) setFires(firesData)
      if (user) {
        // Try localStorage emergency card first for full_name
        try {
          const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
          if (card.full_name) {
            setUserProfile({ full_name: card.full_name, email: user.email })
            setLoading(false)
            return
          }
        } catch {}
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setUserProfile({ full_name: prof?.full_name, email: user.email })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topFire    = fires[0] ?? null
  const otherFires = fires.slice(1)
  const readyPct   = Math.round((bagChecked.size / GO_BAG_ITEMS.length) * 100)
  const stage      = topFire ? evacuationStage(topFire) : null
  const stageMeta  = stage ? STAGE_META[stage] : null

  const initials = userProfile?.full_name
    ? userProfile.full_name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  const firstPerson = persons[0] ?? null

  return (
    <>
      <LanguageSwitcher />

      {/* Root: full height 3-column layout */}
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: '#f5f1e8', fontFamily: 'var(--font-body)' }}
      >

        {/* ══ LEFT COLUMN — tracking cards (340px) ══════════════════════════ */}
        <div
          className="flex flex-col shrink-0 border-r"
          style={{ width: 340, borderColor: '#d4a57440', background: 'rgba(255,255,255,0.6)' }}
        >
          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b" style={{ borderColor: '#d4a57430' }}>
            <div className="flex items-center gap-1.5 text-[#c86432] text-[11px] font-semibold uppercase tracking-widest mb-1">
              <Users className="w-3.5 h-3.5" />
              My Persons
            </div>
            <div className="font-display font-bold text-xl text-[#3e2723]">Tracking</div>
            <div className="text-[#3e2723]/40 text-xs mt-0.5">
              {persons.length} {persons.length === 1 ? 'person' : 'people'} monitored
            </div>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {persons.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: '#f5f1e8' }}>
                  <User className="w-6 h-6 text-[#d4a574]" />
                </div>
                <p className="text-[#3e2723]/50 text-sm mb-3">No people added yet</p>
                <Link
                  href="/dashboard/caregiver/persons"
                  className="text-[#c86432] text-xs font-semibold hover:underline flex items-center gap-1"
                >
                  Add someone to monitor <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              persons.map((p, i) => <PersonCard key={p.id} person={p} index={i} />)
            )}

            {/* Go-bag widget */}
            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#d4a57440' }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 text-[#3e2723] text-sm font-semibold">
                  <Package className="w-4 h-4 text-[#c86432]" />
                  Go-Bag Ready
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432' }}
                >
                  {readyPct}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0ece3' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${readyPct}%`,
                    background: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432',
                  }}
                />
              </div>
              <div className="text-[11px] text-[#3e2723]/40 mt-1.5">
                {bagChecked.size} / {GO_BAG_ITEMS.length} items packed
              </div>
            </div>

            {/* Add person CTA */}
            <Link
              href="/dashboard/caregiver/persons"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-colors border border-dashed hover:bg-white"
              style={{ borderColor: '#d4a57460', color: '#c86432' }}
            >
              + Add person
            </Link>
          </div>
        </div>

        {/* ══ CENTER COLUMN — fire alert + stats ════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="shrink-0 px-8 pt-6 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[#c86432] text-[11px] font-semibold uppercase tracking-widest mb-0.5">
                <Bell className="w-3.5 h-3.5" />
                Caregiver Hub
              </div>
              <h1 className="font-display font-bold text-2xl text-[#3e2723]">My Hub</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/caregiver/map"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#3e2723' }}
              >
                <MapPin className="w-3.5 h-3.5" />
                Evac Map
              </Link>
              <Link
                href="/dashboard/caregiver/checkin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-white"
                style={{ background: 'rgba(255,255,255,0.6)', color: '#3e2723', border: '1px solid #d4a57440' }}
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#7cb342]" />
                Check In Safe
              </Link>
            </div>
          </div>

          {/* Scrollable main area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-5">

            {/* Big fire alert card */}
            {loading ? (
              <div className="h-72 rounded-3xl animate-pulse" style={{ background: '#d4a574' }} />
            ) : topFire ? (
              <div
                className="rounded-3xl p-8 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #3e2723 0%, #5d3a1a 55%, #c86432 100%)',
                  minHeight: 280,
                }}
              >
                {/* Decorative fire glow */}
                <div
                  className="absolute top-6 right-8 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(200,100,50,0.35) 0%, transparent 70%)' }}
                />

                {/* Flame icon circle */}
                <div className="flex flex-col items-center mb-7">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-1"
                    style={{
                      background: 'rgba(200,100,50,0.2)',
                      border: '3px solid rgba(200,100,50,0.45)',
                      boxShadow: '0 0 40px rgba(200,100,50,0.3)',
                    }}
                  >
                    <div
                      className="w-13 h-13 w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(200,100,50,0.35)', border: '2px solid rgba(200,100,50,0.6)' }}
                    >
                      <Flame className="w-7 h-7 text-orange-300" />
                    </div>
                  </div>
                  <h2 className="font-display font-bold text-2xl text-white text-center mt-4">
                    {topFire.incident_name || 'Active Fire Alert'}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-white/55 text-sm">
                      {[topFire.county, topFire.state].filter(Boolean).join(', ')}
                    </span>
                    {stageMeta && (
                      <span
                        className="text-[11px] font-bold px-3 py-1 rounded-full tracking-wide"
                        style={{ background: stageMeta.bg, color: stageMeta.text }}
                      >
                        {stage}
                      </span>
                    )}
                  </div>
                  {/* Stage action line */}
                  {stageMeta && (
                    <p className="text-white/45 text-xs mt-3 max-w-md text-center leading-relaxed">
                      {stageMeta.action}
                    </p>
                  )}
                </div>

                {/* 4 quick-action cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Evacuation Map', href: '/dashboard/caregiver/map',              icon: MapPin,       desc: 'View fires & shelters' },
                    { label: 'Check In Safe',  href: '/dashboard/caregiver/checkin',           icon: CheckCircle,  desc: 'Mark yourself safe'    },
                    { label: 'Find Shelter',   href: '/dashboard/caregiver/map?filter=shelter',icon: Shield,       desc: 'Nearby evac shelters'  },
                    { label: 'Fire Alert',     href: '/dashboard/caregiver/alert',             icon: AlertTriangle,desc: 'Report or view alerts' },
                  ].map(action => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:scale-[1.03] hover:bg-white/15 group"
                      style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <action.icon className="w-5 h-5 text-orange-300 mb-2 group-hover:text-white transition-colors" />
                      <div className="text-white font-semibold text-sm leading-tight">{action.label}</div>
                      <div className="text-white/40 text-[11px] mt-1 leading-snug">{action.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="rounded-3xl p-8 flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3e2723, #5d4a3a)', minHeight: 240 }}
              >
                <div
                  className="w-18 h-18 w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(124,179,66,0.2)', border: '3px solid rgba(124,179,66,0.4)' }}
                >
                  <CheckCircle className="w-9 h-9 text-[#7cb342]" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">No Active Alerts</h2>
                <p className="text-white/45 text-sm mt-2">Your area is currently clear. Stay prepared.</p>
              </div>
            )}

            {/* Other fires */}
            {otherFires.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-[#3e2723] font-semibold text-sm mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#c86432]" />
                  Other Recent Fires
                </div>
                <div className="space-y-2">
                  {otherFires.map(fire => (
                    <div
                      key={fire.id}
                      className="rounded-2xl p-4 bg-white flex items-center gap-4 shadow-sm"
                      style={{ border: '1px solid #f0ece3' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                        style={{ background: fire.containment_pct != null && fire.containment_pct >= 75 ? '#7cb342' : '#c86432' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#3e2723] font-medium text-sm truncate">
                          {fire.incident_name || 'Unnamed Fire'}
                        </div>
                        <div className="text-[#3e2723]/40 text-xs">
                          {[fire.county, fire.state].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-sm font-semibold"
                          style={{ color: fire.containment_pct != null && fire.containment_pct >= 50 ? '#7cb342' : '#c86432' }}
                        >
                          {fire.containment_pct != null ? `${fire.containment_pct}% contained` : 'Uncontained'}
                        </div>
                        {fire.acres_burned != null && (
                          <div className="text-[#3e2723]/40 text-xs">{fire.acres_burned.toLocaleString()} ac</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT COLUMN — profile + map + info cards (380px) ════════════ */}
        <div
          className="flex flex-col shrink-0 border-l"
          style={{ width: 380, borderColor: '#d4a57440', background: 'rgba(255,255,255,0.4)' }}
        >
          {/* Profile badge */}
          <div className="p-5 border-b" style={{ borderColor: '#d4a57430' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-lg text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #3e2723, #c86432)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#3e2723] font-semibold text-sm truncate">
                  {userProfile?.full_name || 'My Profile'}
                </div>
                {userProfile?.email && (
                  <div className="text-[#3e2723]/40 text-xs truncate">{userProfile.email}</div>
                )}
              </div>
              <Link
                href="/dashboard/settings"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#3e2723]/10 transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-[#3e2723]/40" />
              </Link>
            </div>
          </div>

          {/* Map preview */}
          <div className="flex-1 relative overflow-hidden m-4 rounded-2xl" style={{ minHeight: 180 }}>
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=-124.5,32.5,-114.1,42.0&layer=mapnik"
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none', borderRadius: 16 }}
              title="Evacuation Map Preview"
            />
            {/* Zoom hint */}
            <div
              className="absolute top-3 right-3 flex flex-col gap-1.5 rounded-xl overflow-hidden shadow"
              style={{ background: 'rgba(255,255,255,0.9)' }}
            >
              <span className="w-7 h-7 flex items-center justify-center text-[#3e2723] text-base font-bold cursor-default select-none">+</span>
              <div style={{ height: 1, background: '#e5e7eb' }} />
              <span className="w-7 h-7 flex items-center justify-center text-[#3e2723] text-base font-bold cursor-default select-none">−</span>
            </div>
            {/* View full map button */}
            <div className="absolute inset-x-0 bottom-0 p-3">
              <Link
                href="/dashboard/caregiver/map"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'rgba(62,39,35,0.88)', backdropFilter: 'blur(8px)' }}
              >
                <MapPin className="w-3.5 h-3.5" />
                View Full Evacuation Map
              </Link>
            </div>
          </div>

          {/* Bottom 2 info cards */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            {/* Emergency contact card */}
            <div
              className="rounded-2xl p-4 text-white"
              style={{ background: 'linear-gradient(135deg, #4a6621, #7cb342)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-white/60 text-[10px] uppercase tracking-widest mb-0.5">First Person</div>
              <div className="text-sm font-semibold text-white truncate">
                {firstPerson?.name || 'No contact'}
              </div>
              {firstPerson?.phone ? (
                <a
                  href={`tel:${firstPerson.phone}`}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  <Phone className="w-3 h-3" />
                  Call
                </a>
              ) : (
                <Link
                  href="/dashboard/caregiver/persons"
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  Set up
                </Link>
              )}
            </div>

            {/* Location card */}
            <div className="rounded-2xl p-4" style={{ background: '#3e2723' }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <MapPin className="w-4 h-4 text-[#d4a574]" />
              </div>
              <div className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Location</div>
              <div className="text-sm font-semibold text-white/90 leading-snug line-clamp-2">
                {firstPerson?.address || 'Not set'}
              </div>
              <div className="text-white/25 text-[10px] uppercase tracking-widest mt-3">Last Update: Now</div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
