import { Link } from 'react-router-dom'
import { FilePlus, Search, MapPin, Users, TrendingUp, ShieldAlert, ArrowRight, Eye, HeartHandshake, Zap } from 'lucide-react'

const features = [
  { to: '/citizen/report', icon: FilePlus, title: 'File a Complaint', desc: 'Report a crime online. Get a tracking ID instantly.', color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20' },
  { to: '/citizen/track', icon: Search, title: 'Track Your Case', desc: 'Full transparency on your complaint status.', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20' },
  { to: '/citizen/safety', icon: MapPin, title: 'Check Area Safety', desc: 'Know an area\'s safety score before you travel.', color: 'from-green-500/20 to-green-600/5 border-green-500/20' },
  { to: '/citizen/community', icon: Users, title: 'Community Watch', desc: 'Report suspicious activity, help your neighbours.', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/20' },
  { to: '/citizen/transparency', icon: TrendingUp, title: 'Accountability', desc: 'See how complaints are handled, publicly.', color: 'from-orange-500/20 to-orange-600/5 border-orange-500/20' },
  { to: '/citizen/sos', icon: ShieldAlert, title: 'Emergency SOS', desc: 'One-tap panic alert with your location.', color: 'from-red-500/20 to-red-600/5 border-red-500/20' },
]

const pillars = [
  { icon: Zap, title: 'Prevention First', desc: 'Predictive safety alerts and area scores help you avoid danger before it happens.' },
  { icon: Eye, title: 'Radical Transparency', desc: 'Every complaint is tracked publicly. Inaction auto-escalates to higher authority - fighting corruption.' },
  { icon: HeartHandshake, title: 'Community Powered', desc: 'Citizens help each other through verified community reports and shared safety intelligence.' },
]

export function CitizenHome() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 md:p-12 text-center">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> A safer Karnataka, together
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            Your Safety. <span className="text-gradient">Your Right.</span><br />Made Transparent.
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-sm md:text-base">
            File complaints online, track them transparently, check area safety, and help your community -
            all in one place. No more ignored complaints. No more silence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link to="/citizen/report" className="btn-primary px-6 py-3 flex items-center gap-2">
              File a Complaint <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/citizen/safety" className="btn-secondary px-6 py-3">Check Area Safety</Link>
          </div>
        </div>
      </div>

      {/* Three pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillars.map((p, i) => (
          <div key={i} className="glass-card p-6 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
              <p.icon className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">{p.title}</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">What would you like to do?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Link key={f.to} to={f.to}
              className={`card-3d rounded-2xl bg-gradient-to-br ${f.color} border p-6 group animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
