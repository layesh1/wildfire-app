'use client'
import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, MapPin, Users, Clock, Search, Radio, Heart } from 'lucide-react'

const ALL_COVERAGE_DATA = [
  { region: 'Los Angeles County, CA', status: 'covered', agencies: 12, response_time: 8, population: 10014009, svi: 0.61 },
  { region: 'San Bernardino County, CA', status: 'gap', agencies: 4, response_time: 34, population: 2181654, svi: 0.72 },
  { region: 'Riverside County, CA', status: 'partial', agencies: 6, response_time: 22, population: 2418185, svi: 0.68 },
  { region: 'Ventura County, CA', status: 'covered', agencies: 8, response_time: 11, population: 843843, svi: 0.44 },
  { region: 'San Diego County, CA', status: 'covered', agencies: 11, response_time: 9, population: 3298634, svi: 0.52 },
  { region: 'Fresno County, CA', status: 'partial', agencies: 5, response_time: 28, population: 1008654, svi: 0.78 },
  { region: 'Kern County, CA', status: 'gap', agencies: 3, response_time: 41, population: 900202, svi: 0.75 },
  { region: 'Shasta County, CA', status: 'partial', agencies: 4, response_time: 31, population: 181050, svi: 0.67 },
  { region: 'Maricopa County, AZ', status: 'partial', agencies: 9, response_time: 19, population: 4420568, svi: 0.57 },
  { region: 'Pinal County, AZ', status: 'gap', agencies: 2, response_time: 47, population: 411923, svi: 0.79 },
  { region: 'Pima County, AZ', status: 'covered', agencies: 7, response_time: 14, population: 1043433, svi: 0.63 },
  { region: 'Coconino County, AZ', status: 'gap', agencies: 2, response_time: 58, population: 145131, svi: 0.69 },
  { region: 'King County, WA', status: 'covered', agencies: 14, response_time: 7, population: 2252782, svi: 0.38 },
  { region: 'Chelan County, WA', status: 'gap', agencies: 1, response_time: 62, population: 77200, svi: 0.71 },
  { region: 'Yakima County, WA', status: 'partial', agencies: 4, response_time: 26, population: 256228, svi: 0.76 },
  { region: 'Okanogan County, WA', status: 'gap', agencies: 1, response_time: 71, population: 42243, svi: 0.73 },
  { region: 'Larimer County, CO', status: 'partial', agencies: 5, response_time: 25, population: 359066, svi: 0.42 },
  { region: 'Boulder County, CO', status: 'covered', agencies: 8, response_time: 10, population: 330758, svi: 0.35 },
  { region: 'Mesa County, CO', status: 'partial', agencies: 3, response_time: 33, population: 154210, svi: 0.61 },
  { region: 'Jefferson County, MT', status: 'gap', agencies: 1, response_time: 78, population: 12085, svi: 0.65 },
  { region: 'Ravalli County, MT', status: 'gap', agencies: 2, response_time: 54, population: 43806, svi: 0.62 },
  { region: 'Bernalillo County, NM', status: 'covered', agencies: 6, response_time: 13, population: 679121, svi: 0.66 },
  { region: 'Catron County, NM', status: 'gap', agencies: 1, response_time: 89, population: 3527, svi: 0.81 },
  { region: 'Klamath County, OR', status: 'partial', agencies: 4, response_time: 29, population: 66811, svi: 0.64 },
  { region: 'Lake County, OR', status: 'gap', agencies: 1, response_time: 67, population: 7869, svi: 0.71 },
  { region: 'Travis County, TX', status: 'covered', agencies: 10, response_time: 9, population: 1290188, svi: 0.48 },
  { region: 'Presidio County, TX', status: 'gap', agencies: 1, response_time: 94, population: 6131, svi: 0.84 },
  { region: 'Johnston County, NC', status: 'covered', agencies: 6, response_time: 12, population: 215999, svi: 0.55 },
  { region: 'Buncombe County, NC', status: 'partial', agencies: 5, response_time: 18, population: 269452, svi: 0.51 },
  { region: 'Ravalli County, ID', status: 'gap', agencies: 2, response_time: 52, population: 43806, svi: 0.63 },
]

const STATUS_CONFIG = {
  covered: { label: 'Covered', color: 'text-signal-safe', badge: 'badge-safe', icon: CheckCircle },
  partial: { label: 'Partial Gap', color: 'text-signal-warn', badge: 'badge-warn', icon: AlertTriangle },
  gap: { label: 'Critical Gap', color: 'text-signal-danger', badge: 'badge-danger', icon: XCircle },
}

interface AssistRequest {
  id: string
  name: string
  address: string
  people: number
  needs: string
  urgency: 'high' | 'medium' | 'low'
  submitted_at: string
  status: 'pending' | 'responding' | 'resolved'
}

