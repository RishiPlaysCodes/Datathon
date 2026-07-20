import { NavLink } from 'react-router-dom'
import {
  MessageSquare, LayoutDashboard, Network, Map, Users,
  Shield, FileText, TrendingUp, LogOut, Activity,
  AlertTriangle, BookOpen, Briefcase, DollarSign, X,
  Gavel, Fingerprint, Navigation, Camera, Globe, ScanFace, Search as SearchIcon
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/firs', icon: FileText, label: 'FIR Records' },
  { to: '/fir-validator', icon: Gavel, label: 'FIR Validator (AI)' },
  { to: '/network', icon: Network, label: 'Network Graph' },
  { to: '/hotspots', icon: Map, label: 'Hotspot Map' },
  { to: '/accused', icon: Users, label: 'Accused / Profiling' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/forecast', icon: AlertTriangle, label: 'Forecast & Alerts' },
  { to: '/patrol', icon: Navigation, label: 'Patrol AI' },
  { to: '/cctv', icon: Camera, label: 'CCTV / IoT' },
  { to: '/darkweb', icon: Globe, label: 'Dark Web Intel' },
  { to: '/deepfake', icon: ScanFace, label: 'Deepfake Detection' },
  { to: '/osint', icon: SearchIcon, label: 'OSINT Engine' },
  { to: '/cyber-forensics', icon: Fingerprint, label: 'Cyber Forensics' },
  { to: '/sociological', icon: BookOpen, label: 'Sociological' },
  { to: '/investigator', icon: Briefcase, label: 'Decision Support' },
  { to: '/financial', icon: DollarSign, label: 'Financial Crime' },
  { to: '/audit', icon: Shield, label: 'Audit Logs' },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-700/50 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PRAHARI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Crime Intelligence OS</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded bg-dark-800 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-800'
              }`
            }
          >
            <Icon className="w-4 h-4" />
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
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
