import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import AIAssistant from './pages/AIAssistant'
import CrimeSearch from './pages/CrimeSearch'
import CrimeAnalytics from './pages/CrimeAnalytics'
import CrimeHotspots from './pages/CrimeHotspots'
import CriminalNetwork from './pages/CriminalNetwork'
import AssignedCases from './pages/AssignedCases'
import AuditLogs from './pages/AuditLogs'
import OffenderProfile from './pages/OffenderProfile'
import DecisionSupport from './pages/DecisionSupport'
import FinancialCrime from './pages/FinancialCrime'
import CrimeForecasting from './pages/CrimeForecasting'
import Settings from './pages/Settings'
import { TooltipProvider } from './components/ui/tooltip'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ai-assistant" element={<AIAssistant />} />
                  <Route path="/search" element={<CrimeSearch />} />
                  <Route path="/cases" element={<AssignedCases />} />
                  <Route path="/network" element={<CriminalNetwork />} />
                  <Route path="/hotspots" element={<CrimeHotspots />} />
                  <Route path="/analytics" element={<CrimeAnalytics />} />
                  <Route path="/offenders" element={<OffenderProfile />} />
                  <Route path="/decision-support" element={<DecisionSupport />} />
                  <Route path="/financial" element={<FinancialCrime />} />
                  <Route path="/alerts" element={<CrimeForecasting />} />
                  <Route path="/sociological" element={<Settings />} />
                  <Route path="/logs" element={<AuditLogs />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
