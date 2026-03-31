'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type PlaceSuggestion = {
  place_id: string
  description: string
  formatted_address: string
  lat: number
  lng: number
  types: string[]
}

type GoogleAutocompletePrediction = {
  description: string
  place_id: string
}

function clientPlacesKey() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_GOOGLE_PLACES_API_KEY')
  return key
}

let mapsPlacesLoadPromise: Promise<void> | null = null
function ensureGooglePlacesLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser required'))
  const g = (window as unknown as { google?: unknown }).google as
    | { maps?: { places?: unknown } }
    | undefined
  if (g?.maps?.places) return Promise.resolve()
  if (mapsPlacesLoadPromise) return mapsPlacesLoadPromise
  mapsPlacesLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://maps.googleapis.com/maps/api/js'
      + `?key=${encodeURIComponent(clientPlacesKey())}`
      + '&libraries=places'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps Places JS'))
    document.head.appendChild(script)
  })
  return mapsPlacesLoadPromise
}

/** Lightweight client validation before API calls. */
export function looksLikeUsStreetAddress(line: string): boolean {
  const t = line.trim()
  if (t.length < 6) return false
  return /\d/.test(t)
}

export type AddressAutocompleteProps = {
  value: string
  onChange: (v: string) => void
  /** Back-compat callback used by existing consumers. */
  onSelect?: (address: string, lat?: number, lng?: number) => void
  /** Extended suggestion payload with details/types. */
  onPickSuggestion?: (hit: PlaceSuggestion) => void
  placeholder?: string
  required?: boolean
  id?: string
  'aria-invalid'?: boolean
  variant?: 'light' | 'dark'
  hint?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onPickSuggestion,
  placeholder = '123 Main Street, City, ST 12345',
  required,
  id,
  'aria-invalid': ariaInvalid,
  variant = 'light',
  hint,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GoogleAutocompletePrediction[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchDetails(placeId: string): Promise<PlaceSuggestion | null> {
    await ensureGooglePlacesLoaded()
    const mapsAny = (window as any).google?.maps
    if (!mapsAny?.places?.PlacesService) return null
    const svc = new mapsAny.places.PlacesService(document.createElement('div'))
    return new Promise(resolve => {
      let done = false
      const timer = window.setTimeout(() => {
        if (done) return
        done = true
        resolve(null)
      }, 5000)
      svc.getDetails(
        { placeId, fields: ['formatted_address', 'geometry', 'types'] },
        (place: any, status: any) => {
          if (done) return
          done = true
          window.clearTimeout(timer)
          if (status !== mapsAny.places.PlacesServiceStatus.OK || !place) {
            resolve(null)
            return
          }
          const formatted = typeof place.formatted_address === 'string' ? place.formatted_address : null
          const lat = place.geometry?.location?.lat?.()
          const lng = place.geometry?.location?.lng?.()
          if (!formatted || typeof lat !== 'number' || typeof lng !== 'number') {
            resolve(null)
            return
          }
          resolve({
            place_id: placeId,
            description: formatted,
            formatted_address: formatted,
            lat,
            lng,
            types: Array.isArray(place.types) ? place.types : [],
          })
        }
      )
    })
  }

  function handleChange(v: string) {
    onChange(v)
    setSearchError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 3) {
      setSuggestions([])
      setShowDrop(false)
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        await ensureGooglePlacesLoaded()
        const mapsAny = (window as any).google?.maps
        if (!mapsAny?.places?.AutocompleteService || !mapsAny?.places?.PlacesServiceStatus) {
          throw new Error('Google Places unavailable')
        }
        const service = new mapsAny.places.AutocompleteService()
        const preds = await new Promise<GoogleAutocompletePrediction[]>(resolve => {
          let done = false
          const timer = window.setTimeout(() => {
            if (done) return
            done = true
            resolve([])
          }, 5000)
          service.getPlacePredictions(
            {
              input: v,
              componentRestrictions: { country: 'us' },
              types: ['address'],
            },
            (predictions: any[] | null, status: any) => {
              if (done) return
              done = true
              window.clearTimeout(timer)
              if (status !== mapsAny.places.PlacesServiceStatus.OK || !predictions) {
                resolve([])
                return
              }
              resolve(
                predictions.slice(0, 12).map(p => ({
                  place_id: String(p.place_id || ''),
                  description: String(p.description || ''),
                }))
              )
            }
          )
        })
        setSuggestions(preds)
        setShowDrop(preds.length > 0)
        if (preds.length === 0) setSearchError('No address matches found. Try a more complete street address.')
      } catch {
        setSuggestions([])
        setShowDrop(false)
        setSearchError('Address search is unavailable right now. Check API key restrictions and retry.')
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const inputCls =
    variant === 'dark'
      ? cn(
          'w-full bg-ash-800 text-white text-sm rounded-xl px-3 py-2.5 border focus:outline-none focus:border-ember-500/60 placeholder:text-ash-600',
          ariaInvalid ? 'border-signal-danger/60' : 'border-ash-700'
        )
      : cn('input w-full', ariaInvalid && 'border-red-300 ring-1 ring-red-200')

  const defaultHint =
    hint ??
    'Start typing a street address. We verify the selected suggestion before saving.'

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
          Searching verified addresses…
        </p>
      )}
      {!loading && searchError && (
        <p className={cn('text-xs mt-1', variant === 'dark' ? 'text-amber-300' : 'text-amber-700')}>
          {searchError}
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
                onMouseDown={async () => {
                  const hit = await fetchDetails(s.place_id)
                  if (!hit) return
                  onChange(hit.formatted_address)
                  onSelect?.(hit.formatted_address, hit.lat, hit.lng)
                  onPickSuggestion?.(hit)
                  setSuggestions([])
                  setShowDrop(false)
                }}
              >
                {s.description}
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
