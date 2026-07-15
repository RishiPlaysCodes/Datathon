import { NavLink, Outlet, Link } from 'react-router-dom'
import { Shield, FilePlus, Search, MapPin, Users, TrendingUp, Activity, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navItems = [
  { to: '/citizen', icon: Shield, label: 'Home', end: true },
  { to: '/citizen/report', icon: FilePlus, label: 'File Complaint' },
  { to: '/citizen/track', icon: Search, label: 'Track Status' },
  { to: '/citizen/safety', icon: MapPin, label: 'Area Safety' },
  { to: '/citizen/community', icon: Users, label: 'Community Watch' },
  { to: '/citizen/transparency', icon: TrendingUp, label: 'Transparency' },
]

export function CitizenLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/citizen" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">PRAHARI <span className="text-gradient">Nagrik</span></h1>
              <p className="text-[10px] text-gray-500">Citizen Safety & Transparency Portal</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-primary-600/20 text-primary-400' : 'text-gray-400 hover:text-gray-200 hover:bg-dark-800'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/citizen/sos" className="px-3 py-2 rounded-lg text-xs font-bold bg-red-600 text-white animate-pulse-glow hover:bg-red-700 transition-all">
              🆘 SOS
            </Link>
            <Link to="/login" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-dark-700 text-gray-300 border border-white/5 hover:border-primary-500/30">
              <LogIn className="w-3.5 h-3.5" /> Police Login
            </Link>
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg bg-dark-800 text-gray-300">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="md:hidden border-t border-white/5 px-4 py-2 space-y-1">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isActive ? 'bg-primary-600/20 text-primary-400' : 'text-gray-400'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 mt-12 py-6 text-center">
        <p className="text-xs text-gray-600">PRAHARI Nagrik · Karnataka State Police · A transparent, citizen-first safety platform</p>
        <p className="text-[10px] text-gray-700 mt-1">Emergency: Police 100 · Women 1091 · Emergency 112 · Ambulance 108</p>
      </footer>
    </div>
  )
}
