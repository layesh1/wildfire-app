'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Shield, AlertTriangle, Users, CheckCircle, Clock, MapPin, Phone, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { EvacueePin } from '@/components/EvacueeStatusMap'

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

export default function ResponderHubPage() {
  const [pins, setPins] = useState<EvacueePin[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [redFlagCount, setRedFlagCount] = useState<number | null>(null)
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
    <div className="flex flex-col h-screen bg-ash-950">
      {/* Top bar */}
      <div className="px-6 py-3 border-b border-ash-800 flex items-center gap-4 shrink-0 bg-ash-900">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-signal-info" />
          <span className="font-display font-bold text-white text-sm">Evacuation Status Map</span>
          <span className="text-ash-600 text-xs ml-1">· API map layer concept</span>
        </div>

        {/* Status counts */}
        <div className="flex items-center gap-3 ml-2">
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

        <div className="ml-auto flex items-center gap-3">
          {redFlagCount !== null && redFlagCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-signal-danger/10 border border-signal-danger/30">
              <AlertTriangle className="w-3 h-3 text-signal-danger" />
              <span className="text-signal-danger text-xs font-medium">{redFlagCount} Red Flag Warning{redFlagCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ash-500 text-xs">
            <Clock className="w-3 h-3" />
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
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Map — takes most of the space */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-signal-info/30 border-t-signal-info rounded-full animate-spin mx-auto mb-3" />
                <div className="text-ash-500 text-sm">Loading evacuation data…</div>
              </div>
            </div>
          ) : (
            <EvacueeStatusMap pins={pins} center={[35.4250, -80.5900]} zoom={12} />
          )}
        </div>

        {/* Priority sidebar — households that need help */}
        <div className="w-72 shrink-0 border-l border-ash-800 bg-ash-900 flex flex-col overflow-hidden">
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
