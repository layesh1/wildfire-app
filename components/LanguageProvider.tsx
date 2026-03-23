'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
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

/**
 * Sets the googtrans cookie that Google Translate reads on init.
 * Format: /en/<target> — tells GT to translate from English to <target>.
 * Must be set on both path=/ and the root domain to ensure GT picks it up.
 */
function setGoogCookie(code: string) {
  const exp = 'expires=Fri, 31 Dec 2099 23:59:59 GMT'
  document.cookie = `googtrans=/en/${code};path=/;${exp}`
  document.cookie = `googtrans=/en/${code};${exp}`
}

function clearGoogCookie() {
  document.cookie = 'googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

interface Props {
  children: React.ReactNode
  initialLang: string | null
}

export default function LanguageProvider({ children, initialLang }: Props) {
  const supabase = createClient()
  const didInit = useRef(false)

  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return LANGUAGES[0]
    const ls = localStorage.getItem(LS_KEY)
    return getLang(ls ?? initialLang ?? 'en')
  })

  /**
   * On mount: ensure the googtrans cookie reflects the saved language preference.
   * The Google Translate widget in layout.tsx loads after hydration (afterInteractive)
   * and reads this cookie via autoDisplay:true to auto-translate on page load.
   */
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const ls = localStorage.getItem(LS_KEY)
    if (!ls) localStorage.setItem(LS_KEY, initialLang ?? 'en')
    const activeLang = ls ?? initialLang ?? 'en'

    if (activeLang !== 'en') {
      // Ensure cookie is set so GT auto-translates when its script loads
      setGoogCookie(activeLang)
    } else {
      // Ensure no stale cookie from a previous session
      clearGoogCookie()
    }
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    // Persist to Supabase in background (non-blocking)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    })

    if (code === 'en') {
      clearGoogCookie()
    } else {
      setGoogCookie(code)
    }

    // Reload so the GT widget (loaded via layout.tsx afterInteractive) initialises
    // fresh with the updated cookie and auto-translates via autoDisplay:true
    window.location.reload()
  }, [supabase])

  return (
    <Ctx.Provider value={{ lang, setLanguage }}>
      {children}
    </Ctx.Provider>
  )
}
