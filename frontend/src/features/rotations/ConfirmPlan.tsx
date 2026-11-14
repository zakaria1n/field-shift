import { useEffect, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PartyPopper } from 'lucide-react'

import { api, type AdoptedPlan } from '../../api/client'
import { CropChip } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

export default function ConfirmPlan() {
  const { t } = useTranslation()
  const { ref } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { lang, setFieldId } = useWizard()

  const adoptEdits = (location.state as { adoptEdits?: { slot_id: string; crop_id: string | null }[] | null } | null)?.adoptEdits ?? null
  const fieldId = ref?.split('--')[0] ?? null

  const mutation = useMutation({
    mutationFn: () => api.post<AdoptedPlan>(`/api/v1/rotations/${ref}/adopt`, adoptEdits ? { edits: adoptEdits } : {}),
    onSuccess: () => {
      if (fieldId) setFieldId(fieldId)
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const startedRef = useRef(false)
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      mutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  if (mutation.isPending) return <p className="text-sm text-ink/60">{t('common.loading')}</p>

  if (mutation.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center">
          <p className="text-sm font-bold text-red-600">{t('error.generic')}</p>
          <Link to={`/rotations/${ref}`} className="btn-primary mt-4">{t('confirm.stay')}</Link>
        </div>
      </div>
    )
  }

  if (!mutation.isSuccess) {
    return <p className="text-sm text-ink/60">{t('common.loading')}</p>
  }

  const plan = mutation.data

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf/15">
          <CheckCircle2 size={30} className="text-leaf" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-forest">{t('confirm.title')}</h1>
        <p className="mt-1 text-sm text-ink/70">{t('confirm.subtitle')}</p>

        <div className="mt-5 rounded-xl border border-line bg-cream p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t('confirm.selected')}</p>
          <p className="mt-1 text-lg font-bold text-forest"><bdi>{lang === 'ar' ? (plan.label.split('(')[0] + ' (معدلة)') : plan.label}</bdi></p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {plan.slots.map((s, i) => (
              <div key={s.slot_id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-ink/30" aria-hidden>→</span>}
                <CropChip slot={s} size="sm" />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-lg border border-sky/30 bg-sky/10 p-3 text-start text-xs text-ink/75">
          <PartyPopper size={14} className="mt-0.5 shrink-0 text-sky" />
          {t('confirm.anonNote')}
        </p>

        <div className="mt-5">
          <Link to="/home" className="btn-leaf px-8">{t('confirm.goFarm')}</Link>
        </div>
      </div>
    </div>
  )
}
