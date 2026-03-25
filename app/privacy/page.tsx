import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Minutes Matter',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-12 max-w-3xl mx-auto font-poppins">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: March 25, 2026</p>

      <section className="space-y-6 text-gray-700 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Overview</h2>
          <p>
            Minutes Matter (&quot;the App&quot;) is a wildfire evacuation intelligence platform.
            This policy explains what data we collect, how we use it, and your rights.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account information:</strong> Email address and name when you sign up (via Google OAuth or email/password).</li>
            <li><strong>Location data:</strong> Your device location is used only when you grant permission, to show nearby wildfires and evacuation routes. We do not store or share your location.</li>
            <li><strong>Evacuee records:</strong> Safety check-in data you voluntarily submit (name, status, needs) is stored in our database to coordinate emergency response.</li>
            <li><strong>Usage data:</strong> We collect anonymous page views to improve the app. No personal browsing data is tracked.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide wildfire alerts and evacuation intelligence relevant to your area.</li>
            <li>To enable safety check-ins so caregivers and responders can coordinate.</li>
            <li>To power AI-assisted features (SAFE-PATH and COMMAND-INTEL) — your messages are processed by Anthropic&apos;s Claude API and are not stored beyond the session.</li>
            <li>To improve the reliability and performance of the App.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Third-Party Services</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase:</strong> Authentication and database hosting.</li>
            <li><strong>Anthropic (Claude API):</strong> AI chat processing — messages are not retained after the session.</li>
            <li><strong>NASA FIRMS:</strong> Real-time fire detection data (no personal data is shared).</li>
            <li><strong>Google OAuth:</strong> Optional sign-in method — we only receive your email and name.</li>
            <li><strong>OpenStreetMap / Nominatim:</strong> Map tiles and address search (no personal data is shared).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Storage &amp; Security</h2>
          <p>
            Your data is stored securely on Supabase infrastructure with row-level security policies.
            All connections use HTTPS encryption. We do not sell or share your personal data with
            third parties for marketing purposes.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Rights</h2>
          <p>You can:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Request a copy of your data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Revoke location permissions at any time through your device settings.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Children&apos;s Privacy</h2>
          <p>
            The App is not directed at children under 13. We do not knowingly collect
            personal information from children under 13.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page
            with an updated date.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact</h2>
          <p>
            For privacy questions or data requests, open an issue at{' '}
            <a
              href="https://github.com/layesh1/wildfire-app/issues"
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/layesh1/wildfire-app
            </a>.
          </p>
        </div>
      </section>
    </main>
  )
}
