import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Leaf } from 'lucide-react'

import LanguageSwitch from './components/LanguageSwitch'

/** Shell for returning-user screens (after a plan exists). */
export default function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()

  const nav = [
    { to: '/home', label: t('nav.home') },
    { to: '/fields/list', label: t('nav.fields') },
    { to: '/plan', label: t('nav.plan') },
    { to: '/insights', label: t('nav.insights') },
    { to: '/settings', label: t('nav.settings') },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest">
              <Leaf size={18} className="text-white" />
            </span>
            <span className="text-lg font-extrabold text-forest">{t('app.title')}</span>
          </Link>
          <nav className="ms-4 hidden gap-1 sm:flex">
            {nav.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-forest text-white' : 'text-ink/70 hover:bg-forest/5'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="ms-auto">
            <LanguageSwitch variant="light" />
          </div>
        </div>
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
