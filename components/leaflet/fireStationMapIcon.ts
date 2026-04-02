import L from 'leaflet'

const STATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="38" height="38">
      <circle cx="16" cy="16" r="14" fill="#0f172a" fill-opacity="0.9" stroke="#ea580c" stroke-width="2"/>
      <path d="M16 7L9 13.5V24h4v-6h6v6h4V13.5L16 7z" fill="#f8fafc"/>
      <rect x="13" y="17" width="6" height="7" rx="0.5" fill="#334155"/>
    </svg>`

/** Inline img tag for map legend (matches {@link getFireStationMapIcon}). */
export function fireStationMarkerImgHtml(size = 38): string {
  const svg = encodeURIComponent(STATION_SVG)
  return `<img src="data:image/svg+xml,${svg}" width="${size}" height="${size}" style="display:block" alt="" />`
}

let cached: L.DivIcon | null = null

/** Fire station / command anchor — blue disc, house glyph, orange ring. */
export function getFireStationMapIcon(): L.DivIcon {
  if (cached) return cached
  const svg = encodeURIComponent(STATION_SVG)
  cached = L.divIcon({
    className: 'wf-fire-station-map-icon',
    html: `<img src="data:image/svg+xml,${svg}" width="38" height="38" style="display:block" alt="" />`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  })
  return cached
}
