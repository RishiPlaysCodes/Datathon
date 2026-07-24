import { useState } from 'react'
import { Clock, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const STAGES = [
  { key: 'registered', label: 'FIR Registered', icon: '📋' },
  { key: 'assigned', label: 'Assigned to IO', icon: '👮' },
  { key: 'evidence', label: 'Evidence Collection', icon: '🔍' },
  { key: 'suspect', label: 'Suspect Identified', icon: '🎯' },
  { key: 'arrest', label: 'Arrest / Action', icon: '⚖️' },
  { key: 'chargesheet', label: 'Chargesheet Filed', icon: '📄' },
]

export function InvestigationTimelinePage() {
  const [firId, setFirId] = useState('')
  const [timeline, setTimeline] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [newEvent, setNewEvent] = useState({ date: '', description: '', officer: '' })

  const loadTimeline = async () => {
    if (!firId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/crime/firs/${firId}/report`)
      // Generate timeline from report data
      const events: any[] = []
      if (data.case_summary) {
        events.push({ stage: 'registered', date: data.case_summary.date_of_occurrence || 'N/A', description: `FIR ${data.case_summary.fir_number} registered — ${data.case_summary.crime_type}`, status: 'complete' })
      }
      if (data.case_summary?.investigating_officer) {
        events.push({ stage: 'assigned', date: data.case_summary.date_of_occurrence || 'N/A', description: `Assigned to IO: ${data.case_summary.investigating_officer}`, status: 'complete' })
      }
      if (data.similar_cases?.length > 0) {
        events.push({ stage: 'evidence', date: 'Ongoing', description: `${data.similar_cases.length} similar cases identified for cross-reference`, status: 'in_progress' })
      }
      if (data.network_analysis?.accused_involved?.length > 0) {
        events.push({ stage: 'suspect', date: 'Identified', description: `${data.network_analysis.accused_involved.length} suspect(s) linked via network analysis`, status: 'complete' })
      }
      // Determine completion
      const completed = events.filter(e => e.status === 'complete').length
      const total = STAGES.length
      setTimeline({ events, progress: Math.round((completed / total) * 100), report: data })
      toast.success(`Timeline loaded for FIR #${firId}`)
    } catch {
      toast.error('Failed to load — check FIR ID')
    }
    setLoading(false)
  }

  const addEvent = () => {
    if (!newEvent.date || !newEvent.description) return
    if (timeline) {
      setTimeline({
        ...timeline,
        events: [...timeline.events, { stage: 'custom', date: newEvent.date, description: `[${newEvent.officer || 'Officer'}] ${newEvent.description}`, status: 'complete' }],
      })
      setNewEvent({ date: '', description: '', officer: '' })
      toast.success('Event added to timeline')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Investigation Timeline</h1>
      <p className="text-gray-400 text-sm">Track investigation progress per FIR with gap detection and stage tracking.</p>

      {/* FIR ID Input */}
      <div className="flex gap-3">
        <input type="text" value={firId} onChange={e => setFirId(e.target.value)} placeholder="Enter FIR ID (e.g. 1, 2, 3...)" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
        <button onClick={loadTimeline} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {loading ? 'Loading...' : 'Load Timeline'}
        </button>
      </div>

      {timeline && (
        <>
          {/* Progress Bar */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Investigation Progress</span>
              <span className="text-blue-400 font-bold">{timeline.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all" style={{ width: `${timeline.progress}%` }} />
            </div>
          </div>

          {/* Stage Indicators */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STAGES.map((stage, i) => {
              const event = timeline.events.find((e: any) => e.stage === stage.key)
              const isComplete = event?.status === 'complete'
              const isActive = event?.status === 'in_progress'
              return (
                <div key={stage.key} className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium ${isComplete ? 'bg-green-900/30 border-green-600 text-green-400' : isActive ? 'bg-yellow-900/30 border-yellow-600 text-yellow-400' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}>
                  {stage.icon} {stage.label}
                </div>
              )
            })}
          </div>

          {/* Timeline Events */}
          <div className="space-y-3">
            {timeline.events.map((event: any, i: number) => (
              <div key={i} className={`flex gap-4 p-4 rounded-xl border ${event.status === 'complete' ? 'bg-gray-800/30 border-green-800/50' : 'bg-gray-800/30 border-yellow-800/50'}`}>
                <div className="flex-shrink-0 mt-1">
                  {event.status === 'complete' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{event.description}</p>
                  <p className="text-gray-500 text-xs mt-1">{event.date}</p>
                </div>
              </div>
            ))}

            {/* Gap Detection */}
            {timeline.events.length < 3 && (
              <div className="flex gap-4 p-4 rounded-xl border border-red-800/50 bg-red-900/10">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-red-300 text-sm font-medium">Investigation Gap Detected</p>
                  <p className="text-red-400/70 text-xs mt-1">Only {timeline.events.length} of 6 stages completed. FLAG for supervisor review.</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Manual Event */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Manual Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              <input type="text" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Event description" className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              <input type="text" value={newEvent.officer} onChange={e => setNewEvent({ ...newEvent, officer: e.target.value })} placeholder="Officer name" className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
            </div>
            <button onClick={addEvent} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">Add Event</button>
          </div>
        </>
      )}

      <p className="text-gray-600 text-xs">All results are deterministic. No external LLM. Grounded in database records.</p>
    </div>
  )
}
