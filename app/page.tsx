'use client'
import { useRouter } from 'next/navigation'
import { Flame, Shield, Heart, BarChart3, Monitor, Bell, Map, Brain } from 'lucide-react'

const stats = [
  { value: '62,696', label: 'Fire incidents analyzed', sub: '2021–2025' },
  { value: '11.5h', label: 'Median evacuation delay', sub: 'across all counties' },
  { value: '99.74%', label: 'Fires w/ no formal order', sub: 'despite external signals' },
  { value: '9×', label: 'State disparity gap', sub: 'fastest vs slowest' },
]

const features = [
  { icon: Bell, title: 'Personalized Alerts', desc: 'Real-time evacuation orders tailored to your location and needs.' },
  { icon: Map, title: 'Evacuation Mapping', desc: 'Live fire perimeters, safe routes, and shelter locations.' },
  { icon: Brain, title: 'ML Spread Predictor', desc: 'XGBoost & Random Forest models predict fire spread 24h ahead.' },
  { icon: Shield, title: 'Signal Gap Analysis', desc: 'Identifies underserved communities missing critical alerts.' },
]

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* Navbar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-50 border border-forest-200 flex items-center justify-center">
              <Flame className="w-5 h-5 text-forest-600" />
            </div>
            <span className="font-display font-bold text-gray-900 text-lg">WildfireAlert</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#about" className="hover:text-gray-900 transition-colors">About</a>
            <a href="#resources" className="hover:text-gray-900 transition-colors">Resources</a>
          </nav>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Join
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-hidden">
        <div className="absolute inset-0 bg-forest-radial opacity-30 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-16">

          {/* Left: text + buttons */}
          <div className="flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-amber-200 rounded-full px-3 py-1.5 text-xs text-amber-700 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              WiDS Datathon 2025 · California
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Stay Safe From<br />
              <span className="text-gradient-forest">Wildfires</span><br />
              When Seconds Count
            </h1>
            <p className="text-gray-600 text-lg mb-10 leading-relaxed">
              WildfireAlert analyzes signal gaps across 62,696 fire incidents to deliver equity-driven evacuation intelligence — reaching every community, especially the most vulnerable.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                {/* Apple icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Download on App Store
              </button>
              <button
                onClick={() => router.push('/auth/login?role=caregiver')}
                className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                {/* Play Store icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.89-7.43-2.79-2.79L3.18 23.76zM.1 1.22C.04 1.46 0 1.72 0 2v20c0 .28.04.54.1.78l.06.06 11.2-11.2v-.28L.16 1.16.1 1.22zM20.84 10.6l-2.66-1.54-3.14 3.14 3.14 3.14 2.67-1.54c.76-.44.76-1.16-.01-1.2zM4.17.24l12.01 6.93-2.79 2.79L4.17.24z"/>
                </svg>
                Get It on Google Play
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="flex items-center gap-2.5 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-5 py-3 rounded-xl border border-gray-300 transition-all duration-200 hover:scale-[1.02]"
              >
                <Monitor className="w-5 h-5 text-gray-600" />
                Use On Web Browser
              </button>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="relative flex-shrink-0">
            {/* Back phone (slightly offset) */}
            <div className="absolute -right-6 top-6 w-52 h-[420px] bg-gray-900 rounded-[2.5rem] border-4 border-gray-800 shadow-2xl overflow-hidden opacity-80">
              <div className="h-full bg-gradient-to-b from-gray-800 to-gray-900 p-3">
                <div className="h-5 bg-gray-700 rounded-full mb-2 w-20 mx-auto" />
                <div className="space-y-2">
                  {['Mosquito Fire', 'Oak Fire', 'River Fire'].map((name, i) => (
                    <div key={name} className="bg-gray-800 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white text-xs font-medium">{name}</span>
                      </div>
                      <div className="text-gray-400 text-xs">{['76,788 acres', '19,244 acres', '2,900 acres'][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Front phone */}
            <div className="relative z-10 w-60 h-[480px] bg-gray-900 rounded-[2.8rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-900 rounded-full z-10" />

              {/* Screen content */}
              <div className="h-full bg-white flex flex-col">
                {/* App header */}
                <div className="bg-forest-700 px-4 pt-8 pb-3">
                  <div className="text-white text-xs font-bold tracking-wider mb-1">WILDFIRE ALERT</div>
                  <div className="flex items-center justify-between">
                    <span className="text-forest-200 text-xs">Live Incidents</span>
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">LIVE</span>
                  </div>
                </div>

                {/* Map area */}
                <div className="relative bg-emerald-50 flex-1 overflow-hidden">
                  {/* Fake map grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#16a34a" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  {/* Fire markers */}
                  <div className="absolute top-8 left-12 w-8 h-8 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div className="absolute top-16 right-10 w-6 h-6 rounded-full bg-orange-500/30 border-2 border-orange-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  <div className="absolute bottom-12 left-8 w-5 h-5 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                  {/* Incident card */}
                  <div className="absolute bottom-2 left-2 right-2 bg-white rounded-xl shadow-lg p-2.5 border border-gray-100">
                    <div className="font-bold text-gray-900 text-xs mb-0.5">Mosquito Fire</div>
                    <div className="text-gray-500 text-xs">Placer County, CA</div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-xs text-gray-500">76,788 acres</span>
                      <span className="text-xs text-amber-600 font-medium">10% contained</span>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="bg-white border-t border-gray-100 px-3 py-2 flex justify-around">
                  {['Map', 'Alerts', 'Profile'].map(item => (
                    <div key={item} className="flex flex-col items-center gap-0.5">
                      <div className={`w-5 h-1 rounded-full ${item === 'Map' ? 'bg-forest-600' : 'bg-gray-200'}`} />
                      <span className={`text-xs ${item === 'Map' ? 'text-forest-700 font-medium' : 'text-gray-400'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-gray-900 py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              WildfireAlert combines real-time fire data with equity analysis to ensure no community gets left behind.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-forest-600" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-forest-50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="text-forest-600 text-sm font-semibold uppercase tracking-wide mb-3">About the Project</div>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-6">Built for equity.<br />Powered by data.</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              WildfireAlert was built for the WiDS Datathon 2025 to address a critical gap: wildfire evacuation alerts consistently fail to reach the most vulnerable communities.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Using the WatchDuty dataset of 62,696 fire incidents (2021–2025) cross-referenced with the CDC Social Vulnerability Index, we identified that 99.74% of fires with external detection signals never received a formal evacuation order — with median delays of 11.5 hours.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full">WatchDuty Dataset</span>
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full">CDC Social Vulnerability Index</span>
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full">NASA FIRMS</span>
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full">XGBoost · Random Forest</span>
            </div>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-4 max-w-sm w-full">
            {[
              { value: '62,696', label: 'Total incidents', color: 'text-forest-700' },
              { value: '108', label: 'With formal orders', color: 'text-red-600' },
              { value: '41,906', label: 'Fires with signals', color: 'text-amber-600' },
              { value: '11.5h', label: 'Median delay', color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="card p-5 text-center">
                <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-gray-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources / Join CTA */}
      <section id="resources" className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Join WildfireAlert</h2>
          <p className="text-gray-400 text-lg mb-10">
            Access real-time wildfire intelligence tailored to your role — whether you're protecting loved ones, coordinating response, or analyzing data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/login?role=caregiver')}
              className="bg-forest-600 hover:bg-forest-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" /> Caregiver / Evacuee
            </button>
            <button
              onClick={() => router.push('/auth/login?role=emergency_responder')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" /> Emergency Responder
            </button>
            <button
              onClick={() => router.push('/auth/login?role=data_analyst')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-5 h-5" /> Data Analyst
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-forest-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-400 text-sm font-medium">WildfireAlert</span>
          </div>
          <p className="text-gray-600 text-xs text-center">
            WiDS Datathon 2025 · Data: WatchDuty · CDC SVI · NASA FIRMS
          </p>
          <p className="text-gray-600 text-xs">Not a replacement for official emergency directives.</p>
        </div>
      </footer>
    </main>
  )
}
