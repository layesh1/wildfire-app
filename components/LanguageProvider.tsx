'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES, getLang, type Language } from '@/lib/languages'
import TranslationToast from '@/components/TranslationToast'

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

    const revealPage = () => {
      document.documentElement.classList.remove('wfa-translating')
      document.documentElement.classList.add('wfa-translating-done')
    }

    if (activeLang === 'en') {
      revealPage()
      return
    }

    setTranslating(true)
    const run = async () => {
      try {
        const { translateDocument, startTranslationObserver } = await import('@/lib/dom-translator')
        await translateDocument(activeLang)
        // Start observer AFTER initial translation so dynamic content (Supabase lists) gets translated too
        startTranslationObserver(activeLang)
      } catch (e) {
        console.error('[i18n] translation error', e)
      } finally {
        revealPage()
        setTranslating(false)
      }
    }
    run()

    // Clean up observer when component unmounts (page navigation)
    return () => {
      import('@/lib/dom-translator').then(({ stopTranslationObserver }) => stopTranslationObserver())
    }
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    // Persist to Supabase in background
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    })

    setTranslating(true)
    try {
      const { translateDocument, startTranslationObserver, stopTranslationObserver } =
        await import('@/lib/dom-translator')

      // Stop old observer, translate in-place, start new observer for new language
      stopTranslationObserver()
      await translateDocument(code)
      startTranslationObserver(code)
    } catch (e) {
      console.error('[i18n] setLanguage translation error', e)
    } finally {
      setTranslating(false)
    }
  }, [supabase])

  const [toastDismissed, setToastDismissed] = useState(false)

  // Reset dismissed state whenever we start a new translation
  useEffect(() => {
    if (translating) setToastDismissed(false)
  }, [translating])

  return (
    <Ctx.Provider value={{ lang, setLanguage, translating }}>
      {children}
      <TranslationToast
        langCode={lang.code}
        langFlag={lang.flag}
        langNative={lang.native}
        visible={translating && !toastDismissed}
        onDismiss={() => setToastDismissed(true)}
      />
    </Ctx.Provider>
  )
}
