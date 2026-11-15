import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Sprout,
  UserRoundCheck,
  Wheat,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  ArrowLeft
} from 'lucide-react'

import { api, type AdoptedPlan } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { CROP_REGISTRY } from '../../assets/crops/cropRegistry'

type EventStatus = 'planned' | 'planted' | 'harvested' | 'skipped'

const STATUS_CONFIG: Record<EventStatus, { labelKey: string; color: string; icon: typeof Clock }> = {
  planned: {
    labelKey: 'timeline.planned',
    color: 'text-amber-800 border-amber-300 bg-amber-50',
    icon: Clock,
  },
  planted: {
    labelKey: 'timeline.planted',
    color: 'text-emerald-800 border-emerald-300 bg-emerald-50',
    icon: Sprout,
  },
  harvested: {
    labelKey: 'timeline.harvested',
    color: 'text-amber-900 border-amber-400 bg-amber-100',
    icon: Wheat,
  },
  skipped: {
    labelKey: 'timeline.skipped',
    color: 'text-ink/60 border-line bg-cream/70',
    icon: RotateCcw,
  },
}

export default function RotationTimeline() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
  const queryClient = useQueryClient()
  const [savedSlot, setSavedSlot] = useState<string | null>(null)
  const isArabic = i18n.language === 'ar'

  const { data: plan, isLoading } = useQuery({
    queryKey: ['active-plan', fieldId],
    queryFn: () => api.get<AdoptedPlan | null>(`/api/v1/fields/${fieldId}/active-plan`),
  })

  const { data: events } = useQuery({
    queryKey: ['events', fieldId],
    queryFn: () =>
      api.get<{ events: { id: string; event_type: string; crop_slot_id: string | null }[] }>(
        `/api/v1/fields/${fieldId}/events`
      ),
  })

  const saveEvent = useMutation({
    mutationFn: (payload: { event_type: EventStatus; crop_slot_id: string }) =>
      api.put(`/api/v1/fields/${fieldId}/events`, payload),
    onSuccess: (_data, variables) => {
      setSavedSlot(variables.crop_slot_id)
      setTimeout(() => setSavedSlot(null), 3000)
      void queryClient.invalidateQueries({ queryKey: ['events', fieldId] })
    },
  })

  const statusFor = (slotId: string): EventStatus => {
    const latest = events?.events
      .filter((e) => e.crop_slot_id === slotId)
      .slice(-1)[0]
    return (latest?.event_type as EventStatus) ?? 'planned'
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="card border-dashed border-forest/20 p-8 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/5 text-forest">
            <Calendar size={28} />
          </div>
          <h2 className="text-xl font-bold text-forest">{t('home.noPlan')}</h2>
          <p className="text-xs text-ink/70">
            {t('timeline.subtitle')}
          </p>
          <Link
            to={fieldId ? `/fields/${fieldId}/rotations` : '/fields/new'}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>{t('plans.viewDetails')}</span>
          </Link>
        </div>
      </div>
    )
  }

  const completedCount = plan.slots.filter((s) => statusFor(s.slot_id) === 'harvested').length

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Editorial Timeline Header (No repetitive AI dark banner!) */}
      <div className="border-b border-line pb-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest/70 hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft size={13} className="rtl:rotate-180" />
          <span>{t('nav.home')}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest/5 px-3 py-0.5 text-xs font-semibold text-forest">
              <Calendar size={13} className="text-leaf" />
              <span>{isArabic ? 'جدول الدورة الزراعية ومتابعة الأنشطة' : 'Seasonal Succession & Activity Tracker'}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {t('timeline.title')}
            </h1>
            <p className="mt-1 text-sm text-ink/70 max-w-xl">
              {t('timeline.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Harvest Progress Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-line bg-cream/70 px-3 py-2 text-xs font-mono">
              <span className="text-leaf font-bold text-sm">{completedCount}</span>
              <span className="text-ink/40">/</span>
              <span className="font-bold text-forest">{plan.slots.length}</span>
              <span className="text-ink/60">{t('timeline.harvested')}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky/30 bg-sky/10 px-3 py-2 text-xs text-sky-900 font-semibold">
              <UserRoundCheck size={14} className="text-sky-700" />
              <span>{t('timeline.farmerReported')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Succession Stream */}
      <div className="relative space-y-6">
        {plan.slots.map((slot, index) => {
          const current = statusFor(slot.slot_id)
          const cropMeta = slot.crop_id ? CROP_REGISTRY[slot.crop_id] : null
          const StatusIcon = STATUS_CONFIG[current].icon

          return (
            <div
              key={slot.slot_id}
              className="card overflow-hidden border border-line bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Year Marker & Botanical Crop Info */}
                <div className="flex items-center gap-4">
                  {/* Year badge circle */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest/5 border border-forest/15 font-display text-base font-extrabold text-forest shadow-inner">
                    Y{slot.year_number}
                  </div>

                  {/* Prominent Botanical illustration */}
                  <div className="shrink-0">
                    <CropVisual
                      slot={slot}
                      size="sm"
                      showBadge={false}
                      className="rounded-2xl border border-line shadow-2xs"
                    />
                  </div>

                  {/* Crop details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-forest">
                        <bdi>{isArabic ? (slot.name_ar ?? slot.crop_id) : (slot.name_en ?? slot.crop_id)}</bdi>
                      </h3>
                      {cropMeta && (
                        <span className="rounded-full border border-forest/15 bg-forest/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-forest">
                          {cropMeta.family}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-xs text-ink/60">
                      {t('timeline.year', { n: slot.year_number })}
                      {slot.crop_id && (
                        <span className="ms-2 font-mono text-[11px] text-ink/40">
                          (<bdi>{slot.crop_id}</bdi>)
                        </span>
                      )}
                    </p>

                    {/* Current status indicator */}
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs">
                      <StatusIcon size={13} className={STATUS_CONFIG[current].color.split(' ')[0]} />
                      <span className={STATUS_CONFIG[current].color.split(' ')[0]}>
                        {t(STATUS_CONFIG[current].labelKey)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Interactive State Selector */}
                <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 border-line/60 pt-3 sm:pt-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                    Activity Status
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['planned', 'planted', 'harvested', 'skipped'] as const).map((s) => {
                      const isSelected = current === s
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            saveEvent.mutate({ event_type: s, crop_slot_id: slot.slot_id })
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-forest text-white shadow-sm ring-2 ring-forest/30 ring-offset-1'
                              : 'border border-line bg-cream/70 text-ink/70 hover:border-forest/40 hover:bg-white'
                          }`}
                        >
                          {t(`timeline.${s}`)}
                        </button>
                      )
                    })}
                  </div>

                  {/* Feedback confirmation */}
                  {savedSlot === slot.slot_id && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-leaf animate-fade-in">
                      <CheckCircle2 size={13} />
                      {t('common.saved')}
                    </span>
                  )}
                </div>
              </div>

              {/* Step connector note */}
              <div className="mt-4 flex flex-wrap items-center justify-between border-t border-line/50 pt-3 text-[11px] text-ink/60">
                <div className="flex items-center gap-1.5 text-ink/70">
                  <UserRoundCheck size={13} className="text-sky-700" />
                  <span>{t('timeline.farmerReported')}</span>
                </div>
                {index < plan.slots.length - 1 && (
                  <div className="inline-flex items-center gap-1 font-medium text-forest/70">
                    <span>{t('timeline.year', { n: slot.year_number + 1 })}</span>
                    <ArrowRight size={12} className="rtl:rotate-180 text-forest" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Honest Scientific Provenance Note */}
      <div className="rounded-2xl border border-line bg-cream/60 p-4 text-xs text-ink/70">
        <div className="flex items-center gap-2 font-bold text-forest">
          <ShieldCheck size={16} className="text-leaf" />
          <span>Scientific Transparency Note</span>
        </div>
        <p className="mt-1 leading-relaxed text-ink/60">
          {t('disclaimer.calendar')} · Activity records are saved locally in this browser and reflect farmer management without overriding historical Earth observation datasets.
        </p>
      </div>
    </div>
  )
}
