import L from 'leaflet'

/** Dark house glyph on colored ring (green = safe, red = needs action). Same for home and office pins; tooltips distinguish. */
function houseSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="${fill}" aria-hidden="true"><path d="M12 3L2 12h3v8h6v-6h4v6h6v-8h3L12 3z"/></svg>`
}

export function responderEvacueeMarkerHtml(ok: boolean): string {
  const ring = ok ? '#22c55e' : '#ef4444'
  const ringBorder = ok ? '#15803d' : '#991b1b'
  const glyphFill = ok ? '#14532d' : '#450a0a'
  const inner = houseSvg(glyphFill)
  return `<div style="width:34px;height:34px;border-radius:50%;background:${ring};border:2px solid ${ringBorder};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${inner}</div>`
}

export function createResponderEvacueeDivIcon(ok: boolean): L.DivIcon {
  return L.divIcon({
    className: 'wf-responder-evac-marker',
    html: responderEvacueeMarkerHtml(ok),
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
  })
}
