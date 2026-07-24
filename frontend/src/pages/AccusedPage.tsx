import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Search, Users, Shield, AlertTriangle, TrendingUp, Globe } from 'lucide-react'
import { getRiskColor, getRiskLabel } from '@/lib/utils'

export function AccusedPage() {
  const [search, setSearch] = useState('')
  const [repeatOnly, setRepeatOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: accused, isLoading } = useQuery({
    queryKey: ['accused', search, repeatOnly],
    queryFn: () => crimeAPI.listAccused({ search: search || undefined, repeat_only: repeatOnly }),
  })

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['accused-profile', selectedId],
    queryFn: () => crimeAPI.getAccusedProfile(selectedId!),
    enabled: !!selectedId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-400" />
          Accused Database
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Offender profiles with risk scoring and behavioral analysis
        </p>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accused by name or alias..."
              className="input-field w-full pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={repeatOnly}
              onChange={(e) => setRepeatOnly(e.target.checked)}
              className="rounded border-dark-600 bg-dark-800 text-primary-500"
            />
            Repeat offenders only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accused List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            accused?.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedId === a.id
                    ? 'border-primary-500/50 bg-primary-500/10'
                    : 'border-dark-700/30 bg-dark-800/50 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{a.name}</p>
                    {a.alias && <p className="text-xs text-gray-500">Alias: {a.alias}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${getRiskColor(a.risk_score)}`}>
                      {a.risk_score.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-gray-500">{getRiskLabel(a.risk_score)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{a.total_cases} cases</span>
                  {a.is_repeat_offender && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                      REPEAT
                    </span>
                  )}
                  {a.gang_id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      GANG
                    </span>
                  )}
                  {a.osint_verified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 flex items-center gap-0.5">
                      <Globe className="w-2.5 h-2.5" /> OSINT
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Profile Detail */}
        <div className="lg:col-span-2">
          {loadingProfile ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : profile ? (
            <div className="space-y-4">
              {/* Risk Score Card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{profile.accused.name}</h3>
                    {profile.accused.osint_verified && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          OSINT Verified
                        </span>
                        {profile.accused.osint_sources && (
                          <span className="text-[10px] text-gray-500">
                            ({JSON.parse(profile.accused.osint_sources || '[]').length} sources)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`text-center ${getRiskColor(profile.risk_breakdown.total_score)}`}>
                    <p className="text-3xl font-bold">{profile.risk_breakdown.total_score.toFixed(0)}</p>
                    <p className="text-xs uppercase">{profile.risk_breakdown.risk_level} Risk</p>
                  </div>
                </div>

                {/* Risk Breakdown */}
                <div className="space-y-3">
                  {profile.risk_breakdown.factors.map((factor: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">{factor.name}</span>
                        <span className="text-gray-200">{factor.score}/{factor.max_score}</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                          style={{ width: `${(factor.score / factor.max_score) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{factor.reason}</p>
                    </div>
                  ))}
                </div>

                {/* Explanation + Drill-down */}
                <div className="mt-4 p-3 rounded-lg bg-dark-800/80 border border-dark-700/30 space-y-2">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    <Shield className="w-3 h-3 inline mr-1 text-primary-400" />
                    {profile.risk_breakdown.explanation}
                  </p>
                  <details className="text-xs">
                    <summary className="text-cyan-500 cursor-pointer hover:text-cyan-400">🔍 Drill-down: How is this score calculated?</summary>
                    <div className="mt-2 space-y-2 pl-3 border-l border-cyan-900/50">
                      {profile.risk_breakdown.factors.map((f: any, i: number) => (
                        <div key={i} className="text-gray-400">
                          <p className="text-gray-300 font-medium">{f.name} ({f.score}/{f.max_score})</p>
                          <p className="text-gray-500">Reason: {f.reason}</p>
                          <p className="text-gray-600">Weight: {((f.max_score / profile.risk_breakdown.factors.reduce((s: number, x: any) => s + x.max_score, 0)) * 100).toFixed(0)}% of total score</p>
                        </div>
                      ))}
                      <p className="text-gray-600 italic mt-2">This is a rule-based weighted formula. Not ML-based. Updated on new FIR registration.</p>
                    </div>
                  </details>
                </div>
              </div>

              {/* Behavioral Profile */}
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Behavioral Profile</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{profile.behavioral_profile}</p>
              </div>

              {/* OSINT Intelligence */}
              {profile.accused.osint_verified && profile.accused.osint_sources && (
                <div className="glass-card p-4 border border-cyan-500/20">
                  <h4 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    OSINT Intelligence Sources
                  </h4>
                  <div className="space-y-2">
                    {JSON.parse(profile.accused.osint_sources || '[]').map((source: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="text-gray-400">{source}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-3">
                    Data corroborated from open-source intelligence platforms
                  </p>
                </div>
              )}

              {/* Network Connections */}
              {profile.network_connections.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Known Associates</h4>
                  <div className="space-y-2">
                    {profile.network_connections.map((conn: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-dark-800/50">
                        <span className="text-sm text-gray-200">{conn.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{conn.relationship}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked FIRs */}
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  Linked FIRs ({profile.firs.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {profile.firs.map((fir: any) => (
                    <div key={fir.id} className="p-2 rounded bg-dark-800/50 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-primary-400">{fir.fir_number}</span>
                        <span className="capitalize text-gray-500">{fir.crime_type}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5 truncate">{fir.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400">Select an Accused Person</h3>
              <p className="text-sm text-gray-600 mt-1">
                Click on a name to view full profile and risk assessment
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
