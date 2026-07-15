import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { ForecastPage } from '@/pages/ForecastPage'
import { SociologicalPage } from '@/pages/SociologicalPage'
import { InvestigatorPage } from '@/pages/InvestigatorPage'
import { FinancialPage } from '@/pages/FinancialPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="firs" element={<FIRsPage />} />
          <Route path="network" element={<NetworkPage />} />
          <Route path="hotspots" element={<HotspotsPage />} />
          <Route path="accused" element={<AccusedPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="sociological" element={<SociologicalPage />} />
          <Route path="investigator" element={<InvestigatorPage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
