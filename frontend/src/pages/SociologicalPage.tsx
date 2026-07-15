import { useQuery } from '@tanstack/react-query'
import { analysisAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Users, TrendingDown, Building, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export function SociologicalPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sociological'],
    queryFn: () => analysisAPI.getSociological(),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const districts = data?.districts || []
  const demographics = data?.demographics || []
  const riskFactors = data?.risk_factors || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-400" />
          Sociological Crime Insights
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Real crime data correlated with socio-economic factors (Census 2021 / NSSO)
        </p>
      </div>

      {/* Risk Factors */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Social Risk Factor Correlations
        </h3>
        <div className="space-y-3">
          {riskFactors.map((rf: any, idx: number) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-200">{rf.factor}</span>
                <span className="text-sm font-bold text-primary-400">{(rf.correlation * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400" style={{ width: `${rf.correlation * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{rf.insight}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unemployment vs Crime scatter */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary-400" />
            Unemployment vs Crime Count (by District)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="unemployment" name="Unemployment %" stroke="#64748b" fontSize={10} />
              <YAxis dataKey="crime_count" name="Crime Count" stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Scatter data={districts} fill="#3b82f6">
                {districts.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Age demographics */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-400" />
            Accused Age Distribution (Real Data)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={demographics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age_group" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {demographics.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* District table */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-primary-400" />
            District Socio-Economic Profile & Crime Correlation
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">District</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Population</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Unemployment</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Literacy</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Crime Count</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Migration</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Risk</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d: any, idx: number) => (
                  <tr key={idx} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                    <td className="p-3 text-gray-200 font-medium">{d.district}</td>
                    <td className="p-3 text-gray-400">{(d.population / 1000000).toFixed(1)}M</td>
                    <td className="p-3 text-gray-400">{d.unemployment}%</td>
                    <td className="p-3 text-gray-400">{d.literacy}%</td>
                    <td className="p-3 text-gray-200 font-medium">{d.crime_count}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.migration === 'high' ? 'bg-red-500/20 text-red-400' : d.migration === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{d.migration}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.risk_level === 'high' ? 'bg-red-500/20 text-red-400' : d.risk_level === 'medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>{d.risk_level.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-3 italic">
            Crime counts from live FIR database. Socio-economic data: Karnataka Census 2021, NSSO. Correlations via Pearson coefficient.
          </p>
        </div>
      </div>
    </div>
  )
}
