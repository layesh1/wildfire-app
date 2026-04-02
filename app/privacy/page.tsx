import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy · Minutes Matter',
  description: 'Privacy Policy for Minutes Matter (WildfireAlert).',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ash-950 text-ash-100">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <Link
          href="/"
          className="text-sm font-semibold text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="font-display mt-6 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ash-400">
          This policy describes how Minutes Matter (“we,” “us”) collects, uses, and shares information when you use our
          websites and applications (the “Service”).
        </p>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">1. Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-white">Account data:</span> email, name, and profile fields you provide (e.g. home
              address, work location, language, emergency contacts).
            </li>
            <li>
              <span className="text-white">Safety and health fields you opt into:</span> mobility or medical information
              you choose to save for responder visibility during incidents.
            </li>
            <li>
              <span className="text-white">Device location (optional):</span> when you allow it, we use approximate or
              precise location in-session for maps, proximity to incidents, and routing—not as a stored history for
              marketing.
            </li>
            <li>
              <span className="text-white">Technical data:</span> logs and diagnostics needed to operate and secure the
              Service.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">2. How we use information</h2>
          <p>We use information to provide alerts, maps, shelter routing, check-ins, family linking, and responder tools;
            to improve reliability; to comply with law; and to protect users and the Service.</p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">3. Sharing</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-white">Emergency responders:</span> only when you have given the in-app consents
              described at signup or in Settings, and for verified responder accounts subject to access logging.
            </li>
            <li>
              <span className="text-white">Family / My People:</span> status you choose to share with linked accounts.
            </li>
            <li>
              <span className="text-white">Service providers:</span> infrastructure vendors (e.g. hosting, email)
              that process data on our behalf under appropriate agreements.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">4. Retention and your choices</h2>
          <p>
            You can review and remove many profile fields, consents, and account data in Settings. Signed-in users can
            open{' '}
            <Link
              href="/dashboard/settings/privacy"
              className="font-semibold text-amber-300 underline-offset-2 hover:underline"
            >
              Privacy &amp; Security in Settings
            </Link>{' '}
            for a detailed breakdown. Account deletion, where offered, removes associated profile data subject to legal
            retention needs.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">5. Security</h2>
          <p>We use industry-standard transport encryption and hosted infrastructure with encryption at rest. No method
            of transmission or storage is 100% secure.</p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">6. Children</h2>
          <p>The Service is not directed to children under 13. We do not knowingly collect personal information from
            children under 13.</p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">7. Contact</h2>
          <p>
            For privacy questions, contact us through the support channel listed on the site or your organization’s
            administrator. See also our{' '}
            <Link href="/terms" className="font-semibold text-amber-300 underline-offset-2 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
