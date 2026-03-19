'use client'
import { useState } from 'react'
import {
  MapPin, Flame, Phone, AlertTriangle, Shield, CheckCircle,
  Bell, Map, Users, Settings, Activity, ChevronRight,
  Package, Clock, Thermometer, Wind, Navigation,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface WildfireTrackerProps {
  isDark: boolean
}

// ── Static demo data ──────────────────────────────────────────────────────────
const PERSONS = [
  {
    id: 1,
    name: 'Matthew Perry',
    relation: 'Father · 68 yrs',
    mobility: 'Requires Oxygen',
    status: 'danger' as const,
    phone: '(704) 555-0182',
    address: '1105 Cedar Park Dr',
    initials: 'MP',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    relation: 'Mother · 65 yrs',
    mobility: 'Walker-assisted',
    status: 'caution' as const,
    phone: '(704) 555-0147',
    address: '8820 Willow Creek Ln',
    initials: 'SJ',
  },
  {
    id: 3,
    name: 'Robert Chen',
    relation: 'Son · 12 yrs',
    mobility: 'Mobile',
    status: 'safe' as const,
    phone: null,
    address: '1105 Cedar Park Dr',
    initials: 'RC',
  },
]

const STATS = [
  { label: 'Distance',    value: '3.2 mi', sub: 'from location',  icon: Navigation },
  { label: 'Fire Size',   value: '12k ac', sub: 'and growing',    icon: Flame      },
  { label: 'Contained',   value: '15%',    sub: 'control lines',  icon: Shield     },
  { label: 'Est. Arrival',value: '45 min', sub: 'at current rate',icon: Clock      },
]

const NAV_ITEMS = [
  { icon: Bell,     label: 'Hub',      active: true  },
  { icon: Users,    label: 'Persons',  active: false },
  { icon: Map,      label: 'Map',      active: false },
  { icon: Settings, label: 'Settings', active: false },
]

const STATUS_META = {
  danger:  { dot: '#c86432', badge: 'rgba(200,100,50,0.18)', bdr: 'rgba(200,100,50,0.4)', label: 'HIGH RISK'  },
  caution: { dot: '#d4a574', badge: 'rgba(212,165,116,0.18)', bdr: 'rgba(212,165,116,0.4)', label: 'CAUTION'  },
  safe:    { dot: '#7cb342', badge: 'rgba(124,179,66,0.18)',  bdr: 'rgba(124,179,66,0.4)',  label: 'SAFE'      },
}

// ── Theme helper ───────────────────────────────────────────────────────────────
function theme(isDark: boolean) {
  return {
    outerBg:     isDark ? '#1a1a1a'  : '#f5f1e8',
    panelL:      isDark ? 'rgba(45,45,45,0.9)'  : 'rgba(255,255,255,0.85)',
    panelR:      isDark ? 'rgba(40,40,40,0.8)'  : 'rgba(255,255,255,0.7)',
    card:        isDark ? '#3a3a3a'  : '#ffffff',
    cardAlt:     isDark ? '#333333'  : '#faf8f5',
    border:      isDark ? '#4a4a4a'  : 'rgba(212,165,116,0.3)',
    borderLite:  isDark ? '#3d3d3d'  : 'rgba(212,165,116,0.18)',
    text:        isDark ? '#f5f1e8'  : '#3e2723',
    text60:      isDark ? 'rgba(245,241,232,0.6)' : 'rgba(62,39,35,0.6)',
    text40:      isDark ? 'rgba(245,241,232,0.4)' : 'rgba(62,39,35,0.4)',
    text25:      isDark ? 'rgba(245,241,232,0.25)': 'rgba(62,39,35,0.25)',
    accent:      isDark ? '#c86432'  : '#c86432', // same both modes
    accentLite:  isDark ? '#d4a574'  : '#d4a574',
    safe:        '#7cb342',
    sidebar:     '#3e2723',
    sidebarBorder: '#4a2e22',
    activeNav:   '#7cb342',
    heroGrad:    'linear-gradient(135deg, #3e2723 0%, #5d3a1a 55%, #c86432 100%)',
    statCard:    isDark ? '#2a2a2a'  : 'rgba(255,255,255,0.9)',
    profileGrad: 'linear-gradient(135deg, #4a6621, #7cb342)',
    mapBg:       isDark ? '#1e2a1e' : '#c8d8c0',
    locCard:     isDark ? '#242424' : '#3e2723',
  }
}

// ── Person card ────────────────────────────────────────────────────────────────
function PersonCard({ person, isDark }: { person: typeof PERSONS[0]; isDark: boolean }) {
  const t = theme(isDark)
  const m = STATUS_META[person.status]
  const isPrimary = person.id === 1

  return (
    <div
      className="rounded-2xl p-4 mb-3 shrink-0"
      style={{
        background: isPrimary
          ? 'linear-gradient(135deg, #c86432 0%, #8b3a1a 100%)'
          : t.card,
        border: isPrimary ? 'none' : `1.5px solid ${m.bdr}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{
              background: isPrimary
                ? 'rgba(255,255,255,0.25)'
                : `linear-gradient(135deg, ${m.dot}, ${m.dot}88)`,
            }}
          >
            {person.initials}
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold text-sm truncate"
              style={{ color: isPrimary ? '#fff' : t.text }}
            >
              {person.name}
            </div>
            <div
              className="text-[11px] truncate"
              style={{ color: isPrimary ? 'rgba(255,255,255,0.65)' : t.text60 }}
            >
              {person.relation}
            </div>
          </div>
        </div>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-1"
          style={{
            background: isPrimary ? 'rgba(255,255,255,0.2)' : m.badge,
            color: isPrimary ? '#fff' : m.dot,
            border: `1px solid ${isPrimary ? 'rgba(255,255,255,0.35)' : m.bdr}`,
          }}
        >
          {m.label}
        </span>
      </div>

      {/* Mobility */}
      <div
        className="inline-block text-[11px] px-2.5 py-0.5 rounded-full mb-2.5"
        style={{
          background: isPrimary ? 'rgba(255,255,255,0.15)' : m.badge,
          color: isPrimary ? 'rgba(255,255,255,0.85)' : t.text,
          border: `1px solid ${isPrimary ? 'rgba(255,255,255,0.25)' : m.bdr}`,
        }}
      >
        {person.mobility}
      </div>

      {/* Address */}
      <div
        className="flex items-center gap-1.5 text-[11px] mb-1.5"
        style={{ color: isPrimary ? 'rgba(255,255,255,0.6)' : t.text60 }}
      >
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
        <span className="truncate">{person.address}</span>
      </div>
      {person.phone && (
        <div
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: isPrimary ? 'rgba(255,255,255,0.6)' : t.text60 }}
        >
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
          <span>{person.phone}</span>
        </div>
      )}

      {/* Call button on primary card */}
      {isPrimary && person.phone && (
        <div
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.9)', color: '#c86432' }}
        >
          <Phone className="w-3 h-3" />
          Call {person.name.split(' ')[0]}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WildfireTracker({ isDark }: WildfireTrackerProps) {
  const t = theme(isDark)
  const [showPersonTooltip, setShowPersonTooltip] = useState(false)

  return (
    <div
      className="flex h-full w-full overflow-hidden relative"
      style={{ background: t.outerBg, fontFamily: "'Poppins', 'DM Sans', sans-serif" }}
    >

      {/* ── SIDEBAR (90px) ───────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center py-5 shrink-0 gap-1"
        style={{ width: 72, background: t.sidebar, borderRight: `1px solid ${t.sidebarBorder}` }}
      >
        {/* Logo mark */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <Flame className="w-5 h-5 text-orange-400" />
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 w-full px-2 py-2 rounded-xl cursor-pointer"
            style={{
              background: active ? 'rgba(124,179,66,0.18)' : 'transparent',
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: active ? t.activeNav : 'rgba(245,241,232,0.45)' }}
            />
            <span
              className="text-[8.5px] font-medium"
              style={{ color: active ? t.activeNav : 'rgba(245,241,232,0.45)' }}
            >
              {label}
            </span>
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #4a6621, #7cb342)' }}
        >
          NR
        </div>
      </div>

      {/* ── LEFT COLUMN — tracking cards (260px) ────────────────────────── */}
      <div
        className="flex flex-col shrink-0 overflow-hidden"
        style={{ width: 230, background: t.panelL, borderRight: `1px solid ${t.border}` }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 shrink-0" style={{ borderBottom: `1px solid ${t.borderLite}` }}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: t.accent }}>
            <Users className="w-3 h-3" />
            My Persons
          </div>
          <div className="font-bold text-sm" style={{ color: t.text }}>Tracking</div>
          <div className="text-[11px]" style={{ color: t.text40 }}>3 people monitored</div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {PERSONS.map(p => <PersonCard key={p.id} person={p} isDark={isDark} />)}

          {/* Go-bag */}
          <div className="rounded-2xl p-3 mb-3" style={{ background: t.card, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.text }}>
                <Package className="w-3.5 h-3.5" style={{ color: t.accent }} />
                Go-Bag Ready
              </div>
              <span className="text-xs font-bold" style={{ color: '#d4a574' }}>42%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.cardAlt }}>
              <div className="h-full rounded-full" style={{ width: '42%', background: '#d4a574' }} />
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: t.text40 }}>5 / 12 items packed</div>
          </div>

          {/* Add person CTA */}
          <div
            className="rounded-2xl py-2.5 text-center text-xs font-medium border border-dashed"
            style={{ borderColor: t.accentLite + '60', color: t.accent }}
          >
            + Add person
          </div>
        </div>
      </div>

      {/* ── CENTER COLUMN — fire alert ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.borderLite}` }}>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: t.accent }}>
              <Bell className="w-3 h-3" />
              Caregiver Hub
            </div>
            <div className="font-bold text-base" style={{ color: t.text }}>My Hub</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: t.accent }}>
              <MapPin className="w-3 h-3" />
              Evac Map
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: t.panelL, color: t.text, border: `1px solid ${t.border}` }}
            >
              <CheckCircle className="w-3 h-3" style={{ color: t.safe }} />
              Check In
            </div>
          </div>
        </div>

        {/* Fire alert hero */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div
            className="rounded-3xl p-6 relative overflow-hidden mb-4"
            style={{ background: t.heroGrad, minHeight: 210 }}
          >
            {/* Glow */}
            <div
              className="absolute top-4 right-6 w-28 h-28 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(200,100,50,0.4) 0%, transparent 70%)' }}
            />

            <div className="flex items-center gap-4 mb-5">
              {/* Flame circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(200,100,50,0.25)',
                  border: '2px solid rgba(200,100,50,0.5)',
                  boxShadow: '0 0 24px rgba(200,100,50,0.35)',
                }}
              >
                <Flame className="w-7 h-7 text-orange-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-lg text-white leading-tight">Caldor Fire Alert</h2>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: '#c86432', color: '#fff' }}
                  >
                    EXTREME
                  </span>
                </div>
                <p className="text-white/55 text-xs">El Dorado County, CA · Signal gap: 11.5h</p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2">
              {STATS.map(({ label, value, sub, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3 flex flex-col items-center text-center"
                  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Icon className="w-3.5 h-3.5 text-orange-300 mb-1.5" />
                  <div className="text-white font-bold text-sm leading-tight">{value}</div>
                  <div className="text-[9px] text-white/50 mt-0.5 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Status key ── */}
          <div
            className="rounded-2xl px-4 py-3 mb-4"
            style={{ background: t.card, border: `1px solid ${t.borderLite}` }}
          >
            <div className="text-[9px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: t.text40 }}>
              Alert Level Key
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { dot: '#7cb342',  label: 'Safe',     sub: 'All clear'    },
                { dot: '#d4a574',  label: 'Caution',  sub: 'Stay alert'   },
                { dot: '#c86432',  label: 'Warning',  sub: 'Prepare now'  },
                { dot: '#d32f2f',  label: 'Act Now',  sub: 'Evacuate!'    },
              ].map(({ dot, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: dot + '22', border: `2px solid ${dot}` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                  </div>
                  <div className="text-[9px] font-semibold leading-tight" style={{ color: t.text }}>{label}</div>
                  <div className="text-[8px] leading-tight" style={{ color: t.text40 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary fires */}
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: t.text }}>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: t.accent }} />
            Other Active Fires
          </div>
          {[
            { name: 'Dixie Fire', county: 'Plumas County', pct: 82 },
            { name: 'Monument Fire', county: 'Trinity County', pct: 31 },
          ].map(fire => (
            <div
              key={fire.name}
              className="rounded-2xl px-4 py-3 mb-2 flex items-center gap-3"
              style={{ background: t.card, border: `1px solid ${t.borderLite}` }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: fire.pct >= 75 ? t.safe : t.accent }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: t.text }}>{fire.name}</div>
                <div className="text-[10px]" style={{ color: t.text40 }}>{fire.county}</div>
              </div>
              <div className="text-xs font-semibold shrink-0" style={{ color: fire.pct >= 75 ? t.safe : t.accent }}>
                {fire.pct}% contained
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT COLUMN (260px) ─────────────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0 overflow-hidden"
        style={{ width: 230, background: t.panelR, borderLeft: `1px solid ${t.border}` }}
      >
        {/* Profile badge */}
        <div className="px-4 pt-5 pb-4 shrink-0" style={{ borderBottom: `1px solid ${t.borderLite}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
              style={{ background: t.profileGrad }}
            >
              NR
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: t.text }}>Nadia Narayanan</div>
              <div className="text-[11px] truncate" style={{ color: t.text40 }}>nadia@example.com</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: t.text40 }} />
          </div>
        </div>

        {/* Faux map preview */}
        <div className="flex-1 relative m-3 rounded-2xl overflow-hidden" style={{ minHeight: 140, maxHeight: 200 }}>
          {/* Map background — layered gradients to suggest terrain */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(160deg, #1e2a1e 0%, #263326 40%, #1a2820 100%)'
                : 'linear-gradient(160deg, #c8d8c0 0%, #b8c8a8 40%, #a8b898 100%)',
            }}
          />
          {/* Faux road lines */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute" style={{ top: '35%', left: 0, right: 0, height: 2, background: isDark ? '#4a5a4a' : '#a8b888' }} />
            <div className="absolute" style={{ top: 0, bottom: 0, left: '45%', width: 2, background: isDark ? '#4a5a4a' : '#a8b888' }} />
            <div className="absolute" style={{ top: '65%', left: 0, right: 0, height: 1.5, background: isDark ? '#3a4a3a' : '#98a878' }} />
          </div>
          {/* Contour lines effect */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${isDark ? '#5a6a5a' : '#788868'} 10px, ${isDark ? '#5a6a5a' : '#788868'} 11px)`
          }} />

          {/* Fire marker (top-right area) */}
          <div className="absolute" style={{ top: '22%', right: '28%' }}>
            <div className="relative flex items-center justify-center">
              <div
                className="absolute w-8 h-8 rounded-full animate-ping opacity-40"
                style={{ background: '#c86432' }}
              />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
                style={{ background: 'linear-gradient(135deg, #c86432, #e85320)', boxShadow: '0 2px 8px rgba(200,100,50,0.6)' }}
              >
                <Flame className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Person marker (bottom-left area) */}
          <div className="absolute" style={{ bottom: '28%', left: '25%' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#2563eb', boxShadow: '0 2px 6px rgba(37,99,235,0.5)', border: '2px solid #fff' }}
            >
              <MapPin className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* "View Full Map" overlay */}
          <div className="absolute inset-x-0 bottom-0 p-2 pointer-events-none">
            <div
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold text-white"
              style={{ background: 'rgba(62,39,35,0.82)', backdropFilter: 'blur(6px)' }}
            >
              <MapPin className="w-3 h-3" />
              View Full Evacuation Map
            </div>
          </div>
        </div>

        {/* Bottom 2 info cards */}
        <div className="px-3 pb-4 grid grid-cols-2 gap-2.5 shrink-0">
          {/* First person card */}
          <div
            className="rounded-2xl p-3 text-white relative"
            style={{ background: 'linear-gradient(135deg, #4a6621, #7cb342)' }}
            onMouseEnter={() => setShowPersonTooltip(true)}
            onMouseLeave={() => setShowPersonTooltip(false)}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-white/60 text-[9px] uppercase tracking-widest mb-0.5">First Person</div>
            <div className="text-xs font-semibold text-white truncate">—</div>
            <div className="text-white/50 text-[9px] mb-2">Not set up</div>
            <div
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}
            >
              Set up
            </div>

            {/* Hover tooltip */}
            {showPersonTooltip && (
              <div
                className="absolute bottom-full left-0 mb-2 w-48 rounded-xl p-3 shadow-xl z-30 pointer-events-none"
                style={{ background: isDark ? '#1a1a1a' : '#3e2723' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3 h-3 text-[#d4a574] shrink-0" />
                  <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Location</span>
                </div>
                <div className="text-xs font-semibold text-white leading-snug mb-1.5">
                  No address on file
                </div>
                <div className="text-[9px] text-white/40 uppercase tracking-widest">Last Update: —</div>
                {/* Arrow */}
                <div
                  className="absolute top-full left-5"
                  style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${isDark ? '#1a1a1a' : '#3e2723'}` }}
                />
              </div>
            )}
          </div>

          {/* Location card */}
          <div
            className="rounded-2xl p-3 group relative overflow-hidden"
            style={{ background: t.locCard }}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: '#d4a574' }} />
            </div>
            <div className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">Location</div>
            <div className="text-xs font-semibold text-white/90 leading-snug">Cedar Park Dr</div>
            <div className="text-white/25 text-[9px] uppercase tracking-widest mt-2">Last Update: Now</div>
          </div>
        </div>
      </div>

      {/* ── FLAMEO mascot — bottom-right corner ──────────────────────────── */}
      <div
        className="absolute bottom-4 right-4 w-10 h-10 cursor-pointer hover:scale-110 transition-transform"
        style={{ zIndex: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flameo1.png"
          alt="Flameo"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>

    </div>
  )
}
