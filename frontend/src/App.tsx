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
import { FIRValidatorPage } from '@/pages/FIRValidatorPage'
import { CyberForensicsPage } from '@/pages/CyberForensicsPage'
import { PatrolPage } from '@/pages/PatrolPage'
import { CCTVPage } from '@/pages/CCTVPage'
import { DarkWebPage } from '@/pages/DarkWebPage'
import { DeepfakePage } from '@/pages/DeepfakePage'
import { OSINTPage } from '@/pages/OSINTPage'
// Citizen (public) portal
import { CitizenLayout } from '@/components/layout/CitizenLayout'
import { CitizenHome } from '@/pages/citizen/CitizenHome'
import { CitizenReport } from '@/pages/citizen/CitizenReport'
import { CitizenTrack } from '@/pages/citizen/CitizenTrack'
import { CitizenSafety } from '@/pages/citizen/CitizenSafety'
import { CitizenCommunity } from '@/pages/citizen/CitizenCommunity'
import { CitizenTransparency } from '@/pages/citizen/CitizenTransparency'
import { CitizenSOS } from '@/pages/citizen/CitizenSOS'

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

        {/* Public Citizen Portal - NO login required */}
        <Route path="/citizen" element={<CitizenLayout />}>
          <Route index element={<CitizenHome />} />
          <Route path="report" element={<CitizenReport />} />
          <Route path="track" element={<CitizenTrack />} />
          <Route path="safety" element={<CitizenSafety />} />
          <Route path="community" element={<CitizenCommunity />} />
          <Route path="transparency" element={<CitizenTransparency />} />
          <Route path="sos" element={<CitizenSOS />} />
        </Route>

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
          <Route path="fir-validator" element={<FIRValidatorPage />} />
          <Route path="cyber-forensics" element={<CyberForensicsPage />} />
          <Route path="patrol" element={<PatrolPage />} />
          <Route path="cctv" element={<CCTVPage />} />
          <Route path="darkweb" element={<DarkWebPage />} />
          <Route path="deepfake" element={<DeepfakePage />} />
          <Route path="osint" element={<OSINTPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
