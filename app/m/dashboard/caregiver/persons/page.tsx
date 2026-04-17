'use client'
import { useState, useEffect } from 'react'
import { Users, CheckCircle, MessageSquare, Phone, Plus, X, Copy, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { loadMonitoredPersonsForHub, savePersons } from '@/lib/user-data'

type CheckinStatus = 'confirmed_safe' | 'waiting' | 'needs_help' | 'unknown'
interface Person {
  id: string; name: string; address: string; relationship: string
  mobility: string; phone: string; languages: string[]; notes: string
  status: CheckinStatus; last_confirmed: string | null; checkin_token: string | null
  ping_sent_at: string | null; justConfirmed: boolean
}

const LS_KEY = 'monitored_persons_v2'

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function statusDot(status: CheckinStatus) {
  if (status === 'confirmed_safe') return 'bg-green-500'
  if (status === 'waiting') return 'bg-yellow-400 animate-pulse'
  if (status === 'needs_help') return 'bg-red-500 animate-pulse'
  return 'bg-gray-300'
}

function statusLabel(status: CheckinStatus) {
  if (status === 'confirmed_safe') return 'Safe'
  if (status === 'waiting') return 'Waiting…'
  if (status === 'needs_help') return 'Needs help'
  return 'Unknown'
}

function statusColor(status: CheckinStatus) {
  if (status === 'confirmed_safe') return '#16a34a'
  if (status === 'waiting') return '#d97706'
  if (status === 'needs_help') return '#dc2626'
  return '#9ca3af'
}

export default function MobilePersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('Family Member')
  const [pingId, setPingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const persons = await loadMonitoredPersonsForHub(supabase, user.id)
          if (persons.length > 0) { setPersons(persons); return }
        }
      } catch {}
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) setPersons(JSON.parse(raw))
      } catch {}
    }
    load()
  }, [])

  function persist(updated: Person[]) {
    setPersons(updated)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) savePersons(supabase, data.user.id, updated)
      else { try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {} }
    }).catch(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {} })
  }

  function addPerson() {
    if (!name.trim()) return
    persist([{
      id: Date.now().toString(), name: name.trim(), address: '', relationship,
      mobility: 'Mobile Adult', phone: phone.trim(), languages: [], notes: '',
      status: 'unknown', last_confirmed: null, checkin_token: null, ping_sent_at: null, justConfirmed: false,
    }, ...persons])
    setName(''); setPhone(''); setShowAdd(false)
  }

  function markSafe(id: string) {
    persist(persons.map(p => p.id === id
      ? { ...p, status: 'confirmed_safe' as CheckinStatus, last_confirmed: new Date().toISOString(), justConfirmed: true }
      : p))
  }

  function pingPerson(id: string) {
    if (pingId === id) { setPingId(null); return }
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    persist(persons.map(p => p.id === id
      ? { ...p, checkin_token: token, status: 'waiting' as CheckinStatus, ping_sent_at: new Date().toISOString() }
      : p))
    setPingId(id)
  }

  function removePerson(id: string) {
    persist(persons.filter(p => p.id !== id))
  }

  const pingUrl = (token: string | null) =>
    token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/checkin/${token}` : ''

  const safeCount = persons.filter(p => p.status === 'confirmed_safe').length

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-4 pt-10 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-700 text-xs font-semibold uppercase tracking-widest mb-0.5">
              <Users className="w-3.5 h-3.5" /> My People
            </div>
            <h1 className="font-display font-bold text-2xl text-gray-900">People I Care For</h1>
          </div>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        {persons.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(safeCount / persons.length) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{safeCount}/{persons.length} safe</span>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Add person form */}
        {showAdd && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">Add Person</h2>
            <input
              type="text" placeholder="Full name *" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-400"
            />
            <input
              type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-400"
            />
            <select
              value={relationship} onChange={e => setRelationship(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-400"
            >
              {['Family Member', 'Client', 'Neighbor', 'Self', 'Other'].map(r => <option key={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={addPerson} disabled={!name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#16a34a' }}>Add</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {persons.length === 0 && !showAdd && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <div className="text-gray-500 font-semibold mb-1">No one added yet</div>
            <p className="text-gray-400 text-sm">Tap + to add people you care for</p>
          </div>
        )}

        {/* Person cards */}
        {persons.map(p => {
          const url = pingUrl(p.checkin_token)
          const shareText = `Can you let me know you're safe? Tap this link: ${url}`
          return (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-green-800 text-base">{p.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm truncate">{p.name}</span>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(p.status)}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium" style={{ color: statusColor(p.status) }}>{statusLabel(p.status)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{p.relationship}</span>
                  </div>
                  {p.last_confirmed && p.status === 'confirmed_safe' && (
                    <div className="text-[11px] text-gray-400 mt-0.5">{relativeTime(p.last_confirmed)}</div>
                  )}
                </div>
                <button onClick={() => removePerson(p.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => pingPerson(p.id)}
                  className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border"
                  style={p.status === 'waiting'
                    ? { borderColor: '#fbbf24', color: '#d97706', background: '#fef9c3' }
                    : { borderColor: '#d1d5db', color: '#374151', background: '#f9fafb' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {p.status === 'waiting' ? 'Resend' : 'Ping'}
                </button>
                <button
                  onClick={() => markSafe(p.id)}
                  className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border"
                  style={{ borderColor: '#bbf7d0', color: '#16a34a', background: '#f0fdf4' }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Safe
                </button>
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: '#bfdbfe', color: '#1d4ed8', background: '#eff6ff' }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Ping share panel */}
              {pingId === p.id && p.checkin_token && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <p className="text-xs text-gray-500">Share this link with {p.name.split(' ')[0]}:</p>
                  <div className="flex gap-2">
                    <input readOnly value={url} className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] text-gray-500 min-w-0" onClick={e => (e.target as HTMLInputElement).select()} />
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 bg-white shrink-0"
                    >
                      <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <a href={`sms:?body=${encodeURIComponent(shareText)}`} className="flex-1 text-center py-2 rounded-lg text-xs font-semibold bg-green-50 border border-green-200 text-green-700">Text</a>
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-lg text-xs font-semibold bg-green-50 border border-green-200 text-green-700">WhatsApp</a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
