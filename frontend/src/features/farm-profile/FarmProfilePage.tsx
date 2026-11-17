import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Beef,
  Carrot,
  Check,
  CloudRain,
  Droplets,
  Flower,
  HelpCircle,
  Leaf,
  Plus,
  Salad,
  ShieldAlert,
  Shuffle,
  Sparkles,
  Sprout,
  Store,
  Flower2,
  Trash2,
  TrendingUp,
  Utensils,
  Wheat,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import FieldShiftBrand from '../../app/components/FieldShiftBrand'
import { api, type CropOut } from '../../api/client'
import { useWizard, type CropHistoryRow } from '../../state/wizard'
import { cropHasOwnImage, getCropAsset } from '../../assets/crops/cropRegistry'
import CropCombobox, { type CropSelection } from './components/CropCombobox'
import { rebalance, totalOf } from './prioritiesMath'
import type { Priorities } from '../../state/wizard'
import bgQuestionnaire from '../../assets/farm-profile-cinematic/backgrounds/questionnaire.png'
import bgPriorities from '../../assets/farm-profile-cinematic/backgrounds/priorities.png'
import './farmProfile.css'

import FloatingFarmIllustration from './components/FloatingFarmIllustration'
import FarmSceneEffects from './components/FarmSceneEffects'

type Step = 0 | 1 | 2 | 3 | 4
const STEP_KEYS = ['irrigation', 'history', 'purpose', 'constraints', 'priorities'] as const

function nextYears(n: number): number[] {
  const y = new Date().getFullYear()
  return Array.from({ length: n }, (_, i) => y - n + i)
}

