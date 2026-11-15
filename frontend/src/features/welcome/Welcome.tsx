import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MapPin,
  Satellite,
  ShieldCheck,
  Sparkles,
  Layers,
  SlidersHorizontal,
  CloudRain,
  ChevronRight,
  Droplets,
  Sprout,
  CheckCircle2,
  Calendar,
  Compass,
  Store,
  Beef,
  Utensils,
  Leaf,
  Info,
  Clock,
  Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'

import { api, type DashboardItem } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { CropVisual } from '../../app/components/CropVisual'
import { FieldPolygonThumbnail } from '../../app/components/FieldPolygonThumbnail'

interface DemoPreset {
  name: string
  nameAr: string
  area: number
  lat: number
  lon: number
  geometry: { type: string; coordinates: number[][][] }
  temp: number
  precipMm: number
  precipDaily: number
  ph: number
  soilType: string
  soilTypeAr: string
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    name: 'Meknès Valley, Morocco',
    nameAr: 'سهل مكناس، المغرب',
    area: 1.15,
    lat: 33.8938,
    lon: -5.5473,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-5.549, 33.892],
          [-5.545, 33.893],
          [-5.546, 33.896],
          [-5.550, 33.895],
          [-5.549, 33.892],
        ],
      ],
    },
    temp: 20.1,
    precipMm: 609,
    precipDaily: 1.67,
    ph: 7.8,
    soilType: 'Clay Loam',
    soilTypeAr: 'طمي طيني',
  },
  {
    name: 'Gharb Basin, Morocco',
    nameAr: 'حوض الغرب، المغرب',
    area: 2.40,
    lat: 34.251,
    lon: -6.012,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-6.015, 34.249],
          [-6.009, 34.250],
          [-6.010, 34.254],
          [-6.016, 34.253],
          [-6.015, 34.249],
        ],
      ],
    },
    temp: 19.4,
    precipMm: 545,
    precipDaily: 1.49,
    ph: 7.2,
    soilType: 'Silky Clay',
    soilTypeAr: 'طيني غريني',
  },
  {
    name: 'Taroudant (Souss), Morocco',
    nameAr: 'تارودانت (سوس)، المغرب',
    area: 1.85,
    lat: 30.471,
    lon: -8.874,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-8.878, 30.468],
          [-8.871, 30.470],
          [-8.872, 30.474],
          [-8.879, 30.473],
          [-8.878, 30.468],
        ],
      ],
    },
    temp: 21.8,
    precipMm: 220,
    precipDaily: 0.60,
    ph: 8.0,
    soilType: 'Sandy Loam',
    soilTypeAr: 'طمي رملي',
  },
]

