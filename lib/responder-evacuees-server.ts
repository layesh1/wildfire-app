import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildHouseholdPins,
  type HouseholdPin,
  type ResponderEvacueeProfile,
} from '@/lib/responder-household'

export function isEmergencyResponder(
  role: string | null | undefined,
  roles: string[] | null | undefined
): boolean {
  if (role === 'emergency_responder') return true
  return Array.isArray(roles) && roles.includes('emergency_responder')
}

function mapProfileToRow(p: {
  id: string
  full_name: string | null
  address: string
  home_evacuation_status: string
  home_status_updated_at: string | null
  mobility_needs: string[] | null
  medical_needs: string[] | null
  disability_other: string | null
  medical_other: string | null
  work_address: string | null
  work_building_type: string | null
  work_floor_number: number | null
  phone: string | null
  health_data_consent: boolean | null
}): ResponderEvacueeProfile {
  const health = p.health_data_consent === true
  return {
    id: p.id,
    full_name: p.full_name,
    home_address: p.address.trim(),
    home_evacuation_status: p.home_evacuation_status,
    home_status_updated_at: p.home_status_updated_at,
    mobility_needs: health ? (p.mobility_needs ?? []).filter(Boolean) : [],
    medical_needs: health ? (p.medical_needs ?? []).filter(Boolean) : [],
    disability_other: health ? p.disability_other : null,
    medical_other: health ? p.medical_other : null,
    work_address: p.work_address,
    work_building_type: p.work_building_type,
    work_floor_number: p.work_floor_number,
    phone: p.phone?.trim() ? p.phone : null,
  }
}

/**
 * Consented evacuee rows for responder map / COMMAND (no live GPS, email, or safety fields).
 */
export async function fetchResponderEvacueeProfiles(
  supabase: SupabaseClient
): Promise<{ list: ResponderEvacueeProfile[]; error: string | null }> {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select(
      [
        'id',
        'full_name',
        'address',
        'home_evacuation_status',
        'home_status_updated_at',
        'mobility_needs',
        'medical_needs',
        'disability_other',
        'medical_other',
        'work_address',
        'work_building_type',
        'work_floor_number',
        'phone',
        'health_data_consent',
        'location_sharing_consent',
        'evacuation_status_consent',
      ].join(', ')
    )
    .eq('location_sharing_consent', true)
    .eq('evacuation_status_consent', true)
    .not('address', 'is', null)
    .not('home_evacuation_status', 'is', null)

  if (error) {
    return { list: [], error: error.message }
  }

  type Raw = Parameters<typeof mapProfileToRow>[0]
  const list = ((rows ?? []) as unknown[])
    .filter((r): r is Raw => {
      const rec = r as Record<string, unknown>
      return typeof rec.address === 'string' && rec.address.trim().length > 0
    })
    .map(r => mapProfileToRow(r))

  return { list, error: null }
}

export async function fetchResponderHouseholdPins(supabase: SupabaseClient): Promise<{
  householdPins: HouseholdPin[]
  error: string | null
}> {
  const { list, error } = await fetchResponderEvacueeProfiles(supabase)
  if (error) return { householdPins: [], error }
  const householdPins = await buildHouseholdPins(list)
  return { householdPins, error: null }
}
