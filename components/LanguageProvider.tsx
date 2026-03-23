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

/**
 * Loads Google Translate entirely from the client (inside useEffect, post-hydration).
 * Loading GT in layout.tsx caused React error #418: GT appended a div to <body>
 * before React hydrated, creating a server/client mismatch that wiped the GT div.
 * Running inside useEffect avoids that — React has already reconciled the DOM.
 */
function loadGoogleTranslate(onReady: () => void) {
  // Already loaded — call onReady immediately
  if (document.getElementById('google_translate_element')) {
    onReady()
    return
  }

  // Create the container GT renders into — must have real dimensions so the
  // browser renders select.goog-te-combo inside it (visibility:hidden in CSS
  // keeps it invisible while keeping it in the render tree)
  const div = document.createElement('div')
  div.id = 'google_translate_element'
  div.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:220px;height:40px;'
  document.body.appendChild(div)

  // Define callback GT calls after its script loads.
  // autoDisplay:true is REQUIRED — with false, GT waits for user interaction and
  // never auto-translates from the googtrans cookie. true = translate on init from cookie.
  ;(window as any).googleTranslateElementInit = () => {
    new (window as any).google.translate.TranslateElement(
      { pageLanguage: 'en', autoDisplay: true },
      'google_translate_element'
    )
    onReady()
  }

  // Inject script — calls googleTranslateElementInit when ready
  if (!document.getElementById('gt-script')) {
    const s = document.createElement('script')
    s.id = 'gt-script'
    s.src = 'https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit'
    s.async = true
    document.head.appendChild(s)
  } else {
    // Script tag already in DOM (e.g. re-mount) — call init manually
    onReady()
  }
}

/**
 * Finds select.goog-te-combo and triggers translation. Polls for up to 30 s
 * to handle the async delay while GT fetches its language list from Google.
 */
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

  if (tryNow()) return

  // Wait for GT to finish loading its option list (async network request)
  const observer = new MutationObserver(() => { if (tryNow()) observer.disconnect() })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  window.addEventListener('load', () => { if (tryNow()) observer.disconnect() }, { once: true })

  let tries = 0
  const interval = setInterval(() => {
    if (done || ++tries > 60) { clearInterval(interval); observer.disconnect(); return }
    tryNow()
  }, 500)
}

interface Props {
  children: React.ReactNode
  initialLang: string | null
}

export default function LanguageProvider({ children, initialLang }: Props) {
  const supabase = createClient()
  const didApply = useRef(false)

  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return LANGUAGES[0]
    const ls = localStorage.getItem(LS_KEY)
    return getLang(ls ?? initialLang ?? 'en')
  })

  // Apply saved language on mount (handles page reloads / first load)
  useEffect(() => {
    if (didApply.current) return
    didApply.current = true

    const ls = localStorage.getItem(LS_KEY)
    if (!ls) localStorage.setItem(LS_KEY, initialLang ?? 'en')
    const activeLang = ls ?? initialLang ?? 'en'

    if (activeLang !== 'en') {
      setGoogCookie(activeLang)
      // Load GT post-hydration then trigger — avoids React #418 hydration mismatch
      loadGoogleTranslate(() => triggerGT(activeLang))
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

    if (code === 'en') {
      clearGoogCookie()
      // Restore: reload to let GT remove its translations cleanly
      window.location.reload()
    } else {
      setGoogCookie(code)
      // Reload so GT initialises fresh with the cookie and auto-translates (autoDisplay:true)
      window.location.reload()
    }
  }, [supabase])

  return (
    <Ctx.Provider value={{ lang, setLanguage }}>
      {children}
    </Ctx.Provider>
  )
}
