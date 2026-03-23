/**
 * DOM-based translation using /api/translate (Google's translation engine server-side).
 *
 * After React hydration the DOM is stable. We walk all text nodes,
 * batch-translate them, and replace in place. Results are cached in
 * localStorage so repeat navigations and page reloads are near-instant.
 *
 * A WeakMap tracks the original English text of every translated node so
 * multi-step switching (e.g. en→fr then fr→es) always translates FROM
 * the original English rather than from a previously-translated value.
 *
 * Tags that must not be translated: SCRIPT, STYLE, CODE, PRE, INPUT, etc.
 * Elements with data-notranslate="true" are also skipped.
 */

const LS_CACHE_KEY = 'wfa_translations'

// Preserve original English text of each Text node across in-session language switches
const nodeOriginals = new WeakMap<Text, string>()

function getCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || '{}') } catch { return {} }
}

function saveCache(cache: Record<string, string>) {
  try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cache)) } catch {}
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
      const t = node as Text
      const text = t.textContent?.trim() ?? ''
      // Skip pure numbers, punctuation-only, very short strings
      if (text.length > 1 && !/^[\d\s.,!?%:;()\-–—]+$/.test(text)) {
        // Record original English text on first encounter only
        if (!nodeOriginals.has(t)) nodeOriginals.set(t, text)
        nodes.push(t)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (SKIP_TAGS.has(el.tagName.toUpperCase())) return
      if (el.getAttribute('data-notranslate') === 'true') return
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
  const nodes = collectTextNodes(document.body)
  if (!nodes.length) return

  // Switching back to English: restore original text from WeakMap
  if (!targetLang || targetLang === 'en') {
    for (const node of nodes) {
      const original = nodeOriginals.get(node)
      if (original) {
        const current = node.textContent ?? ''
        const currentTrimmed = current.trim()
        if (currentTrimmed && currentTrimmed !== original) {
          node.textContent = current.replace(currentTrimmed, original)
        }
      }
    }
    return
  }

  const cache = getCache()

  // ALWAYS look up by original English text, not the current (possibly-translated) content
  const allTexts = [...new Set(
    nodes.map(n => nodeOriginals.get(n) ?? n.textContent?.trim() ?? '').filter(Boolean)
  )]
  const needFetch = allTexts.filter(t => !(`${targetLang}:${t}` in cache))

  if (needFetch.length > 0) {
    const fresh = await fetchTranslations(needFetch, targetLang)
    for (const [orig, translated] of Object.entries(fresh)) {
      cache[`${targetLang}:${orig}`] = translated
    }
    saveCache(cache)
  }

  // Apply translations
  for (const node of nodes) {
    const original = nodeOriginals.get(node) ?? node.textContent?.trim() ?? ''
    const translated = cache[`${targetLang}:${original}`]
    if (translated) {
      const current = node.textContent!
      node.textContent = current.replace(original, translated)
    }
  }
}

export function clearTranslationCache() {
  try { localStorage.removeItem(LS_CACHE_KEY) } catch {}
}
