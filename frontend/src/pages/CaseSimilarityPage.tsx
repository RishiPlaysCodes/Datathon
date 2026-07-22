import { useState } from 'react'
import { Search, GitCompare, ArrowRight, UserSearch, AlertCircle, Lightbulb } from 'lucide-react'
import api from '@/lib/api'
import { offenderProfileAPI } from '@/lib/api'
import toast from 'react-hot-toast'

export function CaseSimilarityPage() {
  const [tab, setTab] = useState<'similarity' | 'profiling'>('similarity')
  const [firId, setFirId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const search = async () => {
    const id = parseInt(firId)
    if (!id || id < 1) { toast.error('Enter a valid FIR ID'); return }
    setLoading(true)
    setResult(null)
    setProfile(null)
    try {
      if (tab === 'similarity') {
        const { data } = await api.get(`/public/case-similarity/${id}`)
        setResult(data)
        if (data.total_matches === 0) toast('No similar cases found')
      } else {
        const data = await offenderProfileAPI.profile(id)
        setProfile(data)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary-400" />
          Investigation Support
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Case similarity search and unidentified-offender profiling, both driven by real database patterns
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('similarity'); setResult(null); setProfile(null) }} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'similarity' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-gray-400'}`}>
          <GitCompare className="w-4 h-4" />Case Similarity
        </button>
        <button onClick={() => { setTab('profiling'); setResult(null); setProfile(null) }} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'profiling' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-gray-400'}`}>
          <UserSearch className="w-4 h-4" />Unidentified Offender Profiling
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 flex gap-3 items-center">
        <input className="input-field flex-1" type="number" min="1" placeholder="Enter FIR ID (e.g. 1, 5, 10...)" value={firId} onChange={e => setFirId(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} disabled={loading} className="btn-primary px-6 disabled:opacity-40">
          {loading ? 'Analyzing...' : <><Search className="w-4 h-4 mr-1 inline" />{tab === 'similarity' ? 'Find Similar' : 'Build Profile'}</>}
        </button>
      </div>

      {/* Case Similarity Results */}
      {tab === 'similarity' && result && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Source Case</p>
            <div className="flex items-center gap-3">
              <span className="text-primary-400 font-mono text-sm">{result.source_fir.fir_number}</span>
              <span className="text-white">{result.source_fir.crime_type}</span>
              {result.source_fir.location_name && <span className="text-gray-500 text-xs">{result.source_fir.location_name}</span>}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Similar Cases ({result.total_matches})</p>
            </div>
            {result.similar_cases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No similar cases found in database</p>
            ) : (
              <div className="space-y-3">
                {result.similar_cases.map((c: any, i: number) => (
                  <div key={i} className="rounded-lg border border-dark-600 p-3 hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary-400">{c.fir_number}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-300">{c.crime_type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'closed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-2 rounded-full bg-dark-700 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500" style={{ width: `${c.similarity_score}%` }} />
                        </div>
                        <span className="text-xs text-primary-400 font-medium">{c.similarity_score}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{c.description_preview}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.reasons.map((r: string, j: number) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-300 flex items-center gap-0.5">
                          <ArrowRight className="w-2.5 h-2.5" />{r}
                        </span>
                      ))}
                    </div>
                    {c.location_name && <p className="text-[10px] text-gray-600 mt-1">{c.location_name} · {c.date_of_occurrence?.split('T')[0]}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offender Profiling Results */}
      {tab === 'profiling' && profile && (
        <div className="space-y-4">
          {profile.already_identified ? (
            <div className="glass-card p-6 text-center">
              <p className="text-green-400 font-medium mb-2">This FIR already has identified accused</p>
              <p className="text-gray-400 text-sm">{profile.message}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {profile.identified_accused.map((a: any) => (
                  <span key={a.id} className="text-xs px-3 py-1 rounded-full bg-dark-800 text-gray-300">{a.name}</span>
                ))}
              </div>
            </div>
          ) : !profile.sufficient_data ? (
            <div className="glass-card p-6 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-400 font-medium mb-1">Insufficient data for a reliable profile</p>
              <p className="text-gray-400 text-sm">{profile.message}</p>
            </div>
          ) : (
            <>
              <div className="glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Unsolved Case</p>
                  <p className="text-white font-mono text-sm">{profile.fir_number} — {profile.crime_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-400">{(profile.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-gray-500">confidence</p>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <UserSearch className="w-4 h-4 text-primary-400" />
                  Inferred Offender Profile
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ProfileStat label="Likely Gender" value={profile.inferred_profile.likely_gender} />
                  <ProfileStat label="Age Range" value={profile.inferred_profile.likely_age_range} />
                  <ProfileStat label="Avg Age" value={profile.inferred_profile.likely_average_age ?? '-'} />
                  <ProfileStat label="Repeat Offender Likelihood" value={`${profile.inferred_profile.repeat_offender_likelihood_pct}%`} />
                  <ProfileStat label="Organized Gang Link" value={`${profile.inferred_profile.organized_gang_involvement_pct}%`} />
                  <ProfileStat label="Avg Risk Score" value={profile.inferred_profile.average_risk_score_of_similar_offenders} />
                  {profile.inferred_profile.likely_time_window && <ProfileStat label="Likely Time Window" value={profile.inferred_profile.likely_time_window} />}
                </div>
                {profile.inferred_profile.common_modus_operandi && (
                  <div className="mt-4 bg-dark-800/50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Common Modus Operandi</p>
                    <p className="text-sm text-gray-300">{profile.inferred_profile.common_modus_operandi}</p>
                  </div>
                )}
              </div>

              <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5">
                <p className="text-xs text-blue-300">
                  Based on {profile.based_on_known_offenders} known offender(s) from {profile.based_on_similar_solved_cases} similar solved case(s). {profile.confidence_explanation}
                </p>
              </div>

              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-primary-400" />
                  Recommended Next Steps
                </h3>
                <ul className="space-y-1.5">
                  {profile.next_steps.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-dark-800/50 rounded-lg p-3 text-center">
      <p className="text-sm font-bold text-white capitalize">{value}</p>
      <p className="text-[10px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}
