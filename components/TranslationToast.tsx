'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// Pre-translated messages for all 30 supported languages — no API call needed
const MESSAGES: Record<string, string> = {
  en:    'Friendly reminder: please wait a moment for the new language to load.',
  es:    'Recordatorio: por favor espera un momento mientras carga el nuevo idioma.',
  'zh-CN': '温馨提示：请稍等片刻，新语言正在加载中。',
  'zh-TW': '溫馨提示：請稍等片刻，新語言正在載入中。',
  tl:    'Paalala: mangyaring maghintay sandali habang nilo-load ang bagong wika.',
  vi:    'Nhắc nhở: vui lòng đợi một chút để tải ngôn ngữ mới.',
  ar:    'تذكير: يرجى الانتظار لحظة حتى يتم تحميل اللغة الجديدة.',
  fr:    'Rappel : veuillez patienter un instant pendant le chargement de la nouvelle langue.',
  ko:    '잠깐! 새 언어를 불러오는 동안 잠시 기다려 주세요.',
  ru:    'Напоминание: подождите немного, пока загружается новый язык.',
  pt:    'Lembrete: por favor aguarde um momento enquanto o novo idioma carrega.',
  ht:    'Sonje: tanpri tann yon moman pandan nap chaje nouvo lang lan.',
  hi:    'याद दिलाएं: नई भाषा लोड होते समय कृपया एक पल प्रतीक्षा करें।',
  pl:    'Przypomnienie: proszę chwilę poczekać na załadowanie nowego języka.',
  it:    'Promemoria: attendere un momento mentre viene caricata la nuova lingua.',
  de:    'Hinweis: Bitte warten Sie einen Moment, während die neue Sprache lädt.',
  fa:    'یادآوری: لطفاً یک لحظه صبر کنید تا زبان جدید بارگذاری شود.',
  gu:    'યાદ: નવી ભાષા લોડ થઈ રહી છે, કૃપા કરીને એક ક્ષણ રાહ જુઓ.',
  te:    'గుర్తు చేస్తున్నాం: కొత్త భాష లోడ్ అవుతోంది, దయచేసి ఒక్క క్షణం వేచి ఉండండి.',
  ja:    'お知らせ：新しい言語を読み込んでいます。少々お待ちください。',
  ur:    'یاد دہانی: نئی زبان لوڈ ہو رہی ہے، براہ کرم ایک لمحہ انتظار کریں۔',
  th:    'แจ้งเตือน: กรุณารอสักครู่ขณะที่กำลังโหลดภาษาใหม่',
  hmn:   'Ceeb toom: thov tos ib pliag thaum lub lus tshiab tab tom thauj.',
  hy:    'Հիշեցում: խնդրում ենք սպասել մի պահ, մինչ նոր լեզուն բեռնվում է։',
  he:    'תזכורת: אנא המתן רגע בזמן שהשפה החדשה נטענת.',
  pa:    'ਯਾਦ ਦਿਵਾਉਣਾ: ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਪਲ ਉਡੀਕ ਕਰੋ ਜਦੋਂ ਨਵੀਂ ਭਾਸ਼ਾ ਲੋਡ ਹੁੰਦੀ ਹੈ।',
  km:    'ការរំលឹក: សូមរង់ចាំបន្តិចខណៈពេលភាសាថ្មីកំពុងផ្ទុក។',
  so:    'Xusuusin: fadlan sug waqti yar inta luuqadda cusubi soo rarayso.',
  am:    'ማስታወሻ: አዲሱ ቋንቋ እስኪጫን ትንሽ ይጠብቁ።',
  bn:    'মনে রাখুন: নতুন ভাষা লোড হওয়ার সময় দয়া করে একটু অপেক্ষা করুন।',
}

const EN_MESSAGE = MESSAGES['en']

// RTL languages
const RTL = new Set(['ar', 'fa', 'ur', 'he'])

interface Props {
  langCode: string
  langFlag: string
  langNative: string
  visible: boolean          // controlled by parent (translating state)
  onDismiss: () => void
}

export default function TranslationToast({ langCode, langFlag, langNative, visible, onDismiss }: Props) {
  const [show, setShow] = useState(false)

  // Animate in when visible becomes true; keep shown until dismissed even if visible flips false quickly
  useEffect(() => {
    if (visible) setShow(true)
    // Don't auto-hide — let the user dismiss, or parent clears it
  }, [visible])

  if (!show || langCode === 'en') return null

  const nativeMsg = MESSAGES[langCode] ?? MESSAGES['en']
  const isRTL = RTL.has(langCode)
  const isSameAsEn = nativeMsg === EN_MESSAGE

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[min(92vw,480px)] animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-xl border border-ember-500/40 bg-ash-900/95 backdrop-blur-md shadow-2xl shadow-black/50 px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Spinner + flag */}
          <div className="relative shrink-0 mt-0.5">
            <svg className="animate-spin h-5 w-5 text-ember-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">{langFlag}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Target language message */}
            <p
              className="text-sm font-medium text-ash-100 leading-snug"
              dir={isRTL ? 'rtl' : 'ltr'}
              lang={langCode}
            >
              {nativeMsg}
            </p>

            {/* English subtitle — only if different from native */}
            {!isSameAsEn && (
              <p className="text-xs text-ash-400 leading-snug">
                {EN_MESSAGE}
              </p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => { setShow(false); onDismiss() }}
            className="shrink-0 mt-0.5 p-1 rounded-md text-ash-500 hover:text-ash-200 hover:bg-ash-700/60 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
