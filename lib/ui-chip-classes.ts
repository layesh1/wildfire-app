import { cn } from '@/lib/utils'

/** Selected chip / toggle — high contrast in light and dark mode */
export const CHIP_SELECTED =
  'bg-green-700 text-white border-green-700 dark:bg-green-600 dark:text-white dark:border-green-600'

/** Unselected chip / toggle */
export const CHIP_UNSELECTED =
  'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'

export function chipToggleClass(selected: boolean, extra?: string) {
  return cn('border font-medium transition-all', selected ? CHIP_SELECTED : CHIP_UNSELECTED, extra)
}
