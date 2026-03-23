import { NextResponse } from 'next/server'

/**
 * Server-side proxy to Google's translation engine.
 * Uses the same endpoint as Chrome's built-in translate (client=gtx).
 * No API key required. Server-side to avoid CORS.
 */
export async function POST(req: Request) {
  try {
    const { texts, target } = await req.json()

    if (!Array.isArray(texts) || !target || typeof target !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (target === 'en') {
      return NextResponse.json({ translations: texts })
    }

    const results = await Promise.all(
      texts.map(async (text: string) => {
        if (!text || !text.trim()) return text
        try {
          const url =
            `https://translate.googleapis.com/translate_a/single` +
            `?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
          })
          if (!res.ok) return text
          const data = await res.json()
          // data[0] is [[translated, original], ...] segments
          return (data[0] as [string, string][])?.map(([t]) => t).join('') || text
        } catch {
          return text // fallback to original on error
        }
      })
    )

    return NextResponse.json({ translations: results })
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
