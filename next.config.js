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
      // Google Translate also loads scripts from gstatic CDN — must be whitelisted
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://translate.googleapis.com https://translate.google.com https://www.gstatic.com https://ssl.gstatic.com capacitor://localhost",
      // Styles: self + inline (Tailwind) + Google Fonts + Google Translate
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://www.gstatic.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com https://www.gstatic.com",
      // Images: self + data URIs (Leaflet SVG icons) + tile servers + Supabase + Google
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.tile.opentopomap.org https://server.arcgisonline.com https://*.supabase.co https://firms.modaps.eosdis.nasa.gov https://www.gstatic.com https://ssl.gstatic.com https://translate.googleapis.com https://www.google.com",
      // API calls: self + Supabase + external APIs + Nominatim address autocomplete + FEMA NRI
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://firms.modaps.eosdis.nasa.gov https://services3.arcgis.com https://opendata.arcgis.com https://*.googleapis.com https://translate.google.com https://www.google.com https://nominatim.openstreetmap.org https://hazards.fema.gov capacitor://localhost http://localhost",
      // Google OAuth + Google Translate iframes
      "frame-src https://accounts.google.com https://translate.google.com https://translate.googleapis.com https://www.google.com",
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
      // Apple requires AASA served as application/json with no redirect
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

module.exports = nextConfig
