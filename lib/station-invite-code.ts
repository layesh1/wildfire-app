import { randomBytes } from 'crypto'

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Uppercase slug from station name for invite prefix (no spaces). */
export function stationInvitePrefix(stationName: string): string {
  const raw = stationName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 12)
  return raw.length > 0 ? raw : 'STATION'
}

export function randomInviteSuffix(length = 6): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[bytes[i]! % ALPHANUM.length]
  }
  return out
}

/** e.g. CLAYTON-A4X9K2 */
export function formatStationInviteCode(stationName: string, suffix: string): string {
  return `${stationInvitePrefix(stationName)}-${suffix}`
}
