import { useState } from 'react'
import { TrendingUp, Search, ShieldAlert, Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { forecastAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/20',
  high: 'text-orange-400 bg-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/20',
  low: 'text-green-400 bg-green-500/20',
}

export function CrimeForecastPage() {
  const [location, setLocation] = useState('')
  const [district, setDistrict] = useState('')
  const [days, setDays] = useState(180)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const search = async () => {
    if (!location.trim() && !district.trim()) {
      toast.error('Enter a location or district')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const data = await forecastAPI.get({
        location: location.trim() || undefined,
        district: district.trim() || undefined,
        days,
      })
      setResult(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Forecast failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          Predictive Crime Forecast
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Historical pattern-based risk analysis with concrete preventive measures
        </p>
      </div>

      {/* Search */}
      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="input-field" placeholder="Location (e.g. Koramangala)" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <input className="input-field" placeholder="District (e.g. Bengaluru Urban)" value={district} onChange={e => setDistrict(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field">
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
        <button onClick={search} disabled={loading} className="btn-primary disabled:opacity-40">
          {loading ? 'Analyzing...' : <><Search className="w-4 h-4 mr-1 inline" />Forecast</>}
        </button>
      </div>

      {result && !result.sufficient_data && (
        <div className="glass-card p-6 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-yellow-400 font-medium">{result.message}</p>
        </div>
      )}

      {result && result.sufficient_data && (
        <div className="space-y-4">
          {/* Risk summary */}
          <div className="glass-card p-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">{result.location || result.district}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${RISK_COLORS[result.risk_level]}`}>{result.risk_level.toUpperCase()} RISK</span>
                <span className="text-xs text-gray-500">{result.risk_ratio_vs_city_average}x city average</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{result.total_incidents}</p>
              <p className="text-xs text-gray-500">incidents in {result.period_days} days</p>
            </div>
          </div>

          {/* Forecast summary */}
          <div className="glass-card p-4 border border-primary-500/20 bg-primary-500/5">
            <p className="text-sm text-gray-200">{result.forecast_summary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crime type frequency */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Crime Type Frequency</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.crime_type_frequency.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="crime_type" stroke="#64748b" fontSize={9} angle={-25} textAnchor="end" height={70} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Time patterns */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Time Patterns</h3>
              <div className="bg-dark-800/50 rounded-lg p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-white font-medium">{result.peak_time_window.window}</p>
                  <p className="text-xs text-gray-500">Peak time window ({result.peak_time_window.incident_count} incidents)</p>
                </div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-white font-medium">{result.peak_day_of_week.day}</p>
                  <p className="text-xs text-gray-500">Peak day of week ({result.peak_day_of_week.incident_count} incidents)</p>
                </div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4 flex items-center gap-3">
                <TrendingUp className={`w-5 h-5 ${result.trend === 'increasing' ? 'text-red-400' : result.trend === 'decreasing' ? 'text-green-400' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm text-white font-medium capitalize">{result.trend}{result.trend_change_pct != null && ` (${result.trend_change_pct > 0 ? '+' : ''}${result.trend_change_pct}%)`}</p>
                  <p className="text-xs text-gray-500">Trend vs earlier half of period</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preventive measures */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary-400" />
              Preventive Measures for "{result.dominant_crime_type}"
            </h3>
            <ul className="space-y-2">
              {result.preventive_measures.map((m: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] text-gray-600 px-2">{result.method_disclosure}</p>
        </div>
      )}

      {!result && (
        <div className="glass-card p-12 text-center text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter a location or district to generate a forecast</p>
        </div>
      )}
    </div>
  )
}
