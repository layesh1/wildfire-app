'use client'
import { Sun, Moon } from 'lucide-react'
import WildfireTracker from '@/components/WildfireTracker'
import JarDemo from '@/components/JarDemo'

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 overflow-auto">
      {/* Page header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-2">
          Design Preview
        </div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">
          Light &amp; Dark Mode Preview
        </h1>
        <p className="text-gray-500 text-sm">
          Side-by-side comparison of the dashboard in both themes.
        </p>
      </div>

      {/* Side-by-side container */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-5 min-w-0">

          {/* ── Light mode ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-sm font-semibold text-gray-700">
                <Sun className="w-4 h-4 text-amber-500" />
                Light Mode
              </div>
            </div>
            {/* Tracker */}
            <div
              className="rounded-3xl overflow-hidden border border-gray-200 shadow-xl"
              style={{ height: 640 }}
            >
              <WildfireTracker isDark={false} />
            </div>
          </div>

          {/* ── Vertical divider (desktop only) ── */}
          <div className="hidden lg:block w-px bg-gray-300 self-stretch my-8" />

          {/* ── Dark mode ── */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-full shadow-sm text-sm font-semibold text-gray-200">
                <Moon className="w-4 h-4 text-indigo-400" />
                Dark Mode
              </div>
            </div>
            {/* Tracker */}
            <div
              className="rounded-3xl overflow-hidden border border-gray-700 shadow-xl"
              style={{ height: 640 }}
            >
              <WildfireTracker isDark={true} />
            </div>
          </div>

        </div>

        {/* Jar alert demo */}
        <div className="mt-8 rounded-3xl overflow-hidden border border-gray-200 shadow-xl">
          <JarDemo />
        </div>

        {/* Color palette legend */}
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Color System</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Danger',        color: '#c86432', text: '#fff' },
              { label: 'Caution',       color: '#d4a574', text: '#3e2723' },
              { label: 'Safe',          color: '#7cb342', text: '#fff' },
              { label: 'Sidebar',       color: '#3e2723', text: '#fff' },
              { label: 'Light BG',      color: '#f5f1e8', text: '#3e2723' },
              { label: 'Dark BG',       color: '#1a1a1a', text: '#f5f1e8' },
            ].map(({ label, color, text }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-full h-10 rounded-xl border border-black/10"
                  style={{ background: color }}
                />
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{color}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
