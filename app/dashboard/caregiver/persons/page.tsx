'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Heart,
  MapPin,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  RefreshCw,
  Wind,
  Phone,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Relationship = 'Parent' | 'Client' | 'Neighbor' | 'Self' | 'Other'
type Mobility = 'Mobile Adult' | 'Elderly' | 'Disabled' | 'No Vehicle' | 'Medical Equipment'
type EvacStatus = 'Not Evacuated' | 'Preparing' | 'Evacuated' | 'Safe at Shelter'
type AlertLang = 'English' | 'Spanish'

interface Person {
  id: string
  name: string
  address: string
  relationship: Relationship
  mobility: Mobility
  phone: string
  alertLang: AlertLang
  status: EvacStatus
  nearestFireKm: number | null   // null = unchecked, -1 = clear
  checkingFire: boolean
  lastChecked: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIPS: Relationship[] = ['Parent', 'Client', 'Neighbor', 'Self', 'Other']
const MOBILITIES: Mobility[] = ['Mobile Adult', 'Elderly', 'Disabled', 'No Vehicle', 'Medical Equipment']
const EVAC_STATUSES: EvacStatus[] = ['Not Evacuated', 'Preparing', 'Evacuated', 'Safe at Shelter']
const ALERT_LANGS: AlertLang[] = ['English', 'Spanish']
const LS_KEY = 'monitored_persons'

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Fire check for a single address ──────────────────────────────────────────

async function checkFiresForAddress(address: string): Promise<number> {
  // Get coordinates via weather API
  const wRes = await fetch(`/api/weather?location=${encodeURIComponent(address)}`)
  if (!wRes.ok) throw new Error('Location not found')
  const weather = await wRes.json()

  // Get FIRMS
  const fRes = await fetch('/api/fires/firms').catch(() => null)
  if (!fRes?.ok) {
    // Demo: mock fire 30 km away
    return 30
  }
  const fJson = await fRes.json().catch(() => ({}))
  const points: { lat: number; lon: number }[] = Array.isArray(fJson?.data) ? fJson.data : []

  if (points.length === 0) return -1 // clear

  let minKm = Infinity
  for (const p of points) {
    const km = haversineKm(weather.lat, weather.lon, p.lat, p.lon)
    if (km < minKm) minKm = km
  }

  // Return -1 if nearest is > 50 km (effectively clear)
  return minKm <= 50 ? minKm : -1
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function statusStyle(status: EvacStatus): { badge: string; dot: string } {
  switch (status) {
    case 'Not Evacuated':
      return { badge: 'badge-danger', dot: 'bg-signal-danger animate-pulse' }
    case 'Preparing':
      return { badge: 'badge-warn', dot: 'bg-signal-warn animate-pulse' }
    case 'Evacuated':
      return { badge: 'badge-safe', dot: 'bg-signal-safe' }
    case 'Safe at Shelter':
      return { badge: 'badge-safe', dot: 'bg-signal-safe' }
  }
}

function mobilityBadgeColor(mobility: Mobility): string {
  switch (mobility) {
    case 'Mobile Adult':   return 'bg-ash-700 text-ash-300 border-ash-600'
    case 'Elderly':        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'Disabled':       return 'bg-signal-warn/20 text-signal-warn border-signal-warn/30'
    case 'No Vehicle':     return 'bg-signal-warn/20 text-signal-warn border-signal-warn/30'
    case 'Medical Equipment': return 'bg-signal-danger/20 text-signal-danger border-signal-danger/30'
  }
}

function fireDistanceDisplay(km: number | null): { label: string; color: string } {
  if (km === null) return { label: 'Not checked', color: 'text-ash-500' }
  if (km === -1)   return { label: 'Clear', color: 'text-signal-safe' }
  if (km < 10)     return { label: `${km.toFixed(1)} km away`, color: 'text-signal-danger' }
  if (km < 25)     return { label: `${km.toFixed(1)} km away`, color: 'text-signal-warn' }
  return { label: `${km.toFixed(1)} km away`, color: 'text-amber-400' }
}

// ── Empty form ────────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: '',
    address: '',
    relationship: 'Parent' as Relationship,
    mobility: 'Mobile Adult' as Mobility,
    phone: '',
    alertLang: 'English' as AlertLang,
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [checkingAll, setCheckingAll] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setPersons(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
  }, [])

