import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'

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
const EarthAnalysisPage = lazy(() => import('../features/earth-analysis/EarthAnalysisPage'))
import RotationExplorer from '../features/rotations/RotationExplorer'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<Welcome />} />
      {/* Earth Analysis owns its full viewport — rendered outside the wizard shell */}
      <Route path="/analyses/:jobId/progress" element={<Suspense fallback={<FarmProfileFallback />}><EarthAnalysisPage /></Suspense>} />
      <Route path="/fields/:fieldId/rotations" element={<RotationExplorer />} />
      <Route path="/fields/new" element={<EarthObservatoryPage />} />
      <Route path="/setup/questions" element={<Suspense fallback={<FarmProfileFallback />}><FarmProfilePage /></Suspense>} />
      <Route path="/setup/priorities" element={<PrioritiesRedirect />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
