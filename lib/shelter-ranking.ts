export type Shelter = {
  name: string
  lat: number
  lng: number
  county?: string
  phone?: string | null
}

export type RankedShelter = Shelter & {
  travelTimeSeconds: number
  travelDistanceMeters: number
  accessibilityLikely: boolean
}

function getRoutesKey(): string {
  const key = process.env.GOOGLE_ROUTES_API_KEY
  if (!key) throw new Error('Missing GOOGLE_ROUTES_API_KEY')
  return key
}

function isAccessibilityLikely(name: string): boolean {
  return /\b(accessible|ada)\b/i.test(name)
}

export async function rankSheltersByProximity(
  origin: { lat: number; lng: number },
  shelters: Shelter[],
  options?: { preferAccessible?: boolean }
): Promise<RankedShelter[]> {
  if (!shelters.length) return []
  const key = getRoutesKey()
  const destinations = shelters.map(s => `${s.lat},${s.lng}`).join('|')
  const url =
    'https://maps.googleapis.com/maps/api/distancematrix/json'
    + `?origins=${encodeURIComponent(`${origin.lat},${origin.lng}`)}`
    + `&destinations=${encodeURIComponent(destinations)}`
    + '&mode=driving'
    + `&key=${encodeURIComponent(key)}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Distance Matrix request failed (${res.status})`)
  const data = (await res.json()) as {
    rows?: Array<{
      elements?: Array<{
        status?: string
        duration?: { value?: number }
        distance?: { value?: number }
      }>
    }>
  }
  const elements = data.rows?.[0]?.elements ?? []
  const ranked: RankedShelter[] = shelters.map((s, i) => {
    const el = elements[i]
    const time = el?.status === 'OK' ? (el.duration?.value ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    const dist = el?.status === 'OK' ? (el.distance?.value ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    return {
      ...s,
      travelTimeSeconds: time,
      travelDistanceMeters: dist,
      accessibilityLikely: isAccessibilityLikely(s.name),
    }
  })

  const preferAccessible = options?.preferAccessible === true
  ranked.sort((a, b) => {
    if (preferAccessible && a.accessibilityLikely !== b.accessibilityLikely) {
      return a.accessibilityLikely ? -1 : 1
    }
    return a.travelTimeSeconds - b.travelTimeSeconds
  })
  return ranked
}
