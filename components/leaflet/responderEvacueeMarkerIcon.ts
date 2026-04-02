import L from 'leaflet'

/** Green/red only when an active incident is nearby; grey = no local fire threat on map. */
export type ResponderEvacMarkerTint = 'cleared' | 'needs_action' | 'neutral'

/** Home residence vs work / office site (same ring colors, different center glyph). */
export type ResponderEvacMarkerKind = 'home' | 'office'

function houseSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="${fill}" aria-hidden="true"><path d="M12 3L2 12h3v8h6v-6h4v6h6v-8h3L12 3z"/></svg>`
}

/** Office block (grid windows) — reads differently from the house pin at a glance. */
function officeSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="${fill}" aria-hidden="true"><path d="M4 21V5h16v16H4zm2-2h5v-4H6v4zm7 0h5v-4h-5v4zM6 13h5V9H6v4zm7 0h5V9h-5v4zM6 9h5V5H6v4zm7 0h5V5h-5v4z"/></svg>`
}

function glyphSvg(kind: ResponderEvacMarkerKind, fill: string): string {
  return kind === 'office' ? officeSvg(fill) : houseSvg(fill)
}

export function responderEvacueeMarkerHtmlTint(
  tint: ResponderEvacMarkerTint,
  kind: ResponderEvacMarkerKind = 'home',
): string {
  let ring: string
  let ringBorder: string
  let glyphFill: string
  if (tint === 'neutral') {
    ring = '#64748b'
    ringBorder = '#475569'
    glyphFill = '#f8fafc'
  } else if (tint === 'cleared') {
    ring = '#22c55e'
    ringBorder = '#15803d'
    glyphFill = '#14532d'
  } else {
    ring = '#ef4444'
    ringBorder = '#991b1b'
    glyphFill = '#450a0a'
  }
  const inner = glyphSvg(kind, glyphFill)
  return `<div style="width:34px;height:34px;border-radius:50%;background:${ring};border:2px solid ${ringBorder};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${inner}</div>`
}

/** Legend / legacy: house icon only (home semantics). */
export function responderEvacueeMarkerHtml(ok: boolean): string {
  return responderEvacueeMarkerHtmlTint(ok ? 'cleared' : 'needs_action', 'home')
}

const ICON_CACHE = new Map<string, L.DivIcon>()

function iconCacheKey(tint: ResponderEvacMarkerTint, kind: ResponderEvacMarkerKind): string {
  return `${kind}:${tint}`
}

export function createResponderEvacueeDivIconTint(
  tint: ResponderEvacMarkerTint,
  kind: ResponderEvacMarkerKind = 'home',
): L.DivIcon {
  const key = iconCacheKey(tint, kind)
  let icon = ICON_CACHE.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: 'wf-responder-evac-marker',
      html: responderEvacueeMarkerHtmlTint(tint, kind),
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -15],
    })
    ICON_CACHE.set(key, icon)
  }
  return icon
}

export function createResponderEvacueeDivIcon(ok: boolean): L.DivIcon {
  return createResponderEvacueeDivIconTint(ok ? 'cleared' : 'needs_action')
}
