'use client'
import { useEffect, useState } from 'react'
import { Shield, Flame, AlertTriangle, Activity, Clock, ChevronRight, Wind, Droplets, Users, Truck, Radio, Map, Building2, Brain, Factory, CheckCircle, MapPin, Phone, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import type { EvacueePin } from '@/components/EvacueeStatusMap'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'
import { useResponderStationAnchor } from '@/hooks/useResponderStationAnchor'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { useFlameoHubAgentBridge } from '@/components/FlameoHubAgentBridge'

const EvacueeStatusMap = dynamic(() => import('@/components/EvacueeStatusMap'), { ssr: false })

// Demo pins for Concord / Cabarrus County, NC — realistic addresses
const DEMO_PINS: EvacueePin[] = [
  { id: 'd1',  name: 'Linda Johnson',    address: '4231 Moss Creek Dr NW, Concord, NC', lat: 35.4312, lon: -80.6021, status: 'unknown',    phone: '(704) 555-0142', special_needs: 'Wheelchair user — needs transport' },
  { id: 'd2',  name: 'Marcus Williams',  address: '7809 Lyles Ln NW, Concord, NC',      lat: 35.4401, lon: -80.5874, status: 'evacuated',   phone: '(704) 555-0189' },
  { id: 'd3',  name: 'Sandra Okafor',    address: '2108 Pitts School Rd NW, Concord',   lat: 35.4188, lon: -80.6110, status: 'sheltering',  phone: '(704) 555-0231', special_needs: 'Oxygen-dependent' },
  { id: 'd4',  name: 'David Chen',       address: '5543 Poplar Tent Rd, Concord, NC',   lat: 35.4520, lon: -80.5720, status: 'evacuated',   phone: '(704) 555-0374' },
  { id: 'd5',  name: 'Rosa Martinez',    address: '818 Cabarrus Ave W, Concord, NC',    lat: 35.4071, lon: -80.5941, status: 'evacuated',   phone: '(704) 555-0456' },
  { id: 'd6',  name: 'James Harrington', address: '1342 Branchview Dr NE, Concord',     lat: 35.4250, lon: -80.5580, status: 'unknown',    phone: '(704) 555-0521', special_needs: 'Elderly, lives alone' },
  { id: 'd7',  name: 'Priya Patel',      address: '3901 Gateway Ln NW, Concord, NC',    lat: 35.4480, lon: -80.6050, status: 'evacuated',   phone: '(704) 555-0612' },
  { id: 'd8',  name: 'Tyrone Jackson',   address: '629 Union Cemetery Rd, Concord',     lat: 35.3980, lon: -80.5800, status: 'returning',   phone: '(704) 555-0733' },
  { id: 'd9',  name: 'Carol Simmons',    address: '4412 Flowes Store Rd, Concord',      lat: 35.4600, lon: -80.6210, status: 'unknown',    phone: '(704) 555-0844', special_needs: 'Dialysis 3x/week' },
  { id: 'd10', name: 'Brian Kowalski',   address: '2745 Davidson Hwy, Concord, NC',     lat: 35.4330, lon: -80.5490, status: 'evacuated',   phone: '(704) 555-0915' },
  { id: 'd11', name: 'Fatima Al-Hassan', address: '1103 Winecoff School Rd, Concord',   lat: 35.4140, lon: -80.6320, status: 'evacuated',   phone: '(704) 555-1022' },
  { id: 'd12', name: 'George Patterson', address: '5881 Odell School Rd, Concord, NC',  lat: 35.4650, lon: -80.5630, status: 'sheltering',  phone: '(704) 555-1198', special_needs: 'Hearing impaired' },
  { id: 'd13', name: 'Ana Gutierrez',    address: '3200 Rocky River Rd, Concord, NC',   lat: 35.3850, lon: -80.5670, status: 'evacuated',   phone: '(704) 555-1244' },
  { id: 'd14', name: 'Earl Thompson',    address: '777 Kannapolis Pkwy, Concord, NC',   lat: 35.4750, lon: -80.5980, status: 'unknown',    phone: '(704) 555-1367', special_needs: 'Bedridden — EMS required' },
  { id: 'd15', name: 'Mei-Ling Wu',      address: '9012 Poplar Tent Rd, Concord, NC',   lat: 35.4820, lon: -80.5540, status: 'evacuated',   phone: '(704) 555-1481' },
  { id: 'd16', name: 'Jerome Davis',     address: '455 Bethel Church Rd, Concord',      lat: 35.4020, lon: -80.6080, status: 'evacuated',   phone: '(704) 555-1555' },
  { id: 'd17', name: 'Helen Murphy',     address: '2314 Cabarrus Ave E, Concord, NC',   lat: 35.4090, lon: -80.5610, status: 'returning',   phone: '(704) 555-1629' },
  { id: 'd18', name: 'Darius Freeman',   address: '6670 Zion Church Rd, Concord, NC',   lat: 35.4400, lon: -80.6350, status: 'unknown',    phone: '(704) 555-1772', special_needs: 'Non-English speaking (French)' },
  { id: 'd19', name: 'Lucia Fernandez',  address: '321 Main St S, Kannapolis, NC',      lat: 35.4887, lon: -80.6208, status: 'evacuated',   phone: '(704) 555-1845' },
  { id: 'd20', name: 'Walter Grant',     address: '1848 Harris Rd, Harrisburg, NC',     lat: 35.3260, lon: -80.6530, status: 'evacuated',   phone: '(704) 555-1901' },
  { id: 'd21', name: 'Nkechi Obi',       address: '4102 Derita Rd, Concord, NC',        lat: 35.3720, lon: -80.6010, status: 'sheltering',  phone: '(704) 555-2033' },
  { id: 'd22', name: 'Robert Singh',     address: '7231 Pitts School Rd, Concord',      lat: 35.4560, lon: -80.6270, status: 'unknown',    phone: '(704) 555-2114', special_needs: 'Insulin-dependent diabetic' },
  { id: 'd23', name: 'Karen Nguyen',     address: '5543 Caldwell Rd, Harrisburg, NC',   lat: 35.3340, lon: -80.6420, status: 'evacuated',   phone: '(704) 555-2256' },
]

// NFDRS standardized risk levels (National Fire Danger Rating System)
const NFDRS = [
  { level: 'Low', color: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/30', desc: 'Fires not likely' },
  { level: 'Moderate', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', desc: 'Some fires possible' },
  { level: 'High', color: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400/30', desc: 'Fires start easily' },
  { level: 'Very High', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', desc: 'Rapid spread expected' },
  { level: 'Extreme', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', desc: 'Extreme spread, mass ignition' },
]

const MUTUAL_AID = [
  { agency: 'NC State Forestry', type: 'Air support + ground crews', status: 'available', eta: '45 min' },
  { agency: 'Johnston County FD', type: 'Engine + crew (3)', status: 'available', eta: '20 min' },
  { agency: 'Wake County Emergency', type: 'EMS + command unit', status: 'deployed', eta: 'On scene' },
  { agency: 'FEMA Region 4', type: 'Type I Incident Management', status: 'pending', eta: '6–12 hr' },
]

const STAFFING = [
  { shift: 'A-Shift (On duty)', crew: ['Lt. Morris (OIC)', 'FF Garcia (Driver/Pump)', 'FF Patel (EMS)', 'FF Kim (S&R)'], truck: 'Engine 1 + Rescue 1' },
  { shift: 'B-Shift (On call)', crew: ['Capt. Rhodes', 'FF Johnson', 'FF Davis'], truck: 'Engine 2' },
]

const DEMO_FIRES = [
  { id: 'd1', incident_name: 'Dixie Fire', county: 'Plumas', state: 'CA', acres_burned: 963309, containment_pct: null, svi_score: 0.69, signal_gap_hours: 3.5 },
  { id: 'd2', incident_name: 'Bootleg Fire', county: 'Klamath', state: 'OR', acres_burned: 401279, containment_pct: null, svi_score: 0.58, signal_gap_hours: 2.1 },
  { id: 'd3', incident_name: 'Wallow Fire', county: 'Greenlee', state: 'AZ', acres_burned: 538049, containment_pct: null, svi_score: 0.74, signal_gap_hours: 18.4 },
  { id: 'd4', incident_name: 'Creek Fire', county: 'Fresno', state: 'CA', acres_burned: 379895, containment_pct: null, svi_score: 0.72, signal_gap_hours: 4.2 },
  { id: 'd5', incident_name: 'Caldor Fire', county: 'El Dorado', state: 'CA', acres_burned: 221774, containment_pct: null, svi_score: 0.61, signal_gap_hours: 6.8 },
  { id: 'd6', incident_name: 'Monument Fire', county: 'Trinity', state: 'CA', acres_burned: 223124, containment_pct: null, svi_score: 0.63, signal_gap_hours: null },
  { id: 'd7', incident_name: 'Snake River Complex', county: 'Owyhee', state: 'ID', acres_burned: 481838, containment_pct: null, svi_score: 0.71, signal_gap_hours: null },
  { id: 'd8', incident_name: 'Whitewater-Baldy', county: 'Catron', state: 'NM', acres_burned: 297845, containment_pct: null, svi_score: 0.78, signal_gap_hours: null },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface RedFlagWarning {
  zone: string
  headline: string
  onset: string
  expires: string
  lat: number
  lon: number
  description: string
}

interface NifcFire {
  id: string
  fire_name: string
  latitude: number
  longitude: number
  acres: number | null
  containment: number | null
  source: string
}

interface Shelter {
  name: string
  county: string
  state: string
  lat: number
  lon: number
  capacity: number | null
  occupancy: number | null
  pct_full: number | null
}

const COMMAND_QUICK_LINKS = [
  { label: 'ML Fire Prediction', href: '/dashboard/responder/analytics?tab=ml', icon: Brain, badge: 'AI', badgeColor: 'text-xs font-bold text-ember-400' },
  { label: 'ICS Board', href: '/dashboard/responder/ics', icon: Shield, badge: 'ICS', badgeColor: 'text-xs font-bold text-blue-400' },
  { label: 'Signal Gap Analysis', href: '/dashboard/responder/analytics?tab=signals', icon: Activity, badge: '99%', badgeColor: 'text-xs font-bold text-signal-warn' },
] as const

// ─── Helper: format ISO date ──────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Sub-component: Situation Report Header ──────────────────────────────────

function SituationReportHeader() {
  const [incidentName, setIncidentName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [nifcCount, setNifcCount] = useState<number | null>(null)
  const [shelterWarn, setShelterWarn] = useState<number | null>(null)
  const [redFlagLoaded, setRedFlagLoaded] = useState(false)
  const [nifcLoaded, setNifcLoaded] = useState(false)
  const [shelterLoaded, setShelterLoaded] = useState(false)

  // Load saved incident name
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active_incident_name')
      if (saved) setIncidentName(saved)
    } catch {}
  }, [])

  // Tick clock every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Fetch status chips
  useEffect(() => {
    fetch('/api/fires/redflags')
      .then(r => r.json())
      .then(d => setRedFlagCount(d.count ?? 0))
      .catch(() => setRedFlagCount(0))
      .finally(() => setRedFlagLoaded(true))

    fetch('/api/fires/nifc')
      .then(r => r.json())
      .then(d => setNifcCount(Array.isArray(d.data) ? d.data.length : 0))
      .catch(() => setNifcCount(0))
      .finally(() => setNifcLoaded(true))

    fetch('/api/shelters')
      .then(r => r.json())
      .then(d => setShelterWarn(d.near_capacity ?? 0))
      .catch(() => setShelterWarn(0))
      .finally(() => setShelterLoaded(true))
  }, [])

  function saveIncident(name: string) {
    setIncidentName(name)
    try { localStorage.setItem('active_incident_name', name) } catch {}
  }

  const timeStr = currentTime.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 text-ember-400 text-xs font-medium mb-4">
        <Shield className="w-3.5 h-3.5" />
        SITUATION REPORT
        <span className="ml-auto flex items-center gap-1.5 text-ash-500 font-mono text-xs">
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
      </div>

      {/* Incident name */}
      <input
        type="text"
        value={incidentName}
        onChange={e => saveIncident(e.target.value)}
        placeholder="Active incident name (e.g. Caldor Fire)…"
        className="w-full bg-ash-800 border border-ash-700 rounded-lg px-4 py-2.5 text-white text-base font-semibold focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600 transition-colors mb-4"
      />

      {/* Status chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Red Flag */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !redFlagLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          redFlagCount && redFlagCount > 0
            ? 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {!redFlagLoaded ? 'Loading…' : redFlagCount && redFlagCount > 0
            ? `${redFlagCount} Red Flag Warning${redFlagCount !== 1 ? 's' : ''}`
            : 'No Red Flag Warnings'
          }
        </div>

        {/* NIFC Active */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !nifcLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          nifcCount && nifcCount > 0
            ? 'bg-ember-500/10 border-ember-500/30 text-ember-400'
            : 'bg-ash-900 border-ash-800 text-ash-400'
        }`}>
          <Flame className="w-3.5 h-3.5 shrink-0" />
          {!nifcLoaded ? 'Loading…' : `${nifcCount ?? 0} NIFC Active`}
        </div>

        {/* Nearest Weather */}
        <Link
          href="#weather"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-signal-info/30 bg-signal-info/10 text-signal-info text-xs font-medium hover:bg-signal-info/20 transition-colors"
        >
          <Wind className="w-3.5 h-3.5 shrink-0" />
          View Weather ↓
        </Link>

        {/* Shelters */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
          !shelterLoaded ? 'bg-ash-900 border-ash-800 text-ash-500' :
          shelterWarn && shelterWarn > 0
            ? 'bg-signal-warn/10 border-signal-warn/30 text-signal-warn'
            : 'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
        }`}>
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {!shelterLoaded ? 'Loading…' : shelterWarn && shelterWarn > 0
            ? `${shelterWarn} shelter${shelterWarn !== 1 ? 's' : ''} near capacity`
            : 'Shelters OK'
          }
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component: Red Flag Warnings ────────────────────────────────────────

function RedFlagSection({ mapCenter }: { mapCenter: [number, number] }) {
  const [pins, setPins] = useState<EvacueePin[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
  const [showFacilities, setShowFacilities] = useState(false)
  const supabase = createClient()

  async function loadData() {
    setLoading(true)
    try {
      // Try to pull real check-in data from Supabase and augment with demo pins
      const { data: records } = await supabase
        .from('evacuee_records')
        .select('id, status, location_name, user_id, profiles(full_name, phone)')
        .order('updated_at', { ascending: false })
        .limit(100)

      if (records && records.length > 0) {
        // Real records don't have lat/lon, so we layer them over demo map as a count
        // For demo, still show demo pins but update counts
        setPins(DEMO_PINS)
      } else {
        setPins(DEMO_PINS)
      }
    } catch {
      setPins(DEMO_PINS)
    }

    // Also fetch red flag warnings count
    try {
      const res = await fetch('/api/fires/redflags')
      if (res.ok) {
        const data = await res.json()
        setRedFlagCount(Array.isArray(data) ? data.length : null)
      }
    } catch {
      // silently ignore
    }

    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line

  const byStatus = {
    evacuated:  pins.filter(p => p.status === 'evacuated').length,
    sheltering: pins.filter(p => p.status === 'sheltering').length,
    returning:  pins.filter(p => p.status === 'returning').length,
    unknown:    pins.filter(p => p.status === 'unknown').length,
  }

  const needHelp = pins.filter(p => p.status === 'unknown' && p.special_needs)

  return (
    <div className="flex flex-col min-h-[70dvh] h-[85dvh] max-h-[100dvh] sm:min-h-[80dvh] lg:h-screen lg:max-h-none bg-ash-950 wfa-responder-map-surface rounded-xl overflow-hidden border border-ash-800">
      {/* Top bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-ash-800 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 bg-ash-900">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-5 h-5 text-signal-info shrink-0" />
          <span className="font-display font-bold text-white text-sm truncate">Evacuation Status Map</span>
          <span className="text-ash-600 text-xs ml-1 hidden sm:inline">· API map layer concept</span>
        </div>

        {/* Status counts */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-safe/10 border border-signal-safe/20">
            <CheckCircle className="w-3 h-3 text-signal-safe" />
            <span className="text-signal-safe text-xs font-bold">{byStatus.evacuated}</span>
            <span className="text-ash-500 text-xs">safe</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/20">
            <AlertTriangle className="w-3 h-3 text-signal-danger" />
            <span className="text-signal-danger text-xs font-bold">{byStatus.unknown}</span>
            <span className="text-ash-500 text-xs">not evacuated</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-warn/10 border border-signal-warn/20">
            <Users className="w-3 h-3 text-signal-warn" />
            <span className="text-signal-warn text-xs font-bold">{byStatus.sheltering}</span>
            <span className="text-ash-500 text-xs">sheltering</span>
          </div>
        </div>

        <button
          onClick={() => setShowFacilities(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showFacilities
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'border-ash-700 text-ash-400 hover:text-white hover:border-ash-600'
          }`}
        >
          <Factory className="w-3 h-3" />
          {showFacilities ? 'Hazard Sites: ON' : 'Hazard Sites'}
        </button>

        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
          {redFlagCount !== null && redFlagCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
              <AlertTriangle className="w-3 h-3 text-signal-danger shrink-0" />
              <span className="text-signal-danger text-xs font-medium">{redFlagCount} Red Flag Warning{redFlagCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ash-500 text-xs">
            <Clock className="w-3 h-3 shrink-0" />
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ash-700 text-ash-400 hover:text-white hover:border-ash-600 transition-colors text-xs disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main content: map + priority sidebar */}
      <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row gap-0">
        {/* Map — takes most of the space */}
        <div className="flex-1 min-h-[220px] min-w-0 lg:min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-signal-info/30 border-t-signal-info rounded-full animate-spin mx-auto mb-3" />
                <div className="text-ash-500 text-sm">Loading evacuation data…</div>
              </div>
            </div>
          ) : (
            <EvacueeStatusMap
              pins={pins}
              center={mapCenter}
              zoom={12}
              facilities={HAZARD_FACILITIES}
              showFacilities={showFacilities}
            />
          )}
        </div>

        {/* Priority sidebar — households that need help */}
        <div className="w-full max-h-[42vh] lg:max-h-none lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-ash-800 bg-ash-900 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-ash-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-signal-danger" />
              <span className="text-white text-sm font-semibold">Priority — Needs Help</span>
              <span className="ml-auto w-5 h-5 rounded-full bg-signal-danger text-white text-xs flex items-center justify-center font-bold">
                {needHelp.length}
              </span>
            </div>
            <p className="text-ash-500 text-xs mt-1">Not evacuated · Special needs flagged</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {needHelp.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-signal-safe mx-auto mb-2" />
                <div className="text-ash-400 text-sm">All high-priority households accounted for</div>
              </div>
            ) : (
              <div className="divide-y divide-ash-800">
                {needHelp.map(pin => (
                  <div key={pin.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-signal-danger mt-1.5 shrink-0 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold truncate">{pin.name}</div>
                        <div className="flex items-center gap-1 text-ash-500 text-xs mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pin.address}</span>
                        </div>
                        {pin.special_needs && (
                          <div className="mt-1.5 text-xs text-signal-warn font-medium bg-signal-warn/10 border border-signal-warn/20 rounded px-2 py-0.5">
                            {pin.special_needs}
                          </div>
                        )}
                        {pin.phone && (
                          <div className="flex items-center gap-1 text-ash-400 text-xs mt-1.5">
                            <Phone className="w-3 h-3" />
                            {pin.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Non-special-needs not-evacuated */}
            {byStatus.unknown - needHelp.length > 0 && (
              <div className="px-4 py-3 border-t border-ash-800">
                <div className="text-ash-500 text-xs font-medium uppercase tracking-wider mb-2">Also not evacuated</div>
                <div className="divide-y divide-ash-800/50">
                  {pins.filter(p => p.status === 'unknown' && !p.special_needs).map(pin => (
                    <div key={pin.id} className="py-2.5">
                      <div className="text-ash-300 text-sm font-medium">{pin.name}</div>
                      <div className="flex items-center gap-1 text-ash-600 text-xs mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{pin.address}</span>
                      </div>
                      {pin.phone && (
                        <div className="flex items-center gap-1 text-ash-500 text-xs mt-1">
                          <Phone className="w-3 h-3" />
                          {pin.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-3 border-t border-ash-800 shrink-0">
            <p className="text-ash-600 text-xs leading-relaxed">
              This layer would integrate with your existing CAD system as an API overlay — showing registered residents' self-reported evacuation status in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-component: NIFC Live Incidents ───────────────────────────────────────

function NifcSection() {
  const [fires, setFires] = useState<NifcFire[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/fires/firms?limit=8')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fires?.length) setFires(data.fires)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (loaded && fires.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-signal-danger" />
        <h2 className="text-white font-semibold text-sm">Live NIFC Active Incidents</h2>
        <span className="ml-auto text-ash-600 text-xs">NASA FIRMS · refreshes every 5 min</span>
      </div>
      <div className="card overflow-hidden">
        {!loaded ? (
          <div className="p-6 text-center text-ash-500 text-sm">Loading live incidents…</div>
        ) : (
          <div className="divide-y divide-ash-800">
            {fires.slice(0, 6).map((f, i) => (
              <div key={f.id ?? i} className="flex items-center gap-4 px-5 py-3 hover:bg-ash-800/40 transition-colors">
                <div className="w-2 h-2 rounded-full bg-signal-danger animate-pulse-slow shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{f.fire_name || 'Active Fire'}</div>
                  <div className="text-ash-500 text-xs">{f.source}</div>
                </div>
                <div className="text-right shrink-0">
                  {f.acres != null && <div className="text-ash-300 text-xs font-mono">{f.acres.toLocaleString()} ac</div>}
                  {f.containment != null && <div className="text-signal-safe text-xs">{f.containment}% contained</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-component: Shelter Capacity ──────────────────────────────────────────

function ShelterSection() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [nearCapacity, setNearCapacity] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/shelters')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.shelters) { setShelters(data.shelters.slice(0, 8)); setNearCapacity(data.near_capacity ?? 0) }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-signal-info" />
        <h2 className="text-white font-semibold text-sm">Shelter Capacity — FEMA Live</h2>
        {nearCapacity > 0 && (
          <span className="badge-danger ml-2">{nearCapacity} near capacity</span>
        )}
        <span className="ml-auto text-ash-600 text-xs">FEMA NSS · updates every 5 min</span>
      </div>
      <div className="card overflow-hidden">
        {!loaded ? (
          <div className="p-6 text-center text-ash-500 text-sm">Loading shelter data…</div>
        ) : shelters.length === 0 ? (
          <div className="p-6 text-center text-ash-500 text-sm">No active shelters in system</div>
        ) : (
          <div className="divide-y divide-ash-800">
            {shelters.map((s, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-ash-800/40 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.pct_full != null && s.pct_full >= 80 ? 'bg-signal-danger' : s.pct_full != null && s.pct_full >= 50 ? 'bg-signal-warn' : 'bg-signal-safe'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{s.name}</div>
                  <div className="text-ash-500 text-xs">{s.county}{s.county && s.state ? ', ' : ''}{s.state}</div>
                </div>
                <div className="text-right shrink-0">
                  {s.capacity != null && <div className="text-ash-300 text-xs font-mono">{s.occupancy ?? '?'} / {s.capacity}</div>}
                  {s.pct_full != null && (
                    <div className={`text-xs font-bold ${s.pct_full >= 80 ? 'text-signal-danger' : s.pct_full >= 50 ? 'text-signal-warn' : 'text-signal-safe'}`}>{s.pct_full}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResponderDashboard() {
  const [activeFires, setActiveFires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const flameoAgent = useFlameoContext({ role: 'emergency_responder' })
  const { setPayload: setFlameoHubAgentPayload } = useFlameoHubAgentBridge()

  useEffect(() => {
    setFlameoHubAgentPayload({
      context: flameoAgent.context,
      status: flameoAgent.status,
      flameoRole: 'responder',
    })
  }, [flameoAgent.context, flameoAgent.status, setFlameoHubAgentPayload])

  const { center, weatherLocation, stationLabel, manualInput, setManualInput, applyManualStation, geoReady } = useResponderStationAnchor()
  const [weather, setWeather] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    if (!geoReady || !weatherLocation.trim()) return
    let cancelled = false
    async function loadWeather() {
      setWeatherLoading(true)
      try {
        const res = await fetch(`/api/weather?location=${encodeURIComponent(weatherLocation)}`)
        if (res.ok && !cancelled) setWeather(await res.json())
      } catch {}
      if (!cancelled) setWeatherLoading(false)
    }
    loadWeather()
    return () => { cancelled = true }
  }, [geoReady, weatherLocation])

  async function applyStationAndRefresh() {
    await applyManualStation()
  }

  async function refreshWeatherOnly() {
    if (!weatherLocation.trim()) return
    setWeatherLoading(true)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(weatherLocation)}`)
      if (res.ok) setWeather(await res.json())
    } catch {}
    setWeatherLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('fire_events')
        .select('id, incident_name, county, state, acres_burned, containment_pct, started_at, svi_score, signal_gap_hours')
        .is('containment_pct', null)
        .order('acres_burned', { ascending: false })
        .limit(8)
      if (data && data.length > 0) setActiveFires(data)
      else setActiveFires(DEMO_FIRES as any[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8">

      {/* Situation Report Header */}
      <SituationReportHeader />

      <div className="mb-8">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Shield className="w-4 h-4" />
          EMERGENCY RESPONDER · FLAMEO FIELD INTEL
        </div>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Incident Command Center</h1>
        <p className="text-ash-400 text-sm mb-2">Live fire intelligence, mutual aid coordination, and evacuation status on this hub.</p>
        <Link href="/dashboard/responder/analytics" className="inline-flex items-center gap-1 text-signal-info text-sm font-medium hover:underline">
          Open Command Analytics dashboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick nav — single path to ICS; evacuation map stays on this page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/dashboard/responder/analytics?tab=ml" className="card p-5 hover:bg-ash-800 transition-all hover:scale-[1.02] group">
          <div className="flex items-center justify-between mb-3">
            <Brain className="w-5 h-5 text-ash-400 group-hover:text-white transition-colors" />
            <span className="text-xs font-bold text-ember-400">AI</span>
          </div>
          <div className="text-white text-sm font-medium">ML Fire Prediction</div>
          <ChevronRight className="w-4 h-4 text-ash-600 group-hover:text-ash-300 mt-2 transition-colors" />
        </Link>

        <div
          className="card p-5 cursor-default border border-dashed border-ash-600/50"
          aria-label="Active incidents in jurisdiction. Details are on this page below."
        >
          <div className="flex items-center justify-between mb-3">
            <Flame className="w-5 h-5 text-signal-danger" />
            <span className="text-xs font-bold text-signal-danger tabular-nums">{loading ? '…' : activeFires.length}</span>
          </div>
          <div className="text-white text-sm font-medium">Active incidents in jurisdiction</div>
          <p className="text-ash-500 text-xs mt-2 leading-snug">Evacuation map and largest incidents table are on this hub — not a separate route.</p>
        </div>

        {COMMAND_QUICK_LINKS.slice(1).map(({ label, href, icon: Icon, badge, badgeColor }) => (
          <Link key={href} href={href} className="card p-5 hover:bg-ash-800 transition-all hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-ash-400 group-hover:text-white transition-colors" />
              <span className={badgeColor}>{badge}</span>
            </div>
            <div className="text-white text-sm font-medium">{label}</div>
            <ChevronRight className="w-4 h-4 text-ash-600 group-hover:text-ash-300 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Red Flag Warnings — TIME-CRITICAL: shown above NFDRS scale */}
      <RedFlagSection mapCenter={center} />

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* NFDRS Risk Scale */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-ember-400" />
            <h2 className="text-white font-semibold text-sm">NFDRS Fire Danger Scale</h2>
            <span className="ml-auto text-ash-600 text-xs">NWCG Standard</span>
          </div>
          <div className="space-y-2">
            {NFDRS.map(n => (
              <div key={n.level} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${n.border} bg-ash-900`}>
                <div className={`w-3 h-3 rounded-full ${n.color} shrink-0`} />
                <span className={`text-sm font-semibold w-20 shrink-0 ${n.text}`}>{n.level}</span>
                <span className="text-ash-500 text-xs">{n.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">Standardized by NWCG. Active hotspots: bright red (0–12h), orange (12–24h), dark red (24h+). Contained perimeters: black lines. Uncontained: red lines.</p>
        </div>

        {/* Mutual Aid Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-signal-info" />
            <h2 className="text-white font-semibold text-sm">Mutual Aid & FEMA Resources</h2>
            <span className="ml-auto text-ash-600 text-xs">WebEOC sync</span>
          </div>
          <div className="space-y-2">
            {MUTUAL_AID.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-ash-900 border border-ash-800">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.status === 'available' ? 'bg-signal-safe' : a.status === 'deployed' ? 'bg-signal-info' : 'bg-signal-warn'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{a.agency}</div>
                  <div className="text-ash-500 text-xs">{a.type}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-mono font-bold ${a.status === 'available' ? 'text-signal-safe' : a.status === 'deployed' ? 'text-signal-info' : 'text-signal-warn'}`}>{a.eta}</div>
                  <div className="text-ash-600 text-xs capitalize">{a.status}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">FEMA orders processed via state-level ICS. Mutual aid agreements active per district protocols.</p>
        </div>

        {/* Staffing & Engine Assignments */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-signal-warn" />
            <h2 className="text-white font-semibold text-sm">Staffing & Engine Assignments</h2>
          </div>
          <div className="space-y-3">
            {STAFFING.map((s, i) => (
              <div key={i} className="rounded-lg border border-ash-800 bg-ash-900 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-white text-xs font-semibold">{s.shift}</span>
                  <span className="ml-auto text-ash-500 text-xs">{s.truck}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.crew.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-ash-800 border border-ash-700 rounded text-ash-300 text-xs">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-ash-600 text-xs mt-3">Critical Task Analysis determines pumper, driver, EMS, and S&R assignments based on incident need vs. available resources.</p>
        </div>

        {/* Weather Conditions */}
        <div id="weather" className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wind className="w-4 h-4 text-signal-info" />
            <h2 className="text-white font-semibold text-sm">Current Conditions</h2>
            <span className="ml-auto text-ash-600 text-xs">Open-Meteo · station anchor</span>
          </div>
          {stationLabel && (
            <p className="text-ash-500 text-xs mb-3">
              Auto: profile home or device location{stationLabel ? ` · ${stationLabel}` : ''}. Adjust to query nearby counties.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyStationAndRefresh()}
              placeholder="City, zip, or county…"
              className="flex-1 min-w-[12rem] bg-ash-800 border border-ash-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600"
            />
            <button type="button" onClick={() => applyStationAndRefresh()} disabled={weatherLoading}
              className="px-3 py-1.5 rounded-lg text-xs bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors disabled:opacity-50">
              Apply
            </button>
            <button type="button" onClick={() => refreshWeatherOnly()} disabled={weatherLoading}
              className="px-3 py-1.5 rounded-lg text-xs border border-ash-600 text-ash-400 hover:text-white hover:border-ash-500 transition-colors disabled:opacity-50">
              {weatherLoading ? '…' : 'Refresh'}
            </button>
          </div>
          {weather ? (
            <>
              <div className="text-ash-500 text-xs mb-3 truncate">{weather.location}</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Temp', value: weather.temp_f != null ? `${weather.temp_f}°F` : '—', icon: Flame, color: weather.temp_f != null && weather.temp_f > 90 ? 'text-ember-400' : 'text-ash-300' },
                  { label: 'Wind', value: weather.wind_mph != null ? `${weather.wind_mph} mph${weather.wind_dir ? ' ' + weather.wind_dir : ''}` : '—', icon: Wind, color: weather.wind_mph != null && weather.wind_mph > 20 ? 'text-signal-warn' : 'text-ash-300' },
                  { label: 'Humidity', value: weather.humidity_pct != null ? `${weather.humidity_pct}%` : '—', icon: Droplets, color: weather.humidity_pct != null && weather.humidity_pct < 20 ? 'text-signal-danger' : 'text-ash-300' },
                  { label: 'Visibility', value: weather.visibility_miles != null ? `${weather.visibility_miles} mi` : '—', icon: Map, color: 'text-ash-300' },
                ].map(c => (
                  <div key={c.label} className="bg-ash-900 rounded-lg p-2.5 border border-ash-800">
                    <div className="flex items-center gap-1 mb-1">
                      <c.icon className={`w-3 h-3 ${c.color}`} />
                      <span className="text-ash-500 text-xs">{c.label}</span>
                    </div>
                    <div className={`font-mono text-sm font-bold ${c.color}`}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium ${
                weather.fire_risk_color === 'signal-danger' ? 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger' :
                weather.fire_risk_color === 'signal-warn' ? 'bg-signal-warn/10 border-signal-warn/30 text-signal-warn' :
                'bg-signal-safe/10 border-signal-safe/30 text-signal-safe'
              }`}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Fire risk: {weather.fire_risk}{weather.red_flag ? ' · Red Flag Warning' : ''}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-ash-600 text-xs">
              {geoReady ? 'Loading conditions for your station…' : 'Resolving station from profile or device…'}
            </div>
          )}
        </div>
      </div>

      {/* Live NIFC Incidents — added section */}
      <NifcSection />

      {/* Active fires table */}
      <div>
        <h2 className="section-title mb-4">Largest Active Incidents</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ash-800 text-left">
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Incident</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Acres</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                <th className="px-6 py-4 text-ash-400 text-xs font-medium uppercase tracking-wider">Alert Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash-800">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-ash-800 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : activeFires.length > 0 ? activeFires.map(fire => (
                <tr key={fire.id} className="hover:bg-ash-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-signal-danger animate-pulse-slow" />
                      <span className="text-white text-sm font-medium truncate max-w-[160px]">{fire.incident_name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ash-400 text-sm">{fire.county ? `${fire.county}, ` : ''}{fire.state || '—'}</td>
                  <td className="px-6 py-4 text-ash-300 text-sm font-mono">{fire.acres_burned ? fire.acres_burned.toLocaleString() : '—'}</td>
                  <td className="px-6 py-4">
                    {fire.svi_score != null ? (
                      <span className={fire.svi_score > 0.75 ? 'badge-danger' : fire.svi_score > 0.5 ? 'badge-warn' : 'badge-safe'}>{fire.svi_score.toFixed(2)}</span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {fire.signal_gap_hours != null ? (
                      <span className={fire.signal_gap_hours > 12 ? 'text-signal-danger' : fire.signal_gap_hours > 6 ? 'text-signal-warn' : 'text-signal-safe'}>{fire.signal_gap_hours.toFixed(1)}h</span>
                    ) : <span className="text-ash-600">—</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-ash-500 text-sm">No active incident data. Connect to live data feed to populate.</td></tr>
              )}
            </tbody>
          </table>
          <p className="text-ash-600 text-xs px-6 py-3 border-t border-ash-800">
            WiDS 2021–2025 historical record · Live incidents require connected data feed · Sorted by max acreage
          </p>
        </div>
      </div>

      {/* Shelter Capacity — added section */}
      <ShelterSection />
    </div>
  )
}
