import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { crimeAPI } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FileText, AlertTriangle, CheckCircle, Users, TrendingUp, MapPin, Lock, Unlock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function DashboardPage() {
  const { user } = useAuthStore()
  const [allStations, setAllStations] = useState(false)
  const navigate = useNavigate()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', allStations],
    queryFn: () => crimeAPI.getDashboard({ days: 180, all_stations: allStations }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!dashboard) return null

  // Aggregate trends by date
  const trendMap: Record<string, number> = {}
  dashboard.trends.forEach(t => {
    trendMap[t.date] = (trendMap[t.date] || 0) + t.count
  })
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date: date.slice(5), count }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-400 text-sm mt-1">Crime intelligence overview · Last 180 days</p>
          {user?.station_id && !allStations && (
            <p className="text-xs text-primary-400 mt-0.5">
              📍 Showing: {user.station_id.replace(/_/g, ' ')} ({user.assigned_zone || 'All'} Zone)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAllStations(false)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-colors ${!allStations ? 'bg-primary-600 text-white border-primary-500' : 'border-dark-600 text-gray-400 hover:text-white'}`}
          >
            <Lock className="w-3 h-3" />My Station
          </button>
          <button
            onClick={() => setAllStations(true)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-colors ${allStations ? 'bg-orange-600 text-white border-orange-500' : 'border-dark-600 text-gray-400 hover:text-white'}`}
          >
            <Unlock className="w-3 h-3" />All Stations
          </button>
        </div>
      </div>
      {allStations && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-xs text-yellow-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          You are viewing FIRs across ALL stations. Access logged for audit.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Total FIRs"
          value={dashboard.total_firs}
          color="blue"
          onClick={() => navigate('/firs')}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Active Cases"
          value={dashboard.active_cases}
          color="orange"
          onClick={() => navigate('/firs')}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Closed Cases"
          value={dashboard.closed_cases}
          color="green"
          onClick={() => navigate('/firs')}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Repeat Offenders"
          value={dashboard.repeat_offenders}
          color="red"
          onClick={() => navigate('/accused')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crime Trends */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Crime Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Crime Types Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Crime Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dashboard.top_crime_types.slice(0, 8)}
                dataKey="count"
                nameKey="crime_type"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ crime_type, count }) => `${crime_type} (${count})`}
                labelLine={false}
                fontSize={10}
              >
                {dashboard.top_crime_types.slice(0, 8).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Stats */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-400" />
          Crime by Location
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dashboard.hotspots.slice(0, 8).map(h => ({ location: h.location_name || 'Unknown', count: h.count }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="location" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={60} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Hotspots */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Active Hotspots</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dashboard.hotspots.slice(0, 6).map((h, idx) => (
            <div key={idx} className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">{h.location_name || 'Unknown'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  {h.count} cases
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize">{h.crime_type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deterministic Disclaimer */}
      <p className="text-[10px] text-gray-600 text-center pt-4 border-t border-gray-800/50">
        All results are deterministic — same input always produces same output. No external LLM APIs used. Zero hallucination risk. Grounded in database records.
      </p>
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void }) {
  const colors = {
    blue: 'from-primary-500/20 to-primary-600/5 border-primary-500/20 text-primary-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  }

  return (
    <div onClick={onClick} className={`rounded-xl bg-gradient-to-br ${colors[color as keyof typeof colors]} border p-5 ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
      {onClick && <p className="text-[9px] text-gray-600 mt-2">Click to drill-down →</p>}
    </div>
  )
}
