import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, Satellite, ChevronLeft } from 'lucide-react'

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
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {/* Elevated Header */}
      <header
        className="sticky top-0 z-40 text-white shadow-md"
        style={{ background: 'linear-gradient(135deg, #081A15 0%, #0E2921 55%, #163E32 100%)', borderBottom: '1px solid rgba(188, 230, 206, 0.15)' }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/welcome"
              className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf rounded-xl p-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-leaf to-emerald-600 text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
                <Sprout size={22} className="drop-shadow" />
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-mint transition-colors">
                  {t('app.title')}
                </span>
                <span className="text-[10px] font-semibold text-mint/80 tracking-wide uppercase flex items-center gap-1 font-mono">
                  <Satellite size={10} className="text-emerald-400" /> Earth Intelligence
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitch variant="dark" />
          </div>
        </div>

        {/* Stepper progress Bar */}
        {step > 0 && (
          <div className="border-t border-white/10 bg-black/20 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <WizardStepper current={step} />
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area with atmospheric spacing */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      {/* Scientific Provenance Footer */}
      <footer className="border-t border-line bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 text-xs text-ink-muted">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-semibold text-forest">{t('app.title')}</span>
              <span className="text-line-strong">•</span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-cream-warm px-2 py-0.5 rounded text-forest">
                NASA POWER
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-cream-warm px-2 py-0.5 rounded text-forest">
                SoilGrids 250m
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-cream-warm px-2 py-0.5 rounded text-forest">
                FAO GAEZ v5
              </span>
            </div>
            <p className="text-[11px] text-ink-light">
              {t('app.poweredBy')} · {t('app.noNasaEndorsement')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
