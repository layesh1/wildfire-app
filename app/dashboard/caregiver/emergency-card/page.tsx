'use client'
import { useState, useEffect } from 'react'
import { FileText, Download, Phone, MapPin, AlertTriangle, Heart, Shield } from 'lucide-react'

const MOBILITY_CHECKLISTS: Record<string, string[]> = {
  'Mobile Adult': [
    'Grab go-bag (documents, medications, charger, cash)',
    'Close all windows and doors on the way out',
    'Take your most direct pre-planned route',
    'Text your emergency contact when leaving',
    'Drive at least 20 miles from the fire',
  ],
  'Elderly': [
    'Call your designated driver/helper immediately',
    'Pack medications (7-day supply), glasses, hearing aids',
    'Bring grab bar or mobility aids',
    'Alert a neighbor or community center',
    'Allow extra time — leave as soon as you hear of the fire',
  ],
  'Disabled': [
    'Contact pre-registered accessible transport service',
    'Pack all medical equipment and power adapters',
    'Notify local emergency registry if pre-registered',
    'Have a backup person who knows your location',
    'Request lift-equipped transit if needed',
  ],
  'No Vehicle': [
    'Call your county accessible transport number immediately',
    'Contact a neighbor or church community for a ride',
    'Walk to your pre-identified pickup point',
    'Know your transit evacuation route',
    'Carry transit card / cash for any alternative',
  ],
  'Medical Equipment': [
    'Pack backup power source for nebulizer / O2 concentrator',
    'Bring printed medication list and prescriptions',
    'Notify receiving shelter of medical equipment needs',
    'Pack extra supplies (oxygen tubing, nebulizer cups)',
    'Confirm hospital / medical shelter location in advance',
  ],
}

export default function EmergencyCardPage() {
  const [profile, setProfile] = useState({
    name: '',
    address: '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    mobility: 'Mobile Adult',
    dependents: [] as {name: string; mobility: string}[],
    notes: '',
  })

  useEffect(() => {
    try {
      // Load from settings localStorage if available
      const raw = localStorage.getItem('wfa_profile_cache')
      if (raw) {
        const p = JSON.parse(raw)
        setProfile(prev => ({
          ...prev,
          name: p.full_name || '',
          address: p.address || '',
          phone: p.phone || '',
          emergencyContactName: p.emergency_contact_name || '',
          emergencyContactPhone: p.emergency_contact_phone || '',
        }))
      }
      // Load persons
      const personsRaw = localStorage.getItem('monitored_persons_v2')
      if (personsRaw) {
        const persons = JSON.parse(personsRaw)
        setProfile(prev => ({
          ...prev,
          dependents: persons.map((p: any) => ({ name: p.name, mobility: p.mobility || 'Mobile Adult' })),
        }))
      }
    } catch {}
  }, [])

  function printCard() {
    window.print()
  }

  const checklist = MOBILITY_CHECKLISTS[profile.mobility] || MOBILITY_CHECKLISTS['Mobile Adult']

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 no-print">
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
          <FileText className="w-4 h-4" />
          CAREGIVER · EMERGENCY CARD
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Emergency Card</h1>
        <p className="text-gray-500 text-sm mb-4">Fill in your details, then download or print. Store offline — this card works when apps fail.</p>
        <button
          onClick={printCard}
          className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 rounded-xl text-white font-semibold transition-colors"
        >
          <Download className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Edit form — no-print */}
      <div className="card p-5 mb-6 no-print space-y-4">
        <h2 className="text-gray-900 font-semibold text-sm">Your Information</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Your name</label>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))}
              placeholder="Full name" className="input" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Your phone</label>
            <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({...p, phone: e.target.value}))}
              placeholder="+1 (555) 000-0000" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-gray-500 text-xs block mb-1">Your address</label>
            <input type="text" value={profile.address} onChange={e => setProfile(p => ({...p, address: e.target.value}))}
              placeholder="123 Main St, City, CA 95003" className="input" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Emergency contact name</label>
            <input type="text" value={profile.emergencyContactName} onChange={e => setProfile(p => ({...p, emergencyContactName: e.target.value}))}
              placeholder="Contact name" className="input" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Emergency contact phone</label>
            <input type="tel" value={profile.emergencyContactPhone} onChange={e => setProfile(p => ({...p, emergencyContactPhone: e.target.value}))}
              placeholder="+1 (555) 000-0001" className="input" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Your mobility level</label>
            <select value={profile.mobility} onChange={e => setProfile(p => ({...p, mobility: e.target.value}))} className="input">
              {Object.keys(MOBILITY_CHECKLISTS).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Special notes</label>
            <input type="text" value={profile.notes} onChange={e => setProfile(p => ({...p, notes: e.target.value}))}
              placeholder="e.g. nebulizer required, no vehicle" className="input" />
          </div>
        </div>
      </div>

      {/* Printable card */}
      <div className="print-card rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
        {/* Card header */}
        <div className="bg-forest-50 border-b border-forest-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-forest-100 border border-forest-200 flex items-center justify-center">
                <Shield className="w-5 h-5 text-forest-600" />
              </div>
              <div>
                <div className="font-display font-bold text-gray-900 text-lg">WILDFIRE EMERGENCY CARD</div>
                <div className="text-forest-600/70 text-xs">Minutes Matter · minutesmatter.app</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-xs">Generated</div>
              <div className="text-gray-700 text-xs font-mono">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <Heart className="w-3 h-3" /> Name
              </div>
              <div className="text-gray-900 font-semibold">{profile.name || '____________________'}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <Phone className="w-3 h-3" /> Phone
              </div>
              <div className="text-gray-900 font-semibold font-mono">{profile.phone || '____________________'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <MapPin className="w-3 h-3" /> Home Address
              </div>
              <div className="text-gray-900 font-semibold">{profile.address || '____________________________________'}</div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Emergency contact */}
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Emergency Contact</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="text-gray-400 text-xs mb-0.5">Name</div>
                <div className="text-gray-900 font-semibold text-sm">{profile.emergencyContactName || '____________________'}</div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="text-gray-400 text-xs mb-0.5">Phone</div>
                <div className="text-gray-900 font-semibold text-sm font-mono">{profile.emergencyContactPhone || '____________________'}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Critical numbers */}
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Critical Numbers</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
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
                <span className="text-gray-500">Poison Control</span>
                <span className="text-gray-900 font-mono font-bold">1-800-222-1222</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Mobility-adaptive checklist */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-signal-warn" />
              <div className="text-gray-400 text-xs uppercase tracking-wider">Evacuation Checklist ({profile.mobility})</div>
            </div>
            <ol className="space-y-1.5">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dependents */}
          {profile.dependents.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">People I&rsquo;m Responsible For</div>
                <div className="space-y-1">
                  {profile.dependents.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-900">{d.name}</span>
                      <span className="text-gray-400 text-xs">{d.mobility}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Special notes */}
          {profile.notes && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Special Notes</div>
                <div className="text-gray-700 text-sm">{profile.notes}</div>
              </div>
            </>
          )}

          <div className="border-t border-gray-100 pt-3 text-gray-300 text-xs">
            Minutes Matter Emergency Card · Print and store offline · minutesmatter.app
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border-color: #ccc !important; background: white !important; }
          .print-card * { color: black !important; background: transparent !important; border-color: #eee !important; }
        }
      `}</style>
    </div>
  )
}
