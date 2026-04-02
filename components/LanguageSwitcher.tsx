'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/components/LanguageProvider'
import { LANGUAGES } from '@/lib/languages'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  menuButtonClassName?: string
  /** Open menu above the button (e.g. footer of sidebar) so it is not clipped below the viewport. */
  menuOpens?: 'below' | 'above'
}

export default function LanguageSwitcher({ className, menuButtonClassName, menuOpens = 'below' }: Props) {
  const { lang, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const code = lang.code.split('-')[0].toUpperCase()

  return (
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-base font-medium transition-colors',
          'border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90',
          'text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700',
          menuButtonClassName
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${lang.name}`}
      >
        <span className="text-lg leading-none" aria-hidden>
          {lang.flag}
        </span>
        <span className="uppercase tracking-wide">{code}</span>
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 z-[90] min-w-[260px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-900',
            menuOpens === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
          role="listbox"
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Language
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  type="button"
                  role="option"
                  aria-selected={l.code === lang.code}
                  onClick={() => {
                    void setLanguage(l.code)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                    l.code === lang.code
                      ? 'border border-amber-600/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="text-base leading-none">{l.flag}</span>
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
