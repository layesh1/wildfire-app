import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'

export type ConsumerAlertSeverity = 'critical' | 'high' | 'elevated' | 'watch'

export type NifcProximityItem = NifcFire & { distanceKm: number }

export type AiAlertSummary = {
  headline: string
  severity: string
  bullets: string[]
  recommended_actions: string[]
}

export function milesToKm(mi: number): number {
  return Math.max(1, mi) * 1.609344
}
