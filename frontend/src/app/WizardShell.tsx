import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, Satellite, Home, MapPin, Compass, BarChart2, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api, type DashboardItem } from '../api/client'
import LanguageSwitch from './components/LanguageSwitch'
import WizardStepper from './components/WizardStepper'

/** Shell for first-visit journey screens (welcome → … → confirmation) harmonized with AppShell styling. */
export default function WizardShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // Only display navigation links if a saved farm exists in this browser
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasFarm = (dashboard?.length ?? 0) > 0

  const nav = [
    { to: '/home', label: t('nav.home'), icon: Home },
    { to: '/fields/list', label: t('nav.fields'), icon: MapPin },
    { to: '/plan', label: t('nav.plan'), icon: Compass },
    { to: '/insights', label: t('nav.insights'), icon: BarChart2 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

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
      {/* Top Navigation Harmonized with AppShell */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-line shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/welcome" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest to-forest-surface text-white shadow-sm group-hover:bg-leaf transition-colors">
                <Sprout size={20} />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-forest">
                  {t('app.title')}
                </span>
                <span className="text-[9px] font-semibold text-leaf tracking-wider uppercase flex items-center gap-1 font-mono">
                  <Satellite size={9} /> Agritech Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links ONLY when the farmer has an active saved farm */}
            {hasFarm && (
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
                          ? 'bg-forest text-white shadow-sm ring-1 ring-forest/20'
                          : 'text-ink-muted hover:text-forest hover:bg-forest/5'
                      }`}
                    >
                      <Icon size={14} className={active ? 'text-mint' : 'text-ink-light'} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitch variant="light" />
          </div>
        </div>

        {/* Stepper progress Bar */}
        {step > 0 && (
          <div className="border-t border-line bg-cream-warm/70 backdrop-blur-md">
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
