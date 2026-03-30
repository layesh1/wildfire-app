/**
 * Normalize pasted invite codes: trim, uppercase, ASCII hyphens (copy/paste often uses en-dashes).
 */
export function normalizeInviteCodeInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase()
}
