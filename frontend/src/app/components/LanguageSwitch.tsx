import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { useWizard } from '../../state/wizard'
import type { Lang } from '../../i18n'

export default function LanguageSwitch({
  variant = 'light',
  lang: langProp,
  onChange,
}: {
  variant?: 'light' | 'dark'
  lang?: Lang
  onChange?: (l: Lang) => void
}) {
  const { t } = useTranslation()
  const { lang: wizardLang, setLang: setWizardLang } = useWizard()
  const currentLang = langProp ?? wizardLang
  const setLang = onChange ?? setWizardLang

  return (
    <div
      role="group"
      aria-label={t('aria.languageSwitch')}
      className={`inline-flex items-center rounded-full p-0.5 border text-xs font-bold transition-all duration-200 ${
        variant === 'dark'
          ? 'bg-black/35 border-white/25 text-white shadow-inner'
          : 'bg-cream-warm border-line text-forest shadow-inner'
      }`}
    >
      <span className="ps-2 pe-1 text-ink-light/70" aria-hidden>
        <Globe size={13} className={variant === 'dark' ? 'text-white/70' : 'text-forest/70'} />
      </span>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={currentLang === 'en'}
        className={`rounded-full px-2.5 py-1 transition-all duration-200 ${
          currentLang === 'en'
            ? variant === 'dark'
              ? 'bg-white text-forest shadow-sm'
              : 'bg-forest text-white shadow-sm'
            : variant === 'dark'
              ? 'text-white/75 hover:text-white'
              : 'text-ink-muted hover:text-forest'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={currentLang === 'ar'}
        className={`rounded-full px-2.5 py-1 font-ar transition-all duration-200 ${
          currentLang === 'ar'
            ? variant === 'dark'
              ? 'bg-white text-forest shadow-sm'
              : 'bg-forest text-white shadow-sm'
            : variant === 'dark'
              ? 'text-white/75 hover:text-white'
              : 'text-ink-muted hover:text-forest'
        }`}
      >
        العربية
      </button>
    </div>
  )
}
