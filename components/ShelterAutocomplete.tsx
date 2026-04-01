'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { HUMAN_EVAC_SHELTERS } from '@/lib/evac-shelters'
import type { EvacShelter } from '@/app/dashboard/caregiver/map/LeafletMap'

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function scoreShelter(query: string, s: EvacShelter): number {
  const q = normalize(query)
  if (!q) return 0
  const name = normalize(s.name)
  const county = normalize(s.county)
  if (name === q || county === q) return 1000
  if (name.startsWith(q) || county.startsWith(q)) return 500
  const words = q.split(' ').filter(Boolean)
  let score = 0
  for (const w of words) {
    if (w.length < 2) continue
    if (name.includes(w)) score += 40
    if (county.includes(w)) score += 20
  }
  if (name.includes(q)) score += 80
  return score
}

export type ShelterAutocompleteProps = {
  value: string
  onChange: (v: string) => void
  onPickShelter?: (s: EvacShelter) => void
  placeholder?: string
  id?: string
  variant?: 'light' | 'dark'
  'aria-invalid'?: boolean
}

/**
 * Typeahead over known human evacuation shelters (same catalog as the map).
 * Behaves like address autocomplete: dropdown updates as you type.
 */
export default function ShelterAutocomplete({
  value,
  onChange,
  onPickShelter,
  placeholder = 'Start typing a shelter name…',
  id,
  variant = 'dark',
  'aria-invalid': ariaInvalid,
}: ShelterAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestions = useMemo(() => {
    const q = value.trim()
    if (q.length < 2) return [] as EvacShelter[]
    return [...HUMAN_EVAC_SHELTERS]
      .map(s => ({ s, sc: scoreShelter(q, s) }))
      .filter(x => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 10)
      .map(x => x.s)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isLight = variant === 'light'
  const inputCls = cn(
    'mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none',
    isLight
      ? 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-amber-500'
      : 'border-ash-700 bg-ash-900 text-white placeholder-ash-600 focus:border-ash-500',
    ariaInvalid && 'border-red-500'
  )
  const dropCls = cn(
    'absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border shadow-lg',
    isLight ? 'border-gray-200 bg-white' : 'border-ash-700 bg-ash-950'
  )
  const rowCls = (active: boolean) =>
    cn(
      'w-full cursor-pointer px-3 py-2.5 text-left text-sm transition-colors',
      isLight
        ? active
          ? 'bg-amber-50 text-gray-900'
          : 'text-gray-800 hover:bg-gray-50'
        : active
          ? 'bg-ash-800 text-white'
          : 'text-ash-200 hover:bg-ash-800/80'
    )

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        onChange={e => {
          onChange(e.target.value)
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => setOpen(true), 80)
        }}
        onFocus={() => value.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className={inputCls}
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
      />
      {open && suggestions.length > 0 && (
        <ul
          className={dropCls}
          role="listbox"
        >
          {suggestions.map(s => (
            <li key={s.id} role="option">
              <button
                type="button"
                className={rowCls(false)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  const label = `${s.name} — ${s.county}`
                  onChange(label)
                  onPickShelter?.(s)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{s.name}</span>
                <span className={cn('block text-xs', isLight ? 'text-gray-500' : 'text-ash-500')}>{s.county}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
