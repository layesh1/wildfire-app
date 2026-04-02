import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Flame,
  AlertTriangle,
  Scale,
  MapPinned,
  Brain,
  Thermometer,
  Activity,
  FlaskConical,
  BarChart2,
  Map,
  MapPin,
  TrendingUp,
  Database,
} from 'lucide-react'

export type AnalystMainTabId = 'overview' | 'prediction' | 'evacuation' | 'equity' | 'maps_trends'

export type AnalystSubNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type AnalystMainTabConfig = {
  id: AnalystMainTabId
  label: string
  emoji: string
  description: string
  /** First sub-route (sidebar + tab default) */
  href: string
  sub: AnalystSubNavItem[]
}

export const ANALYST_MAIN_TABS: AnalystMainTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    emoji: '',
    description: 'Platform summary, key metrics, and how Flameo uses your models and data.',
    href: '/dashboard/analyst',
    sub: [],
  },
  {
    id: 'prediction',
    label: 'Fire prediction',
    emoji: '🔥',
    description: 'ML, fire weather, and historical fire behavior.',
    href: '/dashboard/analyst/ml',
    sub: [
      { label: 'ML Predictor', href: '/dashboard/analyst/ml', icon: Brain },
      { label: 'Fire weather', href: '/dashboard/analyst/fire-weather', icon: Thermometer },
      { label: 'Fire patterns', href: '/dashboard/analyst/fire-patterns', icon: Activity },
      { label: 'Simulation lab', href: '/dashboard/analyst/simulation', icon: FlaskConical },
    ],
  },
  {
    id: 'evacuation',
    label: 'Evacuation analysis',
    emoji: '🚨',
    description: 'Alert equity and under-detected risk.',
    href: '/dashboard/analyst/signal-gap',
    sub: [
      { label: 'Signal gap', href: '/dashboard/analyst/signal-gap', icon: AlertTriangle },
      { label: 'Hidden danger', href: '/dashboard/analyst/hidden-danger', icon: Flame },
    ],
  },
  {
    id: 'equity',
    label: 'Impact & equity',
    emoji: '📊',
    description: 'Demographic impact and national risk index views.',
    href: '/dashboard/analyst/equity',
    sub: [
      { label: 'Equity metrics', href: '/dashboard/analyst/equity', icon: Scale },
      { label: 'NRI analysis', href: '/dashboard/analyst/nri', icon: BarChart2 },
    ],
  },
  {
    id: 'maps_trends',
    label: 'Maps & trends',
    emoji: '🗺️',
    description: 'Live fire map, density, long-term trends, and pipeline health.',
    href: '/dashboard/analyst/map',
    sub: [
      { label: 'Live fire map', href: '/dashboard/analyst/map', icon: Map },
      { label: 'Fire density', href: '/dashboard/analyst/fire-density', icon: MapPin },
      { label: 'Trends', href: '/dashboard/analyst/trends', icon: TrendingUp },
      { label: 'Data health', href: '/dashboard/analyst/data-health', icon: Database },
    ],
  },
]

/** Sidebar: overview + five work areas + settings lives outside this list */
export const ANALYST_SIDEBAR_PRIMARY: { label: string; href: string; icon: LucideIcon; tabId: AnalystMainTabId }[] = [
  { label: 'Overview', href: '/dashboard/analyst', icon: BarChart3, tabId: 'overview' },
  { label: 'Fire prediction', href: '/dashboard/analyst/ml', icon: Brain, tabId: 'prediction' },
  { label: 'Evacuation analysis', href: '/dashboard/analyst/signal-gap', icon: AlertTriangle, tabId: 'evacuation' },
  { label: 'Impact & equity', href: '/dashboard/analyst/equity', icon: Scale, tabId: 'equity' },
  { label: 'Maps & trends', href: '/dashboard/analyst/map', icon: MapPinned, tabId: 'maps_trends' },
]

export function getAnalystMainTabId(pathname: string): AnalystMainTabId {
  const p = pathname.replace(/\/$/, '') || '/dashboard/analyst'
  if (p === '/dashboard/analyst') return 'overview'
  if (/^\/dashboard\/analyst\/(ml|fire-weather|fire-patterns|simulation)(\/|$)/.test(pathname)) return 'prediction'
  if (/^\/dashboard\/analyst\/(signal-gap|hidden-danger)(\/|$)/.test(pathname)) return 'evacuation'
  if (/^\/dashboard\/analyst\/(equity|nri)(\/|$)/.test(pathname)) return 'equity'
  if (/^\/dashboard\/analyst\/(map|fire-density|trends|data-health)(\/|$)/.test(pathname)) return 'maps_trends'
  return 'overview'
}

export function getMainTabConfig(id: AnalystMainTabId): AnalystMainTabConfig | undefined {
  return ANALYST_MAIN_TABS.find(t => t.id === id)
}
