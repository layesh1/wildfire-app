'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Flame, MapPin, Phone, AlertTriangle, CheckCircle,
  Shield, ChevronRight, Package, User, Users, Bell,
  Maximize2, Minimize2, LayoutTemplate
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import type { NifcFire } from './map/LeafletMap'
import AlertJar from '@/components/AlertJar'
import { useRoleContext } from '@/components/RoleContext'

const LeafletMap = dynamic(() => import('./map/LeafletMap'), { ssr: false })

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
          : 'var(--wfa-panel-solid)',
        border: isPrimary ? 'none' : `1.5px solid ${color}40`,
      }}
    >
      {/* Name + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div
            className={`font-semibold text-sm truncate ${isPrimary ? 'text-white' : ''}`}
            style={isPrimary ? undefined : { color: 'var(--wfa-text)' }}
          >
            {person.name}
          </div>
          <div
            className={`text-xs mt-0.5 ${isPrimary ? 'text-white/60' : ''}`}
            style={isPrimary ? undefined : { color: 'var(--wfa-text-50)' }}
          >
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
            background: isPrimary ? 'rgba(255,255,255,0.15)' : 'var(--wfa-tag-bg)',
            color: isPrimary ? 'rgba(255,255,255,0.8)' : 'var(--wfa-text)',
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
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-white/90"
          style={{ background: 'var(--wfa-call-btn-bg)', color: 'var(--wfa-accent)' }}
        >
          <Phone className="w-3 h-3" />
          Call {person.name.split(' ')[0]}
        </a>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export default function CaregiverDashboard() {
  const [fires, setFires]     = useState<FireEvent[]>([])
  const [nifc, setNifc]       = useState<NifcFire[]>([])
  const [persons, setPersons] = useState<MonitoredPerson[]>([])
  const [userProfile, setUserProfile] = useState<{ full_name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [bagChecked, setBagChecked] = useState<Set<string>>(new Set())

  // Resizable 3-column layout
  const [leftPct, setLeftPct]   = useState(25)
  const [rightPct, setRightPct] = useState(28)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const [preset, setPreset]     = useState<'equal' | 'default' | 'map'>('default')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      if (dragging === 'left') { setLeftPct(clamp(pct, 15, 40)); setPreset('equal') }
      if (dragging === 'right') { setRightPct(clamp(100 - pct, 20, 50)); setPreset('equal') }
    }
    function onUp() { setDragging(null) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging])

  function applyPreset(p: 'equal' | 'default' | 'map') {
    setPreset(p)
    if (p === 'equal')   { setLeftPct(33); setRightPct(33) }
    if (p === 'default') { setLeftPct(25); setRightPct(28) }
    if (p === 'map')     { setLeftPct(15); setRightPct(45) }
  }
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [personLocation, setPersonLocation] = useState<[number, number] | null>(null)
  const { mode, activePerson } = useRoleContext()
  const isCaregiverMode = mode === 'caregiver' && activePerson !== null

  // Geocode active person's address whenever they change
  useEffect(() => {
    if (!activePerson?.address) { setPersonLocation(null); return }
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(activePerson.address)}&format=json&limit=1&countrycodes=us`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then(r => r.json())
      .then((data: { lat: string; lon: string }[]) => {
        if (data[0]) setPersonLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        else setPersonLocation(null)
      })
      .catch(() => setPersonLocation(null))
  }, [activePerson?.address])


  const supabase = createClient()

  useEffect(() => {
    // Request geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {} // silently ignore denial
      )
    }

    // Load localStorage data
    try {
      const saved = JSON.parse(localStorage.getItem('monitored_persons_v2') || '[]')
      setPersons(saved)
    } catch {}

    try {
      const saved = JSON.parse(localStorage.getItem('wfa_gobag') || '[]')
      setBagChecked(new Set(saved))
    } catch {}

    // Supabase data + NIFC live fires
    async function load() {
      try {
        const [firesRes, authRes, nifcRes] = await Promise.all([
          supabase
            .from('fire_events')
            .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, signal_gap_hours, has_evacuation_order')
            .order('started_at', { ascending: false })
            .limit(6),
          supabase.auth.getUser(),
          fetch('/api/fires/nifc').catch(() => null),
        ])
        const firesData = firesRes?.data
        const user = authRes?.data?.user
        if (nifcRes?.ok) {
          const json = await nifcRes.json().catch(() => ({}))
          if (json?.data) setNifc(json.data)
        }
        if (firesData) setFires(firesData)
        if (user) {
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
      } catch (err) {
        console.error('[Hub] load error:', err)
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


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--wfa-border)', background: 'var(--wfa-page-bg)' }}>
        <span className="text-xs mr-2" style={{ color: 'var(--wfa-muted)' }}>Layout</span>
        {([['equal', 'Equal', LayoutTemplate], ['default', 'Default', Minimize2], ['map', 'Map Focus', Maximize2]] as const).map(([p, label, Icon]) => (
          <button key={p} onClick={() => applyPreset(p)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: preset === p ? 'var(--wfa-accent)' : 'transparent', color: preset === p ? '#fff' : 'var(--wfa-muted)', border: `1px solid ${preset === p ? 'transparent' : 'var(--wfa-border)'}` }}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Root: full height 3-column resizable layout */}
      <div
        ref={containerRef}
        className="flex overflow-hidden"
        style={{ flex: 1, background: 'var(--wfa-page-bg)', fontFamily: 'var(--font-body)', userSelect: dragging ? 'none' : undefined }}
      >

        {/* ══ LEFT COLUMN — tracking cards (340px) ══════════════════════════ */}
        <div
          className="flex flex-col shrink-0 border-r"
          style={{ width: `${leftPct}%`, minWidth: 180, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-l)' }}
        >
          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b" style={{ borderColor: 'var(--wfa-border-lite)' }}>
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'var(--wfa-accent)' }}
            >
              <Users className="w-3.5 h-3.5" />
              {isCaregiverMode ? 'Caring For' : 'My Persons'}
            </div>
            <div className="font-display font-bold text-xl" style={{ color: 'var(--wfa-text)' }}>
              {isCaregiverMode ? activePerson!.name.split(' ')[0] : 'Tracking'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--wfa-text-40)' }}>
              {isCaregiverMode
                ? (activePerson!.relationship || 'Person in care')
                : `${persons.length} ${persons.length === 1 ? 'person' : 'people'} monitored`}
            </div>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {persons.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--wfa-tag-bg)' }}>
                  <User className="w-6 h-6" style={{ color: 'var(--wfa-accent-lite)' }} />
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--wfa-text-50)' }}>No people added yet</p>
                <Link
                  href="/dashboard/caregiver/persons"
                  className="text-xs font-semibold hover:underline flex items-center gap-1"
                  style={{ color: 'var(--wfa-accent)' }}
                >
                  Add someone to monitor <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              persons.map((p, i) => <PersonCard key={p.id} person={p} index={i} />)
            )}

            {/* Go-bag widget */}
            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: 'var(--wfa-border)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--wfa-text)' }}>
                  <Package className="w-4 h-4" style={{ color: 'var(--wfa-accent)' }} />
                  Go-Bag Ready
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432' }}
                >
                  {readyPct}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--wfa-progress-bg)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${readyPct}%`,
                    background: readyPct >= 80 ? '#7cb342' : readyPct >= 50 ? '#d4a574' : '#c86432',
                  }}
                />
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--wfa-text-40)' }}>
                {bagChecked.size} / {GO_BAG_ITEMS.length} items packed
              </div>
            </div>

            {/* Add person CTA */}
            <Link
              href="/dashboard/caregiver/persons"
              className="group flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl text-sm font-medium transition-all border border-dashed hover:shadow-sm"
              style={{ borderColor: 'var(--wfa-border)', color: 'var(--wfa-accent)' }}
            >
              <span className="flex items-center gap-1.5">+ Add person</span>
              <span
                className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity max-h-0 group-hover:max-h-4 overflow-hidden leading-none"
                style={{ color: 'var(--wfa-accent)' }}
              >
                Track location &amp; check‑in status
              </span>
            </Link>
          </div>
        </div>

        {/* ══ DRAG HANDLE — left/center ══════════════════════════════════ */}
        <div onMouseDown={() => setDragging('left')} style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize', zIndex: 10 }}>
          <div style={{ width: 2, height: 40, borderRadius: 4, background: dragging === 'left' ? '#f97316' : 'var(--wfa-border)', transition: 'background 0.15s' }} />
        </div>

        {/* ══ CENTER COLUMN — fire alert + stats ════════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 240 }}>

          {/* Top bar */}
          <div className="shrink-0 px-8 pt-6 pb-4 flex items-center justify-between">
            <div>
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--wfa-accent)' }}
              >
                <Bell className="w-3.5 h-3.5" />
                {isCaregiverMode ? `Caring for ${activePerson!.name}` : 'My Safety'}
              </div>
              <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--wfa-text)' }}>
                {isCaregiverMode ? `${activePerson!.name.split(' ')[0]}'s Hub` : 'My Hub'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="group relative">
                <Link
                  href="/dashboard/caregiver/map"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.03]"
                  style={{ background: 'var(--wfa-btn-dark)' }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Evac Map
                </Link>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-10 shadow-lg"
                  style={{ background: 'var(--wfa-tooltip-bg)' }}
                >
                  Live fire map &amp; evacuation routes
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{ background: 'var(--wfa-tooltip-bg)' }} />
                </div>
              </div>
              <div className="group relative">
                <Link
                  href="/dashboard/caregiver/checkin"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] hover:shadow-sm"
                  style={{ background: 'var(--wfa-checkin-bg)', color: 'var(--wfa-text)', border: '1px solid var(--wfa-border)' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#7cb342' }} />
                  {isCaregiverMode ? `Ping ${activePerson!.name.split(' ')[0]}` : 'Check In Safe'}
                </Link>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-10 shadow-lg"
                  style={{ background: 'var(--wfa-tooltip-bg)' }}
                >
                  {isCaregiverMode ? `Send ${activePerson!.name.split(' ')[0]} a safety check-in` : 'Mark yourself safe & notify your network'}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{ background: 'var(--wfa-tooltip-bg)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable main area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-5">

            {/* Big fire alert card */}
            {loading ? (
              <div className="h-72 rounded-3xl animate-pulse" style={{ background: 'var(--wfa-accent-lite)' }} />
            ) : topFire ? (
              <div
                data-tour="hub-panel"
                className="wfa-dark-panel rounded-3xl p-8 relative overflow-hidden"
                style={{
                  background: 'var(--wfa-hero-bg)',
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
                <div data-tour="quick-actions" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Evacuation Map', href: '/dashboard/caregiver/map',               icon: MapPin,        desc: 'View fires & shelters' },
                    { label: isCaregiverMode ? `Ping ${activePerson!.name.split(' ')[0]}` : 'Check In Safe', href: '/dashboard/caregiver/checkin', icon: CheckCircle, desc: isCaregiverMode ? `Send ${activePerson!.name.split(' ')[0]} a check-in` : 'Mark yourself safe' },
                    { label: 'Find Shelter',   href: '/dashboard/caregiver/map?filter=shelter', icon: Shield,        desc: 'Nearby evac shelters'  },
                    { label: 'Fire Alert',     href: '/dashboard/caregiver/alert',              icon: AlertTriangle, desc: 'Report or view alerts' },
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
                className="wfa-dark-panel rounded-3xl pt-12 px-8 pb-8 flex flex-col items-center"
                style={{ background: 'var(--wfa-empty-bg)' }}
              >
                <AlertJar level="safe" size={160} />
                <h2 className="font-display text-xl font-bold text-white mt-16">No Active Alerts</h2>
                <p className="text-white/45 text-sm mt-2 mb-6">Your area is currently clear. Stay prepared.</p>

                {/* Alert level key */}
                <div className="w-full grid grid-cols-4 gap-3">
                  {[
                    { dot: '#7cb342', label: 'Safe',    sub: 'All clear'   },
                    { dot: '#d4a574', label: 'Caution', sub: 'Stay alert'  },
                    { dot: '#c86432', label: 'Warning', sub: 'Prepare now' },
                    { dot: '#d32f2f', label: 'Act Now', sub: 'Evacuate!'   },
                  ].map(({ dot, label, sub }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: dot + '22', border: `2px solid ${dot}` }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
                      </div>
                      <div className="text-xs font-semibold text-white">{label}</div>
                      <div className="text-[10px] text-white/40">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other fires */}
            {otherFires.length > 0 && (
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm mb-3" style={{ color: 'var(--wfa-text)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--wfa-accent)' }} />
                  Other Recent Fires
                </div>
                <div className="space-y-2">
                  {otherFires.map(fire => (
                    <div
                      key={fire.id}
                      className="rounded-2xl p-4 bg-white flex items-center gap-4 shadow-sm"
                      style={{ border: '1px solid var(--wfa-fire-border)' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                        style={{ background: fire.containment_pct != null && fire.containment_pct >= 75 ? '#7cb342' : '#c86432' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" style={{ color: 'var(--wfa-text)' }}>
                          {fire.incident_name || 'Unnamed Fire'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--wfa-text-40)' }}>
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
                          <div className="text-xs" style={{ color: 'var(--wfa-text-40)' }}>{fire.acres_burned.toLocaleString()} ac</div>
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
        {/* ══ DRAG HANDLE — center/right ══════════════════════════════════ */}
        <div onMouseDown={() => setDragging('right')} style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize', zIndex: 10 }}>
          <div style={{ width: 2, height: 40, borderRadius: 4, background: dragging === 'right' ? '#f97316' : 'var(--wfa-border)', transition: 'background 0.15s' }} />
        </div>

        {/* ══ RIGHT COLUMN — map + profile + first person ════════════════════ */}
        <div
          className="flex flex-col shrink-0 border-l"
          style={{ width: `${rightPct}%`, minWidth: 220, borderColor: 'var(--wfa-border)', background: 'var(--wfa-panel-r)' }}
        >
          {/* Profile badge */}
          <div className="p-5 border-b" style={{ borderColor: 'var(--wfa-border-lite)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg text-white shrink-0"
                style={{ background: 'var(--wfa-profile-grad)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: 'var(--wfa-text)' }}>
                  {userProfile?.full_name || 'My Profile'}
                </div>
                {userProfile?.email && (
                  <div className="text-xs truncate" style={{ color: 'var(--wfa-text-40)' }}>{userProfile.email}</div>
                )}
              </div>
              <Link
                href="/dashboard/settings"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--wfa-text-40)' }} />
              </Link>
            </div>
          </div>

          {/* Map preview — same LeafletMap as the Evacuation Map tab */}
          <div className="flex-1 relative overflow-hidden m-4 rounded-2xl" style={{ minHeight: 200 }}>
            <LeafletMap
              nifc={nifc}
              userLocation={userLocation}
              center={isCaregiverMode && personLocation ? personLocation : (userLocation ?? [37.5, -119.5])}
              shelters={[]}
              showShelters={false}
              watchedLocations={isCaregiverMode && personLocation && activePerson
                ? [{ label: activePerson.name, lat: personLocation[0], lng: personLocation[1] }]
                : []
              }
            />
            {/* "View Full Map" overlay button at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
              <Link
                href="/dashboard/caregiver/map"
                className="pointer-events-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--wfa-tooltip-bg)', backdropFilter: 'blur(8px)' }}
              >
                <MapPin className="w-3.5 h-3.5" />
                View Full Evacuation Map
              </Link>
            </div>
          </div>

          {/* Early Fire Alert button */}
          <div className="px-4 pb-4">
            <Link
              href="/dashboard/caregiver/alert"
              className="rounded-xl text-white flex items-center gap-3 px-4 py-3 w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #7a2e0e, #c86432)' }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white leading-tight">Early Fire Alert</div>
                <div className="text-white/50 text-[11px]">Monitor nearby fires</div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
