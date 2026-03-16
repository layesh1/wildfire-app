/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevents clickjacking — stops your app being embedded in iframes on other sites
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stops browsers from MIME-sniffing (e.g. treating a PNG as an executable)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Full URL in same-origin referrer, only origin on cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restricts browser features (camera/mic only when actually needed)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // Forces HTTPS for 1 year (only enable after you're sure HTTPS is stable)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Prevents XSS by limiting where scripts/resources can load from
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs unsafe-inline and unsafe-eval for its runtime
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      // Styles: self + inline (Tailwind) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (Leaflet SVG icons) + tile servers + Supabase
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.supabase.co https://firms.modaps.eosdis.nasa.gov",
      // API calls: self + Supabase + external APIs your routes use
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://firms.modaps.eosdis.nasa.gov https://services3.arcgis.com https://opendata.arcgis.com",
      // Google OAuth iframe
      "frame-src https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'firms.modaps.eosdis.nasa.gov' },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
