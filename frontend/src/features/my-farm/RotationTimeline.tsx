import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserRoundCheck } from 'lucide-react'

import { api, type AdoptedPlan } from '../../api/client'
import { CropChip } from '../../app/components/ui'

type EventStatus = 'planned' | 'planted' | 'harvested' | 'skipped'

export default function RotationTimeline() {
  const { t } = useTranslation()
  const { fieldId } = useParams()
  const queryClient = useQueryClient()
  const [savedSlot, setSavedSlot] = useState<string | null>(null)

  const { data: plan, isLoading } = useQuery({
    queryKey: ['active-plan', fieldId],
    queryFn: () => api.get<AdoptedPlan | null>(`/api/v1/fields/${fieldId}/active-plan`),
  })

  const { data: events } = useQuery({
    queryKey: ['events', fieldId],
    queryFn: () => api.get<{ events: { id: string; event_type: string; crop_slot_id: string | null }[] }>(`/api/v1/fields/${fieldId}/events`),
  })

  const saveEvent = useMutation({
    mutationFn: (payload: { event_type: EventStatus; crop_slot_id: string }) =>
      api.put(`/api/v1/fields/${fieldId}/events`, payload),
    onSuccess: (_data, variables) => {
      setSavedSlot(variables.crop_slot_id)
      void queryClient.invalidateQueries({ queryKey: ['events', fieldId] })
    },
  })

  const statusFor = (slotId: string): EventStatus => {
    const latest = events?.events
      .filter((e) => e.crop_slot_id === slotId)
      .slice(-1)[0]
    return (latest?.event_type as EventStatus) ?? 'planned'
  }

  if (isLoading) return <p className="text-sm text-ink/60">{t('common.loading')}</p>

  if (!plan) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-ink/70">{t('home.noPlan')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-forest">{t('timeline.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('timeline.subtitle')}</p>

      <div className="mt-5 space-y-4">
        {plan.slots.map((slot) => {
          const current = statusFor(slot.slot_id)
          return (
            <div key={slot.slot_id} className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <CropChip slot={slot} />
                <div>
                  <p className="text-sm font-bold text-ink">
                    {t('timeline.year', { n: slot.year_number })}
                    {slot.crop_id && <span className="ms-2 text-xs font-normal text-ink/50"><bdi>{slot.crop_id}</bdi></span>}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sky">
                    <UserRoundCheck size={12} /> {t('timeline.farmerReported')}
                  </p>
                </div>
                <div className="ms-auto flex flex-wrap items-center gap-1.5">
                  {(['planned', 'planted', 'harvested', 'skipped'] as const).map((s) => (
                    <button
                      key={s}
                      aria-pressed={current === s}
                      onClick={() => saveEvent.mutate({ event_type: s, crop_slot_id: slot.slot_id })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        current === s ? 'border-leaf bg-leaf text-white' : 'border-line bg-white text-ink/70 hover:bg-forest/5'
                      }`}
                    >
                      {t(`timeline.${s}`)}
                    </button>
                  ))}
                </div>
                {savedSlot === slot.slot_id && <span className="text-xs font-semibold text-leaf">{t('common.saved')}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
