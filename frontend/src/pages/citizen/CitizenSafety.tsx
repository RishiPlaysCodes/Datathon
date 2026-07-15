import { useQuery } from '@tanstack/react-query'
import { citizenAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MapPin, Shield, AlertTriangle } from 'lucide-react'

export function CitizenSafety() {
  const { data, isLoading } = useQuery({
    queryKey: ['citizen-safety'],
    queryFn: () => citizenAPI.getSafetyScores(),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const areas = data?.areas || []

  const scoreColor = (s: number) => s >= 7 ? 'text-green-400' : s >= 4.5 ? 'text-yellow-400' : 'text-red-400'
  const barColor = (s: number) => s >= 7 ? 'from-green-600 to-green-400' : s >= 4.5 ? 'from-yellow-600 to-yellow-400' : 'from-red-600 to-red-400'

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-400" /> Area Safety Scores
        </h1>
        <p className="text-sm text-gray-400 mt-1">Check an area's safety before you travel. Scores are computed from real crime data (last 90 days).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((a: any, i: number) => (
          <div key={i} className="glass-card-hover p-5 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-white">{a.area}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                  a.label === 'Safe' ? 'bg-green-500/20 text-green-400' :
                  a.label === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{a.label}</span>
              </div>
              <div className={`text-3xl font-bold ${scoreColor(a.safety_score)}`}>
                {a.safety_score}<span className="text-sm text-gray-600">/10</span>
              </div>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full bg-gradient-to-r ${barColor(a.safety_score)}`} style={{ width: `${a.safety_score * 10}%` }} />
            </div>
            <p className="text-xs text-gray-400 flex items-start gap-1.5">
              {a.safety_score >= 7 ? <Shield className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />}
              {a.advisory}
            </p>
            <p className="text-[10px] text-gray-600 mt-2">{a.incidents_90d} incidents in last 90 days</p>
          </div>
        ))}
      </div>
      {areas.length === 0 && <p className="text-center text-gray-500 py-8">No safety data available yet.</p>}
    </div>
  )
}
