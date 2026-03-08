export type UserRole = 'emergency_responder' | 'caregiver' | 'evacuee' | 'data_analyst'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name?: string
  county?: string
  created_at: string
}

export interface FireEvent {
  id: string
  geo_event_id: string
  incident_name?: string
  latitude: number
  longitude: number
  county?: string
  state?: string
  acres_burned?: number
  containment_pct?: number
  started_at: string
  updated_at: string
  svi_score?: number
  has_evacuation_order: boolean
  signal_gap_hours?: number
}

export interface EvacuationSignal {
  id: string
  fire_event_id: string
  signal_type: 'wireless_alert' | 'social_media' | 'news' | 'official_order'
  received_at: string
  source?: string
  message?: string
}

export interface SignalGapAnalysis {
  county: string
  state: string
  svi_score: number
  median_delay_hours: number
  fire_count: number
  pct_no_formal_order: number
}

export interface MLPrediction {
  fire_id: string
  spread_risk: 'low' | 'moderate' | 'high' | 'extreme'
  predicted_acres_24h: number
  confidence: number
  features_used: string[]
}

export interface EvacueeRecord {
  id: string
  user_id: string
  fire_event_id?: string
  status: 'evacuated' | 'sheltering' | 'returning' | 'unknown'
  location_name?: string
  needs?: string[]
  updated_at: string
}

export interface NASAFirm {
  latitude: number
  longitude: number
  brightness: number
  scan: number
  track: number
  acq_date: string
  acq_time: string
  satellite: string
  confidence: number
  frp: number
}
