/** Work / secondary location — mirrors profiles columns from 20260406_work_location.sql */

export const WORK_BUILDING_TYPES = ['house', 'apartment', 'office', 'other'] as const

export type WorkBuildingType = (typeof WORK_BUILDING_TYPES)[number]

export function isWorkBuildingType(s: string | null | undefined): s is WorkBuildingType {
  return WORK_BUILDING_TYPES.includes(s as WorkBuildingType)
}

export function workBuildingNeedsFloor(t: WorkBuildingType | null | undefined): boolean {
  return t === 'office' || t === 'apartment'
}
