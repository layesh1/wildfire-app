import { cn } from '@/lib/utils'

/** Selected chip / toggle — white label + rim in light mode; muted rim on dark emerald fill */
export const CHIP_SELECTED =
  'border-2 border-white bg-green-700 text-white shadow-sm dark:border-white/35 dark:bg-emerald-700 dark:text-white dark:shadow-none'

/** Unselected chip / toggle (border-2 matches selected so layout does not shift) */
export const CHIP_UNSELECTED =
  'border-2 border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'

export function chipToggleClass(selected: boolean, extra?: string) {
  return cn('font-medium transition-all', selected ? CHIP_SELECTED : CHIP_UNSELECTED, extra)
}
