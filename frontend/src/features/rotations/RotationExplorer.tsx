import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MoveRight } from 'lucide-react'

import { api, type RotationListOut } from '../../api/client'
import { CropChip, IndicatorRow } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function RotationExplorer() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
  const { lang } = useWizard()

  const { data, isLoading, error } = useQuery({
    queryKey: ['rotations', fieldId],
    queryFn: () => api.get<RotationListOut>(`/api/v1/fields/${fieldId}/rotations`),
  })

  if (isLoading) return <p className="text-sm text-ink/60">{t('common.loading')}</p>
  if (error || !data) return <p className="text-sm text-red-600">{t('error.generic')}</p>

  return (
    <div>
      <p className="kicker">{t('steps.plans')}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('plans.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('plans.subtitle')}</p>

      {data.insufficient_data_note && (
        <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs font-medium text-ink/80">
          {data.insufficient_data_note}
        </p>
      )}
      {data.current_practice_note && (
        <p className="mt-2 rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink/70">
          {data.current_practice_note}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {data.rotations.map((plan) => {
          const indicators = Object.fromEntries(plan.score.indicators.map((i) => [i.key, i]))
          return (
            <article
              key={plan.plan_id}
              className={`card p-4 flex flex-col ${plan.is_recommended ? 'ring-2 ring-leaf' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-forest">{plan.label}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    plan.is_recommended ? 'bg-leaf/15 text-forest' : 'bg-line text-ink/60'
                  }`}
                >
                  {plan.is_recommended ? t('plans.recommended') : t('plans.alternative')}
                </span>
              </div>

              <div className="mt-3 flex items-stretch gap-1.5">
                {plan.slots.map((slot, i) => (
                  <div key={slot.slot_id} className="flex items-center gap-1.5">
                    {i > 0 && <MoveRight size={14} className="text-ink/30 rtl:rotate-180 shrink-0" aria-hidden />}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50">
                        {t(`timeline.year`, { n: slot.year_number })}
                      </span>
                      <CropChip slot={slot} size="sm" />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-ink/70 leading-relaxed">
                <bdi>{lang === 'ar' ? plan.summary_ar : plan.summary_en}</bdi>
              </p>

              <div className="mt-3 space-y-2.5">
                {INDICATOR_KEYS.map((key) => {
                  const ind = indicators[key]
                  if (!ind) return null
                  return (
                    <IndicatorRow
                      key={key}
                      label={lang === 'ar' ? ind.label_ar : ind.label_en}
                      value={ind.value}
                      status={ind.status}
                    />
                  )
                })}
              </div>

              {(lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en) && (
                <p className="mt-3 rounded-lg bg-cream border border-line px-2.5 py-2 text-[11px] text-ink/70">
                  <span className="font-bold">{t('plan.limitation')}: </span>
                  <bdi>{lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en}</bdi>
                </p>
              )}

              <div className="mt-auto pt-4">
                <Link to={`/rotations/${plan.plan_id}`} className="btn-primary w-full">
                  {t('plans.viewDetails')} <ArrowRight size={15} className="rtl:rotate-180" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-ink/50">{t('plan.scoreNote')}</p>
    </div>
  )
}
