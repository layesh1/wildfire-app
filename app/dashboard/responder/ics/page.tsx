'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Shield, ClipboardList, Download, Plus, Trash2, Clock,
  Users, Truck, Radio, FileText, Save, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DivisionStatus = 'Staged' | 'En Route' | 'On Scene' | 'Released' | 'Unaccounted'
type PersonnelRole = 'IC' | 'Operations' | 'Safety Officer' | 'Division Supervisor' | 'Crew Member' | 'Logistics' | 'Medical'
type PersonnelStatus = 'Assigned' | 'On Scene' | 'Evacuated' | 'Unaccounted'
type ApparatusType = 'Engine' | 'Water Tender' | 'Dozer' | 'Hand Crew' | 'Air Tanker' | 'Helicopter' | 'Rescue'
type ApparatusStatus = 'Available' | 'Assigned' | 'Out of Service' | 'Ordered/ETA'
type ResourceType = 'Engine' | 'Crew' | 'Dozer' | 'Aircraft' | 'Medical' | 'Other'
type RequestPriority = 'Immediate' | 'Routine'

interface Division {
  id: string
  name: string
  crew: string
  crewSize: number
  status: DivisionStatus
  assignment: string
}

interface Personnel {
  id: string
  name: string
  role: PersonnelRole
  assignment: string
  status: PersonnelStatus
  lastCheckin: string // ISO string
}

interface Apparatus {
  id: string
  unitId: string
  type: ApparatusType
  status: ApparatusStatus
  location: string
}

interface ResourceRequest {
  id: string
  resourceType: ResourceType
  quantity: number
  priority: RequestPriority
  notes: string
  timestamp: string // ISO string
  fulfilled: boolean
}

interface ICSBoard {
  incidentName: string
  acres: number
  containment: number
  structuresThreatened: number
  divisions: Division[]
  personnel: Personnel[]
  apparatus: Apparatus[]
  resourceRequests: ResourceRequest[]
  notes: string
  lastSaved: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'ics_incident_board'
const LS_PERSONS_KEY = 'monitored_persons'

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

function now() {
  return new Date().toISOString()
}

const DEFAULT_BOARD: ICSBoard = {
  incidentName: '',
  acres: 0,
  containment: 0,
  structuresThreatened: 0,
  divisions: [
    { id: newId(), name: 'Division A', crew: '', crewSize: 0, status: 'Staged', assignment: '' },
    { id: newId(), name: 'Division B', crew: '', crewSize: 0, status: 'Staged', assignment: '' },
    { id: newId(), name: 'Air Operations', crew: '', crewSize: 0, status: 'Staged', assignment: '' },
    { id: newId(), name: 'Logistics', crew: '', crewSize: 0, status: 'Staged', assignment: '' },
  ],
  personnel: [
    { id: newId(), name: 'IC (Placeholder)', role: 'IC', assignment: '', status: 'Assigned', lastCheckin: now() },
    { id: newId(), name: 'Safety Officer (Placeholder)', role: 'Safety Officer', assignment: '', status: 'Assigned', lastCheckin: now() },
    { id: newId(), name: 'Crew Member (Placeholder)', role: 'Crew Member', assignment: '', status: 'Assigned', lastCheckin: now() },
  ],
  apparatus: [
    { id: newId(), unitId: 'Engine 51', type: 'Engine', status: 'Available', location: '' },
    { id: newId(), unitId: 'Water Tender 12', type: 'Water Tender', status: 'Available', location: '' },
    { id: newId(), unitId: 'Hand Crew 1', type: 'Hand Crew', status: 'Available', location: '' },
  ],
  resourceRequests: [],
  notes: '',
  lastSaved: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesAgo(iso: string): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff === 1) return '1 min ago'
  if (diff < 60) return `${diff} min ago`
  const h = Math.floor(diff / 60)
  return `${h}h ${diff % 60}m ago`
}

