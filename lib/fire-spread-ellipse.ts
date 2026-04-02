/**
 * Elliptical fire spread geometry (Van Wagner length-to-breadth vs wind).
 * Shared by spread visualizations; coordinates in meters on local tangent plane.
 */

export function vanWagnerLW(windSpeedMph: number): number {
  const u = windSpeedMph * 0.44704
  return Math.min(8, Math.max(1.0, 0.936 * Math.exp(0.2566 * u) + 0.461 * Math.exp(-0.1548 * u) - 0.397))
}

export function generateEllipse(
  lat: number,
  lon: number,
  a_m: number,
  b_m: number,
  c_m: number,
  headDirDeg: number,
  nPts = 72,
): [number, number][] {
  const theta = (headDirDeg * Math.PI) / 180
  const cosLat = Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: nPts + 1 }, (_, i) => {
    const phi = (2 * Math.PI * i) / nPts
    const x = a_m * Math.cos(phi) - c_m
    const y = b_m * Math.sin(phi)
    const dE = x * Math.sin(theta) + y * Math.cos(theta)
    const dN = x * Math.cos(theta) - y * Math.sin(theta)
    return [lat + dN / 111320, lon + dE / (111320 * cosLat)] as [number, number]
  })
}