  // Persist to localStorage on every change
  const persist = useCallback((updated: Person[]) => {
    setPersons(updated)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(updated))
    } catch {
      // storage full or unavailable
    }
  }, [])

  // ── Form submit ────────────────────────────────────────────────────────────

  function addPerson() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.address.trim()) { setFormError('Address is required'); return }
    setFormError(null)

    const newPerson: Person = {
      id: Date.now().toString(),
      name: form.name.trim(),
      address: form.address.trim(),
      relationship: form.relationship,
      mobility: form.mobility,
      phone: form.phone.trim(),
      alertLang: form.alertLang,
      status: 'Not Evacuated',
      nearestFireKm: null,
      checkingFire: false,
      lastChecked: null,
    }

    persist([newPerson, ...persons])
    setForm(emptyForm())
    setShowForm(false)
  }

  // ── Remove person ──────────────────────────────────────────────────────────

  function removePerson(id: string) {
    persist(persons.filter(p => p.id !== id))
  }

  // ── Update status ──────────────────────────────────────────────────────────

  function updateStatus(id: string, status: EvacStatus) {
    persist(persons.map(p => p.id === id ? { ...p, status } : p))
  }

  // ── Check fires for one person ─────────────────────────────────────────────

  async function checkOnePerson(id: string) {
    persist(persons.map(p => p.id === id ? { ...p, checkingFire: true } : p))
    const person = persons.find(p => p.id === id)
    if (!person) return
    try {
      const km = await checkFiresForAddress(person.address)
      persist(
        persons.map(p =>
          p.id === id
            ? { ...p, nearestFireKm: km, checkingFire: false, lastChecked: new Date().toISOString() }
            : p
        )
      )
    } catch {
      persist(persons.map(p => p.id === id ? { ...p, checkingFire: false } : p))
    }
  }

  // ── Check all fires ────────────────────────────────────────────────────────

  async function checkAllFires() {
    if (persons.length === 0) return
    setCheckingAll(true)
    // Mark all as checking
    persist(persons.map(p => ({ ...p, checkingFire: true })))

    const results = await Promise.allSettled(
      persons.map(p => checkFiresForAddress(p.address))
    )

    const now = new Date().toISOString()
    const updated = persons.map((p, i) => ({
      ...p,
      checkingFire: false,
      nearestFireKm: results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<number>).value : p.nearestFireKm,
      lastChecked: results[i].status === 'fulfilled' ? now : p.lastChecked,
    }))
    persist(updated)
    setCheckingAll(false)
  }

  // ── Mark all safe ──────────────────────────────────────────────────────────

  function markAllSafe() {
    persist(persons.map(p => ({ ...p, status: 'Safe at Shelter' as EvacStatus })))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const safeCount = persons.filter(
    p => p.status === 'Evacuated' || p.status === 'Safe at Shelter'
  ).length
  const total = persons.length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <Users className="w-4 h-4" />
          CAREGIVER · MONITORED PERSONS
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">My Monitored Persons</h1>
        <p className="text-ash-400 text-sm">Track people in your care during wildfires</p>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-signal-safe" />
              <span className="text-white text-sm font-medium">
                {safeCount} of {total} confirmed safe
              </span>
            </div>
            <span className="text-ash-500 text-xs">
              {total - safeCount} still need check-in
            </span>
          </div>
          <div className="h-2 bg-ash-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-signal-safe rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${(safeCount / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Batch action bar */}
      {total > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={markAllSafe}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-signal-safe/15 border border-signal-safe/30 text-signal-safe hover:bg-signal-safe/25 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark All Safe
          </button>
          <button
            onClick={checkAllFires}
            disabled={checkingAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ember-500/15 border border-ember-500/30 text-ember-400 hover:bg-ember-500/25 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingAll ? 'animate-spin' : ''}`} />
            {checkingAll ? 'Checking…' : 'Check All Fires'}
          </button>
          <span className="ml-auto text-ash-600 text-xs">
            {total} {total === 1 ? 'person' : 'people'} tracked
          </span>
        </div>
      )}

      {/* Add person button */}
      <button
        onClick={() => { setShowForm(v => !v); setFormError(null) }}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all mb-5 ${
          showForm
            ? 'border-ash-700 text-ash-400 bg-ash-800/50 hover:bg-ash-800'
            : 'border-dashed border-ash-600 text-ash-400 hover:border-ember-500/50 hover:text-ember-400 hover:bg-ember-500/5'
        }`}
      >
        {showForm ? (
          <><X className="w-4 h-4" /> Cancel</>
        ) : (
          <><Plus className="w-4 h-4" /> Add Person</>
        )}
      </button>

      {/* Add person form */}
      {showForm && (
        <div className="card p-5 mb-6 space-y-4 border-ember-500/20">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-ember-400" /> New Monitored Person
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="label">Full name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Maria Garcia"
                className="input"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="label">Relationship *</label>
              <select
                value={form.relationship}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value as Relationship }))}
                className="input appearance-none cursor-pointer"
              >
                {RELATIONSHIPS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="label">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, Paradise, CA 95969"
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Mobility */}
            <div>
              <label className="label">Mobility level *</label>
              <select
                value={form.mobility}
                onChange={e => setForm(f => ({ ...f, mobility: e.target.value as Mobility }))}
                className="input appearance-none cursor-pointer"
              >
                {MOBILITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Alert language */}
            <div>
              <label className="label">Alert language</label>
              <select
                value={form.alertLang}
                onChange={e => setForm(f => ({ ...f, alertLang: e.target.value as AlertLang }))}
                className="input appearance-none cursor-pointer"
              >
                {ALERT_LANGS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="sm:col-span-2">
              <label className="label">
                Phone number <span className="text-ash-600 font-normal">(optional — for SMS alerts)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (530) 555-0100"
                  className="input pl-9"
                />
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-signal-danger text-xs">{formError}</p>
          )}

          <button
            onClick={addPerson}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Person
          </button>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !showForm && (
        <div className="card p-10 text-center">
          <Users className="w-12 h-12 text-ash-700 mx-auto mb-3" />
          <div className="text-white font-semibold mb-2">No one added yet</div>
          <p className="text-ash-500 text-sm max-w-xs mx-auto">
            Add people you care for to track their evacuation status and check nearby fire activity.
          </p>
        </div>
      )}

      {/* Person cards */}
      <div className="space-y-4">
        {persons.map(person => {
          const ss = statusStyle(person.status)
          const fd = fireDistanceDisplay(person.nearestFireKm)
          const mobilityBadge = mobilityBadgeColor(person.mobility)

          return (
            <div
              key={person.id}
              className="card p-5"
            >
              {/* Card header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${ss.dot}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold truncate">{person.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ash-800 text-ash-300 border border-ash-700 shrink-0">
                        {person.relationship}
                      </span>
                      {person.alertLang === 'Spanish' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                          ES
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-ash-500 text-xs">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{person.address}</span>
                    </div>
                    {person.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-ash-600 text-xs">
                        <Phone className="w-3 h-3 shrink-0" />
                        {person.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removePerson(person.id)}
                  className="p-1.5 rounded-lg text-ash-600 hover:text-signal-danger hover:bg-signal-danger/10 transition-colors shrink-0"
                  aria-label={`Remove ${person.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobility badge */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${mobilityBadge}`}>
                  {person.mobility}
                </span>
              </div>

              {/* Status + fire check row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Status selector */}
                <div className="flex-1 min-w-[160px]">
                  <label className="text-ash-600 text-xs mb-1 block">Evacuation Status</label>
                  <select
                    value={person.status}
                    onChange={e => updateStatus(person.id, e.target.value as EvacStatus)}
                    className={`w-full text-sm rounded-lg px-3 py-2 border bg-ash-800 focus:outline-none transition-colors appearance-none cursor-pointer ${
                      person.status === 'Not Evacuated'
                        ? 'border-signal-danger/40 text-signal-danger'
                        : person.status === 'Preparing'
                        ? 'border-signal-warn/40 text-signal-warn'
                        : 'border-signal-safe/40 text-signal-safe'
                    }`}
                  >
                    {EVAC_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Fire distance */}
                <div className="shrink-0 text-right">
                  <div className="text-ash-600 text-xs mb-1">Nearest fire</div>
                  {person.checkingFire ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-3 h-3 border-2 border-ash-600 border-t-ember-500 rounded-full animate-spin" />
                      <span className="text-ash-500 text-xs">Checking…</span>
                    </div>
                  ) : (
                    <div className={`text-sm font-semibold ${fd.color}`}>{fd.label}</div>
                  )}
                  {person.lastChecked && !person.checkingFire && (
                    <div className="text-ash-700 text-xs mt-0.5">
                      {new Date(person.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Check fires button */}
              <div className="mt-3 pt-3 border-t border-ash-800">
                <button
                  onClick={() => checkOnePerson(person.id)}
                  disabled={person.checkingFire || checkingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ash-700 text-ash-400 hover:text-ember-400 hover:border-ember-500/40 transition-colors disabled:opacity-40"
                >
                  {person.checkingFire ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> Checking…</>
                  ) : (
                    <><Wind className="w-3 h-3" /> Check Fires</>
                  )}
                </button>
              </div>

              {/* Inline fire alert — only for close fires */}
              {person.nearestFireKm !== null && person.nearestFireKm !== -1 && person.nearestFireKm < 25 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-signal-danger/10 border border-signal-danger/30 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 text-signal-danger shrink-0" />
                  <span className="text-signal-danger text-xs font-medium">
                    Active fire {person.nearestFireKm.toFixed(1)} km away — review evacuation status
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Research note at bottom */}
      {total > 0 && (
        <div className="card p-4 mt-6 border-l-4 border-amber-500/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-white font-semibold text-sm mb-1">Evacuation lead time matters</div>
              <p className="text-ash-400 text-xs leading-relaxed">
                People with limited mobility need 1.5–4× more time to evacuate safely.
                Official orders arrive a median of{' '}
                <span className="text-white">3.5 hours</span> after first fire signals — and up to{' '}
                <span className="text-white">100 hours</span> at the 90th percentile.
                Pre-position transport and supplies before orders are issued.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
