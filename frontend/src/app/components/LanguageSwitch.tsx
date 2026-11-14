import { useTranslation } from 'react-i18next'
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
  const lang = langProp ?? wizardLang
  const setLang = onChange ?? setWizardLang
  const next: Lang = lang === 'en' ? 'ar' : 'en'
  const label = lang === 'en' ? 'العربية' : 'English'

  return (
    <button
      onClick={() => setLang(next)}
      aria-label={t('aria.languageSwitch')}
      className={
        variant === 'dark'
          ? 'rounded-full border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10'
          : 'rounded-full border border-forest/30 px-3 py-1.5 text-sm font-semibold text-forest hover:bg-forest/5'
      }
    >
      <span dir={next === 'ar' ? 'rtl' : 'ltr'}>{label}</span>
    </button>
  )
}
