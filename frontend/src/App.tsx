import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ChatPage } from '@/pages/ChatPage'
import { FIRsPage } from '@/pages/FIRsPage'
import { NetworkPage } from '@/pages/NetworkPage'
import { HotspotsPage } from '@/pages/HotspotsPage'
import { AccusedPage } from '@/pages/AccusedPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AuditPage } from '@/pages/AuditPage'
import { DeepfakePage } from '@/pages/DeepfakePage'

const ROLE_LEVEL: Record<string, number> = {
  citizen: 0,
  constable: 1,
  investigator: 2,
  analyst: 3,
  supervisor: 4,
  policymaker: 5,
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ minimumRole, children }: { minimumRole: string; children: React.ReactNode }) {
  const { user } = useAuthStore()
  const userLevel = ROLE_LEVEL[user?.role || 'citizen'] ?? 0
  const requiredLevel = ROLE_LEVEL[minimumRole] ?? Number.POSITIVE_INFINITY
  if (userLevel < requiredLevel) {
    return <Navigate to={user?.role === 'citizen' ? '/firs' : '/dashboard'} replace />
  }
  return <>{children}</>
}

function DefaultRoute() {
  const { user } = useAuthStore()
  return <Navigate to={user?.role === 'citizen' ? '/firs' : '/dashboard'} replace />
}

function App() {
  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultRoute />} />
          <Route
            path="dashboard"
            element={<RoleRoute minimumRole="constable"><DashboardPage /></RoleRoute>}
          />
          <Route
            path="chat"
            element={<RoleRoute minimumRole="constable"><ChatPage /></RoleRoute>}
          />
          <Route path="firs" element={<FIRsPage />} />
          <Route path="deepfake" element={<DeepfakePage />} />
          <Route
            path="network"
            element={<RoleRoute minimumRole="constable"><NetworkPage /></RoleRoute>}
          />
          <Route
            path="hotspots"
            element={<RoleRoute minimumRole="constable"><HotspotsPage /></RoleRoute>}
          />
          <Route
            path="accused"
            element={<RoleRoute minimumRole="constable"><AccusedPage /></RoleRoute>}
          />
          <Route
            path="analytics"
            element={<RoleRoute minimumRole="constable"><AnalyticsPage /></RoleRoute>}
          />
          <Route
            path="audit"
            element={<RoleRoute minimumRole="supervisor"><AuditPage /></RoleRoute>}
          />
        </Route>
        <Route path="*" element={<DefaultRoute />} />
      </Routes>
    </HashRouter>
  )
}

export default App
