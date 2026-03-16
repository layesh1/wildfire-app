'use client'
import { useEffect, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-50">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ash-800 border border-ash-600 text-ash-300 hover:text-white hover:border-ash-500 text-xs font-medium shadow-lg transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{lang.flag} {lang.name}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 bg-ash-800 border border-ash-600 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-ash-700">
            <p className="text-ash-400 text-xs font-medium uppercase tracking-wide">Select Language</p>
          </div>
          <div
            className="overflow-y-auto p-2"
            style={{ maxHeight: '300px' }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setOpen(false) }}
                  className={`text-xs px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors
                    ${l.code === lang.code
                      ? 'border border-ember-400/60 bg-ember-500/10 text-white'
                      : 'border border-transparent hover:bg-ash-700 text-ash-300 hover:text-white'
                    }`}
                >
                  <span className="text-sm leading-none">{l.flag}</span>
                  <span className="truncate">{l.native}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
