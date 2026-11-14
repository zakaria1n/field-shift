import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, History } from 'lucide-react'

import { api, type AdoptedPlan } from '../../api/client'
import { CropChip, IndicatorRow } from '../../app/components/ui'

interface VersionRow {
  plan_id: string
  version_id: string
  status: string
  label: string | null
  base_version_id: string | null
  total: number | null
  created_at: string
  is_active: boolean
}

export default function PlanManagement() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()

  const { data: plan } = useQuery({
    queryKey: ['active-plan', fieldId],
    queryFn: () => api.get<AdoptedPlan | null>(`/api/v1/fields/${fieldId}/active-plan`),
  })
  const { data: versions } = useQuery({
    queryKey: ['plan-versions', fieldId],
    queryFn: () => api.get<{ versions: VersionRow[] }>(`/api/v1/fields/${fieldId}/plan-versions`),
  })

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.home')}
      </Link>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-forest">{t('plans.manage.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('plans.manage.subtitle')}</p>

      {plan ? (
        <div className="card mt-4 p-5 ring-1 ring-leaf/40">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-leaf" />
            <h2 className="text-lg font-bold text-forest"><bdi>{i18n.language === 'ar' ? t('home.activePlan') : plan.label}</bdi></h2>
            <span className="ms-auto chip">{t('plans.manage.active')}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {plan.slots.map((s, i) => (
              <div key={s.slot_id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink/30" aria-hidden>→</span>}
                <CropChip slot={s} size="sm" />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plan.score.indicators.map((ind) => (
              <IndicatorRow key={ind.key} label={i18n.language === 'ar' ? ind.label_ar : ind.label_en} value={ind.value} status={ind.status} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/fields/${fieldId}/rotations`} className="btn-secondary !py-2 text-xs">{t('plans.viewDetails')}</Link>
            <Link to={`/fields/${fieldId}/insights`} className="btn-secondary !py-2 text-xs">{t('home.reevaluate')}</Link>
          </div>
        </div>
      ) : (
        <div className="card mt-4 p-6 text-sm text-ink/70">{t('home.noPlan')}</div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink/50">
          <History size={15} /> {t('plans.manage.archived')}
        </h2>
        <ul className="mt-3 space-y-2">
          {(versions?.versions ?? []).map((v) => (
            <li key={v.version_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span className="font-semibold text-ink"><bdi>{v.label ?? v.version_id.slice(0, 12)}</bdi></span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${v.is_active ? 'bg-leaf/15 text-forest' : 'bg-line text-ink/50'}`}>
                {v.is_active ? t('plans.manage.active') : t('plans.manage.archived')}
              </span>
              {v.total !== null && <span className="text-xs text-ink/60">{t('mixer.total')}: <bdi>{v.total}</bdi></span>}
              <span className="ms-auto text-[11px] text-ink/45">{v.created_at.slice(0, 10)}</span>
            </li>
          ))}
          {(versions?.versions.length ?? 0) === 0 && <li className="text-sm text-ink/50">—</li>}
        </ul>
      </div>
    </div>
  )
}