export default function AgencyCoveragePage() {
  const [filter, setFilter] = useState<'all' | 'gap' | 'partial'>('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'coverage' | 'requests'>('coverage')
  const [requests, setRequests] = useState<AssistRequest[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('wfa_evac_requests')
    if (stored) {
      try { setRequests(JSON.parse(stored)) } catch {}
    }
  }, [])

  function updateStatus(id: string, status: AssistRequest['status']) {
    const updated = requests.map(r => r.id === id ? { ...r, status } : r)
    setRequests(updated)
    localStorage.setItem('wfa_evac_requests', JSON.stringify(updated))
  }

  const filtered = ALL_COVERAGE_DATA.filter(row => {
    const matchFilter = filter === 'all' || row.status === filter || (filter === 'gap' && row.status === 'partial')
    const matchSearch = !search || row.region.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const gaps = ALL_COVERAGE_DATA.filter(r => r.status === 'gap').length
  const partial = ALL_COVERAGE_DATA.filter(r => r.status === 'partial').length
  const maxTime = Math.max(...ALL_COVERAGE_DATA.map(r => r.response_time))
  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-warn text-sm font-medium mb-3">
          <Shield className="w-4 h-4" /> AGENCY COVERAGE
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Agency Coverage & Assist Requests</h1>
        <p className="text-ash-400 text-sm">Emergency response coverage across US counties, plus live evacuation assistance requests from residents.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5"><div className="font-display text-3xl font-bold text-signal-danger">{gaps}</div><div className="text-ash-400 text-sm mt-1">Critical gaps</div></div>
        <div className="card p-5"><div className="font-display text-3xl font-bold text-signal-warn">{partial}</div><div className="text-ash-400 text-sm mt-1">Partial coverage</div></div>
        <div className="card p-5"><div className="font-display text-3xl font-bold text-ember-400">{maxTime} min</div><div className="text-ash-400 text-sm mt-1">Max response time</div></div>
        <div className={`card p-5 ${pending > 0 ? 'border-signal-danger/30 bg-signal-danger/5' : ''}`}>
          <div className={`font-display text-3xl font-bold ${pending > 0 ? 'text-signal-danger' : 'text-signal-safe'}`}>{pending}</div>
          <div className="text-ash-400 text-sm mt-1">Assist requests pending</div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-ash-900 rounded-xl p-1 border border-ash-800 w-fit">
        <button onClick={() => setTab('coverage')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'coverage' ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}>
          <Shield className="w-3.5 h-3.5" /> Coverage Map
        </button>
        <button onClick={() => setTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'requests' ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}>
          <Radio className="w-3.5 h-3.5" /> Assist Requests
          {pending > 0 && <span className="w-5 h-5 rounded-full bg-signal-danger text-white text-xs flex items-center justify-center font-bold">{pending}</span>}
        </button>
      </div>

      {tab === 'coverage' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ash-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search county or state…"
                className="w-full bg-ash-800 border border-ash-700 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-ash-500 placeholder:text-ash-600" />
            </div>
            {(['all', 'gap', 'partial'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
                {f === 'all' ? `All (${ALL_COVERAGE_DATA.length})` : f === 'gap' ? 'Gaps only' : 'Partial only'}
              </button>
            ))}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ash-800 text-left">
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Region</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Agencies</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Response</th>
                  <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash-800">
                {filtered.map((row, i) => {
                  const cfg = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG]
                  const Icon = cfg.icon
                  return (
                    <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-ash-600 shrink-0" />
                          <span className="text-white text-sm font-medium">{row.region}</span>
                        </div>
                        <div className="text-ash-600 text-xs mt-0.5 pl-5">{row.population.toLocaleString()} residents</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span className={cfg.badge}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-ash-600" />
                          <span className="text-ash-300 text-sm">{row.agencies}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-mono font-bold ${row.response_time > 40 ? 'text-signal-danger' : row.response_time > 20 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                          {row.response_time} min
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-mono ${row.svi > 0.7 ? 'text-signal-danger' : row.svi > 0.5 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                          {row.svi.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="card p-12 text-center">
              <Heart className="w-10 h-10 text-ash-700 mx-auto mb-3" />
              <div className="text-white font-semibold mb-1">No assist requests yet</div>
              <div className="text-ash-500 text-sm max-w-sm mx-auto">When caregivers or evacuees submit help requests from their dashboard, they appear here for dispatch.</div>
            </div>
          ) : requests.map(req => (
            <div key={req.id} className={`card p-4 border-l-4 ${req.urgency === 'high' ? 'border-l-signal-danger' : req.urgency === 'medium' ? 'border-l-signal-warn' : 'border-l-signal-safe'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase ${req.urgency === 'high' ? 'text-signal-danger' : req.urgency === 'medium' ? 'text-signal-warn' : 'text-signal-safe'}`}>{req.urgency} priority</span>
                    <span className="text-ash-600 text-xs">{new Date(req.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-white font-semibold text-sm">{req.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-ash-500" />
                    <span className="text-ash-400 text-xs">{req.address}</span>
                  </div>
                  <div className="text-ash-500 text-xs mt-1">{req.people} {req.people === 1 ? 'person' : 'people'}{req.needs ? ` · ${req.needs}` : ''}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {req.status === 'pending' && (
                    <button onClick={() => updateStatus(req.id, 'responding')}
                      className="px-3 py-1.5 rounded-lg text-xs bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors">
                      Responding
                    </button>
                  )}
                  {req.status === 'responding' && (
                    <>
                      <span className="px-2 py-1 rounded text-xs bg-signal-info/20 text-signal-info text-center">En route</span>
                      <button onClick={() => updateStatus(req.id, 'resolved')}
                        className="px-3 py-1.5 rounded-lg text-xs bg-signal-safe/20 border border-signal-safe/30 text-signal-safe hover:bg-signal-safe/30 transition-colors">
                        Resolved
                      </button>
                    </>
                  )}
                  {req.status === 'resolved' && (
                    <span className="px-2 py-1 rounded text-xs bg-signal-safe/20 text-signal-safe text-center">Resolved</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
