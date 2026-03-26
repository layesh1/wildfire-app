'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { loadPersons, savePersons, loadProfileCard } from '@/lib/user-data'
import {
  Users,
  Heart,
  MapPin,
  CheckCircle,
  X,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  AlertTriangle,
  Settings,
  Pencil,
  UserCircle,
  UserPlus,
} from 'lucide-react'

// ── Address autocomplete (Nominatim/OpenStreetMap, no API key) ─────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function AddressInput({
  value, onChange, placeholder, className = ''
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length < 4) { setSuggestions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&addressdetails=0&limit=5&countrycodes=us`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setShowDrop(data.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 400)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        placeholder={placeholder}
        className={className}
      />
      {showDrop && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-ash-800 border border-ash-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-ash-200 hover:bg-ash-700 hover:text-white transition-colors truncate"
                onMouseDown={() => { onChange(s.display_name); setSuggestions([]); setShowDrop(false) }}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Relationship = 'Family Member' | 'Client' | 'Neighbor' | 'Self' | 'Other'
type Mobility = 'Mobile Adult' | 'Elderly' | 'Disabled' | 'No Vehicle' | 'Medical Equipment' | 'Other'
type CheckinStatus = 'confirmed_safe' | 'waiting' | 'needs_help' | 'unknown'

interface Person {
  id: string
  name: string
  address: string
  relationship: Relationship
  mobility: Mobility
  phone: string
  languages: string[]
  notes: string
  status: CheckinStatus
  last_confirmed: string | null   // ISO string
  checkin_token: string | null
  ping_sent_at: string | null
  justConfirmed: boolean          // transient — triggers animation
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIPS: Relationship[] = ['Family Member', 'Client', 'Neighbor', 'Self', 'Other']
const FAMILY_RELATIONS = ['Parent', 'Child', 'Sibling', 'Spouse / Partner', 'Grandparent', 'Grandchild', 'Aunt / Uncle', 'Cousin', 'Other']
const MOBILITIES: Mobility[] = ['Mobile Adult', 'Elderly', 'Disabled', 'No Vehicle', 'Medical Equipment', 'Other']
const PERSON_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Spanish', flag: '🇲🇽' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'fa', label: 'Farsi', flag: '🇮🇷' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'other', label: 'Other', flag: '🌐' },
]
const LS_KEY = 'monitored_persons_v2'

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

// ── Background fire proximity check ──────────────────────────────────────────

async function getNearestFireKm(address: string): Promise<number | null> {
  try {
    const wRes = await fetch(`/api/weather?location=${encodeURIComponent(address)}`)
    if (!wRes.ok) return null
    const weather = await wRes.json()

    const fRes = await fetch('/api/fires/firms').catch(() => null)
    if (!fRes?.ok) return null
    const fJson = await fRes.json().catch(() => ({}))
    const points: { lat: number; lon: number }[] = Array.isArray(fJson?.data) ? fJson.data : []
    if (points.length === 0) return null

    let minKm = Infinity
    for (const p of points) {
      const km = haversineKm(weather.lat, weather.lon, p.lat, p.lon)
      if (km < minKm) minKm = km
    }
    return minKm <= 50 ? minKm : null
  } catch {
    return null
  }
}

// ── Relative time ──────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const d = Math.floor(hr / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

// ── Status display config ─────────────────────────────────────────────────────

function statusConfig(status: CheckinStatus): {
  label: string
  cardBorder: string
  badgeBg: string
  badgeText: string
  dotClass: string
} {
  switch (status) {
    case 'confirmed_safe':
      return {
        label: 'Confirmed safe',
        cardBorder: 'border-signal-safe/40',
        badgeBg: 'bg-signal-safe/15',
        badgeText: 'text-signal-safe',
        dotClass: 'bg-signal-safe',
      }
    case 'waiting':
      return {
        label: 'Waiting for response…',
        cardBorder: 'border-signal-warn/40',
        badgeBg: 'bg-signal-warn/10',
        badgeText: 'text-signal-warn',
        dotClass: 'bg-signal-warn animate-pulse',
      }
    case 'needs_help':
      return {
        label: 'Flagged needs help',
        cardBorder: 'border-signal-danger/50',
        badgeBg: 'bg-signal-danger/15',
        badgeText: 'text-signal-danger',
        dotClass: 'bg-signal-danger animate-pulse',
      }
    case 'unknown':
    default:
      return {
        label: 'Not yet checked in',
        cardBorder: 'border-ash-700',
        badgeBg: 'bg-ash-800',
        badgeText: 'text-ash-400',
        dotClass: 'bg-ash-600',
      }
  }
}

// ── Empty form ─────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: '',
    address: '',
    relationship: 'Family Member' as Relationship,
    familyRelation: '',
    mobility: 'Mobile Adult' as Mobility,
    mobilityOther: '',
    phone: '',
    languages: [] as string[],
    notes: '',
  }
}

// ── Ping popover ──────────────────────────────────────────────────────────────

function PingPopover({
  person,
  onClose,
}: {
  person: Person
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' && person.checkin_token
    ? `${window.location.origin}/checkin/${person.checkin_token}`
    : ''

  const shareText = `Can you let me know you're safe? Tap this link: ${url}`

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mt-3 p-4 rounded-xl bg-ash-800 border border-ash-700 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-ash-300 text-xs leading-relaxed">
          Share this link with <span className="text-white font-medium">{person.name}</span> to confirm they&rsquo;re safe:
        </p>
        <button
          onClick={onClose}
          className="p-1 text-ash-600 hover:text-ash-300 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Copyable URL */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="input text-xs py-2 text-ash-400 flex-1 min-w-0"
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={copyUrl}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-ash-600 text-ash-300 hover:text-white hover:border-ash-500 transition-colors shrink-0"
        >
          <Copy className="w-3 h-3" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`sms:?body=${encodeURIComponent(shareText)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-signal-safe/15 border border-signal-safe/30 text-signal-safe hover:bg-signal-safe/25 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Text / SMS
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=Quick safety check&body=${encodeURIComponent(`Please tap this link to let me know you're safe: ${url}`)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </a>
      </div>

      <p className="text-ash-600 text-xs">
        When they tap the link and confirm, you&rsquo;ll see them marked safe here.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [openPingId, setOpenPingId] = useState<string | null>(null)
  const [fireWarningNames, setFireWarningNames] = useState<string[]>([])
  const [myName, setMyName] = useState('')
  const [myAddress, setMyAddress] = useState('')
  const personsRef = useRef<Person[]>([])
  personsRef.current = persons

  // ── Load from Supabase (with localStorage fallback) on mount ─────────────

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const [persons, card] = await Promise.all([
            loadPersons(supabase, user.id),
            loadProfileCard(supabase, user.id),
          ])
          if (persons.length > 0) setPersons(persons)
          if (card?.full_name) setMyName(card.full_name)
          if (card?.address) setMyAddress(card.address)
          return
        }
      } catch {}
      // Fallback: localStorage only
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) setPersons(JSON.parse(raw))
      } catch {}
      try {
        const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
        if (card.full_name) setMyName(card.full_name)
        if (card.address) setMyAddress(card.address)
      } catch {}
    }
    load()
  }, [])

  // ── Persist to Supabase + localStorage ───────────────────────────────────

  const persist = useCallback((updated: Person[]) => {
    setPersons(updated)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) savePersons(supabase, data.user.id, updated)
      else {
        try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {}
      }
    }).catch(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {}
    })
  }, [])

  // ── Background fire check on mount ───────────────────────────────────────

  useEffect(() => {
    if (persons.length === 0) return
    const names: string[] = []
    Promise.allSettled(
      persons.map(p =>
        getNearestFireKm(p.address).then(km => {
          if (km !== null && km <= 25) names.push(p.name)
        })
      )
    ).then(() => setFireWarningNames(names))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  // ── BroadcastChannel listener for real-time checkin updates ─────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    const bc = new BroadcastChannel('checkin')
    bc.onmessage = (e: MessageEvent<{ token: string; status: CheckinStatus }>) => {
      const { token, status } = e.data
      const now = new Date().toISOString()
      const updated = personsRef.current.map(p =>
        p.checkin_token === token
          ? { ...p, status, last_confirmed: now, justConfirmed: status === 'confirmed_safe' }
          : p
      )
      persist(updated)
      // Clear justConfirmed flag after animation
      setTimeout(() => {
        persist(personsRef.current.map(p =>
          p.checkin_token === token ? { ...p, justConfirmed: false } : p
        ))
      }, 2500)
    }
    return () => bc.close()
  }, [persist])

  // ── Poll localStorage every 10s for status changes ────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return
        const stored: Person[] = JSON.parse(raw)
        // Merge external status changes (from checkin page in another tab)
        const current = personsRef.current
        const merged = current.map(p => {
          const stored_p = stored.find(s => s.id === p.id)
          if (!stored_p) return p
          if (stored_p.status !== p.status || stored_p.last_confirmed !== p.last_confirmed) {
            const justConfirmed = stored_p.status === 'confirmed_safe' && p.status !== 'confirmed_safe'
            return { ...stored_p, justConfirmed }
          }
          return p
        })
        setPersons(merged)
        if (merged.some(p => p.justConfirmed)) {
          setTimeout(() => {
            setPersons(prev => prev.map(p => ({ ...p, justConfirmed: false })))
          }, 2500)
        }
      } catch {
        // ignore
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // ── Add / Edit person ─────────────────────────────────────────────────────

  function startEdit(person: Person) {
    setEditingId(person.id)
    setForm({
      name: person.name,
      address: person.address,
      relationship: RELATIONSHIPS.includes(person.relationship as Relationship)
        ? person.relationship as Relationship
        : 'Other',
      familyRelation: '',
      mobility: MOBILITIES.includes(person.mobility as Mobility)
        ? person.mobility as Mobility
        : 'Other',
      mobilityOther: MOBILITIES.includes(person.mobility as Mobility) ? '' : person.mobility,
      phone: person.phone,
      languages: person.languages,
      notes: person.notes,
    })
    setShowForm(true)
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function savePerson() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.address.trim()) { setFormError('Address is required'); return }
    setFormError(null)

    const resolvedRelationship = form.relationship === 'Family Member' && form.familyRelation
      ? form.familyRelation as Relationship
      : form.relationship
    const resolvedMobility = form.mobility === 'Other' && form.mobilityOther.trim()
      ? form.mobilityOther.trim() as Mobility
      : form.mobility

    if (editingId) {
      persist(persons.map(p =>
        p.id === editingId
          ? { ...p, name: form.name.trim(), address: form.address.trim(), relationship: resolvedRelationship, mobility: resolvedMobility, phone: form.phone.trim(), languages: form.languages, notes: form.notes.trim() }
          : p
      ))
    } else {
      persist([{
        id: Date.now().toString(),
        name: form.name.trim(),
        address: form.address.trim(),
        relationship: resolvedRelationship,
        mobility: resolvedMobility,
        phone: form.phone.trim(),
        languages: form.languages,
        notes: form.notes.trim(),
        status: 'unknown',
        last_confirmed: null,
        checkin_token: null,
        ping_sent_at: null,
        justConfirmed: false,
      }, ...persons])
    }

    setForm(emptyForm())
    setShowForm(false)
    setEditingId(null)
  }

  // ── Remove person ────────────────────────────────────────────────────────

  function removePerson(id: string) {
    persist(persons.filter(p => p.id !== id))
  }

  // ── Mark individual safe ─────────────────────────────────────────────────

  function markSafe(id: string) {
    persist(persons.map(p =>
      p.id === id
        ? { ...p, status: 'confirmed_safe', last_confirmed: new Date().toISOString(), justConfirmed: true }
        : p
    ))
    setTimeout(() => {
      persist(personsRef.current.map(p => p.id === id ? { ...p, justConfirmed: false } : p))
    }, 2500)
  }

  // ── Mark all safe ────────────────────────────────────────────────────────

  function markAllSafe() {
    const now = new Date().toISOString()
    persist(persons.map(p => ({
      ...p,
      status: 'confirmed_safe' as CheckinStatus,
      last_confirmed: now,
      justConfirmed: true,
    })))
    setTimeout(() => {
      persist(personsRef.current.map(p => ({ ...p, justConfirmed: false })))
    }, 2500)
  }

  // ── Ping person ──────────────────────────────────────────────────────────

  function pingPerson(id: string) {
    if (openPingId === id) {
      setOpenPingId(null)
      return
    }
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const now = new Date().toISOString()
    persist(persons.map(p =>
      p.id === id
        ? { ...p, checkin_token: token, status: 'waiting', ping_sent_at: now }
        : p
    ))
    setOpenPingId(id)
  }

  // ── Add myself ───────────────────────────────────────────────────────────

  function addMyself() {
    const selfEntry: Person = {
      id: 'self_' + Date.now().toString(),
      name: myName || 'Me',
      address: myAddress || '',
      relationship: 'Self' as Relationship,
      mobility: 'Mobile Adult' as Mobility,
      phone: '',
      languages: [],
      notes: '',
      status: 'unknown',
      last_confirmed: null,
      checkin_token: null,
      ping_sent_at: null,
      justConfirmed: false,
    }
    persist([selfEntry, ...persons])
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const selfEntry = persons.find(p => p.relationship === 'Self')
  const others = persons.filter(p => p.relationship !== 'Self')
  const safeCount = persons.filter(p => p.status === 'confirmed_safe').length
  const total = persons.length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <Users className="w-4 h-4" />
          CAREGIVER &middot; MY PEOPLE
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">My People</h1>
        <p className="text-ash-400 text-sm">Track people in your care and confirm they're safe during a wildfire event</p>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-ash-800/60 border border-ash-700 mb-5 p-4">
        <div className="text-white text-xs font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-ember-400" />
          How My People works
        </div>
        <ul className="text-ash-400 text-xs space-y-1.5 list-none">
          <li>① <strong className="text-ash-300">Add a person</strong> — name, address, and mobility info for each person you care for</li>
          <li>② <strong className="text-ash-300">Ping them</strong> — tap "Ping" to generate a unique check-in link, then send it via text, WhatsApp, or email</li>
          <li>③ <strong className="text-ash-300">They tap the link</strong> — they confirm safe, need help, or are evacuating. You see their status update here instantly</li>
          <li>④ <strong className="text-ash-300">Mark Safe manually</strong> — if you've spoken to them directly, you can mark them safe yourself</li>
        </ul>
      </div>

      {/* Fire proximity warning */}
      {fireWarningNames.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-signal-warn/10 border border-signal-warn/30 mb-5">
          <AlertTriangle className="w-4 h-4 text-signal-warn shrink-0 mt-0.5" />
          <p className="text-signal-warn text-sm leading-relaxed">
            Heads up — there may be fire activity near{' '}
            <span className="font-semibold">
              {fireWarningNames.length === 1
                ? fireWarningNames[0]
                : fireWarningNames.slice(0, -1).join(', ') + ' and ' + fireWarningNames[fireWarningNames.length - 1]}
            </span>
            &rsquo;s area. Consider sending them a check-in.
          </p>
        </div>
      )}

      {/* ── Monitor Myself ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 text-ash-400 text-xs font-semibold uppercase tracking-widest mb-3">
          <UserCircle className="w-3.5 h-3.5" /> Me
        </div>
        {selfEntry ? (
          (() => {
            const sc = statusConfig(selfEntry.status)
            return (
              <div className={`card p-5 border-2 transition-all duration-500 ${selfEntry.justConfirmed ? 'border-signal-safe/60 shadow-lg shadow-signal-safe/10' : sc.cardBorder}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${sc.dotClass}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{selfEntry.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ash-800 text-ash-300 border border-ash-700">You</span>
                      </div>
                      {selfEntry.address && (
                        <div className="flex items-center gap-1.5 mt-1 text-ash-500 text-xs">
                          <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{selfEntry.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removePerson(selfEntry.id)} className="p-1.5 rounded-lg text-ash-600 hover:text-signal-danger hover:bg-signal-danger/10 transition-colors" aria-label="Remove myself">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 ${sc.badgeBg} ${sc.badgeText}`}>
                  {selfEntry.status === 'confirmed_safe' && <CheckCircle className="w-3.5 h-3.5" />}
                  {sc.label}
                </div>
                <div className="text-ash-500 text-xs mb-4">
                  {selfEntry.status === 'confirmed_safe' && selfEntry.last_confirmed && <span>Last confirmed: {relativeTime(selfEntry.last_confirmed)}</span>}
                  {selfEntry.status === 'unknown' && <span>Not yet confirmed</span>}
                </div>
                <button onClick={() => markSafe(selfEntry.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-signal-safe/30 text-signal-safe bg-signal-safe/10 hover:bg-signal-safe/20 transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Myself Safe
                </button>
              </div>
            )
          })()
        ) : (
          <div className="card p-5 border border-dashed border-ash-600 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-ash-800 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-ash-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium mb-0.5">Are you also monitoring yourself?</div>
              <div className="text-ash-400 text-xs">Add yourself so you can confirm your own safety during an event.</div>
            </div>
            <button
              onClick={addMyself}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-signal-safe/30 text-signal-safe bg-signal-safe/10 hover:bg-signal-safe/20 transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" /> Track Myself
            </button>
          </div>
        )}
      </div>

      {/* ── People I care for header ────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-ash-400 text-xs font-semibold uppercase tracking-widest mb-3">
        <Users className="w-3.5 h-3.5" /> People I Care For
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card p-4 mb-5">
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
          <span className="ml-auto text-ash-600 text-xs">
            {total} {total === 1 ? 'person' : 'people'} tracked
          </span>
        </div>
      )}

      {/* Add person button */}
      <button
        onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(emptyForm()); setFormError(null) }}
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

      {/* Add / Edit person form */}
      {showForm && (
        <div className="card p-5 mb-6 space-y-4 border-ember-500/20">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-ember-400" /> {editingId ? 'Edit Person' : 'New Person'}
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
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value as Relationship, familyRelation: '' }))}
                className="input appearance-none cursor-pointer"
              >
                {RELATIONSHIPS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {form.relationship === 'Family Member' && (
                <select
                  value={form.familyRelation}
                  onChange={e => setForm(f => ({ ...f, familyRelation: e.target.value }))}
                  className="input appearance-none cursor-pointer mt-2"
                >
                  <option value="">Select relation type...</option>
                  {FAMILY_RELATIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="label">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none z-10" />
                <AddressInput
                  value={form.address}
                  onChange={v => setForm(f => ({ ...f, address: v }))}
                  placeholder="123 Main St, Paradise, CA 95969"
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Mobility */}
            <div>
              <label className="label">Mobility level</label>
              <select
                value={form.mobility}
                onChange={e => setForm(f => ({ ...f, mobility: e.target.value as Mobility, mobilityOther: '' }))}
                className="input appearance-none cursor-pointer"
              >
                {MOBILITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {form.mobility === 'Other' && (
                <input
                  type="text"
                  value={form.mobilityOther}
                  onChange={e => setForm(f => ({ ...f, mobilityOther: e.target.value }))}
                  placeholder="Describe mobility needs..."
                  className="input mt-2"
                />
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="label">
                Phone <span className="text-ash-600 font-normal">(optional)</span>
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

            {/* Languages */}
            <div className="sm:col-span-2">
              <label className="label">Languages spoken <span className="text-ash-600 font-normal">(click to select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PERSON_LANGUAGES.map(l => {
                  const selected = form.languages.includes(l.code)
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        languages: selected
                          ? f.languages.filter(c => c !== l.code)
                          : [...f.languages, l.code]
                      }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-ember-500/20 border-ember-500/50 text-ember-300'
                          : 'bg-ash-800 border-ash-700 text-ash-400 hover:border-ash-600 hover:text-ash-300'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                      {selected && <span className="text-ember-400">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Personal Notes */}
            <div className="sm:col-span-2">
              <label className="label">Personal notes <span className="text-ash-600 font-normal">(medical needs, sensitivities, other info)</span></label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. needs nebulizer, nonverbal, has latex sensitivity, uses wheelchair, carries EpiPen..."
                rows={3}
                className="input resize-none font-normal"
              />
            </div>
          </div>

          {formError && (
            <p className="text-signal-danger text-xs">{formError}</p>
          )}

          <button
            onClick={savePerson}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {editingId ? 'Save Changes' : 'Add Person'}
          </button>
        </div>
      )}

      {/* Empty state for others */}
      {others.length === 0 && !showForm && (
        <div className="card p-10 text-center">
          <Users className="w-12 h-12 text-ash-700 mx-auto mb-3" />
          <div className="text-white font-semibold mb-2">No one added yet</div>
          <p className="text-ash-500 text-sm max-w-xs mx-auto">
            Add the people you care for to send them quick check-ins during a wildfire.
          </p>
        </div>
      )}

      {/* Person cards (others only — self is rendered above) */}
      <div className="space-y-4">
        {others.map(person => {
          const sc = statusConfig(person.status)
          const isWaiting = person.status === 'waiting'
          const pingSentMin = person.ping_sent_at
            ? Math.floor((Date.now() - new Date(person.ping_sent_at).getTime()) / 60000)
            : null

          return (
            <div
              key={person.id}
              className={`card p-5 border-2 transition-all duration-500 ${
                person.justConfirmed
                  ? 'border-signal-safe/60 shadow-lg shadow-signal-safe/10'
                  : sc.cardBorder
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${sc.dotClass}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{person.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ash-800 text-ash-300 border border-ash-700 shrink-0">
                        {person.relationship}
                      </span>
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
                    {person.languages && person.languages.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {person.languages.map(code => {
                          const lang = PERSON_LANGUAGES.find(l => l.code === code)
                          return lang ? (
                            <span key={code} className="text-xs px-1.5 py-0.5 rounded bg-ash-800 border border-ash-700 text-ash-400">
                              {lang.flag} {lang.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                    {person.notes && (
                      <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-signal-warn/5 border border-signal-warn/20 text-xs text-ash-300 leading-relaxed">
                        <span className="text-signal-warn font-medium">Note: </span>{person.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit + Remove buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(person)}
                    className="p-1.5 rounded-lg text-ash-600 hover:text-ember-400 hover:bg-ember-500/10 transition-colors"
                    aria-label={`Edit ${person.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removePerson(person.id)}
                    className="p-1.5 rounded-lg text-ash-600 hover:text-signal-danger hover:bg-signal-danger/10 transition-colors"
                    aria-label={`Remove ${person.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 ${sc.badgeBg} ${sc.badgeText}`}>
                {person.status === 'confirmed_safe' && <CheckCircle className="w-3.5 h-3.5" />}
                {sc.label}
              </div>

              {/* Last confirmed / waiting detail */}
              <div className="text-ash-500 text-xs mb-4">
                {person.status === 'confirmed_safe' && person.last_confirmed && (
                  <span>Last confirmed: {relativeTime(person.last_confirmed)}</span>
                )}
                {person.status === 'waiting' && pingSentMin !== null && (
                  <span className="text-signal-warn">Sent {pingSentMin === 0 ? 'just now' : `${pingSentMin} min ago`}</span>
                )}
                {person.status === 'unknown' && (
                  <span>Never checked in</span>
                )}
                {person.status === 'needs_help' && (
                  <span className="text-signal-danger font-medium">Help requested — follow up immediately</span>
                )}
              </div>

              {/* Just confirmed animation */}
              {person.justConfirmed && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-signal-safe/15 border border-signal-safe/30 mb-3 animate-pulse">
                  <CheckCircle className="w-4 h-4 text-signal-safe" />
                  <span className="text-signal-safe text-sm font-medium">{person.name} confirmed safe!</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => pingPerson(person.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isWaiting
                      ? 'border-signal-warn/40 text-signal-warn bg-signal-warn/10 hover:bg-signal-warn/20'
                      : 'border-ash-600 text-ash-300 bg-ash-800 hover:text-white hover:border-ash-500'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isWaiting ? 'Resend Ping' : `Ping ${person.name}`}
                </button>

                <button
                  onClick={() => markSafe(person.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-signal-safe/30 text-signal-safe bg-signal-safe/10 hover:bg-signal-safe/20 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Safe
                </button>
              </div>

              {/* Ping popover */}
              {openPingId === person.id && person.checkin_token && (
                <PingPopover
                  person={person}
                  onClose={() => setOpenPingId(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
