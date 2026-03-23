'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES, getLang, type Language } from '@/lib/languages'

const LS_KEY = 'app_language'

interface LangCtx {
  lang: Language
  setLanguage: (code: string) => Promise<void>
  translating: boolean
}

const Ctx = createContext<LangCtx>({
  lang: LANGUAGES[0],
  setLanguage: async () => {},
  translating: false,
})

export function useLanguage() {
  return useContext(Ctx)
}

interface Props {
  children: React.ReactNode
  initialLang: string | null
}

export default function LanguageProvider({ children, initialLang }: Props) {
  const supabase = createClient()
  const didInit = useRef(false)
  const [translating, setTranslating] = useState(false)

  /**
   * IMPORTANT: use initialLang (from Supabase) for the server render, not LANGUAGES[0].
   * If the server returns English but the client reads 'ko' from localStorage, the Sidebar
   * renders different values → React error #418 on every page load.
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

    if (activeLang === 'en') {
      // Make sure body is visible even if no translation needed
      document.documentElement.classList.remove('wfa-translating')
      document.documentElement.classList.add('wfa-translating-done')
      return
    }

    // Translate the page after React has settled
    setTranslating(true)
    const revealPage = () => {
      document.documentElement.classList.remove('wfa-translating')
      document.documentElement.classList.add('wfa-translating-done')
    }
    const run = async () => {
      try {
        const { translateDocument } = await import('@/lib/dom-translator')
        await translateDocument(activeLang)
      } catch (e) {
        console.error('[i18n] translation error', e)
      } finally {
        revealPage()
        setTranslating(false)
      }
    }
    run()
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    // Persist to Supabase in background
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    })

    // Clear session cache so fresh translations are fetched for the new language
    try {
      const { clearTranslationCache } = await import('@/lib/dom-translator')
      clearTranslationCache()
    } catch {}

    window.location.reload()
  }, [supabase])

  return (
    <Ctx.Provider value={{ lang, setLanguage, translating }}>
      {children}
    </Ctx.Provider>
  )
}
