'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Page failed to load</h2>
        <p className="text-gray-500 text-sm mb-6">
          Something went wrong on this page. Your data is safe — try reloading or go back to the hub.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#16a34a' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
          <Link
            href="/dashboard/caregiver"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Go to Hub
          </Link>
        </div>
        {error.digest && (
          <p className="text-gray-400 text-xs mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
