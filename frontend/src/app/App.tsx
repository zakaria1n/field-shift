import { Routes, Route, Navigate } from 'react-router-dom'

import AppShell from './AppShell'
import WizardShell from './WizardShell'
import Welcome from '../features/welcome/Welcome'
import FieldSelect from '../features/field-map/FieldSelect'
import Questions from '../features/farm-profile/Questions'
import Priorities from '../features/priorities/Priorities'
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

export default function App() {
  return (
    <Routes>
      <Route element={<WizardShell />}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/fields/new" element={<FieldSelect />} />
        <Route path="/setup/questions" element={<Questions />} />
        <Route path="/setup/priorities" element={<Priorities />} />
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
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
