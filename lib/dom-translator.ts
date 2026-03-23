/**
 * DOM-based translation using /api/translate (Google's translation engine server-side).
 *
 * Key design choices:
 * - localStorage cache: persists across navigations & reloads → instant repeat switches
 * - WeakMap originals: tracks original English text per node so fr→es works correctly
 * - Parallel batches: all API calls fire simultaneously (not sequentially) for speed
 * - MutationObserver: catches dynamically-loaded content (Supabase lists, etc.)
 */

const LS_CACHE_KEY = 'wfa_translations'
const BATCH = 50

// Track original English text of every text node so multi-language switching
// always translates FROM English, not from a previously-translated value.
const nodeOriginals = new WeakMap<Text, string>()

// ─── Cache helpers ────────────────────────────────────────────────────────────

function getCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || '{}') } catch { return {} }
}

function saveCache(cache: Record<string, string>) {
  try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(cache)) } catch {}
}

export function clearTranslationCache() {
  try { localStorage.removeItem(LS_CACHE_KEY) } catch {}
}

// ─── DOM walking ─────────────────────────────────────────────────────────────

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
      if (text.length > 1 && !/^[\d\s.,!?%:;()\-–—]+$/.test(text)) {
        // Record original English only on first encounter
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

// ─── Fetch (parallel batches) ─────────────────────────────────────────────────

async function fetchBatch(texts: string[], target: string): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target }),
    })
    if (!res.ok) return map
    const { translations } = await res.json()
    texts.forEach((text, idx) => {
      if (translations[idx] && translations[idx] !== text) map[text] = translations[idx]
    })
  } catch { /* skip batch on error */ }
  return map
}

async function fetchTranslations(texts: string[], target: string): Promise<Record<string, string>> {
  // Fire ALL batches in parallel instead of sequentially
  const batches: string[][] = []
  for (let i = 0; i < texts.length; i += BATCH) batches.push(texts.slice(i, i + BATCH))

  const results = await Promise.all(batches.map(b => fetchBatch(b, target)))
  return Object.assign({}, ...results)
}

// ─── Apply translations ───────────────────────────────────────────────────────

function applyTranslations(nodes: Text[], cache: Record<string, string>, targetLang: string) {
  for (const node of nodes) {
    const original = nodeOriginals.get(node) ?? node.textContent?.trim() ?? ''
    const translated = cache[`${targetLang}:${original}`]
    if (translated) {
      const current = node.textContent!
      node.textContent = current.replace(original, translated)
    }
  }
}

function restoreOriginals(nodes: Text[]) {
  for (const node of nodes) {
    const original = nodeOriginals.get(node)
    if (!original) continue
    const current = node.textContent ?? ''
    const trimmed = current.trim()
    if (trimmed && trimmed !== original) {
      node.textContent = current.replace(trimmed, original)
    }
  }
}

// ─── Main translate function ──────────────────────────────────────────────────

let _translating = false // guard against re-entrant observer calls

export async function translateDocument(targetLang: string): Promise<void> {
  if (_translating) return
  _translating = true

  try {
    const nodes = collectTextNodes(document.body)
    if (!nodes.length) return

    if (!targetLang || targetLang === 'en') {
      restoreOriginals(nodes)
      return
    }

    const cache = getCache()

    // Always use the original English text as the lookup key
    const allTexts = [...new Set(
      nodes.map(n => nodeOriginals.get(n) ?? n.textContent?.trim() ?? '').filter(Boolean)
    )]
    const needFetch = allTexts.filter(t => !(`${targetLang}:${t}` in cache))

    if (needFetch.length > 0) {
      const fresh = await fetchTranslations(needFetch, targetLang)
      for (const [orig, trans] of Object.entries(fresh)) cache[`${targetLang}:${orig}`] = trans
      saveCache(cache)
    }

    applyTranslations(nodes, cache, targetLang)
  } finally {
    _translating = false
  }
}

// ─── MutationObserver (dynamic content e.g. Supabase-loaded lists) ────────────

let _observer: MutationObserver | null = null
let _observerLang: string | null = null
let _debounce: ReturnType<typeof setTimeout> | null = null

export function startTranslationObserver(targetLang: string) {
  stopTranslationObserver()
  if (!targetLang || targetLang === 'en') return

  _observerLang = targetLang

  _observer = new MutationObserver((mutations) => {
    // Only care about new element/text nodes being added to the DOM
    const hasNew = mutations.some(m =>
      Array.from(m.addedNodes).some(n =>
        n.nodeType === Node.TEXT_NODE ||
        (n.nodeType === Node.ELEMENT_NODE && (n as Element).textContent?.trim())
      )
    )
    if (!hasNew || !_observerLang) return

    if (_debounce) clearTimeout(_debounce)
    _debounce = setTimeout(() => {
      if (_observerLang) translateDocument(_observerLang)
    }, 250)
  })

  _observer.observe(document.body, {
    childList: true,
    subtree: true,
    // characterData: false — we don't watch text changes to avoid loops
    // (our own node.textContent = ... fires characterData, not childList)
  })
}

export function stopTranslationObserver() {
  _observer?.disconnect()
  _observer = null
  _observerLang = null
  if (_debounce) clearTimeout(_debounce)
  _debounce = null
}
