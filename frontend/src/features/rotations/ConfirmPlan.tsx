import { useEffect, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PartyPopper, ArrowRight, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'

import { api, type AdoptedPlan } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
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
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#229E65', '#3B8EA5', '#D9943B', '#BCE6CE'],
        })
      } catch { /* confetti fallback */ }
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

  if (mutation.isPending) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
      </div>
    )
  }

  if (mutation.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-8 text-center space-y-4">
          <p className="text-sm font-bold text-red-600">{t('error.generic')}</p>
          <Link to={`/rotations/${ref}`} className="btn-primary inline-flex">
            {t('confirm.stay')}
          </Link>
        </div>
      </div>
    )
  }

  if (!mutation.isSuccess) {
    return <p className="text-sm text-ink-muted text-center py-10">{t('common.loading')}</p>
  }

  const plan = mutation.data

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="card-elevated p-8 sm:p-10 text-center bg-white border border-line shadow-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-leaf via-mint to-sky" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf-soft to-leaf/20 text-leaf shadow-glow ring-4 ring-leaf/10">
          <CheckCircle2 size={34} strokeWidth={2.5} />
        </div>

        <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('confirm.title')}
        </h1>
        <p className="mt-2 text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
          {t('confirm.subtitle')}
        </p>

        {/* Adopted Rotation Sequence Box */}
        <div className="mt-6 rounded-2xl border border-line bg-cream/50 p-5 text-start space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono">
              {t('confirm.selected')}
            </span>
            <span className="badge-glow text-[10px]">
              Active Strategy
            </span>
          </div>

          <p className="text-lg font-extrabold text-forest">
            <bdi>{lang === 'ar' ? (plan.label.split('(')[0] + ' (معدلة)') : plan.label}</bdi>
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {plan.slots.map((s, i) => (
              <div key={s.slot_id} className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-ink-light mb-1 uppercase font-bold">
                  {t('timeline.year', { n: s.year_number })}
                </span>
                <CropVisual slot={s} size="sm" showFamily className="w-full bg-white shadow-xs" />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-sky/30 bg-sky-soft/60 p-3.5 text-start text-xs text-ink-muted leading-relaxed">
          <PartyPopper size={16} className="mt-0.5 shrink-0 text-sky" />
          <span>{t('confirm.anonNote')}</span>
        </p>

        <div className="mt-7">
          <Link
            to="/home"
            className="btn-leaf text-base px-10 py-3.5 shadow-lg group inline-flex items-center gap-2"
          >
            <span>{t('confirm.goFarm')}</span>
            <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={18} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
