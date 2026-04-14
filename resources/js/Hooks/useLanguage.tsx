import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Language = 'en' | 'ar'

interface LanguageContextValue {
  lang: Language
  toggleLang: () => void
  isRtl: boolean
  dir: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  toggleLang: () => {},
  isRtl: false,
  dir: 'ltr',
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('vcpro_lang') as Language | null
      if (stored === 'en' || stored === 'ar') return stored
    } catch {}
    return navigator.language.startsWith('ar') ? 'ar' : 'en'
  })

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('vcpro_lang', lang)
  }, [lang])

  const toggleLang = () => setLang(l => (l === 'en' ? 'ar' : 'en'))

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, isRtl: lang === 'ar', dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
