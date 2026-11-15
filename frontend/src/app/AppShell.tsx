import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Sprout, Home, MapPin, Compass, BarChart2, Settings, Satellite } from 'lucide-react'

import LanguageSwitch from './components/LanguageSwitch'

/** Elevated shell for returning-user screens (dashboard, timeline, insights, management). */
export default function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()

  const nav = [
    { to: '/home', label: t('nav.home'), icon: Home },
    { to: '/fields/list', label: t('nav.fields'), icon: MapPin },
    { to: '/plan', label: t('nav.plan'), icon: Compass },
    { to: '/insights', label: t('nav.insights'), icon: BarChart2 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-line shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/home" className="group flex items-center gap-2.5">
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

            {/* Desktop Navigation Links */}
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
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitch variant="light" />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 start-0 end-0 z-40 bg-white/95 backdrop-blur-lg border-t border-line shadow-lg px-2 py-1.5"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
                  active ? 'text-forest font-extrabold' : 'text-ink-muted hover:text-forest'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg mb-0.5 transition-all ${
                    active ? 'bg-forest text-white shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="border-t border-line bg-white/80 backdrop-blur-md hidden md:block">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 text-xs text-ink-muted">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-forest">{t('app.title')}</span>
              <span className="text-line-strong">•</span>
              <span className="font-mono text-[11px] text-ink-light">NASA POWER · SoilGrids · GAEZ v5</span>
              <span className="text-line-strong">•</span>
              <Link to="/welcome" className="text-[11px] font-semibold text-leaf hover:underline">
                Overview & Guide
              </Link>
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
