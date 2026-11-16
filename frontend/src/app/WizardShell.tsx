import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, Satellite, Home, MapPin, Compass, BarChart2, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api, type DashboardItem } from '../api/client'
import { useWizard } from '../state/wizard'
import LanguageSwitch from './components/LanguageSwitch'
import WizardStepper from './components/WizardStepper'

/** Shell for first-visit journey screens (welcome → … → confirmation) harmonized with AppShell styling. */
export default function WizardShell() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { farmProfileStep } = useWizard()
  const isArabic = i18n.language === 'ar'

  // Only display navigation links if an adopted rotation plan actually exists
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasSavedPlan = Boolean(dashboard?.some((f) => Boolean(f.active_plan)))

  const nav = [
    { to: '/home', label: t('nav.home'), icon: Home },
    { to: '/fields/list', label: t('nav.fields'), icon: MapPin },
    { to: '/plan', label: t('nav.plan'), icon: Compass },
    { to: '/insights', label: t('nav.insights'), icon: BarChart2 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  const isFarmProfile =
    location.pathname === '/setup/questions' || location.pathname === '/setup/priorities'

  const stepFor: Record<string, number> = {
    '/welcome': 0,
    '/fields/new': 1,
    '/setup/questions': 2,
    '/setup/priorities': 3,
  }
  const isAnalysisRoute = location.pathname.startsWith('/analyses/')
  const isPlansRoute = location.pathname.includes('/rotations')
  const step = isAnalysisRoute ? 4 : isPlansRoute ? 5 : (stepFor[location.pathname] ?? 0)

  // Immersive mode: the Welcome page renders its own cinematic overlay
  // navigation, so the app shell chrome is removed there.
  const isImmersiveWelcome = location.pathname === '/welcome'
  if (isImmersiveWelcome) {
    return (
      <div className="flex min-h-screen flex-col bg-forest-dark text-ink">
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    )
  }

  // Navigation items are ONLY shown on the Welcome page (step === 0) AND ONLY if a rotation plan has already been saved.
  // During any wizard step (1 to 5), nav links are completely hidden to prevent premature navigation to empty pages.
  const showNav = step === 0 && hasSavedPlan

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {/* Top Cinematic Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#071913]/95 backdrop-blur-md border-b border-white/10 shadow-lg text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to={hasSavedPlan ? '/home' : '/welcome'} className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf to-forest-surface text-white shadow-md group-hover:bg-leaf transition-colors ring-1 ring-white/20">
                <Sprout size={20} className="text-white" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>{t('app.title')}</span>
                  {isFarmProfile && (
                    <span className="hidden lg:inline text-xs font-normal text-white/50 border-s border-white/20 ps-2">
                      {isArabic
                        ? 'الملف الزراعي — من حقلك إلى خطة دورة زراعية مخصصة'
                        : 'Farm Profile — From your field to a personalized crop plan'}
                    </span>
                  )}
                </span>
                <span className="text-[9px] font-semibold text-leaf tracking-wider uppercase flex items-center gap-1 font-mono">
                  <Satellite size={9} /> Agritech Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links ONLY when on /welcome AND a rotation plan is already saved */}
            {showNav && (
              <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
                {nav.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                        active
                          ? 'bg-leaf text-white shadow-sm ring-1 ring-white/30'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon size={14} className={active ? 'text-white' : 'text-white/60'} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitch variant="dark" />
          </div>
        </div>

        {/* Stepper Progress Bar */}
        {step > 0 && (
          <div className="border-t border-white/10 bg-[#0A2018]/90 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <WizardStepper
                current={isFarmProfile ? farmProfileStep : step}
                mode={isFarmProfile ? 'farmProfile' : 'default'}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area with atmospheric spacing (compact on analysis telemetry view) */}
      <main className={`mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 ${isAnalysisRoute ? 'py-3 sm:py-4' : 'py-8 sm:py-10'}`}>
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
