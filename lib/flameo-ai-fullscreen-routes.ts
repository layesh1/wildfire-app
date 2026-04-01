/** Dedicated Flameo AI chat routes that use the full viewport (ER + evacuee hubs). */
export function isFlameoDashboardAiFullScreenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname === '/dashboard/responder/ai' ||
    pathname === '/dashboard/home/ai' ||
    pathname === '/dashboard/evacuee/ai' ||
    pathname === '/m/dashboard/home/ai' ||
    pathname === '/m/dashboard/evacuee/ai' ||
    pathname === '/m/dashboard/responder/ai'
  )
}
