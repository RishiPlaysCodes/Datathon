import { NavLink } from 'react-router-dom'
import {
  MessageSquare, LayoutDashboard, Network, Map, Users,
  Shield, FileText, TrendingUp, LogOut, Activity, ScanSearch,
  Camera, GitCompare, Inbox, Landmark, TrendingUp as TrendingUpIcon
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const allNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', minRole: 'constable' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat', minRole: 'constable' },
  { to: '/firs', icon: FileText, label: 'FIR Records', minRole: 'citizen' },
  { to: '/complaints', icon: Inbox, label: 'Public Complaints', minRole: 'constable' },
  { to: '/deepfake', icon: ScanSearch, label: 'Deepfake Detect', minRole: 'citizen' },
  { to: '/cctv', icon: Camera, label: 'CCTV Match', minRole: 'constable' },
  { to: '/case-similarity', icon: GitCompare, label: 'Investigation Support', minRole: 'constable' },
  { to: '/network', icon: Network, label: 'Network Graph', minRole: 'constable' },
  { to: '/hotspots', icon: Map, label: 'Hotspot Map', minRole: 'constable' },
  { to: '/crime-forecast', icon: TrendingUpIcon, label: 'Crime Forecast', minRole: 'constable' },
  { to: '/accused', icon: Users, label: 'Accused', minRole: 'constable' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics', minRole: 'constable' },
  { to: '/policy-insights', icon: Landmark, label: 'Policy Insights', minRole: 'analyst' },
  { to: '/audit', icon: Shield, label: 'Audit Logs', minRole: 'supervisor' },
]

const ROLE_LEVEL: Record<string, number> = {
  citizen: 0,
  constable: 1,
  investigator: 2,
  analyst: 3,
  supervisor: 4,
  policymaker: 5,
}

export function Sidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const { user, logout } = useAuthStore()
  const userLevel = ROLE_LEVEL[user?.role || 'citizen'] ?? 0

  const navItems = allNavItems.filter(
    (item) => userLevel >= (ROLE_LEVEL[item.minRole] ?? 0)
  )

  return (
    <aside className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-dark-700/50 bg-dark-900 transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PRAHARI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Crime Intelligence OS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-800'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-primary-400 text-sm font-bold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout()
            onNavigate()
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
