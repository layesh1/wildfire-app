'use client'

import { useState, useEffect, useCallback } from 'react'
import AddressAutocomplete, { type PlaceSuggestion } from '@/components/AddressAutocomplete'

const DEFAULT_HELPER =
  'Enter your home address. Emergency responders use this for door-to-door safety checks.'

export type AddressVerifySaveProps = {
  variant?: 'light' | 'dark'
  id?: string
  /** Overrides default hint under the autocomplete (e.g. work address). */
  hint?: string
  /** Current input text (draft; not DB until save). */
  value: string
  onChange: (v: string) => void
  /** Persisted line from profiles.address (for display only). */
  savedAddress?: string | null
  /** Called only from explicit Verify & Save after geocode succeeds. */
  onVerifiedSave: (verifiedLine: string) => Promise<void>
  /** Optional metadata callback for auto-detection flows (work building type, etc.). */
  onVerified?: (meta: { address: string; lat: number; lng: number; types: string[] }) => void
  disabled?: boolean
}

/**
 * Address entry with autocomplete → reverse geocode → Verify & Save.
 * Does not write to the database except via onVerifiedSave.
 */
export default function AddressVerifySave({
  variant = 'dark',
  id,
  hint,
  value,
  onChange,
  savedAddress,
  onVerifiedSave,
  onVerified,
  disabled,
}: AddressVerifySaveProps) {
  const helperText = hint ?? DEFAULT_HELPER
  const [geocodedLine, setGeocodedLine] = useState<string | null>(null)
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const handleDraftChange = useCallback(
    (v: string) => {
      setGeocodedLine(null)
      setSelected(null)
      setGeocodeError(null)
      setJustSaved(false)
      onChange(v)
    },
    [onChange]
  )

  const onPickSuggestion = useCallback((hit: PlaceSuggestion) => {
    setGeocodeError(null)
    setGeocodedLine(hit.formatted_address)
    setSelected(hit)
    setJustSaved(false)
  }, [])

  useEffect(() => {
    setJustSaved(false)
  }, [savedAddress])

  async function handleVerifySave() {
    if (!geocodedLine || !selected || saving || disabled) return
    setSaving(true)
    setGeocodeError(null)
    try {
      await onVerifiedSave(geocodedLine)
      onVerified?.({
        address: geocodedLine,
        lat: selected.lat,
        lng: selected.lng,
        types: selected.types,
      })
      setJustSaved(true)
      try {
        window.dispatchEvent(new CustomEvent('wfa-flameo-context-refresh'))
      } catch {
        /* ignore */
      }
    } catch (e) {
      setGeocodeError(
        e instanceof Error && e.message
          ? e.message
          : 'Could not save. Try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave = Boolean(geocodedLine && selected) && !saving && !disabled

  return (
    <div className="space-y-2">
      <AddressAutocomplete
        id={id}
        variant={variant}
        value={value}
        onChange={handleDraftChange}
        onPickSuggestion={onPickSuggestion}
        hint={helperText}
        matchesPersistedAddress={savedAddress ?? undefined}
      />
      {geocodeError && (
        <p className="text-sm text-red-400 mt-1">{geocodeError}</p>
      )}
      <button
        type="button"
        disabled={!canSave}
        onClick={handleVerifySave}
        className={
          variant === 'dark'
            ? 'mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-forest-700 hover:bg-forest-600 text-ash-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            : 'mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-700 hover:bg-green-600 !text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
        }
      >
        {saving ? 'Saving…' : 'Verify & Save'}
      </button>
      {justSaved && (
        <p className="text-sm text-signal-safe mt-1">✅ Address saved</p>
      )}
      {savedAddress?.trim() && !justSaved && (
        <p className={variant === 'dark' ? 'text-xs text-ash-500' : 'text-xs text-gray-500'}>
          Saved address: {savedAddress}
        </p>
      )}
    </div>
  )
}
