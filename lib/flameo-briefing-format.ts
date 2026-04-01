/**
 * Flameo briefing copy may still contain legacy ** segments from the model; UI renders those as bold.
 * Strip markdown-style heading markers so we never show leading # in user-facing text.
 */
export function stripMarkdownHeadingMarkers(s: string): string {
  return s.replace(/^#{1,6}\s*/gm, '')
}
