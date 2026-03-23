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

  /**
   * CRITICAL: must return getLang(initialLang) on the server (not LANGUAGES[0]).
   * The dashboard layout passes initialLang from Supabase. If the server returns
   * LANGUAGES[0] (English) but the client reads 'ko' from localStorage, the Sidebar
   * renders different lang values → React error #418 hydration mismatch on every load.
   * Using initialLang for both server and client initial render eliminates the mismatch.
   */
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return getLang(initialLang ?? 'en')
    const ls = localStorage.getItem(LS_KEY)
    return getLang(ls ?? initialLang ?? 'en')
  })

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const ls = localStorage.getItem(LS_KEY)
    if (!ls) localStorage.setItem(LS_KEY, initialLang ?? 'en')
    const activeLang = ls ?? initialLang ?? 'en'

    if (activeLang !== 'en') {
      setGoogCookie(activeLang)
    } else {
      clearGoogCookie()
      return
    }

    /**
     * Trigger GT translation via the select element.
     *
     * globals.css adds `display: block !important` to `.goog-te-gadget` which
     * overrides GT's own inline `style="display:none"`. That prevents GT from
     * hiding the gadget before its language list request fires, so options load.
     *
     * Once options are present we set the select value and fire `change` — this
     * is how GT starts the page translation (the same event the user triggers
     * when they pick from the dropdown manually).
     *
     * The googtrans cookie is also set as a belt-and-suspenders: GT reads it on
     * init via autoDisplay:true and may translate before options even load.
     */
    let tries = 0
    const interval = setInterval(() => {
      if (++tries > 60) { clearInterval(interval); return }  // give up after 30 s

      const sel = document.querySelector<HTMLSelectElement>('select.goog-te-combo')
      if (sel && sel.options.length > 1) {
        sel.value = activeLang
        sel.dispatchEvent(new Event('change'))
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    })

    if (code === 'en') {
      clearGoogCookie()
    } else {
      setGoogCookie(code)
    }

    window.location.reload()
  }, [supabase])

  return (
    <Ctx.Provider value={{ lang, setLanguage }}>
      {children}
    </Ctx.Provider>
  )
}
