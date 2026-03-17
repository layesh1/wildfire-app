import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'Minutes Matter | Wildfire Evacuation Intelligence',
  description: 'Real-time wildfire signal gap analysis and caregiver alert system. WiDS Datathon 2025.',
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head>
        {/* Google Translate: inline init must come before the GT loader script */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `function googleTranslateElementInit(){new google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false},'google_translate_element');}` }} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script async src="https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit" />
      </head>
      <body className="bg-gray-50 text-gray-900 font-body antialiased" suppressHydrationWarning>
        {children}
        {/* GT div is created by gt-init.js — kept outside React's tree to prevent hydration conflicts */}
      </body>
    </html>
  )
}
