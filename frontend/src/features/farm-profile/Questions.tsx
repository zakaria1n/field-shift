import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  CircleHelp,
  Plus,
  Trash2,
  Droplets,
  CloudRain,
  Shuffle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Wheat,
  ShieldAlert,
  Sprout,
  Store,
  Beef,
  Utensils,
  Leaf,
  Layers,
  Sparkles,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { api, type CropOut } from '../../api/client'
import { useWizard, type CropHistoryRow } from '../../state/wizard'
import { CropVisual } from '../../app/components/CropVisual'
import { getCropAsset } from '../../assets/crops/cropRegistry'
import { Parcel3DCard } from '../../app/components/Parcel3DCard'

type Step = 0 | 1 | 2 | 3
const TOTAL_QUESTIONS = 4

function nextYears(n: number): number[] {
  const y = new Date().getFullYear()
  return Array.from({ length: n }, (_, i) => y - n + i)
}

export default function Questions() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    answers,
    setAnswers,
    fieldId: wizardFieldId,
    setFieldId,
    field,
    setFarmProfileStep
  } = useWizard()
  const isArabic = i18n.language === 'ar'

  const [step, setStep] = useState<Step>(0)
  const [showExtractionBanner, setShowExtractionBanner] = useState<boolean>(true)

  const fieldId =
    (location.state as { fieldId?: string } | null)?.fieldId ||
    searchParams.get('field') ||
    wizardFieldId

  useEffect(() => {
    if (fieldId && fieldId !== wizardFieldId) {
      setFieldId(fieldId)
    }
  }, [fieldId, wizardFieldId, setFieldId])

  // Synchronize wizard stepper state with current Farm Profile step
  useEffect(() => {
    setFarmProfileStep(step + 1)
  }, [step, setFarmProfileStep])

  const { data: catalog } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.get<{ crops: CropOut[] }>('/api/v1/crops'),
    staleTime: 3600_000,
  })
  const crops = catalog?.crops ?? []

  const years = useMemo(() => nextYears(3), [])

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

  function goNext() {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
    } else {
      navigate(`/setup/priorities${fieldId ? `?field=${fieldId}` : ''}`, {
        state: fieldId ? { fieldId } : undefined,
      })
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => (s - 1) as Step)
    else navigate('/fields/new')
  }

  const irrigationCards = [
    {
      value: 'rainfed',
      label: t('q.irrigation.rainfed'),
      desc: isArabic ? 'تعتمد حصرياً على الأمطار الموسمية (Rain only)' : 'Dependent on seasonal rainfall alone (Rain only)',
      icon: CloudRain,
      color: 'text-sky',
    },
    {
      value: 'irrigated',
      label: t('q.irrigation.irrigated'),
      desc: isArabic ? 'نظام ري تكميلي متوفر بانتظام (With irrigation)' : 'Equipped with active irrigation infrastructure',
      icon: Droplets,
      color: 'text-leaf',
    },
    {
      value: 'mixed',
      label: t('q.irrigation.mixed'),
      desc: isArabic ? 'ري جزئي أو تكميلي حسب الحاجة (Partial irrigation)' : 'Partial or deficit supplemental watering',
      icon: Shuffle,
      color: 'text-forest',
    },
    {
      value: 'unknown',
      label: t('q.irrigation.unknown'),
      desc: isArabic ? 'استخدام التقدير الإقليمي الافتراضي (Satellite model)' : 'Use regional satellite baseline model',
      icon: HelpCircle,
      color: 'text-ink-light',
    },
  ] as const

  const purposeCards = [
    {
      value: 'sell',
      label: t('q.purposes.sell'),
      desc: isArabic ? 'تسويق المحصول والبيع التجاري (Commercial sale)' : 'Commercial sale and market revenue',
      icon: Store,
    },
    {
      value: 'livestock_feed',
      label: t('q.purposes.livestock_feed'),
      desc: isArabic ? 'تغذية الماشية والأعلاف الحيوانية (Livestock feed)' : 'Animal feed, silage, and forage pasture',
      icon: Beef,
    },
    {
      value: 'household_food',
      label: t('q.purposes.household_food'),
      desc: isArabic ? 'الاكتفاء الذاتي وغذاء الأسرة (Family consumption)' : 'Farm household sustenance and food security',
      icon: Utensils,
    },
    {
      value: 'soil_restoration',
      label: t('q.purposes.soil_restoration'),
      desc: isArabic ? 'تثبيت النيتروجين وتحسين خصوبة التربة (Soil restoration)' : 'Nitrogen fixation, cover crop & soil health',
      icon: Leaf,
    },
  ] as const

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Symbolic Extraction Transition Banner (00_Transition_Extract_Your_Field.png) */}
      <AnimatePresence>
        {showExtractionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl border border-leaf/30 bg-gradient-to-r from-[#071913] via-[#0A2018] to-[#0E2921] p-4 sm:p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-leaf/20 border border-leaf/40 text-leaf">
                <Sparkles size={20} />
              </span>
              <div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-white">
                  {isArabic ? 'أرضك، قصتك — استخراج بيانات الحقل' : 'Your land, your story — Field Extraction Active'}
                </h3>
                <p className="text-xs text-white/70">
                  {isArabic
                    ? 'يستخدم فيلد شيفت شكل حقلك الجيوديسي لبناء خطة زراعية مخصصة ومتوازنة.'
                    : 'FieldShift uses the exact field polygon you selected to build a personalized crop plan.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExtractionBanner(false)}
              className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors self-end sm:self-auto shrink-0 font-mono"
            >
              ✕ {isArabic ? 'إغلاق' : 'Dismiss'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Form Steps (Left) + Companion 3D Real Parcel (Right) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Interactive Form Step */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="kicker">{t('steps.questions')}</p>
                <span className="badge-glow text-[10px]">
                  {isArabic
                    ? `الملف الزراعي · الخطوة ${step + 1} من 5`
                    : `YOUR FARM PROFILE - STEP ${step + 1} OF 5`}
                </span>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'w-6 bg-leaf'
                        : i < step
                          ? 'w-3 bg-forest'
                          : 'w-2 bg-line'
                    }`}
                  />
                ))}
              </div>
            </div>

            <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {step === 0 && (isArabic ? 'كيف يتم ري أرضك؟' : 'How is your field watered?')}
              {step === 1 && (isArabic ? 'ماذا زرعت في هذا الحقل؟' : 'What did you grow on this field?')}
              {step === 2 && (isArabic ? 'لماذا تزرع في هذا الحقل؟' : 'Why do you grow crops on this field?')}
              {step === 3 && (isArabic ? 'هل هناك محاصيل تفضل تجنبها؟' : 'Are there any crops you want to avoid?')}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {step === 0 && (isArabic ? 'اختر الخيار الذي يصف ظروفك الزراعية بدقة.' : 'Choose the option that best describes your farming conditions.')}
              {step === 1 && (isArabic ? 'أدخل المحاصيل الرئيسية لآخر ٣ سنوات.' : 'Add the main crops for the last 3 agricultural years.')}
              {step === 2 && (isArabic ? 'يمكنك تحديد أكثر من هدف واحد لاستغلال الحقل.' : 'You can select more than one purpose for your harvest.')}
              {step === 3 && (isArabic ? 'حدد المحاصيل التي لا ترغب في تضمينها في التوصيات.' : 'Select crops you prefer not to have in your rotation candidates.')}
            </p>
          </div>

          {/* Form Content Card */}
          <div className="card p-6 sm:p-8 bg-white shadow-card-hover border border-line">
            <AnimatePresence mode="wait">
              {/* STEP 1: IRRIGATION (01_Irrigation.png) */}
              {step === 0 && (
                <motion.section
                  key="step-0"
                  initial={{ opacity: 0, x: isArabic ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isArabic ? 15 : -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {irrigationCards.map((opt) => {
                      const selected = answers.irrigation_type === opt.value
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            set({
                              irrigation_type: opt.value,
                              irrigation_method: opt.value === 'rainfed' ? null : answers.irrigation_method,
                            })
                          }
                          aria-pressed={selected}
                          className={`group relative flex items-start gap-3.5 rounded-2xl border p-4 text-start transition-all duration-200 ${
                            selected
                              ? 'border-2 border-leaf bg-leaf-soft/60 shadow-glow ring-2 ring-leaf/20 text-forest'
                              : 'border-line bg-white hover:border-leaf/40 hover:bg-cream/50 text-ink'
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              selected
                                ? 'bg-leaf text-white shadow-sm'
                                : 'bg-cream-warm text-ink-muted group-hover:bg-leaf-soft group-hover:text-leaf'
                            }`}
                          >
                            <Icon size={20} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-forest">{opt.label}</span>
                              {selected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf text-white">
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-ink-muted leading-snug">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Conditional Sub-options when Irrigated/Mixed */}
                  {(answers.irrigation_type === 'irrigated' || answers.irrigation_type === 'mixed') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 rounded-2xl bg-cream-warm/70 border border-line p-5 mt-4"
                    >
                      <div>
                        <p className="label text-xs uppercase tracking-wider font-mono text-ink-light">
                          {t('q.method.title')}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 mt-2">
                          {(['drip', 'sprinkler', 'surface', 'other', 'unknown'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => set({ irrigation_method: m })}
                              aria-pressed={answers.irrigation_method === m}
                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                answers.irrigation_method === m
                                  ? 'border-leaf bg-leaf text-white shadow-sm'
                                  : 'border-line bg-white text-ink-muted hover:border-leaf/40'
                              }`}
                            >
                              {t(`q.method.${m}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="label text-xs uppercase tracking-wider font-mono text-ink-light">
                          {t('q.availability.title')}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {(['regular', 'limited', 'unknown'] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => set({ water_availability: v })}
                              aria-pressed={answers.water_availability === v}
                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                answers.water_availability === v
                                  ? 'border-leaf bg-leaf text-white shadow-sm'
                                  : 'border-line bg-white text-ink-muted hover:border-leaf/40'
                              }`}
                            >
                              {t(`q.availability.${v}`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="label text-xs uppercase tracking-wider font-mono text-ink-light" htmlFor="water-volume">
                          {t('q.volume.title')}
                        </label>
                        <input
                          id="water-volume"
                          className="input mt-1 text-xs"
                          placeholder={t('q.volume.optional')}
                          value={answers.water_volume_note ?? ''}
                          onChange={(e) => set({ water_volume_note: e.target.value || null })}
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.section>
              )}

              {/* STEP 2: CROP HISTORY (02_Crop_History.png) */}
              {step === 1 && (
                <motion.section
                  key="step-1"
                  initial={{ opacity: 0, x: isArabic ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isArabic ? 15 : -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    {years.map((year) => {
                      const rows = answers.crop_history.filter((r) => r.crop_year === year)
                      const update = (idx: number, patch: Partial<CropHistoryRow>) => {
                        const globalIdx = answers.crop_history.findIndex((r) => r === rows[idx])
                        const copy = [...answers.crop_history]
                        copy[globalIdx] = { ...copy[globalIdx], ...patch }
                        set({ crop_history: copy })
                      }

                      return (
                        <div key={year} className="rounded-2xl border border-line bg-cream/40 p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-line/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-forest text-white font-mono text-xs font-bold">
                                {year.toString().slice(-2)}
                              </span>
                              <p className="text-sm font-extrabold text-forest">
                                {year - 1}–{year}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1"
                              onClick={() => {
                                const globalIdx = answers.crop_history.findIndex((r) => r.crop_year === year)
                                const copy = [...answers.crop_history]
                                const defaultCrop = crops[0]?.crop_id ?? 'bread_wheat'
                                copy.splice(globalIdx, 0, {
                                  crop_year: year,
                                  season_label: null,
                                  crop_id: defaultCrop,
                                  status: 'planted',
                                })
                                set({ crop_history: copy })
                              }}
                            >
                              <Plus size={12} /> {t('q.history.addCrop')}
                            </button>
                          </div>

                          <div className="space-y-2">
                            {rows.map((row, idx) => {
                              const cropAsset = getCropAsset(row.crop_id)
                              return (
                                <div
                                  key={`${year}-${idx}`}
                                  className="flex flex-wrap items-center gap-2.5 bg-white p-2.5 rounded-xl border border-line"
                                >
                                  {row.status === 'planted' && cropAsset && (
                                    <img
                                      src={cropAsset.image}
                                      alt=""
                                      className="h-8 w-8 rounded-lg object-contain bg-cream border border-line p-0.5"
                                    />
                                  )}

                                  <select
                                    aria-label={`${t('q.history.crop')} ${year}`}
                                    className="input max-w-[15rem] text-xs font-semibold"
                                    value={row.status === 'planted' ? row.crop_id ?? '' : row.status}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      if (v === 'fallow' || v === 'unknown') update(idx, { status: v, crop_id: null })
                                      else update(idx, { status: 'planted', crop_id: v })
                                    }}
                                  >
                                    <option value="unknown">{t('q.history.unknown')}</option>
                                    <option value="fallow">{t('q.history.fallow')}</option>
                                    <optgroup label={isArabic ? 'المحاصيل المعتمدة' : 'Cataloged Crops'}>
                                      {crops.map((c) => (
                                        <option key={c.crop_id} value={c.crop_id}>
                                          {isArabic ? c.name_ar : c.name_en}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>

                                  <input
                                    aria-label={`${t('q.history.season')} ${year}`}
                                    className="input max-w-[9rem] text-xs"
                                    placeholder={t('q.history.season')}
                                    value={row.season_label ?? ''}
                                    onChange={(e) => update(idx, { season_label: e.target.value || null })}
                                  />

                                  {rows.length > 1 && (
                                    <button
                                      type="button"
                                      aria-label={t('q.history.remove')}
                                      className="rounded-full p-2 text-ink-light hover:bg-red-50 hover:text-red-600 transition-colors ms-auto"
                                      onClick={() => {
                                        const globalIdx = answers.crop_history.findIndex((r) => r === row)
                                        const copy = [...answers.crop_history]
                                        copy.splice(globalIdx, 1)
                                        set({ crop_history: copy })
                                      }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.section>
              )}

              {/* STEP 3: PURPOSES (03_Purposes.png) */}
              {step === 2 && (
                <motion.section
                  key="step-2"
                  initial={{ opacity: 0, x: isArabic ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isArabic ? 15 : -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {purposeCards.map((opt) => {
                      const active = answers.purposes.includes(opt.value as any)
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            set({
                              purposes: active
                                ? answers.purposes.filter((p) => p !== opt.value)
                                : [...answers.purposes, opt.value as any],
                            })
                          }
                          aria-pressed={active}
                          className={`group flex items-start gap-3.5 rounded-2xl border p-4 text-start transition-all duration-200 ${
                            active
                              ? 'border-2 border-leaf bg-leaf-soft/60 shadow-glow ring-2 ring-leaf/20 text-forest'
                              : 'border-line bg-white hover:border-leaf/40 hover:bg-cream/50 text-ink'
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              active
                                ? 'bg-leaf text-white shadow-sm'
                                : 'bg-cream-warm text-ink-muted group-hover:bg-leaf-soft group-hover:text-leaf'
                            }`}
                          >
                            <Icon size={20} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-forest">{opt.label}</span>
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                  active ? 'bg-leaf border-leaf text-white' : 'border-line bg-white'
                                }`}
                              >
                                {active && <Check size={12} strokeWidth={3} />}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-ink-muted leading-snug">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-xl bg-amber-soft border border-amber/30 p-3 text-xs text-amber-dark flex items-start gap-2">
                    <CircleHelp size={15} className="mt-0.5 shrink-0" />
                    <span>{t('q.purposes.marketNote')}</span>
                  </div>
                </motion.section>
              )}

              {/* STEP 4: CONSTRAINTS & BANNED CROPS (04_Constraints.png) */}
              {step === 3 && (
                <motion.section
                  key="step-3"
                  initial={{ opacity: 0, x: isArabic ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isArabic ? 15 : -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1">
                    {crops.map((c) => {
                      const active = answers.banned_crops.includes(c.crop_id)
                      const meta = getCropAsset(c.crop_id)
                      return (
                        <button
                          key={c.crop_id}
                          type="button"
                          onClick={() =>
                            set({
                              banned_crops: active
                                ? answers.banned_crops.filter((x) => x !== c.crop_id)
                                : [...answers.banned_crops, c.crop_id],
                            })
                          }
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                            active
                              ? 'border-red-400 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-300'
                              : 'border-line bg-white text-ink-muted hover:border-leaf/40 hover:text-forest'
                          }`}
                        >
                          {meta?.image && (
                            <img src={meta.image} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                          )}
                          <bdi>{isArabic ? c.name_ar : c.name_en}</bdi>
                          {active && <span className="ms-1 text-red-600 font-extrabold">✕</span>}
                        </button>
                      )
                    })}
                  </div>

                  <p className="text-xs text-ink-light italic">{t('q.constraints.none')}</p>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Buttons Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2 px-6"
              onClick={goBack}
            >
              <ArrowLeft className="rtl:rotate-180" size={16} />
              <span>{t('nav.back')}</span>
            </button>

            <button
              type="button"
              className="btn-leaf flex items-center gap-2 px-8 py-3 text-sm shadow-md"
              onClick={goNext}
            >
              <span>{step === 3 ? (isArabic ? 'المتابعة نحو الأولويات' : 'Set Your Priorities') : t('nav.next')}</span>
              <ArrowRight className="rtl:rotate-180" size={16} />
            </button>
          </div>
        </div>

        {/* Right Column: Extruded 3D Real Parcel Representation (Preserving User Geometry) */}
        <aside className="lg:col-span-4 sticky top-28 space-y-4">
          <Parcel3DCard
            geometry={field?.geometry}
            fieldName={field?.name}
            areaHa={field?.area_ha}
          />

          <div className="card p-4 bg-white/95 border border-line text-xs space-y-2">
            <div className="flex items-center gap-2 text-forest font-bold">
              <Info size={14} className="text-leaf" />
              <span>{isArabic ? 'استمرارية التحليل الميداني' : 'Field Continuity'}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              {isArabic
                ? 'يبقى هذا التمثيل المجسم وفياً للشكل الحقيقي لمضلع أرضك طوال مراحل الملف الزراعي.'
                : 'This elevated parcel accurately preserves your true polygon boundary across all 5 profile steps.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
