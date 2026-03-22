'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console only — never send internal error details to client
    console.error('[App Error]', error.digest ?? 'unknown')
  }, [error])

  return (
    <div className="min-h-screen bg-ash-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-signal-danger/10 border border-signal-danger/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-signal-danger" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-ash-400 text-sm mb-6">
          An unexpected error occurred. Your data is safe — try refreshing or going back.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ember-500 hover:bg-ember-400 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl border border-ash-700 text-ash-300 hover:text-white hover:border-ash-600 text-sm font-medium transition-colors"
          >
            Go to dashboard
          </a>
        </div>
        {error.digest && (
          <p className="text-ash-700 text-xs mt-6 font-mono">ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