function fmtTime(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

// ─── Status badge styles ──────────────────────────────────────────────────────

function divisionStatusClass(status: DivisionStatus): string {
  switch (status) {
    case 'Staged': return 'bg-ash-700 border-ash-600 text-ash-300'
    case 'En Route': return 'bg-signal-warn/20 border-signal-warn/40 text-signal-warn'
    case 'On Scene': return 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe'
    case 'Released': return 'bg-blue-500/20 border-blue-500/40 text-blue-400'
    case 'Unaccounted': return 'bg-signal-danger/20 border-signal-danger/40 text-signal-danger animate-pulse'
  }
}

function personnelStatusClass(status: PersonnelStatus): string {
  switch (status) {
    case 'Assigned': return 'bg-ash-700 border-ash-600 text-ash-300'
    case 'On Scene': return 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe'
    case 'Evacuated': return 'bg-blue-500/20 border-blue-500/40 text-blue-400'
    case 'Unaccounted': return 'bg-signal-danger/20 border-signal-danger/40 text-signal-danger animate-pulse'
  }
}

function apparatusStatusClass(status: ApparatusStatus): string {
  switch (status) {
    case 'Available': return 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe'
    case 'Assigned': return 'bg-signal-warn/20 border-signal-warn/40 text-signal-warn'
    case 'Out of Service': return 'bg-signal-danger/20 border-signal-danger/40 text-signal-danger'
    case 'Ordered/ETA': return 'bg-blue-500/20 border-blue-500/40 text-blue-400'
  }
}

// ─── Inline-edit text input ───────────────────────────────────────────────────

function InlineText({
  value, onChange, placeholder, className = '',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-b border-ash-700 focus:border-ember-500/60 focus:outline-none text-white text-xs px-0.5 py-0.5 w-full placeholder:text-ash-600 transition-colors ${className}`}
    />
  )
}

function InlineNumber({
  value, onChange, min = 0, max, className = '',
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string
}) {
  return (
    <input
      type="number"
      value={value || ''}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      className={`bg-transparent border-b border-ash-700 focus:border-ember-500/60 focus:outline-none text-white text-xs px-0.5 py-0.5 w-full placeholder:text-ash-600 transition-colors ${className}`}
    />
  )
}

// ─── Click-to-edit KPI card ───────────────────────────────────────────────────

function KpiCard({
  label, value, unit = '', type = 'number', readOnly = false,
  onChange, color = 'text-white',
}: {
  label: string
  value: number | string
  unit?: string
  type?: 'number' | 'slider'
  readOnly?: boolean
  onChange?: (v: number) => void
  color?: string
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className={`card p-4 flex flex-col gap-2 ${!readOnly ? 'cursor-pointer hover:bg-ash-800/70' : ''} transition-colors`}
      onClick={() => !readOnly && type === 'number' && setEditing(true)}
    >
      <div className="text-ash-500 text-xs uppercase tracking-wider">{label}</div>

      {type === 'slider' ? (
        <div>
          <div className={`font-display text-3xl font-bold mb-2 ${color}`}>
            {value}{unit}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value as number}
            onChange={e => onChange?.(Number(e.target.value))}
            className="w-full accent-ember-500 h-1.5 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-ash-600 text-xs mt-1">
            <span>0%</span><span>100%</span>
          </div>
        </div>
      ) : editing ? (
        <input
          type="number"
          autoFocus
          defaultValue={value as number}
          onBlur={e => { onChange?.(Number(e.target.value)); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onChange?.(Number((e.target as HTMLInputElement).value)); setEditing(false) } }}
          className="bg-ash-800 border border-ember-500/40 rounded px-2 py-1 text-white font-display text-2xl font-bold w-full focus:outline-none"
        />
      ) : (
        <div className={`font-display text-3xl font-bold ${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}{unit}
          {!readOnly && <span className="text-ash-600 text-xs ml-2 font-normal">(click to edit)</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ICSBoardPage() {
  const [board, setBoard] = useState<ICSBoard>(DEFAULT_BOARD)
  const [monitoredCount, setMonitoredCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reqForm, setReqForm] = useState({ resourceType: 'Engine' as ResourceType, quantity: 1, priority: 'Routine' as RequestPriority, notes: '' })
  const [notesLastSaved, setNotesLastSaved] = useState('')
  const notesRef = useRef<HTMLTextAreaElement>(null)

  // Tick clock every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ICSBoard
        setBoard(parsed)
        if (parsed.lastSaved) setNotesLastSaved(parsed.lastSaved)
      }
    } catch {}

    try {
      const persons = localStorage.getItem(LS_PERSONS_KEY)
      if (persons) setMonitoredCount(JSON.parse(persons).length ?? 0)
    } catch {}
  }, [])

  // Persist to localStorage whenever board changes
  const persist = useCallback((updated: ICSBoard) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {}
  }, [])

  function update(patch: Partial<ICSBoard>) {
    setBoard(prev => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }

  // ── Divisions ──────────────────────────────────────────────────────────────

  function updateDivision(id: string, patch: Partial<Division>) {
    update({ divisions: board.divisions.map(d => d.id === id ? { ...d, ...patch } : d) })
  }
  function addDivision() {
    update({ divisions: [...board.divisions, { id: newId(), name: 'New Division', crew: '', crewSize: 0, status: 'Staged', assignment: '' }] })
  }
  function removeDivision(id: string) {
    update({ divisions: board.divisions.filter(d => d.id !== id) })
  }

  // ── Personnel ─────────────────────────────────────────────────────────────

  function updatePersonnel(id: string, patch: Partial<Personnel>) {
    const extra: Partial<Personnel> = patch.status ? { lastCheckin: now() } : {}
    update({ personnel: board.personnel.map(p => p.id === id ? { ...p, ...patch, ...extra } : p) })
  }
  function addPersonnel() {
    update({ personnel: [...board.personnel, { id: newId(), name: '', role: 'Crew Member', assignment: '', status: 'Assigned', lastCheckin: now() }] })
  }
  function removePersonnel(id: string) {
    update({ personnel: board.personnel.filter(p => p.id !== id) })
  }

  // ── Apparatus ─────────────────────────────────────────────────────────────

  function updateApparatus(id: string, patch: Partial<Apparatus>) {
    update({ apparatus: board.apparatus.map(a => a.id === id ? { ...a, ...patch } : a) })
  }
  function addApparatus() {
    update({ apparatus: [...board.apparatus, { id: newId(), unitId: '', type: 'Engine', status: 'Available', location: '' }] })
  }
  function removeApparatus(id: string) {
    update({ apparatus: board.apparatus.filter(a => a.id !== id) })
  }

  // ── Resource Requests ─────────────────────────────────────────────────────

  function logRequest() {
    if (reqForm.quantity < 1) return
    const entry: ResourceRequest = { id: newId(), ...reqForm, timestamp: now(), fulfilled: false }
    update({ resourceRequests: [entry, ...board.resourceRequests] })
    setReqForm({ resourceType: 'Engine', quantity: 1, priority: 'Routine', notes: '' })
  }
  function toggleFulfilled(id: string) {
    update({ resourceRequests: board.resourceRequests.map(r => r.id === id ? { ...r, fulfilled: !r.fulfilled } : r) })
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  function saveNotes() {
    const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const updated = { ...board, notes: notesRef.current?.value ?? board.notes, lastSaved: ts }
    setBoard(updated)
    persist(updated)
    setNotesLastSaved(ts)
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function exportICS201() {
    const d = board
    const ts = new Date().toLocaleString('en-US')
    const slug = (d.incidentName || 'incident').replace(/\s+/g, '-').toLowerCase()
    const dateSlug = new Date().toISOString().slice(0, 10)

    const lines: string[] = [
      '='.repeat(60),
      `ICS-201 INCIDENT BRIEFING SUMMARY`,
      `Generated: ${ts}`,
      '='.repeat(60),
      '',
      `INCIDENT NAME: ${d.incidentName || '(not set)'}`,
      '',
      '── SITUATION STATUS ──',
      `Acres Burned: ${d.acres.toLocaleString()}`,
      `Containment: ${d.containment}%`,
      `Structures Threatened: ${d.structuresThreatened}`,
      `Evacuees Tracked: ${monitoredCount}`,
      '',
      '── SECTOR ASSIGNMENTS (ICS DIVISIONS) ──',
      ['Division/Sector', 'Crew', 'Size', 'Status', 'Assignment'].join('\t'),
      ...d.divisions.map(div =>
        [div.name, div.crew || '—', div.crewSize || '—', div.status, div.assignment || '—'].join('\t')
      ),
      '',
      '── PERSONNEL ACCOUNTABILITY (PAR) ──',
      ['Name', 'Role', 'Assignment', 'Status', 'Last Check-in'].join('\t'),
      ...d.personnel.map(p =>
        [p.name || '(unnamed)', p.role, p.assignment || '—', p.status, fmtDateTime(p.lastCheckin)].join('\t')
      ),
      '',
      '── APPARATUS / RESOURCES ──',
      ['Unit ID', 'Type', 'Status', 'Location/Assignment'].join('\t'),
      ...d.apparatus.map(a =>
        [a.unitId || '(unnamed)', a.type, a.status, a.location || '—'].join('\t')
      ),
      '',
      '── RESOURCE REQUEST LOG ──',
      ...d.resourceRequests.map(r =>
        `[${fmtDateTime(r.timestamp)}] ${r.resourceType} ×${r.quantity} (${r.priority})${r.fulfilled ? ' [FULFILLED]' : ''} — ${r.notes || '(no notes)'}`
      ),
      d.resourceRequests.length === 0 ? '(no requests logged)' : '',
      '',
      '── INCIDENT NOTES / SITREP ──',
      d.notes || '(no notes)',
      '',
      '='.repeat(60),
      `ICS-201 Summary · ${ts}`,
      '='.repeat(60),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ics-201-${slug}-${dateSlug}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── PAR summary ──────────────────────────────────────────────────────────

  const unaccounted = board.personnel.filter(p => p.status === 'Unaccounted').length
  const parTotal = board.personnel.length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-ember-400 text-xs font-medium mb-2">
            <Shield className="w-3.5 h-3.5" />
            EMERGENCY RESPONDER · ICS INCIDENT BOARD
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-display text-3xl font-bold text-white">ICS Incident Board</h1>
            <div className="flex items-center gap-1.5 text-ash-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <button
          onClick={exportICS201}
          className="flex items-center gap-2 px-4 py-2.5 bg-ember-500/10 border border-ember-500/30 rounded-xl hover:bg-ember-500/20 transition-colors text-ember-400 text-sm font-medium shrink-0"
        >
          <Download className="w-4 h-4" />
          Export ICS-201 Summary
        </button>
      </div>

      {/* Incident Name input */}
      <div className="card p-4">
        <label className="text-ash-500 text-xs uppercase tracking-wider block mb-2">Active Incident</label>
        <input
          type="text"
          value={board.incidentName}
          onChange={e => update({ incidentName: e.target.value })}
          placeholder="Enter incident name…"
          className="w-full bg-ash-800 border border-ash-700 rounded-lg px-4 py-2.5 text-white text-lg font-semibold focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 transition-colors"
        />
      </div>

      {/* ── Section 1: Situation Status ────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-ember-400" />
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Situation Status</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Acres Burned"
            value={board.acres}
            color="text-signal-danger"
            onChange={v => update({ acres: v })}
          />
          <KpiCard
            label="Containment %"
            value={board.containment}
            unit="%"
            type="slider"
            color="text-signal-safe"
            onChange={v => update({ containment: v })}
          />
          <KpiCard
            label="Structures Threatened"
            value={board.structuresThreatened}
            color="text-signal-warn"
            onChange={v => update({ structuresThreatened: v })}
          />
          <KpiCard
            label="Evacuees Tracked"
            value={monitoredCount}
            color="text-blue-400"
            readOnly
          />
        </div>
      </section>

      {/* ── Section 2: Sector Assignments ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-signal-info" />
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Sector Assignments (ICS Divisions)</h2>
          </div>
          <button
            onClick={addDivision}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ash-800 border border-ash-700 rounded-lg hover:bg-ash-700 transition-colors text-ash-300 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Division
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ash-800 text-left bg-ash-900/60">
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Division / Sector</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Assigned Crew</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-20">Size</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Status</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider">Assignment Brief</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {board.divisions.map(div => (
                  <tr key={div.id} className="hover:bg-ash-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <InlineText
                        value={div.name}
                        onChange={v => updateDivision(div.id, { name: v })}
                        placeholder="Division name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InlineText
                        value={div.crew}
                        onChange={v => updateDivision(div.id, { crew: v })}
                        placeholder="Crew name/ID"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InlineNumber
                        value={div.crewSize}
                        onChange={v => updateDivision(div.id, { crewSize: v })}
                        min={0}
                        max={100}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={div.status}
                        onChange={e => updateDivision(div.id, { status: e.target.value as DivisionStatus })}
                        className="bg-ash-800 border border-ash-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-ember-500/50 w-full"
                      >
                        {(['Staged', 'En Route', 'On Scene', 'Released', 'Unaccounted'] as DivisionStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded border text-xs font-medium ${divisionStatusClass(div.status)}`}>
                        {div.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InlineText
                        value={div.assignment}
                        onChange={v => updateDivision(div.id, { assignment: v })}
                        placeholder="Brief assignment description…"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeDivision(div.id)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-signal-danger/20 text-ash-600 hover:text-signal-danger transition-colors"
                        title="Remove division"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {board.divisions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ash-600">No divisions. Click "Add Division" to start.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 3: Personnel Accountability ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-signal-warn" />
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Personnel Accountability (PAR)</h2>
          </div>
          <button
            onClick={addPersonnel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ash-800 border border-ash-700 rounded-lg hover:bg-ash-700 transition-colors text-ash-300 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Personnel
          </button>
        </div>

        {/* PAR Summary bar */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-4 text-sm font-medium ${
          unaccounted > 0
            ? 'bg-signal-danger/10 border-signal-danger/40 text-signal-danger'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <Users className="w-4 h-4 shrink-0" />
          {unaccounted > 0
            ? `⚠ ${unaccounted} UNACCOUNTED — ${parTotal - unaccounted} of ${parTotal} personnel accounted for`
            : `All ${parTotal} personnel accounted for`
          }
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ash-800 text-left bg-ash-900/60">
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-40">Name</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-40">Role</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Assignment</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Status</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-28">Last Check-in</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {board.personnel.map(p => (
                  <tr key={p.id} className="hover:bg-ash-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <InlineText
                        value={p.name}
                        onChange={v => updatePersonnel(p.id, { name: v })}
                        placeholder="Full name"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.role}
                        onChange={e => updatePersonnel(p.id, { role: e.target.value as PersonnelRole })}
                        className="bg-ash-800 border border-ash-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-ember-500/50 w-full"
                      >
                        {(['IC', 'Operations', 'Safety Officer', 'Division Supervisor', 'Crew Member', 'Logistics', 'Medical'] as PersonnelRole[]).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <InlineText
                        value={p.assignment}
                        onChange={v => updatePersonnel(p.id, { assignment: v })}
                        placeholder="Division/sector"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={e => updatePersonnel(p.id, { status: e.target.value as PersonnelStatus })}
                        className="bg-ash-800 border border-ash-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-ember-500/50 w-full mb-1"
                      >
                        {(['Assigned', 'On Scene', 'Evacuated', 'Unaccounted'] as PersonnelStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${personnelStatusClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ash-500 font-mono whitespace-nowrap">
                      <div>{fmtTime(p.lastCheckin)}</div>
                      <div className="text-ash-600">{minutesAgo(p.lastCheckin)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removePersonnel(p.id)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-signal-danger/20 text-ash-600 hover:text-signal-danger transition-colors"
                        title="Remove personnel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {board.personnel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ash-600">No personnel logged. Click "Add Personnel" to start.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 4: Apparatus / Resources ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Apparatus / Resources</h2>
          </div>
          <button
            onClick={addApparatus}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ash-800 border border-ash-700 rounded-lg hover:bg-ash-700 transition-colors text-ash-300 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Apparatus
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ash-800 text-left bg-ash-900/60">
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Unit ID</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-36">Type</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider w-40">Status</th>
                  <th className="px-4 py-3 text-ash-400 font-medium uppercase tracking-wider">Location / Assignment</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {board.apparatus.map(a => (
                  <tr key={a.id} className="hover:bg-ash-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <InlineText
                        value={a.unitId}
                        onChange={v => updateApparatus(a.id, { unitId: v })}
                        placeholder="e.g. Engine 51"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.type}
                        onChange={e => updateApparatus(a.id, { type: e.target.value as ApparatusType })}
                        className="bg-ash-800 border border-ash-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-ember-500/50 w-full"
                      >
                        {(['Engine', 'Water Tender', 'Dozer', 'Hand Crew', 'Air Tanker', 'Helicopter', 'Rescue'] as ApparatusType[]).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={e => updateApparatus(a.id, { status: e.target.value as ApparatusStatus })}
                        className="bg-ash-800 border border-ash-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-ember-500/50 w-full mb-1"
                      >
                        {(['Available', 'Assigned', 'Out of Service', 'Ordered/ETA'] as ApparatusStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${apparatusStatusClass(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InlineText
                        value={a.location}
                        onChange={v => updateApparatus(a.id, { location: v })}
                        placeholder="Location or assignment…"
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeApparatus(a.id)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-signal-danger/20 text-ash-600 hover:text-signal-danger transition-colors"
                        title="Remove apparatus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {board.apparatus.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ash-600">No apparatus logged. Click "Add Apparatus" to start.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 5: Resource Request Log ────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4 text-signal-info" />
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Resource Request Log</h2>
        </div>

        {/* Request form */}
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-ash-500 text-xs block mb-1">Resource Type</label>
              <select
                value={reqForm.resourceType}
                onChange={e => setReqForm(f => ({ ...f, resourceType: e.target.value as ResourceType }))}
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-ember-500/50"
              >
                {(['Engine', 'Crew', 'Dozer', 'Aircraft', 'Medical', 'Other'] as ResourceType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-ash-500 text-xs block mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={reqForm.quantity}
                onChange={e => setReqForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-ember-500/50"
              />
            </div>
            <div>
              <label className="text-ash-500 text-xs block mb-1">Priority</label>
              <select
                value={reqForm.priority}
                onChange={e => setReqForm(f => ({ ...f, priority: e.target.value as RequestPriority }))}
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-ember-500/50"
              >
                <option value="Immediate">Immediate</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
            <div>
              <label className="text-ash-500 text-xs block mb-1">Notes</label>
              <input
                type="text"
                value={reqForm.notes}
                onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes…"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-ember-500/50 placeholder:text-ash-600"
              />
            </div>
          </div>
          <button
            onClick={logRequest}
            className="flex items-center gap-2 px-4 py-2 bg-ember-500/10 border border-ember-500/30 rounded-lg hover:bg-ember-500/20 transition-colors text-ember-400 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Request
          </button>
        </div>

        {/* Request list */}
        {board.resourceRequests.length === 0 ? (
          <div className="text-center py-8 text-ash-600 text-xs card">No resource requests logged yet.</div>
        ) : (
          <div className="card divide-y divide-ash-800">
            {board.resourceRequests.map(r => (
              <div key={r.id} className={`flex items-start gap-4 px-5 py-3.5 ${r.fulfilled ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-mono ${r.fulfilled ? 'line-through text-ash-500' : 'text-white'}`}>
                    [{fmtDateTime(r.timestamp)}]{' '}
                    <span className="font-semibold">{r.resourceType}</span>{' '}
                    ×{r.quantity}{' '}
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${
                      r.priority === 'Immediate'
                        ? 'bg-signal-danger/20 border-signal-danger/30 text-signal-danger'
                        : 'bg-ash-700 border-ash-600 text-ash-400'
                    }`}>
                      {r.priority}
                    </span>
                    {r.notes && <span className="text-ash-500"> — {r.notes}</span>}
                  </div>
                </div>
                <button
                  onClick={() => toggleFulfilled(r.id)}
                  className={`shrink-0 px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    r.fulfilled
                      ? 'bg-ash-800 border-ash-700 text-ash-500 hover:bg-ash-700'
                      : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe hover:bg-signal-safe/20'
                  }`}
                >
                  {r.fulfilled ? 'Reopen' : 'Mark Fulfilled'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 6: Incident Notes / SITREP ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-ash-400" />
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Incident Notes / Situation Report</h2>
          </div>
          {notesLastSaved && (
            <div className="flex items-center gap-1.5 text-ash-500 text-xs">
              <Save className="w-3 h-3" />
              Last saved: {notesLastSaved}
            </div>
          )}
        </div>
        <div className="card p-1">
          <textarea
            ref={notesRef}
            defaultValue={board.notes}
            onBlur={saveNotes}
            placeholder="Enter situation report, incident notes, objectives, safety message…"
            rows={10}
            className="w-full bg-transparent border-0 resize-y text-white text-sm px-4 py-3 focus:outline-none placeholder:text-ash-600 font-mono leading-relaxed"
          />
        </div>
        <p className="text-ash-600 text-xs mt-2">Auto-saves to localStorage on focus-out.</p>
      </section>

    </div>
  )
}
