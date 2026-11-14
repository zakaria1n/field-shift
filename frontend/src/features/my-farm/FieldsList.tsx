import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus } from 'lucide-react'

import { api, type DashboardItem } from '../../api/client'

export default function FieldsList() {
  const { t, i18n } = useTranslation()
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-forest">{t('nav.fields')}</h1>
      <ul className="mt-4 space-y-3">
        {(data ?? []).map((f) => (
          <li key={f.field_id}>
            <Link to={`/fields/${f.field_id}/plans`} className="card flex items-center gap-3 p-4 hover:bg-forest/5">
              <MapPin size={18} className="text-leaf" />
              <span className="font-bold text-forest"><bdi>{f.field_name}</bdi></span>
              <span className="text-xs text-ink/60"><bdi>{f.area_ha.toLocaleString(i18n.language)}</bdi> {t('common.hectare')}</span>
              {f.active_plan && <span className="ms-auto chip">{t('plans.manage.active')}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/fields/new" className="btn-leaf mt-4">
        <Plus size={15} /> {t('home.addField')}
      </Link>
    </div>
  )
}
