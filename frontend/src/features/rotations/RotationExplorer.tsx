import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Leaf } from 'lucide-react'
import { api, type RotationListOut } from '../../api/client'
import LanguageSwitch from '../../app/components/LanguageSwitch'
import { RotationImageComposition } from './RotationImageComposition'
import { LandscapeAtmosphere } from './LandscapeAtmosphere'
import { RotationDetails, YearSequence } from './RotationSceneParts'
import './rotation-cinematic.css'

export default function RotationExplorer() {
  const { fieldId } = useParams()
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const reduced = useReducedMotion()
  const [approaching, setApproaching] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [hasDeparted, setHasDeparted] = useState(false)
  const [isWiping, setIsWiping] = useState(false)
  const [pageHidden, setPageHidden] = useState(() => document.hidden)
  useEffect(() => { const update = () => setPageHidden(document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update) }, [])
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current) }, [])
  useEffect(() => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    transitionTimer.current = null
    setApproaching(null)
  }, [location.key])
  const { data, isLoading, error } = useQuery({ queryKey: ['rotations', fieldId], queryFn: () => api.get<RotationListOut>(`/api/v1/fields/${fieldId}/rotations`), enabled: Boolean(fieldId) })
  const plans = data?.rotations ?? []
  // The center is a visual position, not a new rank or a fabricated recommendation.
  const recommended = plans.find(plan => plan.is_recommended)
  const alternatives = plans.filter(plan => plan !== recommended)
  const positionedPlans = recommended
    ? [alternatives[0] ?? null, recommended, alternatives[1] ?? null]
    : [plans[0] ?? null, plans[1] ?? null, plans[2] ?? null]
  const selectedIndex = positionedPlans.findIndex(p => p?.plan_id === params.get('plan'))
  const selected = selectedIndex < 0 ? null : positionedPlans[selectedIndex]
  const lastSelected = useRef<number | null>(null)
  const previousSelected = useRef(selectedIndex)
  if (selected) lastSelected.current = selectedIndex
  useLayoutEffect(() => {
    if (previousSelected.current !== selectedIndex) {
      if (!reduced) setIsWiping(true)
      if (previousSelected.current >= 0) setHasDeparted(true)
      previousSelected.current = selectedIndex
    }
  }, [selectedIndex, reduced])
  const focusIndex = selected ? selectedIndex : approaching ?? (isWiping ? lastSelected.current : hovered ?? (recommended ? 1 : plans.length > 1 ? 1 : plans.length ? 0 : null))
  const rotationLabel = (label: string) => {
    const letter = label.match(/(?:plan|rotation)\s+([a-z])$/i)?.[1]
    return letter ? (ar ? `الدورة ${letter.toUpperCase()}` : `Rotation ${letter.toUpperCase()}`) : label
  }
  const select = (id: string | null) => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    setApproaching(null)
    if (!reduced) setIsWiping(true)
    const next = new URLSearchParams(params)
    if (id) next.set('plan', id); else next.delete('plan')
    setParams(next)
  }
  const approach = (index: number, id: string) => {
    if (transitionTimer.current) return
    setHasDeparted(true)
    if (reduced) { select(id); return }
    setHovered(null)
    setApproaching(index)
    transitionTimer.current = setTimeout(() => { transitionTimer.current = null; select(id) }, 700)
  }
  return <main className={`re-page ${pageHidden ? 're-page--hidden' : ''} ${isWiping ? 're-page--wiping' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
    <div className="re-scene" aria-hidden="true">
      <RotationImageComposition selected={selected ? selectedIndex : null} emphasis={focusIndex} reduced={Boolean(reduced)} onMotionState={setIsWiping} />
      <LandscapeAtmosphere />
      <div className="re-shade" />
    </div>
    <header className="re-header"><div className="re-brand"><Leaf size={25}/><strong>Field<span>Shift</span></strong><i /> <b>{ar ? 'مستكشف الدورات' : 'Rotation Explorer'}</b></div><LanguageSwitch variant="dark"/></header>
    <AnimatePresence>{selected && !reduced && <motion.div key={`focus-${selected.plan_id}`} className="re-transition-content" aria-hidden="true" initial={{ opacity:0, scale:.94 }} animate={{ opacity:[0,1,1,0], scale:[.94,1,1.03,1.05] }} exit={{ opacity:0 }} transition={{ duration:1.9, times:[0,.22,.67,1], ease:'easeInOut' }}>
      {selected.is_recommended && <span className="re-badge">✓ {t('plans.recommended')}</span>}
      <h2><Leaf size={25}/> {rotationLabel(selected.label)}</h2>
      <YearSequence slots={selected.slots}/><p className="re-score">{t('plans.overallScore')}: {selected.score.total == null ? '—' : `${selected.score.total.toFixed(1)}/100`}</p>
    </motion.div>}</AnimatePresence>
    {isLoading ? <div className="re-message">{t('common.loading')}</div> : error || !data ? <div className="re-message" role="alert">{t('error.generic')}</div> : <AnimatePresence mode="wait" initial={false}>
      {selected ? <motion.section key={selected.plan_id} className="re-content" initial={{opacity:0,y:reduced ? 0 : 12}} animate={{opacity:isWiping ? 0 : 1,y:isWiping && !reduced ? 12 : 0}} exit={{opacity:0, transition:{duration:reduced ? 0 : .3}}} transition={{duration:reduced ? 0 : .45}}><RotationDetails plan={selected} back={() => select(null)}/></motion.section> :
      <motion.section key="overview" className={`re-content re-overview ${hasDeparted && !isWiping ? 're-overview--returned' : ''}`} initial={{opacity:0}} animate={{opacity:isWiping ? 0 : 1}} aria-hidden={isWiping} style={{pointerEvents:isWiping ? 'none' : undefined}} exit={{opacity:0}} transition={{duration:reduced ? 0 : .4}}>
        <div className="re-overview-heading"><div className="re-kicker">{ar ? 'مستكشف الدورات' : 'Rotation Explorer'}</div><h1>{ar ? <>حقل واحد. <span>ثلاثة مسارات ممكنة.</span></> : <>One field. <span>Three possible futures.</span></>}</h1></div>
        {data.insufficient_data_note && <p className="re-notice">{data.insufficient_data_note}</p>}
        {data.current_practice_note && <p className="re-notice">{data.current_practice_note}</p>}
        {plans.length === 0 ? <p className="re-notice">{ar ? 'لا توجد دورات متاحة لهذا الحقل.' : 'No rotations are available for this field.'}</p> : <div className="re-plans">{positionedPlans.map((plan,index) => plan ? <article key={plan.plan_id} className={`re-plan ${approaching !== null && approaching !== index ? 're-plan--muted' : ''} ${approaching === index ? 're-plan--selected' : ''}`} data-plan-id={plan.plan_id} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(null) }}>
          <div className="re-badge-space">{plan.is_recommended && <span className="re-badge">✓ {t('plans.recommended')}</span>}</div><h2><Leaf size={25}/> {rotationLabel(plan.label)}</h2>
          <YearSequence slots={plan.slots}/><p className="re-score">{t('plans.overallScore')}: {plan.score.total == null ? '—' : `${plan.score.total.toFixed(1)}/100`}</p>
          <button className="re-button" disabled={approaching !== null || isWiping} onClick={() => approach(index, plan.plan_id)}>{t('plans.viewDetails')} <ArrowRight size={17}/></button>
        </article> : <div key={`empty-${index}`} aria-hidden="true" />)}</div>}
        <p className="re-art-note">{ar ? 'المشهد توضيحي؛ تعتمد المحاصيل على نتائج التحليل.' : 'Landscape is illustrative; crop sequences come from your analysis.'}</p>
      </motion.section>}
    </AnimatePresence>}
  </main>
}
