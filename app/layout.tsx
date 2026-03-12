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
  title: 'WildfireAlert | Equity-Driven Evacuation Intelligence',
  description: 'Real-time wildfire signal gap analysis and caregiver alert system. WiDS Datathon 2025.',
  keywords: ['wildfire', 'evacuation', 'alert', 'equity', 'SVI', 'emergency'],
  openGraph: {
    title: 'WildfireAlert',
    description: 'Equity-driven wildfire evacuation intelligence',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head />
      <body className="bg-gray-50 text-gray-900 font-body antialiased">
        {children}
      </body>
    </html>
  )
}
