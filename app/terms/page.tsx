import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service · Minutes Matter',
  description: 'Terms of Service for Minutes Matter (WildfireAlert).',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ash-950 text-ash-100">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <Link
          href="/"
          className="text-sm font-semibold text-amber-300 underline-offset-2 hover:text-amber-200 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="font-display mt-6 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-ash-400">
          Minutes Matter provides wildfire awareness, evacuation planning, and related tools (“Service”). By using the
          Service you agree to these terms.
        </p>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">1. The Service</h2>
          <p>
            The Service aggregates third-party and modeled data (including federal fire feeds, weather, and shelter
            listings). Information may be incomplete, delayed, or incorrect. The Service is not a substitute for
            official evacuation orders, 911, or instructions from emergency management.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">2. Your account</h2>
          <p>
            You are responsible for your account credentials and for information you submit (including addresses and
            health or mobility details you choose to share). You must be at least 13 years old to use the Service where
            permitted by law.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">3. Acceptable use</h2>
          <p>
            Do not misuse the Service, attempt unauthorized access, or use it in violation of law. Emergency responder
            accounts must follow organizational policies and in-app data-access agreements.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">4. Privacy</h2>
          <p>
            Our{' '}
            <Link href="/privacy" className="font-semibold text-amber-300 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            describes how we handle personal information.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">5. Disclaimer of warranties</h2>
          <p>
            THE SERVICE IS PROVIDED “AS IS.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. YOU USE THE SERVICE AT YOUR OWN
            RISK, ESPECIALLY IN EMERGENCY SITUATIONS.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">6. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS ARISING OUT OF YOUR USE OF OR RELIANCE ON THE SERVICE,
            INCLUDING IN CONNECTION WITH WILDFIRES OR EVACUATIONS.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-relaxed text-ash-300">
          <h2 className="text-base font-semibold text-white">7. Changes</h2>
          <p>We may update these terms. Continued use after changes constitutes acceptance of the updated terms.</p>
        </section>
      </div>
    </div>
  )
}
