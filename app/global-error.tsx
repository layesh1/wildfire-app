'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error.digest ?? 'unknown')
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617', fontFamily: 'sans-serif', color: '#f1f5f9' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Critical error</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
              The app encountered a critical error. Please refresh the page.
            </p>
            <button
              onClick={reset}
              style={{ padding: '10px 24px', background: '#f97316', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
