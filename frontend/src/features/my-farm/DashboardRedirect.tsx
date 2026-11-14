import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { api, type DashboardItem } from '../../api/client'

/** Nav shortcut: /plan and /insights jump to the first field with content. */
export default function DashboardRedirect({ target }: { target: 'plans' | 'insights' | 'timeline' }) {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  useEffect(() => {
    if (data === undefined) return
    const first = data[0]
    if (first) navigate(`/fields/${first.field_id}/${target}`, { replace: true })
    else navigate('/home', { replace: true })
  }, [data, navigate, target])

  return null
}
