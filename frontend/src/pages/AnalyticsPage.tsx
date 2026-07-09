import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7']

export function AnalyticsPage() {
  const [days, setDays] = useState(180)
  const [district, setDistrict] = useState('')

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['analytics', days, district],
    queryFn: () => crimeAPI.getDashboard({ days, district: district || undefined }),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
    )
  }

  if (!dashboard) return null

  // Process trend data for area chart
  const dailyTrends: Record<string, number> = {}
  dashboard.trends.forEach(t => {
    dailyTrends[t.date] = (dailyTrends[t.date] || 0) + t.count
  })
  const trendData = Object.entries(dailyTrends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }))

  // Crime type comparison
  const crimeComparison = dashboard.top_crime_types.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-400" />
            Crime Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Pattern detection, trend analysis, and statistical insights
          </p>
        </div>
        <div className="flex gap-3">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-field text-sm">
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last Quarter</option>
            <option value={180}>Last 6 Months</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{dashboard.total_firs}</p>
          <p className="text-xs text-gray-400 mt-1">Total FIRs</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{dashboard.active_cases}</p>
          <p className="text-xs text-gray-400 mt-1">Active Cases</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{dashboard.closed_cases}</p>
          <p className="text-xs text-gray-400 mt-1">Closed</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{dashboard.repeat_offenders}</p>
          <p className="text-xs text-gray-400 mt-1">Repeat Offenders</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crime Trend Area Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Crime Trend Over Time
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Crime Types Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary-400" />
            Crime Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={crimeComparison}
                dataKey="count"
                nameKey="crime_type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                label={({ crime_type, percent }) => `${crime_type} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={9}
              >
                {crimeComparison.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* District Comparison */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-400" />
            District Comparison
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.district_stats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="district" stroke="#64748b" fontSize={10} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Crime Type Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Crime Types by Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={crimeComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="crime_type" stroke="#64748b" fontSize={9} angle={-30} textAnchor="end" height={80} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {crimeComparison.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
