import Link from 'next/link'
import { Shield, Eye, Trash2 } from 'lucide-react'

export const metadata = {
  title: 'Privacy & Security · Settings',
}

export default function PrivacySecurityPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/dashboard/settings?tab=account"
        className="mb-4 inline-block text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
      >
        ← Back to Settings
      </Link>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Privacy & Security</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        How WildfireAlert handles your information and who can see it.
      </p>

      <section className="card mt-8 space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How your data is protected</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Data at rest is encrypted using AES-256 (Supabase default encryption).</li>
          <li>Connections are encrypted in transit (TLS 1.3).</li>
          <li>Medical and mobility information is only shared with emergency responders when you consent in Settings.</li>
          <li>Your GPS location is not stored as a history — it is used in-session for fire proximity when you allow location on your device.</li>
          <li>Emergency responders must accept an in-app data handling agreement before viewing your sensitive information.</li>
          <li>Responder access to evacuee data is logged for accountability.</li>
        </ul>
      </section>

      <section className="card mt-6 space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Who can see what</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3 font-semibold text-gray-900 dark:text-white">Data type</th>
                <th className="py-2 pr-3 font-semibold text-gray-900 dark:text-white">You</th>
                <th className="py-2 pr-3 font-semibold text-gray-900 dark:text-white">Family</th>
                <th className="py-2 font-semibold text-gray-900 dark:text-white">Responders</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3">Home address</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2 pr-3">No</td>
                <td className="py-2">Yes, if you consented to location sharing</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3">Evacuation status</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2">Yes, if you consented</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3">Personal safety check-ins</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2">Never</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3">Health / mobility</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2 pr-3">No</td>
                <td className="py-2">Yes, if health data consent is on</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Live location</td>
                <td className="py-2 pr-3">Yes</td>
                <td className="py-2 pr-3">When shared in-app</td>
                <td className="py-2">Never stored for responders</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your rights</h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>You can delete your health and mobility data anytime in Settings → Account &amp; Roles.</li>
          <li>You can delete your saved home and work location data anytime in the same section.</li>
          <li>You can delete your entire account from Account actions in Settings.</li>
        </ul>
        <Link
          href="/dashboard/settings?tab=account"
          className="inline-flex text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
        >
          Open Account &amp; Roles to clear data →
        </Link>
      </section>
    </div>
  )
}
