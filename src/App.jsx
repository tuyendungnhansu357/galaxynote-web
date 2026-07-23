import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSync } from './hooks/useSync'
import LoadingScreen from './components/ui/LoadingScreen'
import ErrorToast from './components/ui/ErrorToast'
import QuickSwitcherModal from './components/quickswitcher/QuickSwitcherModal'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import RestrictedPage from './pages/RestrictedPage'

// three.js + 3d-force-graph are ~500kB minified — keep them out of the
// initial bundle entirely, only fetched when the user opens the Galaxy view.
const GraphPage = lazy(() => import('./pages/GraphPage'))
// Only ever needed by admins — split out so every other user's bundle
// doesn't pay for it.
const AdminPage = lazy(() => import('./pages/AdminPage'))

function RequireAuth({ children }) {
  const status = useAuthStore((s) => s.status)
  useSync() // realtime subscriptions — no-op until a user is signed in

  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-out') return <Navigate to="/auth" replace />
  if (status === 'restricted') return <RestrictedPage />
  return children
}

function RequireAdmin({ children }) {
  const status = useAuthStore((s) => s.status)
  const isAdmin = useAuthStore((s) => s.profile?.is_admin)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-out') return <Navigate to="/auth" replace />
  if (status === 'restricted') return <RestrictedPage />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const status = useAuthStore((s) => s.status)

  return (
    <BrowserRouter>
      <ErrorToast />
      {status === 'signed-in' && <QuickSwitcherModal />}
      <Routes>
        <Route
          path="/auth"
          element={status === 'signed-in' ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route
          path="/graph"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingScreen label="Đang tải Galaxy 3D…" />}>
                <GraphPage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Suspense fallback={<LoadingScreen label="Đang tải trang quản trị…" />}>
                <AdminPage />
              </Suspense>
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
