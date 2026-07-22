import { useState } from 'react'
import { Search, GitCompare, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function CaseSimilarityPage() {
  const [firId, setFirId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const search = async () => {
    const id = parseInt(firId)
    if (!id || id < 1) { toast.error('Enter a valid FIR ID'); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/public/case-similarity/${id}`)
      setResult(data)
      if (data.total_matches === 0) toast('No similar cases found')
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
          Case Similarity Engine
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Find similar past cases by crime type, location, modus operandi, and timeline
        </p>
      </div>

      {/* Search */}
      <div className="glass-card p-4 flex gap-3 items-center">
        <input className="input-field flex-1" type="number" min="1" placeholder="Enter FIR ID (e.g. 1, 5, 10...)" value={firId} onChange={e => setFirId(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} disabled={loading} className="btn-primary px-6 disabled:opacity-40">
          {loading ? 'Searching...' : <><Search className="w-4 h-4 mr-1 inline" />Find Similar</>}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Source FIR */}
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Source Case</p>
            <div className="flex items-center gap-3">
              <span className="text-primary-400 font-mono text-sm">{result.source_fir.fir_number}</span>
              <span className="text-white">{result.source_fir.crime_type}</span>
              {result.source_fir.location_name && <span className="text-gray-500 text-xs">{result.source_fir.location_name}</span>}
            </div>
          </div>

          {/* Similar cases */}
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
    </div>
  )
}
