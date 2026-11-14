import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, MapPin, ClipboardList, BarChart3 } from 'lucide-react'

import { useQuery } from '@tanstack/react-query'
import { api, type DashboardItem } from '../../api/client'
import { useWizard } from '../../state/wizard'

export default function Welcome() {
  const { t } = useTranslation()
  const { resetWizard } = useWizard()

  // Returning visitor: is there already a saved farm?
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasFarm = (dashboard?.length ?? 0) > 0

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-center">
      <section>
        <p className="kicker">{t('app.title')} · NASA Space Apps</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight text-forest">
          {t('welcome.heading')}
        </h1>
        <p className="mt-4 text-ink/80 leading-relaxed">{t('welcome.body')}</p>

        <ul className="mt-6 space-y-3 text-sm text-ink/80">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10"><MapPin className="h-4.5 w-4.5 text-forest" size={18} /></span>
            {t('steps.field')} — {t('field.drawHint')}
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10"><ClipboardList className="h-4.5 w-4.5 text-forest" size={18} /></span>
            {t('q.title')}
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10"><BarChart3 className="h-4.5 w-4.5 text-forest" size={18} /></span>
            {t('plans.subtitle')}
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/fields/new" onClick={() => resetWizard()} className="btn-leaf text-base px-7">
            {t('welcome.cta')} <ArrowRight className="rtl:rotate-180" size={18} />
          </Link>
          {hasFarm && (
            <Link to="/home" className="btn-secondary">
              {t('welcome.reprise')}
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-ink/60">{t('welcome.anonNote')}</p>
      </section>

      <section className="card overflow-hidden" aria-hidden>
        <div className="bg-forest p-8 text-white">
          <p className="text-xs font-bold tracking-widest uppercase text-leaf">{t('steps.plans')}</p>
          <p className="mt-3 text-2xl font-bold leading-snug">
            {t('plans.subtitle')}
          </p>
        </div>
        <div className="p-6 grid gap-3 sm:grid-cols-3">
          {(['common.year1', 'common.year2', 'common.year3'] as const).map((key, i) => (
            <div key={key} className="rounded-xl border border-line p-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-leaf">{t(key)}</p>
              <div className="mt-2 flex justify-center">
                <span className={`h-9 w-9 rounded-full ${['bg-forest/15', 'bg-leaf/20', 'bg-sky/20'][i]}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-xl bg-cream border border-line p-4 text-xs text-ink/70">
            {t('disclaimer.body')}
          </div>
        </div>
      </section>
    </div>
  )
}
