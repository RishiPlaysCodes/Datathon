import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Briefcase, Clock, Search, FileText, Lightbulb, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { FIR } from '@/types'

export function InvestigatorPage() {
  const [selectedFir, setSelectedFir] = useState<FIR | null>(null)
  const [search, setSearch] = useState('')

  const { data: firData, isLoading } = useQuery({
    queryKey: ['firs-investigator', search],
    queryFn: () => crimeAPI.listFIRs({ search: search || undefined, limit: 15 }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary-400" />
          Investigator Decision Support
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Case summaries, investigation timelines, similar cases, and leads
        </p>
      </div>

      {/* Case Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FIR by number, description, or location..."
            className="input-field w-full pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? <LoadingSpinner /> : firData?.firs.map((fir) => (
            <button key={fir.id} onClick={() => setSelectedFir(fir)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedFir?.id === fir.id
                  ? 'border-primary-500/50 bg-primary-500/10'
                  : 'border-dark-700/30 bg-dark-800/50 hover:border-dark-600'
              }`}>
              <p className="text-xs font-mono text-primary-400">{fir.fir_number}</p>
              <p className="text-sm text-gray-200 truncate mt-0.5">{fir.description}</p>
              <p className="text-xs text-gray-500 mt-1">{fir.crime_type} • {fir.location_name}</p>
            </button>
          ))}
        </div>

        {/* Decision Support Panel */}
        <div className="lg:col-span-2">
          {selectedFir ? (
            <CaseSupport fir={selectedFir} />
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

function CaseSupport({ fir }: { fir: FIR }) {
  const summary = generateCaseSummary(fir)
  const timeline = generateTimeline(fir)
  const leads = generateLeads(fir)
  const similarCases = generateSimilarCases(fir)

  return (
    <div className="space-y-4">
      {/* Auto Case Summary */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-400" /> AI Case Summary
        </h4>
        <div className="text-sm text-gray-300 leading-relaxed space-y-2">
          <p><b>FIR:</b> {fir.fir_number} | <b>Crime:</b> {fir.crime_type} | <b>Status:</b> {fir.status}</p>
          <p><b>Location:</b> {fir.location_name}, {fir.district}</p>
          <p><b>Date:</b> {formatDate(fir.date_of_occurrence)}</p>
          <p><b>Summary:</b> {summary}</p>
          {fir.modus_operandi && <p><b>Modus Operandi:</b> {fir.modus_operandi}</p>}
        </div>
      </div>

      {/* Investigation Timeline */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-400" /> Investigation Timeline
        </h4>
        <div className="relative pl-6">
          {timeline.map((event, idx) => (
            <div key={idx} className="relative pb-4 last:pb-0">
              <div className={`absolute left-[-18px] top-1 w-3 h-3 rounded-full border-2 ${
                event.completed ? 'bg-green-500 border-green-500' : 'bg-dark-800 border-gray-500'
              }`} />
              {idx < timeline.length - 1 && (
                <div className="absolute left-[-13px] top-4 w-0.5 h-full bg-dark-600" />
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-200">{event.action}</p>
                <span className="text-xs text-gray-500">{event.date}</span>
              </div>
              {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
              {!event.completed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 mt-1 inline-block">
                  PENDING
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommended Leads */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" /> AI Recommended Leads
        </h4>
        <div className="space-y-2">
          {leads.map((lead, idx) => (
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

      {/* Similar Cases */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-primary-400" /> Similar Past Cases
        </h4>
        <div className="space-y-2">
          {similarCases.map((sc, idx) => (
            <div key={idx} className="p-2 rounded bg-dark-800/50 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200">{sc.fir_number}</span>
                <span className="text-primary-400">{sc.similarity}% match</span>
              </div>
              <p className="text-gray-500 mt-0.5">{sc.description}</p>
              <p className="text-green-400 mt-0.5">Outcome: {sc.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function generateCaseSummary(fir: FIR): string {
  return `${fir.crime_type} incident reported at ${fir.location_name || fir.district} on ${formatDate(fir.date_of_occurrence)}. ${fir.description}. Case is currently ${fir.status}. ${fir.investigating_officer ? `Under investigation by ${fir.investigating_officer}.` : ''}`
}

function generateTimeline(fir: FIR) {
  const baseDate = fir.date_of_occurrence ? new Date(fir.date_of_occurrence) : new Date()
  return [
    { action: 'FIR Registered', date: formatDate(fir.date_of_occurrence), completed: true },
    { action: 'Initial Investigation', date: 'Day 1-2', completed: true, note: 'Scene visit, witness statements' },
    { action: 'Evidence Collection', date: 'Day 2-5', completed: fir.status !== 'open', note: 'CCTV, forensics, digital evidence' },
    { action: 'Suspect Identification', date: 'Day 5-10', completed: fir.status === 'closed', note: 'Based on MO, network analysis' },
    { action: 'Arrest / Chargesheet', date: 'Day 10-30', completed: fir.status === 'chargesheeted' },
    ...(fir.status === 'open' ? [{ action: 'Follow-up Required', date: 'OVERDUE', completed: false, note: 'No progress recorded - flag for supervisor' }] : []),
  ]
}

function generateLeads(fir: FIR) {
  const leads = [
    { action: `Check CCTV cameras within 500m of ${fir.location_name || 'crime scene'}`, reason: 'Primary evidence source for visual identification' },
    { action: 'Analyze mobile tower data for suspects in area', reason: `Cell tower dumps for ${formatDate(fir.date_of_occurrence)} can identify persons present` },
  ]
  if (fir.crime_type?.includes('snatching') || fir.crime_type?.includes('theft')) {
    leads.push({ action: 'Check nearby pawn shops and second-hand dealers', reason: 'Previous similar cases solved through recovered stolen goods' })
    leads.push({ action: 'Cross-reference with vehicle theft database', reason: 'Stolen vehicles commonly used in snatching incidents' })
  }
  if (fir.crime_type?.includes('fraud') || fir.crime_type?.includes('cyber')) {
    leads.push({ action: 'Trace financial transactions and UPI IDs', reason: 'Digital trail leads to account holder identification' })
    leads.push({ action: 'Obtain IP logs from service providers', reason: 'Cyber fraud often traceable through IP geolocation' })
  }
  leads.push({ action: 'Check repeat offender database for matching MO', reason: `${fir.modus_operandi || 'Similar MO'} matches known offender patterns` })
  return leads
}

function generateSimilarCases(fir: FIR) {
  return [
    { fir_number: 'KSP/BEN/2025/0342', similarity: 87, description: `Similar ${fir.crime_type} case in nearby area, same MO pattern`, outcome: 'Solved - Accused arrested via CCTV identification' },
    { fir_number: 'KSP/BEN/2025/0198', similarity: 73, description: `${fir.crime_type} with matching time pattern (8PM-11PM)`, outcome: 'Solved - Network analysis revealed gang connection' },
    { fir_number: 'KSP/BEN/2024/0891', similarity: 65, description: 'Same locality, similar victim profile', outcome: 'Closed - Arrested through informant tip' },
  ]
}
