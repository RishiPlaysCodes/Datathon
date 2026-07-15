import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI, analysisAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Briefcase, Clock, Search, FileText, Lightbulb, CheckCircle } from 'lucide-react'
import type { FIR } from '@/types'

export function InvestigatorPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const { data: firData, isLoading } = useQuery({
    queryKey: ['firs-investigator', search],
    queryFn: () => crimeAPI.listFIRs({ search: search || undefined, limit: 15 }),
  })

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ['case-summary', selectedId],
    queryFn: () => crimeAPI.getCaseSummary(selectedId!),
    enabled: !!selectedId,
  })

  const { data: similar } = useQuery({
    queryKey: ['similar-cases', selectedId],
    queryFn: () => analysisAPI.getSimilarCases(selectedId!),
    enabled: !!selectedId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary-400" />
          Investigator Decision Support
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI case summaries, timelines, leads, and similar past cases - all from live data
        </p>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FIR by number, description, or location..." className="input-field w-full pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? <LoadingSpinner /> : firData?.firs.map((fir: FIR) => (
            <button key={fir.id} onClick={() => setSelectedId(fir.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedId === fir.id ? 'border-primary-500/50 bg-primary-500/10' : 'border-dark-700/30 bg-dark-800/50 hover:border-dark-600'
              }`}>
              <p className="text-xs font-mono text-primary-400">{fir.fir_number}</p>
              <p className="text-sm text-gray-200 truncate mt-0.5">{fir.description}</p>
              <p className="text-xs text-gray-500 mt-1">{fir.crime_type} • {fir.location_name}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {loadingCase ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : caseData ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" /> AI Case Summary
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{caseData.summary}</p>
                {caseData.accused_names?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {caseData.accused_names.map((n: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">{n}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-400" /> Investigation Timeline
                </h4>
                <div className="relative pl-6">
                  {caseData.timeline.map((event: any, idx: number) => (
                    <div key={idx} className="relative pb-4 last:pb-0">
                      <div className={`absolute left-[-18px] top-1 w-3 h-3 rounded-full border-2 ${event.completed ? 'bg-green-500 border-green-500' : 'bg-dark-800 border-gray-500'}`} />
                      {idx < caseData.timeline.length - 1 && <div className="absolute left-[-13px] top-4 w-0.5 h-full bg-dark-600" />}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-200">{event.action}</p>
                        <span className="text-xs text-gray-500">{event.date}</span>
                      </div>
                      {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
                      {!event.completed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 mt-1 inline-block">PENDING</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leads */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" /> AI Recommended Leads
                </h4>
                <div className="space-y-2">
                  {caseData.leads.map((lead: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-2 rounded bg-dark-800/50">
                      <CheckCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-200">{lead.action}</p>
                        <p className="text-xs text-gray-500">{lead.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Cases (real DB matches) */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary-400" /> Similar Past Cases (Live DB Match)
                </h4>
                <div className="space-y-2">
                  {similar?.similar_cases?.length > 0 ? similar.similar_cases.map((sc: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-dark-800/50 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-200 font-mono">{sc.fir_number}</span>
                        <span className="text-primary-400">{sc.similarity}% match</span>
                      </div>
                      <p className="text-gray-500 mt-0.5">{sc.description}</p>
                      <p className={`mt-0.5 ${sc.outcome === 'Solved' ? 'text-green-400' : 'text-yellow-400'}`}>Outcome: {sc.outcome}</p>
                    </div>
                  )) : <p className="text-xs text-gray-500">No similar cases found in database.</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400">Select a Case</h3>
              <p className="text-sm text-gray-600 mt-1">Choose an FIR to see AI-powered investigation support</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
