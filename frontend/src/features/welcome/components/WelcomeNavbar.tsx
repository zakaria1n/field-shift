/** Reference-style navbar: leaf logo + wordmark, center links, EN/العربية.
 * Transparent, overlays the hero. Links scroll to their scenes; the
 * language controls reuse the canonical switching behavior. */
import { useTranslation } from 'react-i18next'
import FieldShiftBrand from '../../../app/components/FieldShiftBrand'
import { useWizard } from '../../../state/wizard'
import { NAV_TARGETS } from '../config/welcomeScenes'
import type { Lang } from '../../../i18n'

export default function WelcomeNavbar({ activeScene }: { activeScene: number }) {
  const { t, i18n } = useTranslation()
  const { setLang } = useWizard()
  const isArabic = i18n.language === 'ar'

  const links = [
    { label: t('welcome.cin.nav.home'), kind: 'home' as const, active: activeScene === 0 },
    { label: t('welcome.cin.nav.howItWorks'), kind: 's2' as const, active: activeScene === 2 },
    { label: t('welcome.cin.nav.ourApproach'), kind: 's3' as const, active: activeScene === 3 },
    { label: t('welcome.cin.nav.about'), kind: 'sources' as const, active: false },
  ]

  const go = (kind: 'home' | 's2' | 's3' | 'sources') => {
    if (kind === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (kind === 'sources') {
      // the sources band was removed from this page; About lands on the
      // closing scene instead
      const c = document.querySelector('[data-cinematic]')
      const max = Math.max(1, (c as HTMLElement | null)?.offsetHeight
        ? (c as HTMLElement).offsetHeight - window.innerHeight
        : 1)
      window.scrollTo({ top: max, behavior: 'smooth' })
      return
    }
    const container = document.querySelector('[data-cinematic]')
    const max = Math.max(1, (container as HTMLElement | null)?.offsetHeight
      ? (container as HTMLElement).offsetHeight - window.innerHeight
      : 1)
    window.scrollTo({ top: NAV_TARGETS[kind] * max, behavior: 'smooth' })
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-[#081A15]/80 to-transparent">
      <div className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <button
          type="button"
          onClick={() => go('home')}
          className="flex items-center gap-2"
          aria-label="Field Shift"
        >
          <FieldShiftBrand />
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <button
              key={l.kind}
              type="button"
              onClick={() => go(l.kind)}
              className={`relative pb-1 text-sm font-semibold transition-colors ${
                l.active ? 'text-white' : 'text-white/75 hover:text-white'
              }`}
            >
              {l.label}
              <span
                className={`absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-6 rounded-full bg-[#8FE627] transition-opacity ${
                  l.active ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={!isArabic}
            className={`rounded-full border px-3 py-1 transition-colors ${
              !isArabic
                ? 'border-lime-300/70 bg-black/25 text-white'
                : 'border-white/30 text-white/75 hover:text-white'
            }`}
          >
            EN
          </button>
          <span className="h-4 w-px bg-white/30" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            aria-pressed={isArabic}
            className={`transition-colors ${isArabic ? 'text-lime-200' : 'text-white/75 hover:text-white'}`}
          >
            العربية
          </button>
        </div>
      </div>
    </nav>
  )
}

/** Static variant hook-less wrapper used by the reduced-motion page. */
export function StaticWelcomeNav() {
  const { t, i18n } = useTranslation()
  const { setLang } = useWizard()
  const isArabic = i18n.language === 'ar'
  void t
  void NAV_TARGETS
  return (
    <nav className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-[#081A15]/80 to-transparent">
      <div className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <FieldShiftBrand />
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={!isArabic}
            className={`rounded-full border px-3 py-1 ${!isArabic ? 'border-lime-300/70 bg-black/25 text-white' : 'border-white/30 text-white/75'}`}
          >
            EN
          </button>
          <span className="h-4 w-px bg-white/30" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            aria-pressed={isArabic}
            className={`transition-colors ${isArabic ? 'text-lime-200' : 'text-white/75'}`}
          >
            العربية
          </button>
        </div>
      </div>
    </nav>
  )
}
