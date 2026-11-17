import { useId, useState } from 'react'
import { ArrowRight, Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SlotOut } from '../../api/client'
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


export { RotationDetails } from './details/RotationDetails'
