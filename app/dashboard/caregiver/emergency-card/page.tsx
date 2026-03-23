'use client'
import { useState, useEffect, useRef } from 'react'
import { FileText, Share2, Download, Phone, AlertTriangle, Heart, Shield, Plus, X, Droplets, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/languages'

const MOBILITY_OPTIONS = ['Mobile Adult', 'Elderly', 'Elderly (needs driver)', 'Disabled', 'Wheelchair', 'No Vehicle', 'Medical Equipment', 'Other']

// ── Address autocomplete (Nominatim / OpenStreetMap, no API key) ────────────
interface NominatimResult { place_id: number; display_name: string }

function AddressInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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
      } catch { setSuggestions([]) }
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
        className="input"
      />
      {showDrop && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors truncate"
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

type CardProfile = {
  name: string
  address: string
  phone: string
  bloodType: string
  allergies: string
  emergencyContacts: { name: string; phone: string; relationship: string }[]
  mobility: string
  mobilityOther: string
  medications: string
  medicalEquipment: string
  languages: string
}

type CardOwner = { key: string; label: string }

function emptyProfile(): CardProfile {
  return {
    name: '', address: '', phone: '', bloodType: '', allergies: '',
    emergencyContacts: [{ name: '', phone: '', relationship: '' }],
    mobility: 'Mobile Adult', mobilityOther: '', medications: '',
    medicalEquipment: '', languages: '',
  }
}

function storageKey(key: string) {
  return key === 'self' ? 'wfa_emergency_card' : `wfa_emergency_card_${key}`
}

function loadCard(key: string): CardProfile | null {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function persistCard(key: string, profile: CardProfile) {
  try { localStorage.setItem(storageKey(key), JSON.stringify(profile)) } catch {}
}

export default function EmergencyCardPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const [activeKey, setActiveKey] = useState('self')
  const [cardOwners, setCardOwners] = useState<CardOwner[]>([])
  const [addingPerson, setAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<CardProfile>(emptyProfile())

  // Load card owners list and initial profile
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wfa_emergency_card_owners')
      if (raw) setCardOwners(JSON.parse(raw))
    } catch {}

    async function loadSelf() {
      const saved = loadCard('self')
      if (saved && (saved.name || saved.phone || saved.address)) {
        setProfile(prev => ({ ...prev, ...saved }))
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          if (p) {
            setProfile(prev => ({
              ...prev,
              name: p.full_name || '',
              address: p.address || '',
              phone: p.phone || '',
              languages: p.household_languages || '',
              emergencyContacts: p.emergency_contact_name
                ? [{ name: p.emergency_contact_name, phone: p.emergency_contact_phone || '', relationship: '' }]
                : prev.emergencyContacts,
            }))
          }
        }
      } catch {}
    }
    loadSelf()
  }, [])

  function switchTo(key: string) {
    persistCard(activeKey, profile)
    const loaded = loadCard(key)
    setProfile(loaded ? { ...emptyProfile(), ...loaded } : emptyProfile())
    setActiveKey(key)
    setSaved(false)
  }

  function createPersonCard() {
    const label = newPersonName.trim()
    if (!label) return
    const key = Date.now().toString()
    const newOwners = [...cardOwners, { key, label }]
    setCardOwners(newOwners)
    try { localStorage.setItem('wfa_emergency_card_owners', JSON.stringify(newOwners)) } catch {}
    setNewPersonName('')
    setAddingPerson(false)
    persistCard(activeKey, profile)
    setProfile(emptyProfile())
    setActiveKey(key)
    setSaved(false)
  }

  function deletePersonCard(key: string) {
    if (!confirm('Delete this card?')) return
    try { localStorage.removeItem(storageKey(key)) } catch {}
    const newOwners = cardOwners.filter(o => o.key !== key)
    setCardOwners(newOwners)
    try { localStorage.setItem('wfa_emergency_card_owners', JSON.stringify(newOwners)) } catch {}
    if (activeKey === key) switchTo('self')
  }

  function update<K extends keyof CardProfile>(k: K, value: CardProfile[K]) {
    setProfile(p => {
      const next = { ...p, [k]: value }
      persistCard(activeKey, next)
      return next
    })
    setSaved(false)
  }

  function addContact() {
    update('emergencyContacts', [...profile.emergencyContacts, { name: '', phone: '', relationship: '' }])
  }

  function removeContact(i: number) {
    update('emergencyContacts', profile.emergencyContacts.filter((_, idx) => idx !== i))
  }

  function updateContact(i: number, field: 'name' | 'phone' | 'relationship', value: string) {
    const next = profile.emergencyContacts.map((c, idx) => idx === i ? { ...c, [field]: value } : c)
    update('emergencyContacts', next)
  }

  function savePdf() {
    const card = cardRef.current
    if (!card) return
    const win = window.open('', '_blank', 'width=820,height=1000')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Wildfire Emergency Card</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    body { font-family: 'DM Sans', system-ui, sans-serif; padding: 2rem; background: white; }
    @media print { body { padding: 0.5rem; } }
    .signal-danger { color: #dc2626; }
    .bg-signal-danger\\/10 { background-color: rgba(220,38,38,0.1); }
    .border-signal-danger\\/40 { border-color: rgba(220,38,38,0.4); }
    .text-signal-warn { color: #d97706; }
    .bg-signal-warn\\/10 { background-color: rgba(217,119,6,0.1); }
    .border-signal-warn\\/40 { border-color: rgba(217,119,6,0.4); }
  </style>
</head><body>
  ${card.outerHTML}
  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`)
    win.document.close()
  }

  function shareCard() {
    const mobilityLabel = profile.mobility === 'Other' && profile.mobilityOther ? profile.mobilityOther : profile.mobility
    const lines = [
      'WILDFIRE EMERGENCY CARD — Minutes Matter',
      `Name: ${profile.name || 'Unknown'}`,
      `Phone: ${profile.phone || 'Unknown'}`,
      `Address: ${profile.address || 'Unknown'}`,
      profile.bloodType ? `Blood Type: ${profile.bloodType}` : '',
      profile.allergies ? `Allergies: ${profile.allergies}` : '',
      '',
      '— Emergency Contacts —',
      ...profile.emergencyContacts.filter(c => c.name).map(c => `${c.name}${c.relationship ? ` (${c.relationship})` : ''}: ${c.phone}`),
      '',
      profile.mobility !== 'Mobile Adult' ? `Mobility: ${mobilityLabel}` : '',
      profile.medications ? `Medications: ${profile.medications}` : '',
      profile.medicalEquipment ? `Medical Equipment: ${profile.medicalEquipment}` : '',
      profile.languages ? `Languages: ${profile.languages}` : '',
      '',
      '— Emergency Numbers —',
      '911 · FEMA: 1-800-621-3362 · Red Cross: 1-800-733-2767',
      '',
      'Generated by minutesmatter.app',
    ]
    const text = lines.filter(Boolean).join('\n')
    if (navigator.share) {
      navigator.share({ title: 'Wildfire Emergency Card', text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).then(() => alert('Card copied to clipboard.'))
    }
  }

  const mobilityLabel = profile.mobility === 'Other' && profile.mobilityOther ? profile.mobilityOther : profile.mobility
  const hasCriticalNeeds = profile.medications || profile.medicalEquipment || (profile.mobility !== 'Mobile Adult')
  const activeLabel = activeKey === 'self' ? 'My Card' : (cardOwners.find(o => o.key === activeKey)?.label ?? 'Card')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
          <FileText className="w-4 h-4" />
          CAREGIVER · EMERGENCY CARD
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Emergency Cards</h1>
        <p className="text-gray-500 text-sm mb-4">
          Cards for first responders and shelter staff — your medical needs, contacts, and conditions. Create one for yourself and anyone you care for.
          <strong className="text-gray-700"> Auto-saved to your device.</strong>
        </p>

        {/* Person switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Self tab */}
          <button
            onClick={() => switchTo('self')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              activeKey === 'self'
                ? 'bg-forest-50 border-forest-300 text-forest-700'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            My Card
          </button>

          {/* Other people */}
          {cardOwners.map(o => (
            <div key={o.key} className="relative group">
              <button
                onClick={() => switchTo(o.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border pr-7 ${
                  activeKey === o.key
                    ? 'bg-forest-50 border-forest-300 text-forest-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {o.label}
              </button>
              <button
                onClick={() => deletePersonCard(o.key)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete card"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add person */}
          {addingPerson ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createPersonCard(); if (e.key === 'Escape') { setAddingPerson(false); setNewPersonName('') } }}
                placeholder="Their name..."
                className="input py-1.5 text-sm w-36"
              />
              <button onClick={createPersonCard} className="text-xs text-forest-600 font-medium hover:text-forest-700 px-2 py-1.5 rounded-lg border border-forest-200 bg-forest-50">
                Add
              </button>
              <button onClick={() => { setAddingPerson(false); setNewPersonName('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingPerson(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-forest-600 border border-dashed border-gray-200 hover:border-forest-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add person
            </button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={shareCard}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 rounded-xl text-white font-semibold transition-colors">
            <Share2 className="w-4 h-4" />
            Share / AirDrop
          </button>
          <button onClick={savePdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-700 font-semibold transition-colors">
            <Download className="w-4 h-4" />
            Save as PDF
          </button>
          {saved && <span className="text-signal-safe text-sm font-medium self-center">Saved</span>}
        </div>
        <p className="text-gray-400 text-xs mt-3">
          On iPhone: tap <strong>Share / AirDrop</strong> → &quot;AirDrop&quot; to send to another device, or &quot;Add to Notes&quot; to save offline.
        </p>
      </div>

      {/* Edit form */}
      <div className="space-y-4 no-print mb-8">
        {/* Identity */}
        <div className="card p-5">
          <h2 className="text-gray-700 font-semibold text-sm mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-signal-danger" /> Personal Info
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Full name</label>
              <input type="text" value={profile.name} onChange={e => update('name', e.target.value)}
                placeholder="Jane Doe" className="input" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Phone</label>
              <input type="tel" value={profile.phone} onChange={e => update('phone', e.target.value)}
                placeholder="+1 (555) 000-0000" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Home address</label>
              <AddressInput value={profile.address} onChange={v => update('address', v)} placeholder="123 Main St, City, CA 95003" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Blood type <span className="text-gray-400">(optional)</span></label>
              <select value={profile.bloodType} onChange={e => update('bloodType', e.target.value)} className="input">
                <option value="">Unknown</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Languages spoken <span className="text-gray-400">(select all that apply)</span></label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto grid grid-cols-2 gap-1">
                {LANGUAGES.map(l => {
                  const selected = profile.languages.split(', ').filter(Boolean).includes(l.native)
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        const current = profile.languages.split(', ').filter(Boolean)
                        const next = selected ? current.filter(n => n !== l.native) : [...current, l.native]
                        update('languages', next.join(', '))
                      }}
                      className={`text-xs px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors ${
                        selected
                          ? 'bg-forest-50 border border-forest-300 text-forest-700'
                          : 'border border-transparent hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="text-sm leading-none">{l.flag}</span>
                      <span className="truncate">{l.native}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Allergies / reactions <span className="text-gray-400">(critical for shelters)</span></label>
              <input type="text" value={profile.allergies} onChange={e => update('allergies', e.target.value)}
                placeholder="e.g. penicillin (anaphylaxis), latex, shellfish" className="input" />
            </div>
          </div>
        </div>

        {/* Medical needs */}
        <div className="card p-5">
          <h2 className="text-gray-700 font-semibold text-sm mb-3 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-signal-info" /> Medical Needs
            {hasCriticalNeeds && <span className="text-xs bg-signal-danger/10 text-signal-danger border border-signal-danger/30 px-2 py-0.5 rounded-full font-normal">Has critical needs</span>}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Mobility level</label>
              <select
                value={profile.mobility.startsWith('Other') ? 'Other' : profile.mobility}
                onChange={e => update('mobility', e.target.value)}
                className="input"
              >
                {MOBILITY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {profile.mobility === 'Other' && (
                <input type="text" value={profile.mobilityOther} onChange={e => update('mobilityOther', e.target.value)}
                  placeholder="Describe their situation…" className="input mt-2" autoFocus />
              )}
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Medications <span className="text-gray-400">— responders need this to help at a shelter</span></label>
              <textarea value={profile.medications} onChange={e => update('medications', e.target.value)}
                placeholder="e.g. Metformin 500mg twice daily, Lisinopril 10mg, insulin (refrigerated), blood thinners"
                rows={2} className="input resize-none" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Medical equipment / power needs</label>
              <input type="text" value={profile.medicalEquipment} onChange={e => update('medicalEquipment', e.target.value)}
                placeholder="e.g. O2 concentrator (needs outlet), CPAP, nebulizer, insulin pump" className="input" />
            </div>
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-700 font-semibold text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-forest-600" /> Emergency Contacts
            </h2>
            <button onClick={addContact} className="flex items-center gap-1 text-xs text-forest-600 hover:text-forest-700 font-medium">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {profile.emergencyContacts.map((c, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid sm:grid-cols-3 gap-2">
                  <input type="text" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}
                    placeholder="Name" className="input" />
                  <input type="tel" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}
                    placeholder="Phone" className="input font-mono" />
                  <input type="text" value={c.relationship} onChange={e => updateContact(i, 'relationship', e.target.value)}
                    placeholder="Relationship (e.g. spouse)" className="input" />
                </div>
                {profile.emergencyContacts.length > 1 && (
                  <button onClick={() => removeContact(i)} className="mt-2.5 text-gray-400 hover:text-signal-danger transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Printable / shareable card */}
      <div ref={cardRef} id="emergency-card" className="print-card rounded-xl border-2 border-gray-300 bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b-2 border-red-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-base uppercase tracking-wide">Wildfire Emergency Card</div>
              <div className="text-red-600/70 text-xs">minutesmatter.app · Show this to any shelter or responder</div>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Updated</div>
            <div className="font-mono">{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Identity row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Name</div>
              <div className="text-gray-900 font-bold text-lg">{profile.name || '______________________'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Phone</div>
              <div className="text-gray-900 font-bold text-lg font-mono">{profile.phone || '______________________'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Home Address</div>
              <div className="text-gray-900 font-semibold">{profile.address || '______________________________________'}</div>
            </div>
            {(profile.bloodType || profile.languages || profile.allergies || profile.mobility !== 'Mobile Adult') && (
              <div className="col-span-2 flex flex-wrap gap-2">
                {profile.mobility !== 'Mobile Adult' && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2 py-1 rounded-lg">
                    Mobility: {mobilityLabel}
                  </span>
                )}
                {profile.bloodType && (
                  <span className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                    Blood: {profile.bloodType}
                  </span>
                )}
                {profile.languages && (
                  <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2 py-1 rounded-lg">
                    Speaks: {profile.languages}
                  </span>
                )}
                {profile.allergies && (
                  <span className="bg-signal-warn/10 border border-signal-warn/40 text-signal-warn text-xs font-bold px-2 py-1 rounded-lg">
                    ALLERGY: {profile.allergies}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Critical needs banner */}
          {hasCriticalNeeds && (
            <div className="bg-signal-danger/10 border-2 border-signal-danger/40 rounded-lg p-3">
              <div className="text-signal-danger font-bold text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical Needs — Read Before Placing
              </div>
              <div className="space-y-1 text-sm">
                {profile.mobility !== 'Mobile Adult' && (
                  <div><span className="font-semibold text-gray-700">Mobility:</span> <span className="text-gray-600">{mobilityLabel}</span></div>
                )}
                {profile.medications && (
                  <div><span className="font-semibold text-gray-700">Medications:</span> <span className="text-gray-600">{profile.medications}</span></div>
                )}
                {profile.medicalEquipment && (
                  <div><span className="font-semibold text-gray-700">Equipment:</span> <span className="text-gray-600 font-medium">{profile.medicalEquipment}</span></div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100" />

          {/* Emergency contacts */}
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Emergency Contacts</div>
            <div className="grid grid-cols-1 gap-1.5">
              {profile.emergencyContacts.filter(c => c.name || c.phone).length > 0
                ? profile.emergencyContacts.filter(c => c.name || c.phone).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-gray-900 font-semibold text-sm">{c.name}</span>
                      {c.relationship && <span className="text-gray-400 text-xs">({c.relationship})</span>}
                      <span className="ml-auto text-gray-900 font-mono text-sm">{c.phone}</span>
                    </div>
                  ))
                : <div className="text-gray-400 text-sm">No contacts added yet</div>
              }
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Emergency numbers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">Emergency</span>
              <span className="text-gray-900 font-mono font-bold">911</span>
            </div>
            <div className="flex justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">FEMA Helpline</span>
              <span className="text-gray-900 font-mono font-bold">1-800-621-3362</span>
            </div>
            <div className="flex justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">Red Cross</span>
              <span className="text-gray-900 font-mono font-bold">1-800-733-2767</span>
            </div>
            <div className="flex justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">Crisis Text</span>
              <span className="text-gray-900 font-mono font-bold">Text HOME→741741</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2 text-gray-300 text-xs text-center">
            Minutes Matter Emergency Card · minutesmatter.app · Auto-saved to your device
          </div>
        </div>
      </div>
    </div>
  )
}
