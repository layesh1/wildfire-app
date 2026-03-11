'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { LANGUAGES, getLang, type Language } from '@/lib/languages'

const LS_KEY = 'app_language'

interface LangCtx {
  lang: Language
  setLanguage: (code: string) => Promise<void>
  showModal: boolean
  dismissModal: () => void
}

const Ctx = createContext<LangCtx>({
  lang: LANGUAGES[0],
  setLanguage: async () => {},
  showModal: false,
  dismissModal: () => {},
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

function loadGoogleTranslate() {
  if (document.getElementById('gt-script')) return
  // Hide all Google Translate UI artifacts
  const style = document.createElement('style')
  style.textContent = `
    .skiptranslate, .goog-te-banner-frame { display: none !important; }
    body { top: 0 !important; }
    .goog-te-gadget { font-size: 0 !important; }
    #google_translate_element { display: none !important; }
  `
  document.head.appendChild(style)

  const div = document.createElement('div')
  div.id = 'google_translate_element'
  div.style.display = 'none'
  document.body.appendChild(div)

  ;(window as any).googleTranslateElementInit = () => {
    new (window as any).google.translate.TranslateElement(
      { pageLanguage: 'en', autoDisplay: false },
      'google_translate_element'
    )
  }

  const script = document.createElement('script')
  script.id = 'gt-script'
  script.src = '//translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit'
  script.async = true
  document.head.appendChild(script)
}

/** Triggers translation by manipulating the hidden Google Translate select */
function triggerGT(code: string) {
  const attempt = (tries: number) => {
    const sel = document.querySelector<HTMLSelectElement>('select.goog-te-combo')
    if (sel) {
      sel.value = code
      sel.dispatchEvent(new Event('change'))
    } else if (tries > 0) {
      setTimeout(() => attempt(tries - 1), 300)
    }
  }
  attempt(10)
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

  // Show modal if this is first login (no language ever set)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const ls = localStorage.getItem(LS_KEY)
    // Show modal if neither localStorage nor profile has a language set
    if (!ls && !initialLang) {
      setShowModal(true)
    }

    // Load Google Translate script
    loadGoogleTranslate()

    // Apply translation if non-English
    const activeLang = ls ?? initialLang ?? 'en'
    if (activeLang !== 'en') {
      setGoogCookie(activeLang)
      // Try to trigger without reload; Google Translate picks up cookie on script load
      setTimeout(() => triggerGT(activeLang), 1500)
    }
  }, [initialLang])

  const setLanguage = useCallback(async (code: string) => {
    const selected = getLang(code)
    setLang(selected)
    localStorage.setItem(LS_KEY, code)

    // Persist to Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, language_preference: code })
    }

    if (code === 'en') {
      clearGoogCookie()
      window.location.reload()
    } else {
      setGoogCookie(code)
      // Try soft trigger first (no reload)
      triggerGT(code)
      // Reload after short delay to let Google Translate pick up the cookie
      setTimeout(() => window.location.reload(), 400)
    }
  }, [supabase])

  function dismissModal() {
    setShowModal(false)
    // Default to English — save so modal doesn't re-appear
    localStorage.setItem(LS_KEY, 'en')
  }

  return (
    <Ctx.Provider value={{ lang, setLanguage, showModal, dismissModal }}>
      {children}
    </Ctx.Provider>
  )
}
