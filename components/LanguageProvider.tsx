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
 *  Uses MutationObserver so it reacts the instant GT populates its option list,
 *  instead of polling with a fixed timer (which misses fast or very slow loads). */
function triggerGT(code: string) {
  function applyToSelect(sel: HTMLSelectElement) {
    sel.value = code
    sel.dispatchEvent(new Event('change'))
  }

  // Try immediately — works on navigations where GT is already loaded
  const existing = document.querySelector<HTMLSelectElement>('select.goog-te-combo')
  if (existing && existing.options.length > 1) {
    applyToSelect(existing)
    return
  }

  // Watch the DOM for GT to add / populate the select element
  const observer = new MutationObserver(() => {
    const sel = document.querySelector<HTMLSelectElement>('select.goog-te-combo')
    if (sel && sel.options.length > 1) {
      applyToSelect(sel)
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  // Give up after 30 seconds to avoid leaking the observer
  setTimeout(() => observer.disconnect(), 30000)
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
