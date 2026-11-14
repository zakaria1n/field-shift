import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, TriangleAlert } from 'lucide-react'

import { api, type RotationOut } from '../../api/client'
import { CropChip, IndicatorRow } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function PlanDetails() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const navigate = useNavigate()
  const { lang, fieldId } = useWizard()

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['rotation', ref],
    queryFn: () => api.get<RotationOut>(`/api/v1/rotations/${ref}`),
  })

  if (isLoading) return <p className="text-sm text-ink/60">{t('common.loading')}</p>
  if (error || !plan) return <p className="text-sm text-red-600">{t('error.generic')}</p>

  const fieldRoute = fieldId ?? plan.plan_id.split(':')[0]

  return (
    <div className="mx-auto max-w-4xl">
      <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.back')}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-forest">{plan.label}</h1>
        <span className="chip">{t('plan.years', { n: plan.horizon_years })}</span>
        {plan.is_recommended && (
          <span className="rounded-full bg-leaf/15 px-3 py-1 text-xs font-bold text-forest">{t('plans.recommended')}</span>
        )}
      </div>

      {/* Full sequence */}
      <div className="card mt-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('customize.sequence')}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {plan.slots.map((slot, i) => (
            <div key={slot.slot_id} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink/30" aria-hidden>→</span>}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50">{t('timeline.year', { n: slot.year_number })}</span>
                <CropChip slot={slot} />
              </div>
            </div>
          ))}
        </div>
        {plan.slots.some((s) => s.planting_window) && (
          <ul className="mt-3 space-y-1 text-xs text-ink/60">
            {plan.slots.filter((s) => s.planting_window).map((s) => (
              <li key={s.slot_id}>
                {s.crop_id}: {t('insights.planting')} <bdi>{s.planting_window!.planting_months.join('–')}</bdi> ·{' '}
                {t('insights.harvest')} <bdi>{s.planting_window!.harvest_months.join('–')}</bdi>
                {s.planting_window!.source?.name && <> ({s.planting_window!.source.name})</>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Why + scores */}
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('plan.why')}</h2>
          <p className="mt-2 text-sm text-ink/80 leading-relaxed">
            <bdi>{lang === 'ar' ? plan.summary_ar : plan.summary_en}</bdi>
          </p>
          <div className="mt-4 space-y-3">
            {INDICATOR_KEYS.map((key) => {
              const ind = plan.score.indicators.find((i) => i.key === key)
              if (!ind) return null
              return (
                <IndicatorRow key={key} label={lang === 'ar' ? ind.label_ar : ind.label_en} value={ind.value} status={ind.status} />
              )
            })}
          </div>
          {plan.score.weight_redistribution_note && (
            <p className="mt-3 text-[11px] text-sky">{plan.score.weight_redistribution_note}</p>
          )}
          <p className="mt-3 text-[11px] text-ink/50">{t('plan.scoreNote')}</p>
        </div>

        {/* Limitations, evidence */}
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('plan.limitation')}</h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink/80">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber" />
            <bdi>{(lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en) ?? t('common.unknown')}</bdi>
          </p>

          <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink/50">{t('plan.evidence')}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.evidence.source_ids.map((s) => (
              <span key={s} className="chip"><bdi>{s}</bdi></span>
            ))}
            {plan.evidence.rule_ids.slice(0, 8).map((r) => (
              <span key={r} className="rounded-full bg-cream border border-line px-2 py-0.5 text-[10px] font-mono text-ink/60"><bdi>{r}</bdi></span>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-ink/65 list-disc ps-4">
            {plan.evidence.notes.slice(0, 5).map((note, i) => (
              <li key={i}><bdi>{note}</bdi></li>
            ))}
          </ul>
          {plan.evidence.missing_information.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber/10 border border-amber/40 px-2.5 py-2 text-[11px] text-ink/75">
              {t('status.missing')}: {plan.evidence.missing_information.join(', ')}
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink/55">
            <FileText size={12} className="mt-0.5 shrink-0" />
            {t('plan.dataProvisional')}
          </p>
        </div>
      </div>

      {/* Actions: accept as-is OR customize */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/rotations/${plan.plan_id}/confirmation`} className="btn-leaf" state={{ adoptEdits: null }}>
          {t('plan.useThis')}
        </Link>
        <Link to={`/rotations/${plan.plan_id}/customize`} className="btn-secondary">
          {t('plan.customize')}
        </Link>
        <Link to={`/fields/${fieldRoute}/rotations`} className="btn-secondary">
          {t('confirm.stay')}
        </Link>
      </div>
    </div>
  )
}
