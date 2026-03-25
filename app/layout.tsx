import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono, Poppins } from 'next/font/google'
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Minutes Matter',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png',  sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Minutes Matter',
    description: 'Equity-driven wildfire evacuation intelligence',
    type: 'website',
  },
}

export const viewport = {
  viewportFit: 'cover' as const,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3e2723" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('wfa_theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{var l=localStorage.getItem('app_language');if(l&&l!=='en'){document.documentElement.classList.add('wfa-translating');setTimeout(function(){document.documentElement.classList.remove('wfa-translating');},8000);}}catch(e){}` }} />
        {/* Register service worker for offline support (required for app store submission) */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}` }} />
      </head>
      <body className="bg-gray-50 text-gray-900 font-poppins antialiased" suppressHydrationWarning>
        <ScrollToTop />
        {children}
      </body>
    </html>
  )
}
