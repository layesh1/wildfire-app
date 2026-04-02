'use client'

import { Suspense } from 'react'
import ResponderCommandHubShell from '@/components/responder/ResponderCommandHubShell'

/** Command hub: evacuation-style map, hazards, shelters, opt-in households, Flameo COMMAND. */
export default function ResponderDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-gray-500">
          Loading hub…
        </div>
      }
    >
      <ResponderCommandHubShell />
    </Suspense>
  )
}
