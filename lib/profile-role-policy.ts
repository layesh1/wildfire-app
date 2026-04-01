/**
 * Role invite / switch rules:
 * - Signup is either household (evacuee/caregiver) or emergency responder — not swappable via invite later.
 * - Data analyst is additive only for accounts that already have emergency_responder.
 */

export function profileRolesFromRow(profile: { role?: string | null; roles?: string[] | null } | null): string[] {
  const raw: string[] = Array.isArray(profile?.roles) && profile.roles.length
    ? profile.roles
    : profile?.role
      ? [profile.role]
      : []
  return [...new Set(raw)]
}

export function hasEmergencyResponder(roles: string[]): boolean {
  return roles.includes('emergency_responder')
}

/** Household / evacuee lane (no responder yet). */
export function isConsumerOnlyAccount(roles: string[]): boolean {
  const hasConsumer = roles.some(r => r === 'evacuee' || r === 'caregiver')
  return hasConsumer && !hasEmergencyResponder(roles)
}

export type InvitePolicyResult = { ok: true } | { ok: false; error: string; status: number }

/**
 * Whether an authenticated user may verify (and later claim) an invite for `codeRole`.
 * `bypass` = admin/demo bypass paths — skip policy.
 */
export function inviteCodeAllowedForProfile(
  codeRole: string,
  profileRoles: string[],
  bypass: boolean
): InvitePolicyResult {
  if (bypass) return { ok: true }

  if (codeRole === 'data_analyst') {
    if (!hasEmergencyResponder(profileRoles)) {
      return {
        ok: false,
        status: 403,
        error:
          'Data analyst access is only available if you already have Emergency Responder access. Use your analyst invite after signing up as a responder.',
      }
    }
    return { ok: true }
  }

  if (codeRole === 'emergency_responder') {
    if (isConsumerOnlyAccount(profileRoles)) {
      return {
        ok: false,
        status: 403,
        error:
          'Emergency responder access is chosen when you create your account and cannot be added to a household (evacuee) account with an invite code.',
      }
    }
    return { ok: true }
  }

  return { ok: true }
}

/** Roles shown under “request access / add with code” in Settings (not the evacuee-without-code promo). */
export function settingsInviteRoleOptions(params: {
  myRoles: string[]
  profileHasProtectedRole: boolean
}): string[] {
  const { myRoles, profileHasProtectedRole } = params
  const ALL = ['evacuee', 'emergency_responder', 'data_analyst'] as const
  const hasConsumer = myRoles.some(r => r === 'evacuee' || r === 'caregiver')
  const hasEr = myRoles.includes('emergency_responder')

  return ALL.filter(r => {
    if (myRoles.includes(r)) return false
    if (hasConsumer && r === 'evacuee') return false
    if (!profileHasProtectedRole && (r === 'emergency_responder' || r === 'data_analyst')) return false
    // Responders add analyst via code only here — not consumer roles (use “Add evacuee” promo in Settings).
    if (profileHasProtectedRole && hasEr && !myRoles.includes('data_analyst')) {
      return r === 'data_analyst'
    }
    return true
  })
}
