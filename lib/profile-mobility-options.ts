/**
 * Canonical mobility / disability / medical chip labels — same strings in onboarding and Settings
 * (stored in profiles.mobility_needs, disability_needs, medical_needs).
 */
export const MOBILITY_MOVEMENT_OPTIONS = [
  'Uses wheelchair or mobility device',
  'Uses walker or cane',
  'Cannot climb stairs',
  'Cannot walk long distances',
  'Requires assistance to evacuate',
  'Bedridden or limited mobility',
] as const

export const DISABILITY_OPTIONS = [
  'Visual impairment or blind',
  'Hearing impairment or deaf',
  'Cognitive or developmental disability',
  'Mental health condition',
  'Other',
] as const

export const MEDICAL_OPTIONS = [
  'Requires oxygen or ventilator',
  'Requires dialysis',
  'Has pacemaker or cardiac device',
  'Diabetes — insulin dependent',
  'Severe allergies',
  'Other medications or conditions',
] as const

export const DISABILITY_OTHER_LABEL = 'Other'
export const MEDICAL_OTHER_LABEL = 'Other medications or conditions'

export const MAX_OTHER_WORDS = 10

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

export function clampToMaxWords(s: string, max: number): string {
  const words = s.trim().split(/\s+/).filter(Boolean)
  // Keep raw `s` while under the cap so spaces between words are not stripped on every keystroke.
  if (words.length <= max) return s
  return words.slice(0, max).join(' ')
}