export default function Welcome() {
  const { t, i18n } = useTranslation()
  const { resetWizard } = useWizard()
  const isArabic = i18n.language === 'ar'

  // Returning visitor check
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasFarm = (dashboard?.length ?? 0) > 0
  const savedFarm = dashboard?.[0]

  // Animated field outline completion state
  const [outlineDrawn, setOutlineDrawn] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setOutlineDrawn(true), 2400)
    return () => clearTimeout(timer)
  }, [])

  // Interactive Demo State
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1)
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset>(DEMO_PRESETS[0])
  const [customizedCrop, setCustomizedCrop] = useState<string>('potato')

  const rotationSequence = [
    { crop_id: 'bread_wheat', year_number: 1, name_en: 'Bread wheat', name_ar: 'قمح طري' },
    { crop_id: 'chickpea', year_number: 2, name_en: 'Chickpea', name_ar: 'حمص' },
    {
      crop_id: customizedCrop,
      year_number: 3,
      name_en: customizedCrop === 'potato' ? 'Potato' : customizedCrop === 'lentil' ? 'Lentil' : 'Sunflower',
      name_ar: customizedCrop === 'potato' ? 'بطاطس' : customizedCrop === 'lentil' ? 'عدس' : 'دوار الشمس',
    },
  ]

  return (
    <div className="space-y-24 pb-20">
      {/* Returning Farmer Notification Ribbon */}
      {hasFarm && savedFarm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-leaf/40 bg-leaf/10 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-leaf animate-pulse" />
            <div>
              <p className="text-xs font-bold text-forest">
                {isArabic ? 'لديك حقل محفوظ في هذا المتصفح:' : 'You have an active farm saved in this browser:'}{' '}
                <span className="font-extrabold text-forest underline"><bdi>{savedFarm.field_name || 'My field'}</bdi></span>
                {savedFarm.area_ha != null && ` (${savedFarm.area_ha.toFixed(1)} ${isArabic ? 'هكتار' : 'ha'})`}
              </p>
            </div>
          </div>
          <Link
            to="/home"
            className="btn-primary !py-1.5 !px-4 text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{t('welcome.reprise')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </Link>
        </motion.div>
      )}

      {/* =========================================================================
          1. HERO SCENE: YOUR FIELD, UNDERSTOOD PRECISELY (01_Hero_Parcel_Outline.png)
         ========================================================================= */}
      <section className="grid gap-8 lg:grid-cols-12 items-center pt-2">
        {/* Left Column: Vision, Value Proposition & Primary CTA */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scientific Provenance Kicker */}
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-3.5 py-1 text-xs font-semibold text-forest shadow-xs">
            <Satellite size={14} className="text-leaf" />
            <span>Earth Observation × Agricultural Intelligence · NASA Space Apps</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.12] text-forest tracking-tight">
            <span>{t('welcome.tagline')}</span>
            <span className="block text-xl sm:text-2xl font-semibold text-leaf mt-2">
              {t('welcome.heading')}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-ink/75 leading-relaxed max-w-xl">
            {t('welcome.body')}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              to="/fields/new"
              onClick={() => resetWizard()}
              className="btn-leaf text-sm sm:text-base px-7 py-3.5 shadow-lg group inline-flex items-center gap-2"
            >
              <span>{t('welcome.ctaPrimary')}</span>
              <span className="sr-only"> ({t('welcome.cta')})</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={17} />
            </Link>

            <a
              href="#storytelling"
              className="btn-secondary text-sm sm:text-base px-6 py-3.5 inline-flex items-center gap-2"
            >
              <span>{t('welcome.ctaSecondary')}</span>
              <ChevronRight size={16} className="rtl:rotate-180" />
            </a>
          </div>

          {/* Privacy & Provenance Subtitle */}
          <div className="flex items-center gap-2 text-xs text-ink/60 pt-1">
            <ShieldCheck size={14} className="text-leaf shrink-0" />
            <span>{t('welcome.anonNote')}</span>
          </div>
        </div>

        {/* Right Column: Aerial Agricultural Scene with Progressive Field Outline Drawing */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl overflow-hidden border border-line bg-forest-dark shadow-2xl">
            <div className="relative h-72 sm:h-80 w-full overflow-hidden">
              <img
                src="/assets/hero_earth_fields.jpg"
                alt="Agricultural fields seen from aerial perspective"
                className="w-full h-full object-cover filter brightness-95 contrast-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 via-forest/20 to-transparent" />

              {/* PROGRESSIVE PARCEL DRAWING SVG OVERLAY:
                  At t=0 (first frame), the stroke is invisible.
                  It draws itself progressively around the agricultural field. */}
              <svg
                viewBox="0 0 400 300"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#229E65" floodOpacity="0.8" />
                  </filter>
                  <linearGradient id="hero-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#229E65" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Animated Boundary Polygon Path */}
                <path
                  d="M 75 180 L 190 70 L 330 115 L 305 245 L 140 265 Z"
                  fill="url(#hero-fill-grad)"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  filter="url(#hero-glow)"
                  className="animate-draw-polygon"
                />

                {/* Animated Corner Vertices (fade in once stroke reaches maturity) */}
                {[
                  [75, 180],
                  [190, 70],
                  [330, 115],
                  [305, 245],
                  [140, 265],
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="transition-opacity duration-700"
                    style={{ opacity: outlineDrawn ? 1 : 0 }}
                  />
                ))}
              </svg>

              {/* Cadastral Polygon Coordinate Badge */}
              <div className="absolute top-4 start-4 rounded-xl bg-forest-dark/85 backdrop-blur-md border border-white/20 px-3 py-1.5 shadow-md text-xs font-mono text-white">
                <span className="font-bold text-mint">33.89°N, 5.54°W</span>
                <span className="text-white/60 ms-2">Meknès Plateau</span>
              </div>

              {/* 3-Year Crop Succession Card Float */}
              <div className="absolute bottom-4 inset-x-4 rounded-2xl bg-white/95 backdrop-blur-md border border-line p-3 shadow-lg z-20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block mb-1.5">
                  {t('welcome.multiSeasonSuccession')}
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y1</span> <span className="font-normal text-ink/70">{isArabic ? 'قمح' : 'Wheat'}</span>
                  </div>
                  <span className="text-ink/30 text-xs font-bold" aria-hidden>→</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y2</span> <span className="font-normal text-ink/70">{isArabic ? 'حمص' : 'Chickpea'}</span>
                  </div>
                  <span className="text-ink/30 text-xs font-bold" aria-hidden>→</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y3</span> <span className="font-normal text-ink/70">{isArabic ? 'بطاطس' : 'Potato'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SCROLL STORYTELLING: 4 NARRATIVE SCENES (02_Scroll through 05_Scroll)
         ========================================================================= */}
      <section id="storytelling" className="space-y-16 pt-8 border-t border-line/60">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-0.5 text-xs font-semibold text-forest">
            <Sprout size={13} className="text-leaf" />
            <span>{isArabic ? 'القصة الزراعية الكاملة' : 'The FieldShift Journey'}</span>
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {isArabic ? 'كيف يتحول حقلك إلى استراتيجية زراعية' : 'From Your Land to a Smarter Harvest'}
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            {isArabic
              ? 'رحلة بصرية متصلة توضح كيف تجمع المنصة بين رصد الأرض وخبرتك الميدانية'
              : 'A continuous journey showing how satellite observations and farm priorities unite to create resilient crop plans.'}
          </p>
        </div>

        {/* --- SCENE 1: START WITH YOUR LAND (02_Scroll_Seed_Start.png) --- */}
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-white text-xs font-bold font-mono">
                1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-leaf font-mono">
                {isArabic ? 'الخطوة الأولى · تحديد الأرض' : 'Step 1 · Identify Your Land'}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {isArabic ? 'ابدأ بأرضك الحقيقية' : 'Start with your land.'}
            </h3>
            <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
              {isArabic
                ? 'يساعدك فيلد شيفت على تحديد الحقل ورسم حدوده الدقيقة بدقة جيوديسية، لضمان أن كل تحليل ومؤشر مبني على أرضك الفعلية.'
                : 'Field Shift helps you identify the field and define the exact area to analyze, so your insights are always based on the right land.'}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-line bg-white p-3.5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold text-forest uppercase tracking-wider block font-mono">
                  {isArabic ? 'الحدود الجيوديسية' : 'Cadastral Polygon'}
                </span>
                <p className="text-xs text-ink/65">
                  {isArabic ? 'رسم حر بمتجه GeoJSON على مسقط WGS84' : 'Freely draw polygon boundary across WGS84 ellipsoid'}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-3.5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold text-forest uppercase tracking-wider block font-mono">
                  {isArabic ? 'تحقق الغطاء الأرضي' : 'ESA WorldCover'}
                </span>
                <p className="text-xs text-ink/65">
                  {isArabic ? 'تأكيد فوري للتربة الأرضية واستبعاد المياه' : 'Live land verification rejecting water bodies'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border border-line bg-[#0E2921] shadow-xl group">
              <img
                src="/assets/seed_soil_stage.webp"
                alt="Seed in fertile dark agricultural soil"
                className="w-full h-72 sm:h-80 object-cover filter brightness-95 contrast-105 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E2921]/80 via-transparent to-black/20" />
              <div className="absolute bottom-4 start-4 end-4 rounded-2xl bg-white/90 backdrop-blur-md border border-line p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sprout size={15} className="text-leaf" />
                  <span className="font-bold text-forest">
                    {isArabic ? 'بذرة في التربة الخصبة' : 'Seed placed in fertile soil'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink/60">
                  {isArabic ? 'بداية الدورة' : 'Cycle Genesis'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- SCENE 2: UNDERSTAND YOUR CONDITIONS (03_Scroll_Plant_Conditions.png) --- */}
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf text-white text-xs font-bold font-mono">
                2
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-leaf font-mono">
                {isArabic ? 'الخطوة الثانية · رصد المناخ والتربة' : 'Step 2 · Earth Telemetry'}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {isArabic ? 'افهم ظروف أرضك بدقة' : 'Understand your conditions.'}
            </h3>
            <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
              {isArabic
                ? 'يستخدم فيلد شيفت بيانات رصد الأرض من ناسا ومعهد SoilGrids لاستخراج أنماط المناخ وخصائص التربة عبر عقود من القياسات الموثقة.'
                : 'Field Shift uses Earth observation and agricultural insight to understand the field — from weather and soil to what crops are best suited for your land.'}
            </p>

            {/* Telemetry Indicator Cards */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-2xl border border-sky/30 bg-sky/5 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span className="flex items-center gap-1.5 font-mono">
                    <CloudRain size={14} className="text-sky-700" /> Climate
                  </span>
                  <span className="font-mono text-forest">20.1°C</span>
                </div>
                <p className="text-[11px] text-ink/70">
                  {isArabic ? 'معدل درجات الحرارة وهطول الأمطار التراكمي' : 'Local weather patterns and growing conditions'}
                </p>
              </div>

              <div className="rounded-2xl border border-leaf/30 bg-leaf/5 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-forest">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Layers size={14} className="text-leaf" /> SoilGrids
                  </span>
                  <span className="font-mono text-leaf">pH 7.8</span>
                </div>
                <p className="text-[11px] text-ink/70">
                  {isArabic ? 'حموضة التربة، صنف النسيج ونسبة الطمي' : 'Clay Loam texture, depth carbon & drainage'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden border border-line bg-[#0E2921] shadow-xl group">
              <img
                src="/assets/plant_growth_stage.webp"
                alt="Growing healthy plant sprout in fertile soil"
                className="w-full h-72 sm:h-80 object-cover filter brightness-95 contrast-105 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E2921]/80 via-transparent to-black/20" />
              <div className="absolute bottom-4 start-4 end-4 rounded-2xl bg-white/90 backdrop-blur-md border border-line p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf size={15} className="text-leaf" />
                  <span className="font-bold text-forest">
                    {isArabic ? 'نبات ينمو بصحة وقوة' : 'Growing plant with root vitality'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-leaf font-bold">
                  NASA POWER × SoilGrids
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- SCENE 3: TELL US WHAT MATTERS (04_Scroll_Your_Priorities.png) --- */}
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-800 text-white text-xs font-bold font-mono">
                3
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 font-mono">
                {isArabic ? 'الخطوة الثالثة · أولويات الفلاح' : 'Step 3 · Your Priorities'}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {isArabic ? 'شاركنا ما يهمك أكثر' : 'Tell us what matters.'}
            </h3>
            <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
              {isArabic
                ? 'أنت تشارك سياقك الزراعي وأولوياتك — من أسلوب الري والمحاصيل السابقة إلى أهدافك الإنتاجية — ليقوم فيلد شيفت بتفصيل التوصيات لأرضك.'
                : 'You share your farming context and priorities, so Field Shift can tailor recommendations to your land.'}
            </p>
          </div>

          <div className="lg:col-span-6">
            {/* 4 Representative Priority Preference Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-white p-4 space-y-1 shadow-xs hover:border-forest/40 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky/15 text-sky-800 mb-1">
                  <Droplets size={17} />
                </div>
                <h4 className="font-extrabold text-xs text-forest">
                  {isArabic ? 'الري' : 'Irrigation'}
                </h4>
                <p className="text-[11px] text-ink/65 leading-snug">
                  {isArabic ? 'مطرية، مسقية، أو ري تكميلي' : 'How you water your fields'}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 space-y-1 shadow-xs hover:border-forest/40 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf/15 text-leaf mb-1">
                  <Sprout size={17} />
                </div>
                <h4 className="font-extrabold text-xs text-forest">
                  {isArabic ? 'المحاصيل السابقة' : 'Previous Crops'}
                </h4>
                <p className="text-[11px] text-ink/65 leading-snug">
                  {isArabic ? 'تاريخ ٣ سنوات من الزراعة' : 'What was grown before'}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 space-y-1 shadow-xs hover:border-forest/40 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-amber-900 mb-1">
                  <Store size={17} />
                </div>
                <h4 className="font-extrabold text-xs text-forest">
                  {isArabic ? 'أهداف الإنتاج' : 'Goals'}
                </h4>
                <p className="text-[11px] text-ink/65 leading-snug">
                  {isArabic ? 'تسويق، علف، أو غذاء الأسرة' : 'What you want to achieve'}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-4 space-y-1 shadow-xs hover:border-forest/40 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest/10 text-forest mb-1">
                  <SlidersHorizontal size={17} />
                </div>
                <h4 className="font-extrabold text-xs text-forest">
                  {isArabic ? 'الأولويات' : 'Priorities'}
                </h4>
                <p className="text-[11px] text-ink/65 leading-snug">
                  {isArabic ? 'توازن المياه والتربة والإنتاج' : 'What matters most right now'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- SCENE 4: EXPLORE YOUR NEXT ROTATION (05_Scroll_Rotation_Exploration.png) --- */}
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-white text-xs font-bold font-mono">
                4
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-forest font-mono">
                {isArabic ? 'الخطوة الرابعة · خطة الدورة الزراعية' : 'Step 4 · Rotation Strategies'}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {isArabic ? 'استكشف دورتك الزراعية المقبلة' : 'Explore your next rotation.'}
            </h3>
            <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
              {isArabic
                ? 'تم تحليل حقلك، واتضحت الظروف، وخيارات الدورات الزراعية جاهزة. استكشف، قارن، وخصص الخطة التي تناسب أرضك وأهدافك.'
                : 'Your field is analyzed, conditions are clear, and rotation options are ready. Explore, compare, and customize the plan that fits your land and goals.'}
            </p>
            <div className="pt-2">
              <Link
                to="/fields/new"
                onClick={() => resetWizard()}
                className="btn-leaf text-xs sm:text-sm px-6 py-3 inline-flex items-center gap-2 shadow-md"
              >
                <span>{t('welcome.ctaPrimary')}</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 lg:order-1">
            {/* 3-Year Rotation Strategy Card Representation */}
            <div className="card p-6 border border-line bg-white shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-leaf font-mono block">
                    {isArabic ? 'الدورة الزراعية الموصى بها' : 'Recommended 3-Year Plan'}
                  </span>
                  <h4 className="font-display text-base font-bold text-forest">
                    {isArabic ? 'استراتيجية تنويع واستعادة الخصوبة' : 'Fertility & Resilience Sequence'}
                  </h4>
                </div>
                <span className="badge-glow text-xs font-mono font-bold text-leaf-dark">
                  86 / 100
                </span>
              </div>

              {/* 3 Years Visual Strip */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-line bg-cream/50 p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-forest block">Year 1</span>
                  <span className="text-xl block">🌾</span>
                  <span className="text-xs font-bold text-forest block">{isArabic ? 'قمح طري' : 'Wheat'}</span>
                  <span className="text-[10px] text-ink/50 block">{isArabic ? 'بناء الخصوبة' : 'Build fertility'}</span>
                </div>

                <div className="rounded-xl border border-line bg-cream/50 p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-forest block">Year 2</span>
                  <span className="text-xl block">🫘</span>
                  <span className="text-xs font-bold text-forest block">{isArabic ? 'حمص' : 'Chickpea'}</span>
                  <span className="text-[10px] text-ink/50 block">{isArabic ? 'تثبيت النيتروجين' : 'Fix nitrogen'}</span>
                </div>

                <div className="rounded-xl border border-line bg-cream/50 p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-forest block">Year 3</span>
                  <span className="text-xl block">🥔</span>
                  <span className="text-xs font-bold text-forest block">{isArabic ? 'بطاطس' : 'Potato'}</span>
                  <span className="text-[10px] text-ink/50 block">{isArabic ? 'تحسين المردود' : 'High resilience'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. INTERACTIVE PRODUCT JOURNEY SANDBOX (Real Functional Verification)
         ========================================================================= */}
      <section className="space-y-6 pt-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-0.5 text-xs font-semibold text-forest">
            <Sparkles size={13} className="text-leaf" />
            <span>{isArabic ? 'العرض التفاعلي الحي' : 'Interactive Product Journey'}</span>
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {isArabic ? 'شاهد كيف يعمل فيلد شيفت' : 'Experience How Field Shift Works'}
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            {isArabic
              ? 'جرّب الخطوات الأربع الحقيقية لتحويل إحداثيات أرضك إلى خطة دورة زراعية مخصصة.'
              : 'Step through the four authentic stages: from boundary mapping and Earth telemetry to customized crop planning.'}
          </p>
        </div>

        {/* 4-Stage Interactive Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
          {[
            { num: 1, title: isArabic ? '١. حدد الحقل' : '1. Select Field', icon: MapPin },
            { num: 2, title: isArabic ? '٢. افهم الظروف' : '2. Earth Telemetry', icon: Satellite },
            { num: 3, title: isArabic ? '٣. استكشف الدورات' : '3. Rotations', icon: Layers },
            { num: 4, title: isArabic ? '٤. خصص خطتك' : '4. Customize Plan', icon: SlidersHorizontal },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setActiveStage(s.num as 1 | 2 | 3 | 4)}
              className={`rounded-2xl border p-3 text-start transition-all ${
                activeStage === s.num
                  ? 'border-forest bg-forest text-white shadow-md'
                  : 'border-line bg-white text-ink/70 hover:border-forest/40 hover:bg-cream/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <s.icon size={15} className={activeStage === s.num ? 'text-leaf' : 'text-forest/60'} />
                <span className="text-xs font-bold truncate">{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Interactive Canvas Box */}
        <div className="card overflow-hidden border border-line bg-white shadow-md max-w-4xl mx-auto p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* STAGE 1: SELECT A FIELD */}
            {activeStage === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الأولى: رسم وتحديد الحقل' : 'Stage 1: Field Cadastral Boundary'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic ? 'اختر موقعاً تجريبياً أو ارسم حدود حقلك' : 'Select a sample territory to view cadastral geodesic calculations:'}
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5">
                    {DEMO_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedPreset(p)}
                        className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                          selectedPreset.name === p.name
                            ? 'bg-forest text-white shadow-2xs'
                            : 'border border-line bg-cream/70 text-ink/70 hover:bg-white'
                        }`}
                      >
                        {isArabic ? p.nameAr : p.name.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-12 items-center">
                  <div className="sm:col-span-6 h-52">
                    <FieldPolygonThumbnail
                      geometry={selectedPreset.geometry}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="sm:col-span-6 space-y-3">
                    <div className="rounded-xl border border-line bg-cream/50 p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('welcome.location')}:</span>
                        <span className="font-bold text-forest">{isArabic ? selectedPreset.nameAr : selectedPreset.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('welcome.geodesicArea')}:</span>
                        <span className="font-mono font-bold text-forest">{selectedPreset.area} {t('common.hectare')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('home.centroid')}:</span>
                        <span className="font-mono text-ink/70">{selectedPreset.lat}°N, {selectedPreset.lon}°E</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStage(2)}
                      className="btn-leaf w-full !py-2.5 text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      <span>{isArabic ? 'انتقل لتحليل بيانات الأرض' : 'Inspect Earth Telemetry'}</span>
                      <ArrowRight size={13} className="rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STAGE 2: UNDERSTAND CONDITIONS */}
            {activeStage === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4">
                  <h3 className="font-display text-lg font-bold text-forest">
                    {isArabic ? 'الخطوة الثانية: استرداد بيانات الأرض العلمية' : 'Stage 2: Scientific Earth Observation Telemetry'}
                  </h3>
                  <p className="text-xs text-ink/60">
                    {isArabic
                      ? 'رصد مناخي وتربوي مباشر من NASA POWER و ISRIC SoilGrids 2020'
                      : 'Scientific multi-decade climatology and 250m soil chemistry layers for this coordinate:'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-sky/30 bg-sky/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                      <CloudRain size={16} className="text-sky-700" />
                      <span>NASA POWER Climatology (0.5° × 0.5°)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.annualMeanTemp')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.temp} °C</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.annualRainfall')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.precipMm} mm/yr</span>
                        <span className="text-[9px] font-mono text-ink/40 block">({selectedPreset.precipDaily} mm/day)</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-leaf/30 bg-leaf/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-forest font-bold text-xs">
                      <Layers size={16} className="text-leaf" />
                      <span>ISRIC SoilGrids 2020 (250m Resolution)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.soilPh')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.ph} pH</span>
                        <span className="text-[9px] text-leaf font-bold block">{t('welcome.optimal')}</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.texturalClass')}</span>
                        <span className="font-display text-sm font-extrabold text-forest truncate block">{isArabic ? selectedPreset.soilTypeAr : selectedPreset.soilType}</span>
                        <span className="text-[9px] text-ink/50 block">Clay 34% / Silt 33%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className="btn-leaf !py-2.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isArabic ? 'عرض استراتيجيات الدورات الزراعية' : 'Generate Rotation Strategies'}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 3: EXPLORE ROTATIONS */}
            {activeStage === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الثالثة: استكشاف الدورات الزراعية متعددة السنوات' : 'Stage 3: Multi-Year Rotation Strategy'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic ? 'خطة متوازنة بين كفاءة المياه، استعادة خصوبة التربة، واستدامة الإنتاج' : 'A balanced sequence designed for soil health, biological nitrogen fixation, and climate resilience:'}
                    </p>
                  </div>
                  <span className="rounded-full bg-leaf/15 text-forest border border-leaf/30 px-3 py-1 text-xs font-bold">
                    {t('welcome.agronomicFit')}: 86 / 100
                  </span>
                </div>

                {/* 3-Year Crop Strip */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {rotationSequence.map((slot, index) => (
                    <div
                      key={slot.year_number}
                      className="relative rounded-2xl border border-line bg-cream/50 p-4 flex flex-col items-center justify-between"
                    >
                      <span className="text-[10px] font-mono font-bold text-forest bg-forest/10 px-2 py-0.5 rounded self-start">
                        {t('timeline.year', { n: slot.year_number })}
                      </span>
                      <div className="my-1">
                        <CropVisual
                          slot={slot}
                          size="sm"
                          showBadge={false}
                          className="!bg-transparent !border-0 !shadow-none"
                        />
                      </div>
                      {index < rotationSequence.length - 1 && (
                        <div className="hidden sm:flex absolute -end-2.5 top-1/2 -translate-y-1/2 z-10 h-5 w-5 items-center justify-center rounded-full bg-white border border-line text-forest" aria-hidden>
                          <ArrowRight size={10} className="rtl:rotate-180" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Score Indicators preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.waterFit')}</span>
                    <span className="font-bold text-forest">84%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.soilHealth')}</span>
                    <span className="font-bold text-leaf">92%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.yieldBaseline')}</span>
                    <span className="font-bold text-amber-800">88%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.climateRisk')}</span>
                    <span className="font-bold text-forest">80%</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage(4)}
                    className="btn-leaf !py-2.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isArabic ? 'جرّب تعديل المحاصيل (تفاعلي)' : 'Try Customizing Crops'}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: CUSTOMIZE YOUR PLAN */}
            {activeStage === 4 && (
              <motion.div
                key="stage-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الرابعة: تخصيص واستبدال المحاصيل' : 'Stage 4: Customization & Replacement Verification'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic
                        ? 'انقر لاستبدال محصول السنة الثالثة بمحصول مؤهل علمياً ولاحظ إعادة الحساب التلقائية:'
                        : 'Click to replace Year 3 with an eligible crop and watch agronomic rules verify feasibility in real time:'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1 text-xs font-bold">
                    <CheckCircle2 size={13} />
                    {t('welcome.rulesPassed')}
                  </span>
                </div>

                {/* Candidate Selector buttons */}
                <div>
                  <span className="text-xs font-bold text-forest uppercase tracking-wider block mb-2">
                    {t('welcome.stage4.selectCandidate')}
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {[
                      { id: 'potato', name: t('welcome.stage4.potatoName'), note: t('welcome.stage4.potatoNote') },
                      { id: 'lentil', name: t('welcome.stage4.lentilName'), note: t('welcome.stage4.lentilNote') },
                      { id: 'sunflower', name: t('welcome.stage4.sunflowerName'), note: t('welcome.stage4.sunflowerNote') },
                    ].map((crop) => (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() => setCustomizedCrop(crop.id)}
                        className={`rounded-2xl border p-3 text-start transition-all ${
                          customizedCrop === crop.id
                            ? 'border-leaf bg-leaf/10 ring-2 ring-leaf text-forest'
                            : 'border-line bg-cream/40 hover:bg-white text-ink/70'
                        }`}
                      >
                        <span className="font-bold text-xs block text-forest">{crop.name}</span>
                        <span className="text-[11px] text-ink/50">{crop.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Updated Sequence display */}
                <div className="rounded-2xl border border-line bg-cream/40 p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-forest">{t('welcome.stage4.modifiedSequence')}</span>
                    <span className="font-mono text-leaf font-bold">{t('welcome.stage4.eligibleFeasible')}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-forest">
                      {t('welcome.stage4.year1')}
                    </div>
                    <span className="text-ink/30 font-bold" aria-hidden>→</span>
                    <div className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-forest">
                      {t('welcome.stage4.year2')}
                    </div>
                    <span className="text-ink/30 font-bold" aria-hidden>→</span>
                    <div className="rounded-xl border-2 border-leaf bg-white px-3 py-1.5 text-xs font-bold text-forest shadow-sm">
                      {t('welcome.stage4.year3Customized', {
                        crop: customizedCrop === 'potato'
                          ? (isArabic ? 'بطاطس' : 'Potato')
                          : customizedCrop === 'lentil'
                            ? (isArabic ? 'عدس' : 'Lentil')
                            : (isArabic ? 'دوار الشمس' : 'Sunflower'),
                      })}
                    </div>
                  </div>
                </div>

                {/* Final Call to Action inside Demo */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
                  <p className="text-xs text-ink/60">
                    {t('welcome.readyToRun')}
                  </p>
                  <Link
                    to="/fields/new"
                    onClick={() => resetWizard()}
                    className="btn-primary !py-2.5 text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>{t('welcome.cta')}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* =========================================================================
          4. SCIENTIFIC CREDIBILITY & PROVENANCE
         ========================================================================= */}
      <section className="rounded-3xl border border-line bg-cream/50 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/70 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block font-mono">
              {t('welcome.sources.openScience')}
            </span>
            <h3 className="font-display text-xl font-extrabold text-forest">
              {t('welcome.sources.title')}
            </h3>
          </div>
          <span className="text-xs font-mono text-ink/50">
            {t('welcome.sources.initiative')}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-sky-800">NASA POWER</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.climatology')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.climatologyDesc')}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-leaf">ISRIC SoilGrids 2020</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.soil')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.soilDesc')}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-amber-800">FAO GAEZ v5</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.gaez')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.gaezDesc')}
            </p>
          </div>
        </div>

        {/* Honest Transparency Callout */}
        <div className="border-t border-line/70 pt-4 text-xs text-ink/60 leading-relaxed space-y-1">
          <p className="font-semibold text-forest">
            {t('app.poweredBy')} · {t('app.noNasaEndorsement')}
          </p>
          <p>
            {t('disclaimer.body')}
          </p>
          <p className="text-[11px] text-ink/50">
            {t('disclaimer.soil')} · {t('disclaimer.yield')}
          </p>
        </div>
      </section>

      {/* =========================================================================
          5. CLOSING CTA BANNER (Guidance toward Earth Observatory)
         ========================================================================= */}
      <section className="text-center rounded-3xl bg-gradient-to-br from-[#081A15] via-[#0E2921] to-[#163E32] p-8 sm:p-12 text-white shadow-2xl space-y-4 border border-leaf/30">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {isArabic ? 'جاهز لاستكشاف الدورة الزراعية لأرضك؟' : 'Ready to Map Your Land?'}
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto leading-relaxed">
          {isArabic
            ? 'حدد أرضك على الخريطة في أقل من دقيقة وابدأ في مقارنة الاستراتيجيات الممكنة.'
            : 'Select your field on the interactive satellite map and discover evidence-backed rotation strategies in under two minutes.'}
        </p>
        <div className="pt-2">
          <Link
            to="/fields/new"
            onClick={() => resetWizard()}
            className="btn-leaf text-base px-8 py-3.5 shadow-lg inline-flex items-center gap-2"
          >
            <span>{t('welcome.ctaPrimary')}</span>
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  )
}
