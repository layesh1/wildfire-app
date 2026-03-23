'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// Pre-translated messages for all 30 supported languages — no API call needed
const MESSAGES: Record<string, string> = {
  en:      'Friendly reminder: refresh and wait a moment for the new language to load.',
  es:      'Recordatorio: actualiza y espera un momento para que cargue el nuevo idioma.',
  'zh-CN': '温馨提示：请刷新页面并稍等片刻，等待新语言加载。',
  'zh-TW': '溫馨提示：請重新整理頁面並稍等片刻，等待新語言載入。',
  tl:      'Paalala: i-refresh at maghintay sandali para ma-load ang bagong wika.',
  vi:      'Nhắc nhở: hãy làm mới trang và đợi một chút để tải ngôn ngữ mới.',
  ar:      'تذكير: حدّث الصفحة وانتظر لحظة حتى يتم تحميل اللغة الجديدة.',
  fr:      'Rappel : actualisez la page et patientez un instant pour charger la nouvelle langue.',
  ko:      '알림: 새로고침 후 잠시 기다리면 새 언어가 로드됩니다.',
  ru:      'Напоминание: обновите страницу и подождите немного, пока загрузится новый язык.',
  pt:      'Lembrete: atualize a página e aguarde um momento para carregar o novo idioma.',
  ht:      'Sonje: aktualize epi tann yon moman pou nouvo lang lan chaje.',
  hi:      'याद दिलाएं: पेज रिफ्रेश करें और नई भाषा लोड होने के लिए एक पल प्रतीक्षा करें।',
  pl:      'Przypomnienie: odśwież stronę i chwilę poczekaj, aż załaduje się nowy język.',
  it:      'Promemoria: aggiorna la pagina e attendi un momento per caricare la nuova lingua.',
  de:      'Hinweis: Seite aktualisieren und einen Moment warten, bis die neue Sprache lädt.',
  fa:      'یادآوری: صفحه را بازخوانی کنید و یک لحظه صبر کنید تا زبان جدید بارگذاری شود.',
  gu:      'યાદ: પેજ રિફ્રેશ કરો અને નવી ભાષા લોડ થવા માટે એક ક્ષણ રાહ જુઓ.',
  te:      'గుర్తు: పేజీని రిఫ్రెష్ చేసి కొత్త భాష లోడ్ అవడానికి ఒక్క క్షణం వేచి ఉండండి.',
  ja:      'お知らせ：ページを更新して、新しい言語が読み込まれるまで少々お待ちください。',
  ur:      'یاد دہانی: صفحہ ریفریش کریں اور نئی زبان لوڈ ہونے کے لیے ایک لمحہ انتظار کریں۔',
  th:      'แจ้งเตือน: รีเฟรชหน้าและรอสักครู่เพื่อโหลดภาษาใหม่',
  hmn:     'Ceeb toom: refresh thiab tos ib pliag kom lub lus tshiab thauj tiav.',
  hy:      'Հիշեցում: թարմացրեք էջը և սպասեք մի պահ, մինչ նոր լեզուն բեռնվի։',
  he:      'תזכורת: רענן את הדף וחכה רגע לטעינת השפה החדשה.',
  pa:      'ਯਾਦ ਦਿਵਾਉਣਾ: ਪੇਜ ਰਿਫ੍ਰੈਸ਼ ਕਰੋ ਅਤੇ ਨਵੀਂ ਭਾਸ਼ਾ ਲੋਡ ਹੋਣ ਲਈ ਇੱਕ ਪਲ ਉਡੀਕ ਕਰੋ।',
  km:      'ការរំលឹក: សូម refresh ហើយរង់ចាំបន្តិចដើម្បីផ្ទុកភាសាថ្មី។',
  so:      'Xusuusin: cusboonaysii bogga oo sug waqti yar si luuqadda cusub u soo rarato.',
  am:      'ማስታወሻ: ገጹን አዳስ እና አዲሱ ቋንቋ እስኪጫን ትንሽ ይጠብቁ።',
  bn:      'মনে রাখুন: পেজ রিফ্রেশ করুন এবং নতুন ভাষা লোড হওয়ার জন্য একটু অপেক্ষা করুন।',
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
