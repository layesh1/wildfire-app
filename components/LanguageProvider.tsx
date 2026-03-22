'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES, getLang, type Language } from '@/lib/languages'

const LS_KEY = 'app_language'

interface LangCtx {
  lang: Language
  setLanguage: (code: string) => Promise<void>
}

const Ctx = createContext<LangCtx>({
  lang: LANGUAGES[0],
  setLanguage: async () => {},
})

export function useLanguage() {
  return useContext(Ctx)
}

/** Reads the googtrans cookie value, e.g. "/en/es" → "es" */
function readGoogCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/googtrans=\/en\/([^;]+)/)
  return match ? match[1] : null
}

function setGoogCookie(code: string) {
  // Set on both root path and current path so iframe picks it up
  const exp = 'expires=Fri, 31 Dec 2099 23:59:59 GMT'
  document.cookie = `googtrans=/en/${code};path=/;${exp}`
  document.cookie = `googtrans=/en/${code};${exp}`
}

function clearGoogCookie() {
  document.cookie = 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
}


/** Triggers translation by manipulating the hidden Google Translate select.
 *  Three-layer strategy handles all timing scenarios on Vercel cold starts:
 *  1. Immediate check (works when GT already loaded on soft nav)
 *  2. MutationObserver (reacts the instant GT populates its option list)
 *  3. window.load event (fires after all scripts finish — catches very slow loads)
 *  4. Interval fallback (30s safety net, fires every 500ms) */
function triggerGT(code: string) {
  let done = false

  function apply(sel: HTMLSelectElement) {
    if (done) return
    done = true
    sel.value = code
    sel.dispatchEvent(new Event('change'))
  }

  function tryNow(): boolean {
    const sel = document.querySelector<HTMLSelectElement>('select.goog-te-combo')
    if (sel && sel.options.length > 1) { apply(sel); return true }
    return false
  }

  // Layer 1: immediate
  if (tryNow()) return

  // Layer 2: MutationObserver
  const observer = new MutationObserver(() => { if (tryNow()) observer.disconnect() })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  // Layer 3: window.load — fires after all async scripts finish
  window.addEventListener('load', () => { if (tryNow()) observer.disconnect() }, { once: true })

  // Layer 4: interval poll — 60 retries × 500ms = 30s safety net
  let tries = 0
  const interval = setInterval(() => {
    if (done || ++tries > 60) { clearInterval(interval); observer.disconnect(); return }
    tryNow()
  }, 500)
}

interface Props {
  children: React.ReactNode
  /** Language code from Supabase profile, null = first login */
  initialLang: string | null
}

export default function LanguageProvider({ children, initialLang }: Props) {
  const supabase = createClient()

  // Determine starting language: localStorage → profile → default 'en'
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return LANGUAGES[0]
    const ls = localStorage.getItem(LS_KEY)
    return getLang(ls ?? initialLang ?? 'en')
  })

  useEffect(() => {
    const ls = localStorage.getItem(LS_KEY)
    // Silently default to English — no popup
    if (!ls) localStorage.setItem(LS_KEY, initialLang ?? 'en')

    const activeLang = ls ?? initialLang ?? 'en'
    if (activeLang !== 'en') {
      setGoogCookie(activeLang)
      triggerGT(activeLang)
    }
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    // Persist to Supabase in the background — don't block the reload
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    })

    if (code === 'en') {
      clearGoogCookie()
      window.location.reload()
    } else {
      setGoogCookie(code)
      window.location.reload()
    }
  }, [supabase])

  return (
    <Ctx.Provider value={{ lang, setLanguage }}>
      {children}
    </Ctx.Provider>
  )
}