/** Canonical 5-step pill progress bar, fixed position across all steps. */
function FarmProfileProgress({
  step,
  isArabic,
  onStepClick,
  onLang,
}: {
  step: Step
  isArabic: boolean
  onStepClick: (target: Step) => void
  onLang: (lang: 'en' | 'ar') => void
}) {
  const { t } = useTranslation()
  const labels = STEP_KEYS.map((key) => t(`fp.progress.${key}`))
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-7 sm:py-4">
        <FieldShiftBrand title={isArabic ? 'الملف الزراعي' : 'Farm Profile'} />
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
          <button type="button" onClick={() => onLang('en')} aria-pressed={!isArabic} className={`rounded-full border px-3 py-1 transition-colors ${!isArabic ? 'border-lime-300/70 bg-black/25 text-white' : 'border-white/30 text-white/75 hover:text-white'}`}>
            EN
          </button>
          <span className="h-4 w-px bg-white/30" aria-hidden />
          <button type="button" onClick={() => onLang('ar')} aria-pressed={isArabic} className={`font-ar transition-colors ${isArabic ? 'text-lime-200' : 'text-white/75 hover:text-white'}`}>
            العربية
          </button>
        </div>
      </div>

      <div className="mx-4 mt-1 rounded-full border border-white/15 bg-[#0B2018]/75 px-4 py-2.5 backdrop-blur-md sm:mx-7">
        <ol className="flex items-center justify-between gap-1.5">
          {labels.map((label, index) => {
            const done = index < step
            const active = index === step
            return (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
                <button
                  type="button"
                  onClick={() => index <= step && onStepClick(index as Step)}
                  className={`flex items-center gap-2 ${index <= step ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                      done
                        ? 'bg-[#A3E635] text-[#17352D]'
                        : active
                          ? 'bg-[#A3E635]/25 text-[#D3F8A2] ring-2 ring-[#A3E635]'
                          : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : index + 1}
                  </span>
                  <span className={`hidden truncate text-sm font-bold sm:block ${active ? 'text-[#D3F8A2]' : done ? 'text-white/85' : 'text-white/55'}`}>
                    {label}
                  </span>
                </button>
                {index < labels.length - 1 && <span className="mx-1 h-px flex-1 bg-white/20" aria-hidden />}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function FarmProfileProgressSpacer() {
  return <div className="h-[136px] shrink-0 lg:h-[148px]" aria-hidden />
}

const OPTION_ICON: Record<string, typeof CloudRain> = {
  rainfed: CloudRain,
  irrigated: Droplets,
  mixed: Shuffle,
  unknown: HelpCircle,
  sell: Store,
  livestock_feed: Beef,
  household_food: Utensils,
  soil_restoration: Leaf,
}

export default function FarmProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    answers,
    setAnswers,
    priorities,
    setPriorities,
    lang: wizardLang,
    setLang: setWizardLang,
    fieldId: wizardFieldId,
    setFieldId,
    field,
    setFarmProfileStep,
  } = useWizard()
  const isArabic = i18n.language === 'ar'

  const routeState = (location.state as { fieldId?: string; areaHa?: number; fieldTransition?: boolean } | null) ?? {}
  const fieldId = routeState.fieldId || searchParams.get('field') || wizardFieldId

  const [step, setStep] = useState<Step>(0)

  const years = useMemo(() => nextYears(3), [])
  const [showAllCrops, setShowAllCrops] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (fieldId && fieldId !== wizardFieldId) setFieldId(fieldId)
  }, [fieldId, wizardFieldId, setFieldId])

  useEffect(() => {
    setFarmProfileStep(step + 1)
  }, [step, setFarmProfileStep])

  const urlStep = searchParams.get('step')
  useEffect(() => {
    if (urlStep === 'irrigation') setStep(0)
    else if (urlStep === 'history') setStep(1)
    else if (urlStep === 'purpose') setStep(2)
    else if (urlStep === 'constraints') setStep(3)
    else if (urlStep === 'priorities') setStep(4)
  }, [urlStep])

  const { data: catalog } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.get<{ crops: CropOut[] }>('/api/v1/crops'),
    staleTime: 3600_000,
  })
  const crops = catalog?.crops ?? []
  const featuredCrops = ['bread_wheat', 'maize', 'sunflower', 'barley', 'lentil']
  const constraintCrops = (
    showAllCrops
      ? crops
      : crops.filter((c) => featuredCrops.includes(c.crop_id) || answers.banned_crops.includes(c.crop_id))
  ).slice(0, showAllCrops ? crops.length : 6)

  useEffect(() => {
    if (answers.crop_history.length === 0) {
      setAnswers({
        ...answers,
        crop_history: years.map((y) => ({
          crop_year: y,
          season_label: 'main',
          crop_id: null,
          status: 'unknown' as const,
        })),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<typeof answers>) => setAnswers({ ...answers, ...patch })

  const presets = [
    {
      id: 'balanced',
      name: isArabic ? 'متوازن' : 'Balanced',
      subtitle: isArabic ? 'وزن متساوٍ (٢٥٪ لكل عامل)' : 'Equal weight (25% each)',
      weights: { water: 25, soil: 25, yield: 25, risk: 25 },
    },
    {
      id: 'drought',
      name: isArabic ? 'توفير المياه' : 'Drought Saver',
      subtitle: isArabic ? 'التركيز على كفاءة المياه' : 'Focus on water efficiency',
      weights: { water: 45, soil: 20, yield: 15, risk: 20 },
    },
    {
      id: 'soil',
      name: isArabic ? 'تجديد التربة' : 'Soil Restorer',
      subtitle: isArabic ? 'أولوية لخصوبة وصحة التربة' : 'Prioritize soil health',
      weights: { water: 20, soil: 50, yield: 15, risk: 15 },
    },
    {
      id: 'yield',
      name: isArabic ? 'أقصى إنتاجية' : 'Yield Focus',
      subtitle: isArabic ? 'تعظيم إمكانات المردود' : 'Maximize yield potential',
      weights: { water: 15, soil: 20, yield: 50, risk: 15 },
    },
  ]
  const activePreset = presets.find(
    (p) =>
      p.weights.water === priorities.water &&
      p.weights.soil === priorities.soil &&
      p.weights.yield === priorities.yield &&
      p.weights.risk === priorities.risk,
  )

  function goNext() {
    if (step < 4) {
      const next = (step + 1) as Step
      setStep(next)
      setSearchParams(next === 4 ? { ...(fieldId ? { field: fieldId } : {}), step: 'priorities' } : fieldId ? { field: fieldId } : {}, { replace: true })
    }
  }

  function goBack() {
    if (step > 0) {
      const prev = (step - 1) as Step
      setStep(prev)
      setSearchParams(fieldId ? { field: fieldId } : {}, { replace: true })
    } else {
      navigate('/fields/new')
    }
  }

  function jumpTo(target: Step) {
    if (target <= step) {
      setStep(target)
      setSearchParams(fieldId ? { field: fieldId } : {}, { replace: true })
    }
  }

  function onLang(lang: 'en' | 'ar') {
    setWizardLang(lang)
  }

  async function startAnalysis() {
    setErrorMessage(null)
    let id = fieldId || wizardFieldId || searchParams.get('field')
    if (!id) {
      try {
        const dashboard = await api.get<Array<{ field_id: string }>>('/api/v1/dashboard')
        if (dashboard && dashboard.length > 0) {
          id = dashboard[0].field_id
          setFieldId(id)
        }
      } catch {
        /* ignore */
      }
    }
    if (!id) {
      setErrorMessage(isArabic ? 'يرجى تحديد حقل أولاً للمتابعة' : 'Please select or draw a field first.')
      return
    }

    const normalizedPriorities = rebalance(priorities, 'water', priorities.water)
    setPriorities(normalizedPriorities)

    setSubmitting(true)
    try {
      const isIrrigatedOrMixed = answers.irrigation_type === 'irrigated' || answers.irrigation_type === 'mixed'
      await api.put(`/api/v1/fields/${id}/profile`, {
        irrigation_type: answers.irrigation_type,
        irrigation_method: isIrrigatedOrMixed ? answers.irrigation_method : null,
        water_availability: isIrrigatedOrMixed ? answers.water_availability : null,
        water_volume_note: answers.water_volume_note,
        purposes: answers.purposes,
        priorities: {
          water: normalizedPriorities.water,
          soil: normalizedPriorities.soil,
          yield: normalizedPriorities.yield,
          risk: normalizedPriorities.risk,
        },
        constraints: answers.banned_crops.length > 0 ? { banned_crops: answers.banned_crops } : null,
      })

      const historyPayload = answers.crop_history
        .map((r) => {
          if (r.status === 'planted' && (!r.crop_id || !r.crop_id.trim())) {
            return { ...r, status: 'unknown' as const, crop_id: null }
          }
          return r
        })
        .filter((r) => r.status === 'planted' || r.status === 'fallow' || r.status === 'unknown')

      await api.put(`/api/v1/fields/${id}/crop-history`, historyPayload)
      const job = await api.post<{ job_id: string; status: string }>(`/api/v1/fields/${id}/analyses`, {})
      navigate(`/analyses/${job.job_id}/progress`, { state: { fieldId: id } })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('error.generic'))
      setSubmitting(false)
    }
  }

  const historyBadges = useMemo(
    () =>
      years.map((year) => {
        const row = answers.crop_history.find((r) => r.crop_year === year)
        const asset = getCropAsset(row?.status === 'planted' ? row.crop_id : null)
        const label =
          row?.status === 'planted' && row.crop_id
            ? (() => {
                const crop = crops.find((c) => c.crop_id === row.crop_id)
                return isArabic ? crop?.name_ar ?? row.crop_id : crop?.name_en ?? row.crop_id
              })()
            : row?.status === 'fallow'
              ? t('q.history.fallow')
              : t('q.history.unknown')
        return {
          label: `${year - 1}–${year} · ${label}`,
          image: row?.status === 'planted' && row.crop_id && cropHasOwnImage(row.crop_id) ? asset?.image ?? null : null,
          cropId: row?.status === 'planted' ? row.crop_id : null,
          group: asset?.group ?? 'other',
          accent: asset?.accent ?? '#A3E635',
          bgLight: asset?.bgLight ?? '#12281E',
        }
      }),
    [answers.crop_history, years, crops, isArabic, t],
  )

  const stepTitles = [
    {
      title: (
        <>
          {isArabic ? 'كيف تُسقى أرضك؟' : (
            <>
              How is your field <span className="text-[#A3E635]">watered</span>?
            </>
          )}
        </>
      ),
      subtitle: isArabic ? 'اختر الخيار الذي يصف ظروفك الزراعية.' : 'Choose the option that best describes your farming conditions.',
    },
    {
      title: (
        <>
          {isArabic ? (
            <>ماذا <span className="text-[#A3E635]">زرعت</span> في هذا الحقل؟</>
          ) : (
            <>
              What did you <span className="text-[#A3E635]">grow</span> on this field?
            </>
          )}
        </>
      ),
      subtitle: isArabic ? 'أضف المحاصيل الرئيسية لآخر ٣ سنوات.' : 'Add the main crops for the last 3 years.',
    },
    {
      title: (
        <>
          {isArabic ? (
            <>لماذا <span className="text-[#A3E635]">تزرع</span> في هذا الحقل؟</>
          ) : (
            <>
              Why do you <span className="text-[#A3E635]">grow</span> crops on this field?
            </>
          )}
        </>
      ),
      subtitle: isArabic ? 'يمكنك اختيار أكثر من هدف.' : 'You can select more than one purpose.',
    },
    {
      title: (
        <>
          {isArabic ? (
            <>هل هناك محاصيل تريد <span className="text-[#A3E635]">تجنبها</span>؟</>
          ) : (
            <>
              Are there any crops you want to <span className="text-[#A3E635]">avoid</span>?
            </>
          )}
        </>
      ),
      subtitle: isArabic ? 'حدد المحاصيل التي لا تريدها في توصياتك.' : 'Select the crops you prefer not to have in your recommendations.',
    },
    {
      title: (
        <>
          {isArabic ? (
            <>حدد <span className="text-[#A3E635]">أولوياتك</span></>
          ) : (
            <>
              Set your <span className="text-[#A3E635]">priorities</span>
            </>
          )}
        </>
      ),
      subtitle: isArabic ? 'عدّل التوازن بين العوامل الأربعة — المجموع يبقى ١٠٠٪.' : 'Adjust the balance between the four factors — the total always stays at 100%.',
    },
  ]

  return (
    <motion.div
      className="earth-observatory relative flex min-h-[100svh] flex-col overflow-x-hidden bg-[#04120D] lg:h-[100svh] lg:overflow-hidden"
      data-testid="farm-profile-page"
      initial={routeState.fieldTransition ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: routeState.fieldTransition ? 0.72 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* prepared cinematic agricultural backdrop, blended into the emerald scene */}
      <motion.div
        key={step === 4 ? 'bg-priorities' : 'bg-questionnaire'}
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: step === 3 ? 'none' : `url(${step === 4 ? bgPriorities : bgQuestionnaire})`,
          mixBlendMode: 'screen',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: step === 3 ? 0 : 0.34 }}
        transition={{ duration: 0.7 }}
        aria-hidden
      />
      {/* cinematic emerald atmosphere: gradients, glow fields, soft waves */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 78% 0%, rgba(26,90,58,0.55), transparent 55%), radial-gradient(90% 70% at 12% 8%, rgba(14,60,38,0.5), transparent 60%), linear-gradient(180deg, rgba(7,33,26,.78) 0%, rgba(4,18,13,.86) 55%, rgba(3,10,8,.9) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-32 top-24 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(143,230,39,0.14), transparent 65%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -start-32 bottom-0 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(34,158,101,0.18), transparent 65%)' }}
        aria-hidden
      />
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-45" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden>
        <path d="M0 160 C 240 110, 480 210, 760 160 S 1200 90, 1440 150 L 1440 220 L 0 220 Z" fill="url(#fp-wave-a)" />
        <path d="M0 190 C 300 150, 560 230, 900 185 S 1280 140, 1440 185 L 1440 220 L 0 220 Z" fill="url(#fp-wave-b)" opacity="0.7" />
        <defs>
          <linearGradient id="fp-wave-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0E3A28" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#123E2C" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="fp-wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1B5238" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0A2B1E" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>

      <FarmProfileProgress step={step} isArabic={isArabic} onStepClick={jumpTo} onLang={onLang} />
      <FarmProfileProgressSpacer />

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] gap-6 px-4 pb-4 pt-2 sm:px-7 lg:h-[calc(100svh-148px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:grid-rows-[minmax(0,1fr)]">
        {/* ---- LEFT: questionnaire */}
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#9BE870]">
                <span className="inline-block h-3.5 w-1 rounded bg-[#A3E635]" aria-hidden />
                {t('fp.step.kicker', { n: step + 1 })}
              </p>
              <h1 className={`${step === 4 ? 'mt-1 text-3xl sm:text-4xl' : 'mt-2 text-3xl sm:text-5xl'} font-display font-extrabold tracking-tight text-white`}>
                {stepTitles[step].title}
              </h1>
              <p className={`${step === 4 ? 'mt-1 text-sm sm:text-base' : 'mt-3 text-base sm:text-lg'} text-white/75`}>{stepTitles[step].subtitle}</p>

              <div className={`${step === 4 ? 'mt-2 farm-priorities-content' : 'mt-5 farm-scroll overflow-y-auto'} min-h-0 flex-1 pe-1.5`}>
                {step === 0 && <IrrigationStep answers={answers} set={set} isArabic={isArabic} t={t} />}
                {step === 1 && <HistoryStep answers={answers} set={set} years={years} crops={crops} isArabic={isArabic} t={t} />}
                {step === 2 && <PurposeStep answers={answers} set={set} isArabic={isArabic} t={t} />}
                {step === 3 && (
                  <ConstraintsStep
                    crops={constraintCrops}
                    totalCrops={crops.length}
                    banned={answers.banned_crops}
                    set={set}
                    isArabic={isArabic}
                    t={t}
                    showAllCrops={showAllCrops}
                    onToggleShowAll={() => setShowAllCrops(true)}
                  />
                )}
                {step === 4 && (
                  <PrioritiesStep
                    priorities={priorities}
                    setPriorities={setPriorities}
                    presets={presets}
                    activePresetId={activePreset?.id ?? null}
                    isArabic={isArabic}
                    t={t}
                    errorMessage={errorMessage}
                    submitting={submitting}
                    onStartAnalysis={startAnalysis}
                    onBack={goBack}
                  />
                )}
              </div>

              {step < 4 && (
                <div className="mt-5 flex shrink-0 items-center justify-between">
                  <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold text-white/85 transition-colors hover:border-white/50 hover:text-white">
                    <ArrowLeft className="rtl:rotate-180" size={16} />
                    {t('nav.back')}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#4CC22B] to-[#2B8F1D] px-8 py-3 text-sm font-extrabold text-white shadow-[0_8px_28px_rgba(76,194,43,0.4)] transition-transform hover:scale-[1.03]"
                  >
                    {step === 3 ? (isArabic ? 'الأولويات' : t('fp.progress.priorities')) : t('nav.next')}
                    <ArrowRight className="rtl:rotate-180" size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- RIGHT: persistent 3D parcel of the REAL field — unboxed,
             floating directly over the cinematic background */}
        <aside className="min-w-0 lg:h-full lg:min-h-0">
          <div className="lg:sticky lg:top-0 lg:h-full">
            <div
              className="relative h-[440px] lg:h-full"
              data-testid="parcel-3d-rail"
            >
              <FloatingFarmIllustration />
              <FarmSceneEffects
                step={STEP_KEYS[step]}
                irrigationType={answers.irrigation_type}
                historyCards={historyBadges}
                purposes={answers.purposes}
                excludedCount={answers.banned_crops.length}
                priorities={priorities}
              />
            </div>

          </div>
        </aside>
      </div>
    </motion.div>
  )
}


// ---- step components (left column) -----------------------------------------

function GroupIcon({ family, size = 40 }: { family: string; size?: number }) {
  const map: Record<string, typeof Wheat> = {
    cereal: Wheat, legume: Sprout, tuber: Carrot,
    vegetable: Salad, forage: Flower, oilseed: Flower2, other: Sprout,
  }
  const Icon = map[family] ?? Sprout
  return <Icon size={size} strokeWidth={1.5} />
}

interface StepCommon {
  isArabic: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}

function IrrigationStep({
  answers,
  set,
  isArabic,
  t,
}: StepCommon & {
  answers: ReturnType<typeof useWizard>['answers']
  set: (patch: Partial<ReturnType<typeof useWizard>['answers']>) => void
}) {
  const options = [
    { value: 'rainfed', label: t('q.irrigation.rainfed'), desc: isArabic ? '(أمطار فقط)' : '(Rain only)', icon: OPTION_ICON.rainfed },
    { value: 'irrigated', label: t('q.irrigation.irrigated'), desc: isArabic ? '(مع الري)' : '(With irrigation)', icon: OPTION_ICON.irrigated },
    { value: 'mixed', label: t('q.irrigation.mixed'), desc: isArabic ? '(أمطار + ري)' : '(Rain + irrigation)', icon: OPTION_ICON.mixed },
    { value: 'unknown', label: t('q.irrigation.unknown'), desc: isArabic ? '(غير متأكد)' : '(Unknown)', icon: OPTION_ICON.unknown },
  ] as const

  return (
    <div className="space-y-5" role="radiogroup" aria-label={t('q.irrigation.title')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = answers.irrigation_type === opt.value
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set({ irrigation_type: opt.value, irrigation_method: opt.value === 'rainfed' ? null : answers.irrigation_method })}
              className={`group relative flex items-center gap-4 rounded-2xl border p-5 text-start transition-all duration-200 ${
                selected
                  ? 'border-2 border-[#A3E635] bg-[#12281E]/90 shadow-[0_0_30px_rgba(143,230,39,0.18)]'
                  : 'border-white/15 bg-white/[0.04] hover:border-[#A3E635]/50 hover:bg-white/[0.07]'
              }`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-r border-white/15 pe-2 ${selected ? 'text-[#A3E635]' : 'text-white/70'}`}>
                <Icon size={26} />
              </span>
              <span className="h-10 w-px shrink-0 bg-white/15" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-white">{opt.label}</span>
                <span className="block text-xs text-white/60">{opt.desc}</span>
              </span>
              {selected && (
                <span className="absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#A3E635] text-[#17352D]">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {(answers.irrigation_type === 'irrigated' || answers.irrigation_type === 'mixed') && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">{t('q.method.title')}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {(['drip', 'sprinkler', 'surface', 'other', 'unknown'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={answers.irrigation_method === m}
                  onClick={() => set({ irrigation_method: m })}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    answers.irrigation_method === m ? 'border-[#A3E635] bg-[#A3E635] text-[#17352D]' : 'border-white/20 bg-white/5 text-white/70 hover:border-[#A3E635]/50'
                  }`}
                >
                  {t(`q.method.${m}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">{t('q.availability.title')}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(['regular', 'limited', 'unknown'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={answers.water_availability === v}
                  onClick={() => set({ water_availability: v })}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    answers.water_availability === v ? 'border-[#A3E635] bg-[#A3E635] text-[#17352D]' : 'border-white/20 bg-white/5 text-white/70 hover:border-[#A3E635]/50'
                  }`}
                >
                  {t(`q.availability.${v}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="water-volume" className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
              {t('q.volume.title')}
            </label>
            <input
              id="water-volume"
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#A3E635]"
              placeholder={t('q.volume.optional')}
              value={answers.water_volume_note ?? ''}
              onChange={(e) => set({ water_volume_note: e.target.value || null })}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

function HistoryStep({
  answers,
  set,
  years,
  crops,
  isArabic,
  t,
}: StepCommon & {
  answers: ReturnType<typeof useWizard>['answers']
  set: (patch: Partial<ReturnType<typeof useWizard>['answers']>) => void
  years: number[]
  crops: CropOut[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="crop-history-cards">
      {years.map((year) => {
        const rows = answers.crop_history.filter((r) => r.crop_year === year)
        const update = (idx: number, patch: Partial<CropHistoryRow>) => {
          const globalIdx = answers.crop_history.findIndex((r) => r === rows[idx])
          const copy = [...answers.crop_history]
          copy[globalIdx] = { ...copy[globalIdx], ...patch }
          set({ crop_history: copy })
        }
        const mainRow = rows[0]
        const asset = getCropAsset(mainRow?.status === 'planted' ? mainRow.crop_id : null)

        return (
          <div key={year} className="rounded-2xl border border-white/15 bg-white/[0.04]">
            <p className="border-b border-white/10 py-3 text-center font-mono text-base font-extrabold text-white">
              {year - 1}–{year}
            </p>
            <div className="space-y-3 p-3.5">
              <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[#0A241A]">
                {mainRow?.status === 'planted' && asset ? (
                  mainRow.crop_id && cropHasOwnImage(mainRow.crop_id) && asset.image ? (
                    <img src={asset.image} alt="" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: `linear-gradient(160deg, ${asset.bgLight} 0%, rgba(10,36,26,0.9) 130%)`, color: asset.accent }}
                    >
                      <GroupIcon family={asset.group} size={56} />
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl text-white/25">
                    {mainRow?.status === 'fallow' ? '⏸' : '?'}
                  </div>
                )}
              </div>

              {rows.map((row, idx) => (
                <div key={`${year}-${idx}`} className="flex items-center gap-2">
                  <CropCombobox
                    crops={crops}
                    status={row.status}
                    cropId={row.crop_id}
                    label={`${t('q.history.crop')} ${year - 1}–${year}`}
                    onChange={(selection: CropSelection) => update(idx, { status: selection.status, crop_id: selection.crop_id })}
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      aria-label={t('q.history.remove')}
                      className="rounded-full p-2 text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-400"
                      onClick={() => {
                        const globalIdx = answers.crop_history.findIndex((r) => r === row)
                        const copy = [...answers.crop_history]
                        copy.splice(globalIdx, 1)
                        set({ crop_history: copy })
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              {rows.length < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const globalIdx = answers.crop_history.findIndex((r) => r.crop_year === year)
                    const copy = [...answers.crop_history]
                    copy.splice(globalIdx, 0, {
                      crop_year: year,
                      season_label: null,
                      crop_id: crops[0]?.crop_id ?? 'bread_wheat',
                      status: 'planted',
                    })
                    set({ crop_history: copy })
                  }}
                  className="w-full rounded-xl border border-dashed border-white/25 py-1.5 text-[11px] font-bold text-white/60 transition-colors hover:border-[#A3E635]/60 hover:text-[#A3E635]"
                >
                  <Plus size={12} className="mr-1 inline" />
                  {t('q.history.addCrop')}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PurposeStep({
  answers,
  set,
  isArabic,
  t,
}: StepCommon & {
  answers: ReturnType<typeof useWizard>['answers']
  set: (patch: Partial<ReturnType<typeof useWizard>['answers']>) => void
}) {
  const options = [
    { value: 'sell', label: t('q.purposes.sell'), desc: isArabic ? '(للسوق)' : '(To market)', icon: Store },
    { value: 'livestock_feed', label: t('q.purposes.livestock_feed'), desc: isArabic ? '(للحيوانات)' : '(For animals)', icon: Beef },
    { value: 'household_food', label: t('q.purposes.household_food'), desc: isArabic ? '(للأسرة)' : '(For your household)', icon: Utensils },
    { value: 'soil_restoration', label: t('q.purposes.soil_restoration'), desc: isArabic ? '(تحسين صحة التربة)' : '(Improve soil health)', icon: Sprout },
  ] as const

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const active = answers.purposes.includes(opt.value)
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                set({
                  purposes: active ? answers.purposes.filter((p) => p !== opt.value) : [...answers.purposes, opt.value],
                })
              }
              className={`group relative flex items-center gap-4 rounded-2xl border p-5 text-start transition-all duration-200 ${
                active
                  ? 'border-2 border-[#A3E635] bg-[#12281E]/90 shadow-[0_0_30px_rgba(143,230,39,0.18)]'
                  : 'border-white/15 bg-white/[0.04] hover:border-[#A3E635]/50 hover:bg-white/[0.07]'
              }`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center border-e border-white/15 pe-2 ${active ? 'text-[#A3E635]' : 'text-white/70'}`}>
                <Icon size={26} />
              </span>
              <span className="h-10 w-px shrink-0 bg-white/15" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-white">{opt.label}</span>
                <span className="block text-xs text-white/60">{opt.desc}</span>
              </span>
              {active && (
                <span className="absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#A3E635] text-[#17352D]">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConstraintsStep({
  crops,
  totalCrops,
  banned,
  set,
  isArabic,
  t,
  showAllCrops,
  onToggleShowAll,
}: StepCommon & {
  crops: CropOut[]
  totalCrops: number
  banned: string[]
  set: (patch: Partial<ReturnType<typeof useWizard>['answers']>) => void
  showAllCrops: boolean
  onToggleShowAll: () => void
}) {
  return (
    <div className="farm-scroll grid max-h-[calc(100svh-430px)] grid-cols-3 gap-2 overflow-y-auto pb-1 pr-1 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" data-testid="constraint-cards">
      {crops.map((crop) => {
        const excluded = banned.includes(crop.crop_id)
        const asset = getCropAsset(crop.crop_id)
        const ownPhoto = cropHasOwnImage(crop.crop_id) && asset?.image
        const cropName = isArabic ? crop.name_ar : crop.name_en
        return (
          <button
            key={crop.crop_id}
            type="button"
            aria-pressed={excluded}
            onClick={() =>
              set({
                banned_crops: excluded ? banned.filter((x) => x !== crop.crop_id) : [...banned, crop.crop_id],
              })
            }
            className={`group relative overflow-hidden rounded-xl border p-1.5 pb-2 text-center transition-all duration-200 ${
              excluded
                ? 'border-2 border-[#F87171] bg-[#2A0F0C]/70 shadow-[0_0_22px_rgba(248,113,113,0.22)]'
                : 'border-white/15 bg-white/[0.04] hover:border-white/40'
            }`}
          >
            <span
              className={`absolute end-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                excluded ? 'border-[#F87171] bg-[#DC2626] text-white' : 'border-white/40 bg-white/10'
              }`}
            >
              {excluded && <X size={11} strokeWidth={3.5} />}
            </span>
            {ownPhoto ? (
              <img
                src={asset!.image}
                alt=""
                className={`h-16 w-full rounded-lg object-contain p-1 transition-all ${excluded ? 'opacity-55 saturate-50' : 'opacity-80 group-hover:opacity-100'}`}
              />
            ) : (
              <div
                className="flex h-16 w-full items-center justify-center rounded-lg"
                style={{ background: asset ? `linear-gradient(150deg, ${asset.bgLight}, rgba(10,36,26,0.9))` : '#0A241A', color: asset?.accent ?? 'rgba(255,255,255,0.4)' }}
              >
                <GroupIcon family={asset?.group ?? 'other'} size={30} />
              </div>
            )}
            {excluded && <div className="absolute inset-0 bg-[#DC2626]/15" aria-hidden />}
            <span className={`mt-1.5 block truncate text-xs font-bold ${excluded ? 'text-[#FCA5A5]' : 'text-white'}`}>
              <bdi>{cropName}</bdi>
            </span>
          </button>
        )
      })}

      {!showAllCrops && totalCrops > crops.length && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-white/[0.03] text-xs font-bold text-white/60 transition-colors hover:border-[#A3E635]/60 hover:text-[#A3E635]"
        >
          <span className="text-xl tracking-widest">•••</span>
          {isArabic ? 'مزيد من المحاصيل' : 'More crops'}
        </button>
      )}
      {showAllCrops && !isArabic && (
        <p className="col-span-full text-[11px] text-white/45">{`${banned.length} selected · ${t('q.constraints.none')}`}</p>
      )}
      {showAllCrops && isArabic && (
        <p className="col-span-full text-[11px] text-white/45">{`${banned.length} مختار · ${t('q.constraints.none')}`}</p>
      )}
      <div className="col-span-full flex items-center gap-2 text-[11px] text-white/45">
        <ShieldAlert size={13} className="shrink-0 text-amber" />
        <span>{isArabic ? 'المحاصيل المحددة تُستبعد من التوصيات.' : 'Selected crops are excluded from recommendations.'}</span>
      </div>
    </div>
  )
}

function PrioritiesStep({
  priorities,
  setPriorities,
  presets,
  activePresetId,
  isArabic,
  t,
  errorMessage,
  submitting,
  onStartAnalysis,
  onBack,
}: {
  priorities: Priorities
  setPriorities: (p: Priorities) => void
  presets: Array<{ id: string; name: string; subtitle: string; weights: Priorities }>
  activePresetId: string | null
  isArabic: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
  errorMessage: string | null
  submitting: boolean
  onStartAnalysis: () => void
  onBack: () => void
}) {
  const keys = ['water', 'soil', 'yield', 'risk'] as const
  const meta: Record<(typeof keys)[number], { label: string; desc: string; icon: typeof CloudRain; accent: string }> = {
    water: { label: isArabic ? 'كفاءة المياه' : 'Water Efficiency', desc: isArabic ? 'تفضيل المحاصيل ذات الاحتياجات المائية المنخفضة.' : 'Favor crops with lower water needs.', icon: Droplets, accent: '#3B8EA5' },
    soil: { label: isArabic ? 'صحة التربة' : 'Soil Health', desc: isArabic ? 'دعم صحة التربة وتنوعها.' : 'Support soil health and diversity.', icon: Sprout, accent: '#229E65' },
    yield: { label: isArabic ? 'المردود' : 'Yield Potential', desc: isArabic ? 'وزن أكبر للمردود المحتمل.' : 'Give more weight to potential yield.', icon: TrendingUp, accent: '#D9943B' },
    risk: { label: isArabic ? 'مخاطر المناخ' : 'Climate Risk', desc: isArabic ? 'تفضيل تحمل الصدمات الحرارية والمطرية.' : 'Favor resilience to heat and rainfall risks.', icon: ShieldAlert, accent: '#4E6E60' },
  }

  return (
    <div className="farm-priorities-step space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map((p) => {
          const selected = activePresetId === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPriorities(p.weights)}
              aria-pressed={selected}
              className={`relative rounded-xl border p-2 text-start transition-all duration-200 ${
                selected
                  ? 'border-2 border-[#A3E635] bg-[#12281E]/90 shadow-[0_0_26px_rgba(143,230,39,0.16)]'
                  : 'border-white/15 bg-white/[0.04] hover:border-[#A3E635]/50'
              }`}
            >
              <span className="block text-xs font-extrabold leading-tight text-white">{p.name}</span>
              <span className="mt-0.5 block text-[9px] leading-tight text-white/60">{p.subtitle}</span>
              {selected && (
                <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#A3E635] text-[#17352D]">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/45">{t('mixer.balanceNote')}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1 font-mono text-xs font-bold text-white" data-testid="mixer-total">
            {t('mixer.total')}: <b className="text-[#A3E635]">{totalOf(priorities)}</b> %
          </span>
        </div>
        <div className="flex h-5 w-full overflow-hidden rounded-full border border-white/15 bg-black/30 p-0.5" aria-hidden>
          {keys.map((k) => (
            <div key={k} className="h-full transition-all duration-300 first:rounded-s-full last:rounded-e-full" style={{ width: `${priorities[k]}%`, backgroundColor: meta[k].accent }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {keys.map((k) => {
          const m = meta[k]
          const Icon = m.icon
          return (
            <div
              key={k}
              className="rounded-xl border px-2.5 py-1.5 transition-all"
              style={{
                borderColor: `${m.accent}${priorities[k] >= 40 ? '66' : '2E'}`,
                backgroundColor: priorities[k] >= 40 ? `${m.accent}0D` : 'rgba(255,255,255,0.025)',
                boxShadow: priorities[k] >= 40 ? `0 0 18px ${m.accent}12` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5" style={{ color: m.accent }}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <label htmlFor={`slider-${k}`} className="block text-xs font-extrabold leading-tight text-white">
                      {m.label}
                    </label>
                    <p className="truncate text-[9px] leading-tight text-white/55">{m.desc}</p>
                  </div>
                </div>
                <span className="min-w-[2.9rem] rounded-md border border-white/15 bg-black/30 px-1.5 py-0.5 text-center font-mono text-xs font-extrabold text-white">
                  <bdi>{priorities[k]}</bdi>%
                </span>
              </div>
              <div className="mt-1">
                <input
                  id={`slider-${k}`}
                  data-testid={`slider-${k}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={priorities[k]}
                  aria-label={t('aria.slider', { label: m.label })}
                  aria-valuetext={`${priorities[k]} percent`}
                  onChange={(e) => setPriorities(rebalance(priorities, k, Number(e.target.value)))}
                  style={{ accentColor: m.accent }}
                  className="h-2 w-full cursor-pointer rounded-lg bg-white/15"
                />
              </div>
            </div>
          )
        })}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between border-t border-transparent bg-transparent px-1 pt-1.5 pb-0.5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2 text-[13px] font-bold text-white/85 transition-colors hover:border-white/50 hover:text-white">
          <ArrowLeft className="rtl:rotate-180" size={16} />
          {t('nav.back')}
        </button>
        <button
          type="button"
          onClick={onStartAnalysis}
          disabled={totalOf(priorities) !== 100 || submitting}
          className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-[#4CC22B] to-[#2B8F1D] px-8 py-2.5 text-[13px] font-extrabold text-white shadow-[0_8px_28px_rgba(76,194,43,0.4)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="start-analysis"
        >
          {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Sparkles size={16} />}
          {t('analysis.start')}
          <ArrowRight className="rtl:rotate-180" size={16} />
        </button>
      </div>
    </div>
  )
}
