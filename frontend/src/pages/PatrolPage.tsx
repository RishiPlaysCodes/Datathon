import { useQuery } from '@tanstack/react-query'
import { analysisAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Navigation, Clock, Users, AlertTriangle, Shield } from 'lucide-react'

export function PatrolPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['patrol'],
    queryFn: () => analysisAPI.getPatrol(),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const recommendations = data?.recommendations || []
  const repeatOffenders = data?.repeat_offenders || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Navigation className="w-6 h-6 text-primary-400" />
          Patrol AI - Intelligent Deployment
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI-powered patrol planning from real crime hotspot data - acts like an experienced officer
        </p>
      </div>

      <div className="glass-card p-5 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">AI Patrol Intelligence Summary</h4>
            <p className="text-xs text-gray-400 mt-1">
              Analyzed the last 30 days of crime data. {recommendations.length} priority deployments recommended.
              {repeatOffenders} repeat offenders active - patrol units should stay alert in their assigned areas.
              This is not a static dashboard - it makes deployment decisions like a seasoned officer.
            </p>
          </div>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Navigation className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg text-gray-400">No hotspot data yet</h3>
          <p className="text-sm text-gray-600 mt-1">Recommendations appear when recent crime data is available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec: any, idx: number) => (
            <div key={idx} className={`glass-card p-5 border-l-4 ${
              rec.priority === 'CRITICAL' ? 'border-l-red-500' : rec.priority === 'HIGH' ? 'border-l-orange-500' : 'border-l-yellow-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  rec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : rec.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{rec.priority} PRIORITY</span>
                <span className="text-xs text-gray-500">Confidence: {rec.confidence}%</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">{rec.area}</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400"><Clock className="w-3.5 h-3.5 text-primary-400" /><span><b>Deploy:</b> {rec.time}</span></div>
                <div className="flex items-center gap-2 text-gray-400"><Users className="w-3.5 h-3.5 text-primary-400" /><span><b>Units:</b> {rec.units}</span></div>
                <div className="flex items-center gap-2 text-gray-400"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /><span><b>Threat:</b> {rec.crime_type} ({rec.count} incidents)</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-dark-700/30">
                <p className="text-xs text-gray-300"><b>AI Reasoning:</b> {rec.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
