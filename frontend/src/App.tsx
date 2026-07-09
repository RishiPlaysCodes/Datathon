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
                  <Route path="/settings" element={<div>Settings (Coming Soon)</div>} />

                  {/* Investigator + Admin */}
                  <Route element={<ProtectedRoute allowedRoles={['admin', 'investigator']} />}>
                    <Route path="/analytics" element={<CrimeAnalytics />} />
                    <Route path="/hotspots" element={<CrimeHotspots />} />
                    <Route path="/network" element={<CriminalNetwork />} />
                    <Route path="/reports" element={<div>Reports (Coming Soon)</div>} />
                  </Route>

                  {/* Admin Only */}
                  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                    <Route path="/logs" element={<AuditLogs />} />
                  </Route>
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
