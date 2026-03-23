import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono, Poppins } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ScrollToTop from '@/components/ScrollToTop'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Minutes Matter | Wildfire Evacuation Intelligence',
  description: 'Real-time wildfire signal gap analysis and caregiver alert system. WiDS Datathon 2026.',
  keywords: ['wildfire', 'evacuation', 'alert', 'equity', 'SVI', 'emergency'],
  icons: {
    icon: '/flameo1.png',
    apple: '/flameo1.png',
  },
  openGraph: {
    title: 'Minutes Matter',
    description: 'Equity-driven wildfire evacuation intelligence',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('wfa_theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}` }} />
      </head>
      <body className="bg-gray-50 text-gray-900 font-poppins antialiased" suppressHydrationWarning>
        <ScrollToTop />
        {children}

        {/*
          Google Translate integration — three-part setup:

          1. This div is SERVER-RENDERED so it's present in the HTML that React hydrates against.
             React reconciliation keeps it (no mismatch). GT finds it by ID and renders into it.
             Positioned off-screen + visibility:hidden in globals.css keeps it invisible.

          2. gt-init script defines googleTranslateElementInit BEFORE the GT library loads,
             so GT can call it immediately when ready. strategy="afterInteractive" guarantees
             this runs AFTER React hydration — no React #418 conflict.

          3. gt-script loads the GT library. afterInteractive = after hydration.
             GT calls googleTranslateElementInit, reads the googtrans cookie,
             and auto-translates because autoDisplay:true.
        */}
        <div
          id="google_translate_element"
          style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '220px', height: '40px' }}
          suppressHydrationWarning
        />
        <Script id="gt-init" strategy="afterInteractive">{`
          window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement(
              { pageLanguage: 'en', autoDisplay: true },
              'google_translate_element'
            );
          };
        `}</Script>
        <Script
          id="gt-script"
          src="https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
