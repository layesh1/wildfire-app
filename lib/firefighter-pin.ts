export interface FirefighterPin {
  id: string
  name: string
  lat: number
  lng: number
  status: string
  current_assignment: string | null
  last_seen_at: string
}
