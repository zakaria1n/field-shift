import { Link } from 'react-router-dom'
import { useId, useState } from 'react'
import { ArrowRight, Droplets, Leaf, BarChart3, CloudSun, TriangleAlert, CalendarDays, Layers3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RotationOut, SlotOut } from '../../api/client'
import { getCropAsset } from '../../assets/crops/cropRegistry'

export function YearSequence({ slots, variant = 'overview' }: { slots: SlotOut[]; variant?: 'overview' | 'detail' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return <ol className={`re-years ${variant === 'detail' ? 're-years--detail' : ''}`}>{slots.map((slot, i) => {
    const asset = slot.crop_id ? getCropAsset(slot.crop_id) : null
    const name = (i18n.language === 'ar' ? slot.name_ar : slot.name_en) || slot.crop_id || t('plan.fallow')
    const content = <><span className="re-crop-icon">{asset?.image ? <img src={asset.image} alt="" /> : <Leaf size={25}/>}</span>
      <span className="re-year-label"><span>{t('timeline.year', { n: slot.year_number })}</span><strong>{name}</strong></span></>
    const canOpen = variant === 'detail' && Boolean(slot.planting_window)
    const panelId = `${id}-calendar-${i}`
    return <li key={slot.slot_id} className="re-year" data-crop-id={slot.crop_id ?? ''}>
      {canOpen ? <button type="button" className="re-year-content re-year-button" aria-expanded={open === slot.slot_id} aria-controls={panelId} onClick={() => setOpen(open === slot.slot_id ? null : slot.slot_id)}>{content}</button> : <div className="re-year-content">{content}</div>}
      {canOpen && <div className="re-calendar-popover" id={panelId} hidden={open !== slot.slot_id}><p>{t('insights.planting')}: {slot.planting_window!.planting_months.join('–')}</p><p>{t('insights.harvest')}: {slot.planting_window!.harvest_months.join('–')}</p></div>}
      {i < slots.length - 1 && <ArrowRight className="re-year-arrow" size={18} aria-hidden />}
    </li>
  })}</ol>
}

export function RotationMetrics({ plan }: { plan: RotationOut }) {
  const { i18n } = useTranslation()
  const icons = { water: Droplets, soil: Leaf, yield: BarChart3, risk: CloudSun }
  return <div className="re-metrics">{(['water', 'soil', 'yield', 'risk'] as const).map(key => {
    const ind = plan.score.indicators.find(item => item.key === key)
    if (!ind) return null
    const Icon = icons[key]
    const progress = ind.value == null ? 0 : Math.max(0, Math.min(100, ind.value * 100))
    return <div key={key}><span className={`re-metric-icon re-metric-${key} ${ind.value == null ? 're-metric-unavailable' : ''}`}>
      <svg className="re-gauge" viewBox="0 0 100 100" aria-hidden="true"><circle className="re-gauge-track" cx="50" cy="50" r="45" pathLength="100" />{ind.value != null && <circle className="re-gauge-value" cx="50" cy="50" r="45" pathLength="100" strokeDasharray={`${progress} 100`} />}</svg>
      <span><Icon size={26}/></span></span><strong>{i18n.language === 'ar' ? ind.label_ar : ind.label_en}</strong><span>{ind.value == null ? (i18n.language === 'ar' ? 'غير متوفر' : 'Unavailable') : `${Math.round(progress)}/100`}{ind.status === 'partial' ? ' · ' + (i18n.language === 'ar' ? 'جزئي' : 'Partial') : ''}</span></div>
  })}</div>
}

export function RotationDetails({ plan, back }: { plan: RotationOut; back: () => void }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const limitation = (ar ? plan.main_limitation_ar : plan.main_limitation_en) || plan.main_limitation_en
  return <div className="re-detail">
    <button className="re-back" onClick={back}>← {ar ? 'العودة إلى جميع الدورات' : 'Back to All Rotations'}</button>
    <header><div className="re-kicker">{plan.label} {plan.is_recommended && <span className="re-detail-recommended">✓ {t('plans.recommended')}</span>}</div><h1>{plan.label} — <span>{ar ? 'التفاصيل' : 'Details'}</span></h1><p>{t('plan.years', { n: plan.horizon_years })} · {t('plans.overallScore')}: {plan.score.total == null ? '—' : `${plan.score.total.toFixed(1)}/100`}</p><span className="re-detail-accent" aria-hidden="true" /></header>
    <YearSequence slots={plan.slots} variant="detail"/>
    <div className="re-detail-factors"><div className="re-rationale"><h2><Leaf size={21}/>{ar ? 'لماذا هذه الدورة؟' : 'Why this rotation?'}</h2><p>{ar ? plan.summary_ar : plan.summary_en}</p></div><RotationMetrics plan={plan}/></div>
    <div className="re-detail-notes">
      <div><strong><CalendarDays size={19}/> {ar ? 'الزراعة والحصاد' : 'Planting & harvest'}</strong>{plan.slots.some(s => s.planting_window) ? plan.slots.filter(s => s.planting_window).map(s => <p key={s.slot_id}>{ar ? s.name_ar : s.name_en}: {s.planting_window!.planting_months.join('–')} / {s.planting_window!.harvest_months.join('–')}</p>) : <p>{ar ? 'البيانات غير متوفرة' : 'Calendar unavailable'}</p>}</div>
      {limitation && <div><strong><TriangleAlert size={16}/> {ar ? 'أهم القيود' : 'Main limitation'}</strong><p>{limitation}</p></div>}
      {plan.evidence.missing_information.length > 0 && <div><strong>{t('status.missing')}</strong><p>{plan.evidence.missing_information.join(', ')}</p></div>}
    </div>
    <footer><Link className="re-text-link" to={`/rotations/${plan.plan_id}`}><Layers3 size={19}/> {ar ? 'شرح الحسابات والمصادر' : 'Full calculations & evidence'} →</Link><Link className="re-button re-use-button" to={`/rotations/${plan.plan_id}/confirmation`} state={{ adoptEdits: null }}>{t('plan.useThis')} <ArrowRight size={17}/></Link></footer>
  </div>
}
