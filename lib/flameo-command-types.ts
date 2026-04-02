export type CommandActionRequired = 'EMS' | 'TRANSPORT' | 'CHECK' | 'CLEAR'

export interface PriorityAssignmentMember {
  name: string
  status: string
  flags: string[]
}

export interface PriorityAssignment {
  rank: number
  address: string
  lat: number
  lng: number
  reason: string
  action_required: CommandActionRequired
  people_count: number
  cannot_evacuate_count: number
  mobility_flags: string[]
  medical_flags: string[]
  members: PriorityAssignmentMember[]
  /** Nearest available firefighter on the map (when positions are reported). */
  assigned_to?: string
  assigned_firefighter_id?: string
  /** Rough drive-time estimate at ~25 mph straight-line proxy. */
  estimated_travel_minutes?: number
}

export interface FlameoCommandIncidentSummary {
  total_households: number
  total_people: number
  evacuated: number
  not_evacuated: number
  needs_help: number
  completion_rate: number
}

export interface FlameoCommandFireContext {
  nearest_fire_miles: number | null
  wind_dir: string | null
  wind_mph: number | null
  fire_risk: string
}

/** Field units reporting GPS on the command map (station roster). */
export interface CommandFieldUnitReporting {
  name: string
  lat: number
  lng: number
  status: string
  current_assignment: string | null
  last_seen_at: string
}

export interface FlameoCommandContext {
  incident_summary: FlameoCommandIncidentSummary
  priority_assignments: PriorityAssignment[]
  fire_context: FlameoCommandFireContext
  generated_at: string
  /** Units with last-known positions — use with priority_assignments.assigned_to for dispatch wording. */
  field_units_reporting: CommandFieldUnitReporting[]
  /** Roster members not sharing GPS (cannot auto-assign nearest). */
  field_units_without_position_count: number
}
