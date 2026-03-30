'use client'

import { useState, useEffect, useCallback } from 'react'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import type { NominatimSearchHit } from '@/lib/nominatim-address'
import { reverseGeocodeDisplayName } from '@/lib/nominatim-address'

const HELPER =
  'Enter your home address. Emergency responders use this for door-to-door safety checks.'

export type AddressVerifySaveProps = {
  variant?: 'light' | 'dark'
  id?: string
  /** Current input text (draft; not DB until save). */
  value: string
  onChange: (v: string) => void
  /** Persisted line from profiles.address (for display only). */
  savedAddress?: string | null
  /** Called only from explicit Verify & Save after geocode succeeds. */
  onVerifiedSave: (verifiedLine: string) => Promise<void>
  disabled?: boolean
}

/**
 * Address entry with autocomplete → reverse geocode → Verify & Save.
 * Does not write to the database except via onVerifiedSave.
 */
export default function AddressVerifySave({
  variant = 'dark',
  id,
  value,
  onChange,
  savedAddress,
  onVerifiedSave,
  disabled,
}: AddressVerifySaveProps) {
  const [geocodedLine, setGeocodedLine] = useState<string | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const handleDraftChange = useCallback(
    (v: string) => {
      setGeocodedLine(null)
      setGeocodeError(null)
      setJustSaved(false)
      onChange(v)
    },
    [onChange]
  )

  const onPickSuggestion = useCallback(async (hit: NominatimSearchHit) => {
    setGeocodeError(null)
    setGeocodedLine(null)
    setJustSaved(false)
    setVerifying(true)
    try {
      const line = await reverseGeocodeDisplayName(hit.lat, hit.lon)
      if (!line) {
        setGeocodeError(
          "We couldn't verify this address. Check spelling and try again."
        )
        return
      }
      setGeocodedLine(line)
    } catch {
      setGeocodeError(
        "We couldn't verify this address. Check spelling and try again."
      )
    } finally {
      setVerifying(false)
    }
  }, [])

  useEffect(() => {
    setJustSaved(false)
  }, [savedAddress])

  async function handleVerifySave() {
    if (!geocodedLine || saving || disabled) return
    setSaving(true)
    setGeocodeError(null)
    try {
      await onVerifiedSave(geocodedLine)
      setJustSaved(true)
      try {
        window.dispatchEvent(new CustomEvent('wfa-flameo-context-refresh'))
      } catch {
        /* ignore */
      }
    } catch {
      setGeocodeError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const canSave = Boolean(geocodedLine) && !verifying && !saving && !disabled

  return (
    <div className="space-y-2">
      <AddressAutocomplete
        id={id}
        variant={variant}
        value={value}
        onChange={handleDraftChange}
        onPickSuggestion={onPickSuggestion}
        hint={HELPER}
      />
      {verifying && (
        <p className={variant === 'dark' ? 'text-xs text-ash-400' : 'text-xs text-gray-500'}>
          Verifying address…
        </p>
      )}
      {geocodedLine && (
        <p
          className={
            variant === 'dark'
              ? 'text-sm text-ash-200 mt-1'
              : 'text-sm text-gray-800 mt-1'
          }
        >
          📍 {geocodedLine} — Is this correct?
        </p>
      )}
      {geocodeError && (
        <p className="text-sm text-red-400 mt-1">{geocodeError}</p>
      )}
      <button
        type="button"
        disabled={!canSave}
        onClick={handleVerifySave}
        className={
          variant === 'dark'
            ? 'mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-forest-700 hover:bg-forest-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            : 'mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-700 hover:bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
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
