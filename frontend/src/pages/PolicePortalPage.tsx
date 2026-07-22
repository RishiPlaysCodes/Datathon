import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { publicPoliceAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Inbox, Phone, Mail, MapPin, Clock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  under_review: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  escalated: 'bg-red-500/20 text-red-400',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-500/20 text-gray-400',
}

export function PolicePortalPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['complaint-inbox', statusFilter],
    queryFn: () => publicPoliceAPI.getInbox(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 30000, // auto-refresh every 30s so new complaints appear without manual reload
  })

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await publicPoliceAPI.updateStatus(id, status)
      toast.success(`Marked as ${status.replace('_', ' ')}`)
      queryClient.invalidateQueries({ queryKey: ['complaint-inbox'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Update failed')
    }
  }

  const handleConvertToFir = async (id: number) => {
    try {
      const result = await publicPoliceAPI.convertToFir(id)
      toast.success(`Converted to FIR: ${result.fir_number}`)
      queryClient.invalidateQueries({ queryKey: ['complaint-inbox'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Conversion failed')
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary-400" />
            Public Complaint Inbox
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Every complaint filed via the public portal — refreshes automatically every 30 seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && data.pending_count > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
              {data.pending_count} pending
            </span>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {!data || data.complaints.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No complaints in this filter yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.complaints.map(c => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex-1 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-primary-400">{c.complaint_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-500/20 text-gray-400'}`}>{c.status.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[c.ai_severity] || ''}`}>{c.ai_severity}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-300">{c.ai_crime_type}</span>
                    {!c.law_violated && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-400">No law violation detected</span>}
                  </div>
                  <p className="text-sm text-gray-200 mb-2">{c.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.complainant_name} {c.complainant_phone && `· ${c.complainant_phone}`}</span>
                    {c.complainant_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.complainant_email}</span>}
                    {c.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location_name}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.submitted_at).toLocaleString('en-IN')}</span>
                  </div>
                  {c.ai_law_sections?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.ai_law_sections.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">{s}</span>)}
                    </div>
                  )}
                  {c.will_go_public_at && (
                    <p className="text-[10px] text-yellow-500/80 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Becomes publicly visible on {new Date(c.will_go_public_at).toLocaleDateString('en-IN')} if unresolved
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {c.status !== 'under_review' && (
                    <button onClick={() => handleStatusUpdate(c.id, 'under_review')} className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                      Mark Under Review
                    </button>
                  )}
                  {c.status !== 'resolved' && (
                    <button onClick={() => handleStatusUpdate(c.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />Resolve
                    </button>
                  )}
                  <button onClick={() => handleConvertToFir(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 flex items-center gap-1">
                    <FileText className="w-3 h-3" />Convert to FIR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
