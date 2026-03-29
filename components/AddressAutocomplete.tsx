'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  filterToStreetAddresses,
  looksLikeUsStreetAddress,
  type NominatimSearchHit,
} from '@/lib/nominatim-address'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export type AddressAutocompleteProps = {
  value: string
  onChange: (v: string) => void
  /** When set, picking a suggestion calls this with the Nominatim hit (for verify flow — does not persist by itself). */
  onPickSuggestion?: (hit: NominatimSearchHit) => void
  placeholder?: string
  required?: boolean
  id?: string
  'aria-invalid'?: boolean
  /** light = login/marketing panels, dark = ash dashboard */
  variant?: 'light' | 'dark'
  hint?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPickSuggestion,
  placeholder = '123 Main Street, City, ST 12345',
  required,
  id,
  'aria-invalid': ariaInvalid,
  variant = 'light',
  hint,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimSearchHit[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 6) {
      setSuggestions([])
      setShowDrop(false)
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `${NOMINATIM}?q=${encodeURIComponent(v)}&format=json&addressdetails=1&limit=12&countrycodes=us`
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'WildfireAlert/2.0 (address-autocomplete)',
          },
        })
        const data = (await res.json()) as NominatimSearchHit[]
        const filtered = filterToStreetAddresses(data)
        setSuggestions(filtered)
        setShowDrop(filtered.length > 0)
      } catch {
        setSuggestions([])
        setShowDrop(false)
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const inputCls =
    variant === 'dark'
      ? cn(
          'w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600',
          ariaInvalid ? 'border-signal-danger/60' : 'border-ash-700'
        )
      : cn(
          'input w-full',
          ariaInvalid && 'border-red-300 ring-1 ring-red-200'
        )

  const defaultHint =
    hint ??
    'Start typing a numbered street address. Suggestions exclude cities and counties — only specific locations power your safety automations.'

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        placeholder={placeholder}
        required={required}
        aria-invalid={ariaInvalid || undefined}
        aria-required={required || undefined}
        autoComplete="street-address"
        className={inputCls}
      />
      {loading && (
        <p className={cn('text-xs mt-1', variant === 'dark' ? 'text-ash-500' : 'text-gray-400')}>
          Searching street-level matches…
        </p>
      )}
      {showDrop && (
        <ul
          className={cn(
            'absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto border text-sm',
            variant === 'dark'
              ? 'bg-ash-800 border-ash-700'
              : 'bg-white border-gray-200'
          )}
        >
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors truncate',
                  variant === 'dark'
                    ? 'text-ash-200 hover:bg-ash-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0'
                )}
                onMouseDown={() => {
                  onPickSuggestion?.(s)
                  onChange(s.display_name)
                  setSuggestions([])
                  setShowDrop(false)
                }}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p
        className={cn(
          'text-xs mt-1.5 leading-relaxed',
          variant === 'dark' ? 'text-ash-500' : 'text-gray-500'
        )}
      >
        {defaultHint}
      </p>
    </div>
  )
}

export { looksLikeUsStreetAddress }
