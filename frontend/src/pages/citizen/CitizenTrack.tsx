import { useState } from 'react'
import { Search, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react'
import { citizenAPI } from '@/lib/api'
import toast from 'react-hot-toast'

const STATUS_STEPS = ['submitted', 'acknowledged', 'fir_registered', 'investigating', 'resolved']
const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', acknowledged: 'Acknowledged', fir_registered: 'FIR Registered',
  investigating: 'Investigating', resolved: 'Resolved', escalated: 'Escalated',
}

export function CitizenTrack() {
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const track = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) return
    setLoading(true)
    try {
      const data = await citizenAPI.trackComplaint(trackingId.trim())
      setResult(data)
    } catch {
      toast.error('No complaint found with this tracking ID')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const currentStep = result ? STATUS_STEPS.indexOf(result.status) : -1

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-400" /> Track Your Complaint
        </h1>
        <p className="text-sm text-gray-400 mt-1">Enter your tracking ID for a transparent, real-time status.</p>
      </div>

      <form onSubmit={track} className="glass-card p-4 flex gap-3 mb-6">
        <input value={trackingId} onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
          placeholder="e.g. KSP-A1B2C3" className="input-field flex-1 font-mono" />
        <button type="submit" disabled={loading} className="btn-primary px-6 disabled:opacity-50">
          {loading ? '...' : 'Track'}
        </button>
      </form>

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Escalation banner */}
          {result.is_escalated && (
            <div className="glass-card p-4 border-l-4 border-l-red-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-400">Escalated to Higher Authority</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{result.escalation_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status header */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Tracking ID</p>
                <p className="text-lg font-bold font-mono text-gradient">{result.tracking_id}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                result.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                result.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
                'bg-primary-500/20 text-primary-400'
              }`}>{STATUS_LABELS[result.status] || result.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500">Crime Type:</span> <span className="text-gray-200 capitalize">{result.crime_type}</span></div>
              <div><span className="text-gray-500">Location:</span> <span className="text-gray-200">{result.location}</span></div>
              <div><span className="text-gray-500">Station:</span> <span className="text-gray-200">{result.station_assigned}</span></div>
              <div><span className="text-gray-500">Filed on:</span> <span className="text-gray-200">{result.filed_on}</span></div>
              {result.fir_number && <div className="col-span-2"><span className="text-gray-500">FIR Number:</span> <span className="text-primary-400 font-mono">{result.fir_number}</span></div>}
              <div><span className="text-gray-500">Days pending:</span> <span className={result.days_pending >= 7 ? 'text-red-400' : 'text-gray-200'}>{result.days_pending}</span></div>
            </div>
          </div>

          {/* Progress timeline */}
          {result.status !== 'escalated' && (
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-gray-300 mb-4">Progress</h4>
              <div className="flex items-center justify-between relative">
                {STATUS_STEPS.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      idx <= currentStep ? 'bg-primary-600' : 'bg-dark-700'
                    }`}>
                      {idx <= currentStep ? <CheckCircle className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-gray-500" />}
                    </div>
                    <p className={`text-[9px] mt-1.5 text-center ${idx <= currentStep ? 'text-primary-400' : 'text-gray-600'}`}>
                      {STATUS_LABELS[step]}
                    </p>
                  </div>
                ))}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-dark-700 -z-0">
                  <div className="h-full bg-primary-600 transition-all" style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Last action */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-primary-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-300">Latest Update</p>
                <p className="text-xs text-gray-400">{result.last_action_note}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
