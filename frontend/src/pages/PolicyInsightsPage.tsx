import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { policyAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Landmark, Users, Clock, MapPin, AlertCircle, Lightbulb } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export function PolicyInsightsPage() {
  const [days, setDays] = useState(365)
  const { data, isLoading, error } = useQuery({
    queryKey: ['policy-insights', days],
    queryFn: () => policyAPI.getInsights(days),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  if (error || !data) return <div className="text-red-400 text-center py-12">Failed to load policy insights</div>

  const ageBracketData = Object.entries(data.victim_demographics.age_brackets)
    .filter(([k]) => k !== 'unknown')
    .map(([bracket, count]) => ({ bracket, count }))

  const genderData = Object.entries(data.victim_demographics.gender_distribution)
    .map(([gender, count]) => ({ gender, count }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary-400" />
            Policy & Sociological Crime Insights
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Demographic patterns and evidence-based policy recommendations
          </p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field text-sm">
          <option value={90}>Last 90 Days</option>
          <option value={180}>Last 6 Months</option>
          <option value={365}>Last Year</option>
          <option value={730}>Last 2 Years</option>
        </select>
      </div>

      {/* Data honesty disclosure */}
      <div className="glass-card p-4 border border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-300/90">{data.data_limitations}</p>
        </div>
      </div>

      {/* Policy Recommendations */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary-400" />
          Evidence-Based Policy Recommendations
        </h2>
        <div className="space-y-3">
          {data.policy_recommendations.length === 0 ? (
            <p className="text-gray-500 text-sm">No significant patterns crossed recommendation thresholds for this period.</p>
          ) : (
            data.policy_recommendations.map((rec: any, i: number) => (
              <div key={i} className="rounded-lg border border-primary-500/20 bg-primary-500/5 p-4">
                <p className="text-sm text-gray-300"><span className="font-semibold text-primary-400">Finding:</span> {rec.finding}</p>
                <p className="text-sm text-gray-200 mt-1"><span className="font-semibold text-green-400">Recommendation:</span> {rec.policy_recommendation}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Victim age demographics */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-400" />
            Victim Age Distribution
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageBracketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bracket" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-500 mt-2">{data.victim_demographics.total_victims_analyzed} victims analyzed</p>
        </div>

        {/* Victim gender distribution */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Victim Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={genderData} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ gender, percent }: any) => `${gender} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                {genderData.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* District crime rates */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-400" />
            District Crime Rates
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.district_crime_rates.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={10} />
              <YAxis type="category" dataKey="district" stroke="#64748b" fontSize={10} width={110} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="fir_count" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Temporal + offender stats */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-400" />
            Temporal & Offender Patterns
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">{data.temporal_pattern.night_crime_pct}%</p>
              <p className="text-xs text-gray-500 mt-1">Crimes {data.temporal_pattern.night_window}</p>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{data.offender_demographics.repeat_offender_rate_pct}%</p>
              <p className="text-xs text-gray-500 mt-1">Repeat offenders</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Offender age distribution</p>
            {Object.entries(data.offender_demographics.age_brackets).filter(([k]) => k !== 'unknown').map(([bracket, count]: any) => (
              <div key={bracket} className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 w-16">{bracket}</span>
                <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${(count / data.offender_demographics.total_offenders_analyzed) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-600 text-center pt-4 border-t border-gray-800/50">
        All insights derived from actual database records. No fabricated socio-economic data. Deterministic analysis.
      </p>
    </div>
  )
}
