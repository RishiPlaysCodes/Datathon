import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FileText, AlertTriangle, CheckCircle, Users, TrendingUp, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function DashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => crimeAPI.getDashboard({ days: 180 }),
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
      <div>
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time crime intelligence overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Total FIRs"
          value={dashboard.total_firs}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Active Cases"
          value={dashboard.active_cases}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Closed Cases"
          value={dashboard.closed_cases}
          color="green"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Repeat Offenders"
          value={dashboard.repeat_offenders}
          color="red"
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
          Crime by District
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dashboard.district_stats.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="district" stroke="#64748b" fontSize={11} angle={-20} textAnchor="end" height={60} />
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
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors = {
    blue: 'from-primary-500/20 to-primary-600/5 border-primary-500/20 text-primary-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  }

  return (
    <div className={`card-3d rounded-2xl bg-gradient-to-br ${colors[color as keyof typeof colors]} border p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
        </div>
        <div className="opacity-70 p-2 rounded-xl bg-white/5">{icon}</div>
      </div>
    </div>
  )
}
