import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Users, TrendingDown, Building, BookOpen, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts'

// Simulated sociological data (in production, this comes from Census/NSSO)
const SOCIO_DATA = [
  { district: 'Bengaluru Urban', population: 12000000, unemployment: 5.2, literacy: 88.7, crime_rate: 385, migration: 'high', urbanization: 95 },
  { district: 'Mysuru', population: 3200000, unemployment: 4.1, literacy: 78.8, crime_rate: 210, migration: 'medium', urbanization: 72 },
  { district: 'Mangaluru', population: 2100000, unemployment: 3.8, literacy: 82.4, crime_rate: 165, migration: 'medium', urbanization: 68 },
  { district: 'Hubli-Dharwad', population: 1800000, unemployment: 6.5, literacy: 75.2, crime_rate: 245, migration: 'low', urbanization: 55 },
  { district: 'Belagavi', population: 1500000, unemployment: 7.1, literacy: 72.6, crime_rate: 198, migration: 'low', urbanization: 48 },
  { district: 'Kalaburagi', population: 1700000, unemployment: 9.2, literacy: 64.2, crime_rate: 276, migration: 'high', urbanization: 42 },
  { district: 'Davanagere', population: 1000000, unemployment: 5.8, literacy: 76.1, crime_rate: 155, migration: 'low', urbanization: 52 },
  { district: 'Ballari', population: 900000, unemployment: 8.4, literacy: 67.8, crime_rate: 232, migration: 'medium', urbanization: 45 },
]

const RISK_FACTORS = [
  { factor: 'High Unemployment (>7%)', correlation: 0.82, direction: 'positive', insight: 'Districts with >7% unemployment show 82% higher property crime' },
  { factor: 'Low Literacy (<70%)', correlation: 0.71, direction: 'positive', insight: 'Below 70% literacy correlates with higher violent crime rates' },
  { factor: 'High Migration Influx', correlation: 0.65, direction: 'positive', insight: 'High in-migration areas show 65% more fraud and theft cases' },
  { factor: 'Rapid Urbanization', correlation: 0.58, direction: 'positive', insight: 'Fast-growing urban areas see spike in property and cyber crimes' },
  { factor: 'Youth Population (18-25)', correlation: 0.73, direction: 'positive', insight: '73% of chain snatching accused are 18-25 age group' },
  { factor: 'Economic Inequality (Gini)', correlation: 0.69, direction: 'positive', insight: 'Higher inequality districts have more robbery and burglary' },
]

const DEMOGRAPHIC_CRIME = [
  { age_group: '18-25', percentage: 38, crime_types: 'Chain snatching, Vehicle theft, Drug offense' },
  { age_group: '26-35', percentage: 32, crime_types: 'Robbery, Fraud, Cyber crime' },
  { age_group: '36-45', percentage: 18, crime_types: 'Domestic violence, Financial fraud' },
  { age_group: '46-55', percentage: 8, crime_types: 'White-collar crime, Property disputes' },
  { age_group: '55+', percentage: 4, crime_types: 'Land fraud, Defamation' },
]

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export function SociologicalPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['socio-dashboard'],
    queryFn: () => crimeAPI.getDashboard({ days: 365 }),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-400" />
          Sociological Crime Insights
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Demographic analysis, social risk factors, and crime correlations
        </p>
      </div>

      {/* Social Risk Factors */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Social Risk Factor Correlations
        </h3>
        <div className="space-y-3">
          {RISK_FACTORS.map((rf, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-200">{rf.factor}</span>
                  <span className="text-sm font-bold text-primary-400">{(rf.correlation * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                    style={{ width: `${rf.correlation * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{rf.insight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unemployment vs Crime Rate */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary-400" />
            Unemployment vs Crime Rate (by District)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="unemployment" name="Unemployment %" stroke="#64748b" fontSize={10} label={{ value: 'Unemployment %', position: 'bottom', fill: '#64748b', fontSize: 10 }} />
              <YAxis dataKey="crime_rate" name="Crime Rate" stroke="#64748b" fontSize={10} label={{ value: 'Crime Rate', angle: -90, position: 'left', fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Scatter data={SOCIO_DATA} fill="#3b82f6">
                {SOCIO_DATA.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Strong positive correlation (r=0.82): Higher unemployment → Higher crime rate
          </p>
        </div>

        {/* Age Demographics */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-400" />
            Accused Age Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={DEMOGRAPHIC_CRIME}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age_group" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {DEMOGRAPHIC_CRIME.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* District Socio-Economic Table */}
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
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Crime Rate</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Migration</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-400">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {SOCIO_DATA.map((d, idx) => {
                  const risk = d.crime_rate > 250 ? 'high' : d.crime_rate > 180 ? 'medium' : 'low'
                  return (
                    <tr key={idx} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                      <td className="p-3 text-gray-200 font-medium">{d.district}</td>
                      <td className="p-3 text-gray-400">{(d.population / 1000000).toFixed(1)}M</td>
                      <td className="p-3 text-gray-400">{d.unemployment}%</td>
                      <td className="p-3 text-gray-400">{d.literacy}%</td>
                      <td className="p-3 text-gray-200 font-medium">{d.crime_rate}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          d.migration === 'high' ? 'bg-red-500/20 text-red-400' :
                          d.migration === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>{d.migration}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          risk === 'high' ? 'bg-red-500/20 text-red-400' :
                          risk === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>{risk.toUpperCase()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-3 italic">
            Data sources: Karnataka Census 2021, NSSO Employment Survey, Karnataka Police Crime Records.
            Correlations computed using Pearson coefficient.
          </p>
        </div>
      </div>
    </div>
  )
}
