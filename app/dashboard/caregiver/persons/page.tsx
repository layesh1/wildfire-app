'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  loadMonitoredPersonsForHub,
  savePersons,
  loadProfileCard,
  linkedMonitoredPersonPlaceholder,
} from '@/lib/user-data'
import {
  Users,
  Heart,
  MapPin,
  CheckCircle,
  X,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  AlertTriangle,
  Settings,
  UserPlus,
} from 'lucide-react'

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
  const [userId, setUserId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteOk, setInviteOk] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false)
  const [confirmInviteEmail, setConfirmInviteEmail] = useState<string | null>(null)
  const [pendingInvites, setPendingInvites] = useState<
    Array<{ id: string; email: string; createdAt: string }>
  >([])
  const [pendingActionEmail, setPendingActionEmail] = useState<string | null>(null)
  const [openPingId, setOpenPingId] = useState<string | null>(null)
  const [fireWarningNames, setFireWarningNames] = useState<string[]>([])
  const [myName, setMyName] = useState('')
  const [myAddress, setMyAddress] = useState('')
  // Manual add (no email) — lets caregivers track people without an invite
  const [manualOpen, setManualOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualRelationship, setManualRelationship] = useState<Relationship>('Family Member')
  const [manualMobility, setManualMobility] = useState<Mobility>('Mobile Adult')
  const [manualNotes, setManualNotes] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const personsRef = useRef<Person[]>([])
  personsRef.current = persons

  // ── Load from Supabase (with localStorage fallback) on mount ─────────────

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const [persons, card] = await Promise.all([
            loadMonitoredPersonsForHub(supabase, user.id),
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

  const loadPendingInvites = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('family_invites')
      .select('id, invitee_email, created_at, status')
      .eq('inviter_user_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    const normalized = (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      email: String(row.invitee_email ?? ''),
      createdAt: String(row.created_at ?? ''),
    }))
    setPendingInvites(normalized.filter(x => x.id && x.email))
  }, [])

  useEffect(() => {
    if (!userId) return
    loadPendingInvites(userId).catch(() => {})
    const supabase = createClient()
    const channel = supabase
      .channel(`pending-family-invites-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_invites',
          filter: `inviter_user_id=eq.${userId}`,
        },
        () => {
          loadPendingInvites(userId).catch(() => {})
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadPendingInvites, userId])

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

  // ── Re-read persons from DB (call after server-side add / link) ──────────

  const refreshPersons = useCallback(
    async (uid: string | null, ensureLinked?: { linkedUserId: string; name: string; email: string }) => {
      if (!uid) return
      let list: Person[] = []
      try {
        const supabase = createClient()
        const fresh = await loadMonitoredPersonsForHub(supabase, uid)
        if (Array.isArray(fresh)) list = fresh as Person[]
      } catch (e) {
        console.warn('[refreshPersons] Supabase load failed; using local cache if any', e)
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (raw) list = JSON.parse(raw) as Person[]
        } catch {
          list = []
        }
      }
      if (ensureLinked && !list.some(p => p.id === ensureLinked.linkedUserId)) {
        const base = linkedMonitoredPersonPlaceholder({
          linkedUserId: ensureLinked.linkedUserId,
          displayName: ensureLinked.name,
          email: ensureLinked.email,
        }) as Record<string, unknown>
        const row: Person = {
          id: String(base.id),
          name: String(base.name),
          address: String(base.address ?? ''),
          relationship: (base.relationship as Person['relationship']) || 'Family Member',
          mobility: (base.mobility as Person['mobility']) || 'Mobile Adult',
          phone: String(base.phone ?? ''),
          languages: [],
          notes: String(base.notes ?? ''),
          status: 'unknown',
          last_confirmed: null,
          checkin_token: null,
          ping_sent_at: null,
          justConfirmed: false,
        }
        list = [...list, row]
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(list))
        } catch {
          /* ignore */
        }
      }
      setPersons(list)
    },
    []
  )

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

  const sendInviteToEmail = useCallback(
    async (email: string) => {
      setInviteLoading(true)
      setInviteError(null)
      setInviteOk(null)
      try {
        const res = await fetch('/api/family/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const serverMsg = typeof data?.error === 'string' ? data.error : ''
          const details =
            typeof data?.details === 'string' && data.details.trim()
              ? ` (${data.details.trim()})`
              : typeof data?.hint === 'string' && data.hint.trim()
                ? ` (${data.hint.trim()})`
                : ''
          const code =
            typeof data?.code === 'string' && data.code.trim() ? ` [${data.code.trim()}]` : ''
          const msg = serverMsg.toLowerCase()
          if (msg.includes('already') && msg.includes('my people')) {
            setInviteError('This person is already in your My People list')
          } else if (msg.includes('valid email')) {
            setInviteError('Please enter a valid email address')
          } else if (serverMsg) {
            setInviteError(`${serverMsg}${details}${code}`)
          } else {
            setInviteError(`Request failed (${res.status}). Try again.`)
          }
          return
        }
        const mode = typeof data?.mode === 'string' ? data.mode : ''
        const emailSent = data?.emailSent === true
        const devLink = typeof data?.devLink === 'string' ? data.devLink : ''
        const serverMsg = typeof data?.message === 'string' ? data.message : ''
        let okText: string
        if (mode === 'linked') {
          // Existing account was linked — they will appear in the list immediately after refresh.
          okText = serverMsg || `${email} is now in your My People`
        } else if (mode === 'pending_signup') {
          okText = serverMsg || `Added ${email}. They will join My People when they sign up with that address.`
        } else {
          okText = serverMsg || (emailSent
            ? `Invitation email sent to ${email}`
            : `Invitation created for ${email}`)
          if (!emailSent && devLink) {
            okText += `\n\nThe invite email couldn't be delivered from this server. Copy the link below and share it yourself (text, WhatsApp, or email):\n${devLink}`
          }
          const pm = typeof data?.emailProviderMessage === 'string' ? data.emailProviderMessage.trim() : ''
          if (pm) {
            okText += `\n\nResend details: ${pm}`
          }
        }
        setInviteOk(okText)
        setInviteEmail('')
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error: consentErr } = await supabase
              .from('profiles')
              .update({ my_people_consent_shown: true })
              .eq('id', user.id)
            if (consentErr) {
              console.warn('[sendInviteToEmail] my_people_consent_shown update:', consentErr.message)
            }
            const linkedId = typeof data?.linkedUserId === 'string' ? data.linkedUserId : ''
            const ensure =
              mode === 'linked' && linkedId
                ? {
                    linkedUserId: linkedId,
                    name: typeof data?.name === 'string' ? data.name : '',
                    email: email.toLowerCase(),
                  }
                : undefined
            await Promise.all([
              loadPendingInvites(user.id),
              refreshPersons(user.id, ensure),
            ])
          }
        } catch {
          /* non-fatal */
        }
      } catch (e) {
        console.error('[sendInviteToEmail]', e)
        setInviteError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      } finally {
        setInviteLoading(false)
      }
    },
    [loadPendingInvites, refreshPersons]
  )

  const openInviteConfirm = useCallback(() => {
    const email = inviteEmail.trim().toLowerCase()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)
    if (!validEmail) {
      setInviteError('Please enter a valid email address')
      setInviteOk(null)
      return
    }
    if (persons.some(p => (p as { email?: string }).email?.toLowerCase() === email)) {
      setInviteError('This person is already in your My People list')
      setInviteOk(null)
      return
    }
    setInviteError(null)
    setConfirmInviteEmail(email)
    setInviteConfirmOpen(true)
  }, [inviteEmail, persons])

  const sendInvite = useCallback(() => {
    openInviteConfirm()
  }, [openInviteConfirm])

  const resendInvite = useCallback((email: string) => {
    setConfirmInviteEmail(email)
    setInviteConfirmOpen(true)
  }, [])

  const confirmInviteSend = useCallback(async () => {
    const email = confirmInviteEmail
    if (!email) return
    setInviteConfirmOpen(false)
    setPendingActionEmail(email)
    try {
      await sendInviteToEmail(email)
    } finally {
      setPendingActionEmail(null)
      setConfirmInviteEmail(null)
    }
  }, [confirmInviteEmail, sendInviteToEmail])

  // ── Manual add (no email) ────────────────────────────────────────────────

  const resetManualForm = useCallback(() => {
    setManualName('')
    setManualPhone('')
    setManualAddress('')
    setManualRelationship('Family Member')
    setManualMobility('Mobile Adult')
    setManualNotes('')
    setManualError(null)
  }, [])

  const addManualPerson = useCallback(() => {
    const name = manualName.trim()
    if (!name) {
      setManualError('Enter a name.')
      return
    }
    setManualError(null)
    const newPerson: Person = {
      id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      address: manualAddress.trim(),
      relationship: manualRelationship,
      mobility: manualMobility,
      phone: manualPhone.trim(),
      languages: [],
      notes: manualNotes.trim(),
      status: 'unknown',
      last_confirmed: null,
      checkin_token: null,
      ping_sent_at: null,
      justConfirmed: false,
    }
    persist([newPerson, ...persons])
    resetManualForm()
    setManualOpen(false)
  }, [
    manualName, manualPhone, manualAddress, manualRelationship, manualMobility, manualNotes,
    persons, persist, resetManualForm,
  ])

  const cancelInvite = useCallback(async (id: string) => {
    setPendingActionEmail(id)
    setInviteError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('family_invites').delete().eq('id', id)
      if (error) {
        console.error('[cancelInvite]', error)
        setInviteError(error.message || 'Something went wrong. Try again.')
        return
      }
      setPendingInvites(prev => prev.filter(inv => inv.id !== id))
    } finally {
      setPendingActionEmail(null)
    }
  }, [])

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

  // ── Stats ─────────────────────────────────────────────────────────────────

  const others = persons.filter(p => p.relationship !== 'Self')
  const safeCount = persons.filter(p => p.status === 'confirmed_safe').length
  const total = persons.length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <Users className="w-4 h-4" />
          CAREGIVER &middot; MY FAMILY
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
          <li>① <strong className="text-ash-300">Invite by email</strong> — send a WildfireAlert invite to someone you care for</li>
          <li>② <strong className="text-ash-300">They accept</strong> — once they join, they appear in your My People list automatically</li>
          <li>③ <strong className="text-ash-300">Monitor status</strong> — view their latest safety status and alert context in one place</li>
          <li>④ <strong className="text-ash-300">Ping if needed</strong> — send a direct check-in link during an active event</li>
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

      {inviteConfirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-confirm-title"
        >
          <div className="max-w-md rounded-xl border border-ash-700 bg-ash-950 p-6 shadow-xl">
            <h2 id="invite-confirm-title" className="font-display text-lg font-bold text-white">
              Heads up before you invite
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ash-300">
              When{' '}
              <span className="font-medium text-ash-100">
                {confirmInviteEmail || 'this person'}
              </span>{' '}
              joins your My People, they will be able to see:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ash-400">
              <li>Your safety status and evacuation updates</li>
              <li>Your general location during an active incident</li>
            </ul>
            <p className="mt-3 text-sm text-ash-400">
              You will be able to see the same about them. Emergency responders can see location and evacuation status of all connected users.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setInviteConfirmOpen(false)
                  setConfirmInviteEmail(null)
                }}
                className="rounded-lg border border-ash-600 px-4 py-2 text-sm text-ash-300 hover:bg-ash-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmInviteSend()}
                disabled={inviteLoading}
                className="rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-500 disabled:opacity-50"
              >
                {inviteLoading ? 'Sending…' : 'Send Invite — I understand'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5 mb-4 space-y-3 border-ember-500/20">
        <h2 className="text-white font-semibold text-sm">INVITE BY EMAIL (OPTIONAL)</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => {
              setInviteEmail(e.target.value)
              if (inviteOk) setInviteOk(null)
              if (inviteError) setInviteError(null)
            }}
            placeholder="Enter their email address"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={sendInvite}
            disabled={inviteLoading}
            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
        <p className="text-ash-400 text-xs">
          If they already have a Minutes Matter account, they&apos;re added to your list immediately.
          Otherwise we try to email them an invite — if the email can&apos;t be delivered, you&apos;ll get a
          link to copy and share yourself.
        </p>
        {inviteOk && (
          <p className="whitespace-pre-wrap break-all text-signal-safe text-xs">✅ {inviteOk}</p>
        )}
        {inviteError && <p className="text-signal-danger text-xs">{inviteError}</p>}
      </div>

      {/* Manual add — never depends on email delivery */}
      <div className="card p-5 mb-6 space-y-3 border-ash-700">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">ADD SOMEONE MANUALLY</h2>
          <button
            type="button"
            onClick={() => {
              if (manualOpen) resetManualForm()
              setManualOpen(v => !v)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-ash-600 text-ash-300 hover:text-white hover:border-ash-500 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {manualOpen ? 'Close' : 'Add person'}
          </button>
        </div>
        {!manualOpen && (
          <p className="text-ash-400 text-xs">
            No email needed. Track anyone you care for — you can ping them via text, WhatsApp or email later.
          </p>
        )}
        {manualOpen && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Full name (required)"
                className="input flex-1"
              />
              <input
                type="tel"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="input flex-1"
              />
            </div>
            <input
              type="text"
              value={manualAddress}
              onChange={e => setManualAddress(e.target.value)}
              placeholder="Address (optional — used for fire proximity)"
              className="input w-full"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={manualRelationship}
                onChange={e => setManualRelationship(e.target.value as Relationship)}
                className="input flex-1"
              >
                {(['Family Member', 'Client', 'Neighbor', 'Self', 'Other'] as Relationship[]).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={manualMobility}
                onChange={e => setManualMobility(e.target.value as Mobility)}
                className="input flex-1"
              >
                {MOBILITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              placeholder="Notes (medications, mobility needs, pets…)"
              className="input w-full"
            />
            {manualError && <p className="text-signal-danger text-xs">{manualError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { resetManualForm(); setManualOpen(false) }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-ash-600 text-ash-300 hover:bg-ash-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addManualPerson}
                disabled={!manualName.trim()}
                className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to My People
              </button>
            </div>
          </div>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <div className="card p-5 mb-6 space-y-3 border-ash-700">
          <div className="text-ash-300 text-xs font-semibold uppercase tracking-widest">Pending Invites</div>
          <div className="space-y-2">
            {pendingInvites.map(invite => {
              const daysAgo = Math.max(
                0,
                Math.floor((Date.now() - new Date(invite.createdAt).getTime()) / 86400000)
              )
              const busy = pendingActionEmail === invite.id || pendingActionEmail === invite.email
              return (
                <div key={invite.id} className="rounded-lg border border-ash-700 bg-ash-900/40 p-3">
                  <div className="text-sm text-white">{invite.email}</div>
                  <div className="text-xs text-ash-500 mb-2">Sent {daysAgo} day{daysAgo === 1 ? '' : 's'} ago</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resendInvite(invite.email)}
                      className="px-2.5 py-1 rounded-md text-xs border border-ember-500/40 text-ember-300 hover:bg-ember-500/10 disabled:opacity-50"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => cancelInvite(invite.id)}
                      className="px-2.5 py-1 rounded-md text-xs border border-ash-600 text-ash-300 hover:bg-ash-800 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for others */}
      {others.length === 0 && (
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
                    <div className="mt-1 flex items-start gap-1.5 text-xs leading-snug">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ash-500" aria-hidden />
                      <div className="min-w-0 text-ash-400">
                        <span className="font-semibold text-ash-200">Live: </span>
                        <span className="break-words">
                          {person.address?.trim()
                            ? person.address.trim()
                            : 'No home street on file — link their account so their profile address fills in, or add one when you add them manually.'}
                        </span>
                      </div>
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

                {/* Remove button */}
                <div className="flex items-center gap-1 shrink-0">
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
