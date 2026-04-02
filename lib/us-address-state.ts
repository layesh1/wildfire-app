/** Best-effort 2-letter US state from a free-form address (e.g. "123 Main St, Raleigh, NC 27601"). */
export function parseUsStateCodeFromAddress(address: string): string | null {
  const t = address.trim()
  if (!t) return null
  const m = t.match(/,\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/)
  return m ? m[1].toUpperCase() : null
}
