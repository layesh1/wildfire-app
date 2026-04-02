/**
 * Bump when in-app responder data-handling T&C text changes; responders must re-accept.
 * Sync with migration default for profiles.responder_consent_version (accepted version).
 */
export const REQUIRED_RESPONDER_CONSENT_VERSION = 1

export type ResponderConsentFields = {
  responder_consent_accepted?: boolean | null
  responder_consent_version?: number | null
}

export function isResponderConsentSatisfied(p: ResponderConsentFields | null | undefined): boolean {
  if (!p?.responder_consent_accepted) return false
  const v = p.responder_consent_version
  const acceptedVersion = typeof v === 'number' && Number.isFinite(v) ? v : 0
  return acceptedVersion >= REQUIRED_RESPONDER_CONSENT_VERSION
}
