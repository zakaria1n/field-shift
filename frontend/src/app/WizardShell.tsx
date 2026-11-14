import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Leaf } from 'lucide-react'

import LanguageSwitch from './components/LanguageSwitch'
import WizardStepper from './components/WizardStepper'

/** Shell for first-visit journey screens (welcome → … → confirmation). */
export default function WizardShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const stepFor: Record<string, number> = {
    '/welcome': 0,
    '/fields/new': 1,
    '/setup/questions': 2,
    '/setup/priorities': 3,
  }
  const isAnalysisRoute = location.pathname.startsWith('/analyses/')
  const isPlansRoute = location.pathname.includes('/rotations')
  const step = isAnalysisRoute ? 4 : isPlansRoute ? 5 : (stepFor[location.pathname] ?? 0)

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-40 bg-forest text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button className="flex items-center gap-2" onClick={() => navigate('/welcome')}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Leaf size={18} />
            </span>
            <span className="text-lg font-extrabold">{t('app.title')}</span>
          </button>
          <div className="ms-auto">
            <LanguageSwitch variant="dark" />
          </div>
        </div>
        {step > 0 && (
          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-4">
              <WizardStepper current={step} />
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 text-[11px] text-ink/50">
          {t('app.poweredBy')} · {t('app.noNasaEndorsement')}
        </div>
      </footer>
    </div>
  )
}
