import L from 'leaflet'

/** Green/red only when an active incident is nearby; grey = no local fire threat on map. */
export type ResponderEvacMarkerTint = 'cleared' | 'needs_action' | 'neutral'

function houseSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="${fill}" aria-hidden="true"><path d="M12 3L2 12h3v8h6v-6h4v6h6v-8h3L12 3z"/></svg>`
}

export function responderEvacueeMarkerHtmlTint(tint: ResponderEvacMarkerTint): string {
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
  const inner = houseSvg(glyphFill)
  return `<div style="width:34px;height:34px;border-radius:50%;background:${ring};border:2px solid ${ringBorder};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${inner}</div>`
}

export function responderEvacueeMarkerHtml(ok: boolean): string {
  return responderEvacueeMarkerHtmlTint(ok ? 'cleared' : 'needs_action')
}

const ICON_CACHE: Partial<Record<ResponderEvacMarkerTint, L.DivIcon>> = {}

export function createResponderEvacueeDivIconTint(tint: ResponderEvacMarkerTint): L.DivIcon {
  if (!ICON_CACHE[tint]) {
    ICON_CACHE[tint] = L.divIcon({
      className: 'wf-responder-evac-marker',
      html: responderEvacueeMarkerHtmlTint(tint),
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -15],
    })
  }
  return ICON_CACHE[tint]!
}

export function createResponderEvacueeDivIcon(ok: boolean): L.DivIcon {
  return createResponderEvacueeDivIconTint(ok ? 'cleared' : 'needs_action')
}
