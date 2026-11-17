import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'

import AppShell from './AppShell'
import WizardShell from './WizardShell'
import Welcome from '../features/welcome/Welcome'
import EarthObservatoryPage from '../features/earth-observatory/EarthObservatoryPage'

// The farm-profile page carries the WebGL parcel stack; load it on demand.
const FarmProfilePage = lazy(() => import('../features/farm-profile/FarmProfilePage'))

/** Old priorities route now lives inside the single 5-step profile page. */
function PrioritiesRedirect() {
  const [searchParams] = useSearchParams()
  const field = searchParams.get('field')
  const query = new URLSearchParams(field ? { field } : {})
  query.set('step', 'priorities')
  return <Navigate to={`/setup/questions?${query.toString()}`} replace />
}

function FarmProfileFallback() {
  return (
    <div className="earth-observatory flex min-h-[100svh] items-center justify-center bg-[#04120D]">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#A3E635]" />
    </div>
  )
}
import AnalysisProgress from '../features/analysis/AnalysisProgress'
import RotationExplorer from '../features/rotations/RotationExplorer'
import PlanDetails from '../features/rotations/PlanDetails'
import CustomizePlan from '../features/plan-editor/CustomizePlan'
import CompareChanges from '../features/comparison/CompareChanges'
import ConfirmPlan from '../features/rotations/ConfirmPlan'
import HomeDashboard from '../features/my-farm/HomeDashboard'
import FieldsList from '../features/my-farm/FieldsList'
import DashboardRedirect from '../features/my-farm/DashboardRedirect'
import RotationTimeline from '../features/my-farm/RotationTimeline'
import FieldInsights from '../features/my-farm/FieldInsights'
import PlanManagement from '../features/my-farm/PlanManagement'
import Settings from '../features/settings/Settings'

import { useQuery } from '@tanstack/react-query'
import { api, type DashboardItem } from '../api/client'

function RootRedirect() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
  })
  if (isLoading) return null
  const hasSavedPlan = Boolean(data?.some((f) => Boolean(f.active_plan)))
  if (hasSavedPlan) return <Navigate to="/home" replace />
  return <Navigate to="/welcome" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route element={<WizardShell />}>
        <Route path="/fields/new" element={<EarthObservatoryPage />} />
        <Route path="/setup/questions" element={<Suspense fallback={<FarmProfileFallback />}><FarmProfilePage /></Suspense>} />
        <Route path="/setup/priorities" element={<PrioritiesRedirect />} />
        <Route path="/analyses/:jobId/progress" element={<AnalysisProgress />} />
        <Route path="/fields/:fieldId/rotations" element={<RotationExplorer />} />
        <Route path="/rotations/:ref" element={<PlanDetails />} />
        <Route path="/rotations/:ref/customize" element={<CustomizePlan />} />
        <Route path="/rotations/:ref/compare" element={<CompareChanges />} />
        <Route path="/rotations/:ref/confirmation" element={<ConfirmPlan />} />
      </Route>
      <Route element={<AppShell />}>
        <Route path="/home" element={<HomeDashboard />} />
        <Route path="/fields/list" element={<FieldsList />} />
        <Route path="/fields/:fieldId/timeline" element={<RotationTimeline />} />
        <Route path="/fields/:fieldId/insights" element={<FieldInsights />} />
        <Route path="/fields/:fieldId/plans" element={<PlanManagement />} />
        <Route path="/plan" element={<DashboardRedirect target="plans" />} />
        <Route path="/insights" element={<DashboardRedirect target="insights" />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
