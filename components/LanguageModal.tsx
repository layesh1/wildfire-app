'use client'
import { useState } from 'react'
import { Globe, Check, X } from 'lucide-react'
import { LANGUAGES } from '@/lib/languages'
import { useLanguage } from './LanguageProvider'

export default function LanguageModal() {
  const { showModal, dismissModal, setLanguage, lang } = useLanguage()
  const [selecting, setSelecting] = useState<string | null>(null)

  if (!showModal) return null

  async function pick(code: string) {
    setSelecting(code)
    await setLanguage(code)
    // setLanguage triggers a reload for non-English; for English, dismiss
    if (code === 'en') dismissModal()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ash-950/80 backdrop-blur-sm">
      <div className="bg-ash-900 border border-ash-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-ash-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ember-500/20 border border-ember-500/40 flex items-center justify-center">
                <Globe className="w-5 h-5 text-ember-400" />
              </div>
              <div>
                <h2 className="text-white font-display font-bold text-xl leading-tight">Choose your language</h2>
                <p className="text-ash-400 text-sm mt-0.5">
                  Select the language you'd like to use — you can change it anytime in your profile.
                </p>
              </div>
            </div>
            <button
              onClick={dismissModal}
              className="text-ash-500 hover:text-white p-1.5 rounded-lg hover:bg-ash-800 transition-colors shrink-0 mt-0.5"
              title="Continue in English"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Multi-language welcome */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ash-500">
            <span>Welcome</span>
            <span>Bienvenido</span>
            <span>欢迎</span>
            <span>Bienvenue</span>
            <span>أهلاً</span>
            <span>Xin chào</span>
            <span>환영합니다</span>
            <span>Добро пожаловать</span>
            <span>مرحباً</span>
            <span>Maligayang pagdating</span>
          </div>
        </div>

        {/* Language grid */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map(language => {
              const isActive = lang.code === language.code
              const isLoading = selecting === language.code

              return (
                <button
                  key={language.code}
                  onClick={() => pick(language.code)}
                  disabled={!!selecting}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all disabled:opacity-60 ${
                    isActive
                      ? 'border-ember-500/60 bg-ember-500/10 text-white'
                      : 'border-ash-700 bg-ash-800/50 hover:border-ash-500 hover:bg-ash-800 text-ash-300 hover:text-white'
                  }`}
                >
                  <span className="text-xl shrink-0 select-none">{language.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{language.native}</div>
                    <div className="text-ash-500 text-xs truncate">{language.name}</div>
                  </div>
                  {isActive && !isLoading && (
                    <Check className="w-3.5 h-3.5 text-ember-400 shrink-0" />
                  )}
                  {isLoading && (
                    <div className="w-3.5 h-3.5 border border-ember-400/40 border-t-ember-400 rounded-full animate-spin shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ash-800 shrink-0 flex items-center justify-between">
          <p className="text-ash-600 text-xs">
            Translation powered by Google Translate. Emergency information may vary by region.
          </p>
          <button
            onClick={dismissModal}
            className="text-ash-400 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-ash-800 transition-colors shrink-0"
          >
            Continue in English
          </button>
        </div>
      </div>
    </div>
  )
}
