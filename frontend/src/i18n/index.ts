import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import ar from './ar.json'

export const SUPPORTED_LANGS = ['en', 'ar'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

const stored = localStorage.getItem('fieldshift.lang')
const initial = stored === 'ar' || stored === 'en' ? stored : 'en'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function applyDirection(lang: Lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  document.documentElement.dir = dir
  localStorage.setItem('fieldshift.lang', lang)
}

applyDirection(initial)

export default i18n
