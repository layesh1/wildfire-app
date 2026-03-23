/**
 * DOM-based translation using /api/translate (Google's translation engine server-side).
 *
 * After React hydration the DOM is stable. We walk all text nodes,
 * batch-translate them, and replace in place. Results are cached in
 * sessionStorage so repeat navigations within a session are instant.
 *
 * Tags that must not be translated: SCRIPT, STYLE, CODE, PRE, INPUT, etc.
 * Elements with data-notranslate="true" are also skipped.
 */

const SESSION_KEY = 'wfa_translations'

function getCache(): Record<string, string> {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') } catch { return {} }
}

function saveCache(cache: Record<string, string>) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache)) } catch {}
}

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE',
  'INPUT', 'TEXTAREA', 'SELECT', 'OPTION',
  'SVG', 'PATH', 'CANVAS',
])

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = []

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? ''
      // Skip pure numbers, punctuation-only, very short strings
      if (text.length > 1 && !/^[\d\s.,!?%:;()\-–—]+$/.test(text)) {
        nodes.push(node as Text)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (SKIP_TAGS.has(el.tagName.toUpperCase())) return
      if (el.getAttribute('data-notranslate') === 'true') return
      if (el.id === 'google_translate_element') return
      for (const child of Array.from(node.childNodes)) walk(child)
    }
  }

  walk(root)
  return nodes
}

async function fetchTranslations(texts: string[], target: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const BATCH = 25

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: batch, target }),
      })
      if (!res.ok) continue
      const { translations } = await res.json()
      batch.forEach((text, idx) => {
        if (translations[idx] && translations[idx] !== text) {
          map[text] = translations[idx]
        }
      })
    } catch {
      // skip batch on error — originals remain
    }
  }

  return map
}

export async function translateDocument(targetLang: string): Promise<void> {
  if (!targetLang || targetLang === 'en') return

  const nodes = collectTextNodes(document.body)
  if (!nodes.length) return

  const cache = getCache()
  const allTexts = [...new Set(nodes.map(n => n.textContent?.trim() ?? '').filter(Boolean))]
  const needFetch = allTexts.filter(t => !(`${targetLang}:${t}` in cache))

  if (needFetch.length > 0) {
    const fresh = await fetchTranslations(needFetch, targetLang)
    for (const [orig, translated] of Object.entries(fresh)) {
      cache[`${targetLang}:${orig}`] = translated
    }
    saveCache(cache)
  }

  // Apply
  for (const node of nodes) {
    const original = node.textContent?.trim() ?? ''
    const translated = cache[`${targetLang}:${original}`]
    if (translated) {
      // Replace only the trimmed portion, preserving surrounding whitespace
      node.textContent = node.textContent!.replace(original, translated)
    }
  }
}

export function clearTranslationCache() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}
