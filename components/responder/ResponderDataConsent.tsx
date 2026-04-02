'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  REQUIRED_RESPONDER_CONSENT_VERSION,
} from '@/lib/responder-data-consent'

type Props = {
  open: boolean
  onAgreed: () => void
}

export default function ResponderDataConsent({ open, onAgreed }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  async function handleAgree() {
    setBusy(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErr('You must be signed in.')
        setBusy(false)
        return
      }
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({
          responder_consent_accepted: true,
          responder_consent_accepted_at: now,
          responder_consent_version: REQUIRED_RESPONDER_CONSENT_VERSION,
        })
        .eq('id', user.id)
      if (error) {
        setErr(error.message)
        setBusy(false)
        return
      }
      onAgreed()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="responder-consent-title"
    >
      <div className="max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-ash-700 dark:bg-ash-900">
        <h2
          id="responder-consent-title"
          className="font-display text-xl font-bold text-emerald-900 dark:text-white"
        >
          Data Access Agreement
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-ash-200">
          You are about to view sensitive evacuation and medical information.
        </p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-900 dark:text-ash-100">
          <p className="text-neutral-900 dark:text-ash-100">
            As an emergency responder using WildfireAlert, you agree to the following:
          </p>
          <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-emerald-900 dark:marker:text-emerald-400">
            <li>
              <span className="font-semibold text-emerald-900 dark:text-white">Purpose limitation</span>
              <br />
              <span className="text-neutral-800 dark:text-ash-100">
                You will only use evacuee location, evacuation status, and medical information for emergency
                response and evacuation assistance during active incidents.
              </span>
            </li>
            <li>
              <span className="font-semibold text-emerald-900 dark:text-white">Confidentiality</span>
              <br />
              <span className="text-neutral-800 dark:text-ash-100">
                You will not share, copy, or store evacuee personal or medical information outside of your
                official emergency response duties.
              </span>
            </li>
            <li>
              <span className="font-semibold text-emerald-900 dark:text-white">Data minimization</span>
              <br />
              <span className="text-neutral-800 dark:text-ash-100">
                You will only access the information you need to assist with evacuation. You will not browse
                evacuee profiles beyond operational necessity.
              </span>
            </li>
            <li>
              <span className="font-semibold text-emerald-900 dark:text-white">Incident scope</span>
              <br />
              <span className="text-neutral-800 dark:text-ash-100">
                Your access to sensitive data is intended for active incident response only.
              </span>
            </li>
            <li>
              <span className="font-semibold text-emerald-900 dark:text-white">Logging</span>
              <br />
              <span className="text-neutral-800 dark:text-ash-100">
                Your access to this data is logged for accountability and auditing purposes.
              </span>
            </li>
          </ol>
          <p className="text-neutral-800 dark:text-ash-200">
            By continuing, you confirm you understand and agree to these terms. Our site-wide{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Privacy Policy
            </Link>
            {' '}
            also apply (each opens in a new tab).
          </p>
        </div>
        {err && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {err}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-ash-600 dark:text-ash-200 dark:hover:bg-ash-800"
          >
            Cancel — Return to Dashboard
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAgree()}
            className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'I Agree — View Evacuation Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
