export interface Language {
  code: string       // Google Translate language code
  name: string       // English name
  native: string     // Name in that language
  flag: string       // Emoji flag
}

// Top 30 languages spoken in the United States by number of speakers
export const LANGUAGES: Language[] = [
  { code: 'en',    name: 'English',          native: 'English',          flag: '🇺🇸' },
  { code: 'es',    name: 'Spanish',          native: 'Español',          flag: '🇪🇸' },
  { code: 'zh-CN', name: 'Chinese (Simpl.)', native: '中文 (简体)',        flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Trad.)',  native: '中文 (繁體)',        flag: '🇹🇼' },
  { code: 'tl',    name: 'Tagalog',          native: 'Filipino',         flag: '🇵🇭' },
  { code: 'vi',    name: 'Vietnamese',       native: 'Tiếng Việt',       flag: '🇻🇳' },
  { code: 'ar',    name: 'Arabic',           native: 'العربية',           flag: '🇸🇦' },
  { code: 'fr',    name: 'French',           native: 'Français',         flag: '🇫🇷' },
  { code: 'ko',    name: 'Korean',           native: '한국어',             flag: '🇰🇷' },
  { code: 'ru',    name: 'Russian',          native: 'Русский',          flag: '🇷🇺' },
  { code: 'pt',    name: 'Portuguese',       native: 'Português',        flag: '🇧🇷' },
  { code: 'ht',    name: 'Haitian Creole',   native: 'Kreyòl ayisyen',   flag: '🇭🇹' },
  { code: 'hi',    name: 'Hindi',            native: 'हिंदी',              flag: '🇮🇳' },
  { code: 'pl',    name: 'Polish',           native: 'Polski',           flag: '🇵🇱' },
  { code: 'it',    name: 'Italian',          native: 'Italiano',         flag: '🇮🇹' },
  { code: 'de',    name: 'German',           native: 'Deutsch',          flag: '🇩🇪' },
  { code: 'fa',    name: 'Persian',          native: 'فارسی',             flag: '🇮🇷' },
  { code: 'gu',    name: 'Gujarati',         native: 'ગુજરાતી',           flag: '🇮🇳' },
  { code: 'te',    name: 'Telugu',           native: 'తెలుగు',            flag: '🇮🇳' },
  { code: 'ja',    name: 'Japanese',         native: '日本語',             flag: '🇯🇵' },
  { code: 'ur',    name: 'Urdu',             native: 'اردو',              flag: '🇵🇰' },
  { code: 'th',    name: 'Thai',             native: 'ภาษาไทย',           flag: '🇹🇭' },
  { code: 'hmn',   name: 'Hmong',            native: 'Hmoob',            flag: '🏔️'  },
  { code: 'hy',    name: 'Armenian',         native: 'Հայերեն',          flag: '🇦🇲' },
  { code: 'he',    name: 'Hebrew',           native: 'עברית',             flag: '🇮🇱' },
  { code: 'pa',    name: 'Punjabi',          native: 'ਪੰਜਾਬੀ',           flag: '🇮🇳' },
  { code: 'km',    name: 'Khmer',            native: 'ខ្មែរ',              flag: '🇰🇭' },
  { code: 'so',    name: 'Somali',           native: 'Soomaali',         flag: '🇸🇴' },
  { code: 'am',    name: 'Amharic',          native: 'አማርኛ',             flag: '🇪🇹' },
  { code: 'bn',    name: 'Bengali',          native: 'বাংলা',             flag: '🇧🇩' },
]

export const DEFAULT_LANG = LANGUAGES[0]

export function getLang(code: string): Language {
  return LANGUAGES.find(l => l.code === code) ?? DEFAULT_LANG
}
