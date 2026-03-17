'use client'
import { useRouter } from 'next/navigation'
import { Flame, ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white overflow-hidden">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-20 border-b border-white/10" style={{ background: 'rgba(10,31,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl tracking-tight">Minutes Matter</span>
          </button>
          <div className="flex-1" />
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-green-200/70 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative py-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/forest-blur-image.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,20,10,0.55)' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-4">About the Project</div>
          <h1 className="font-display font-bold text-white leading-tight mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            A WiDS Datathon 2026 submission<br />from California.
          </h1>
          <p className="text-green-200/70 text-lg leading-relaxed">
            Built to close the gap between fire signals and the people who need to know.
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 space-y-16">

          {/* Origin */}
          <div>
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-4">The Research Question</div>
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-5">Why do so many wildfires go unannounced?</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Minutes Matter started as a research question: why do so many wildfires go unannounced? We dug into the data and found a systemic gap — fire signals exist, but formal alerts rarely follow. The communities hit hardest are also the least likely to be reached in time.
            </p>
            <p className="text-gray-500 leading-relaxed">
              We built this platform to turn that finding into action. It is open to caregivers and evacuees for free, with a mission to make every minute count for the people who need it most.
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { val: '99.74%', label: 'of fires with signals had no formal evacuation order' },
              { val: '11.5h', label: 'median delay between detection and an order' },
              { val: '9×', label: 'state disparity gap in alert timing' },
              { val: '60K+', label: 'wildfire incidents studied across California' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="font-display font-bold text-3xl text-green-700 mb-2">{s.val}</div>
                <div className="text-gray-500 text-sm leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>

          {/* What we built */}
          <div>
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-4">What We Built</div>
            <h2 className="font-display font-bold text-gray-900 text-2xl mb-5">An early-warning platform for those who need it most.</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Signal Detection', desc: 'NASA FIRMS satellite data and WatchDuty reports surface fire activity before formal orders are issued.' },
                { title: 'Equity Scoring', desc: 'CDC Social Vulnerability Index weights alerts so high-risk communities hear first, not last.' },
                { title: 'Caregiver Portal', desc: 'Free, accessible alerts with evacuation routes and Flameo AI — in 30+ languages.' },
                { title: 'Responder Command', desc: 'ML-powered gap maps and incident intelligence for emergency coordinators.' },
              ].map(item => (
                <div key={item.title} className="flex flex-col gap-2">
                  <div className="w-1 h-4 rounded-full bg-green-500" />
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <div className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-4">Data & Technology</div>
            <div className="flex flex-wrap gap-2">
              {['XGBoost · 96% accuracy', 'NASA FIRMS', 'CDC SVI', 'WatchDuty', 'Next.js 14', 'Supabase', 'Vercel'].map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{tag}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6" style={{ background: '#050f08' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-400 text-sm font-medium">Minutes Matter</span>
          </div>
          <p className="text-gray-600 text-xs text-center">WiDS Datathon 2025 · Data: WatchDuty · CDC SVI · NASA FIRMS</p>
          <p className="text-gray-600 text-xs">Not a replacement for official emergency directives.</p>
        </div>
      </footer>

    </main>
  )
}
