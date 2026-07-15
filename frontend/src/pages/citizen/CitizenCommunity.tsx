import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { citizenAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Users, ThumbsUp, Plus, Eye, AlertTriangle, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
  { value: 'safety_hazard', label: 'Safety Hazard' },
  { value: 'missing_person', label: 'Missing Person' },
  { value: 'help_request', label: 'Help Request' },
]
const LOCALITIES = ['Koramangala', 'Jayanagar', 'Indiranagar', 'Whitefield', 'BTM Layout', 'HSR Layout', 'Marathahalli', 'Electronic City', 'Other']

export function CitizenCommunity() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ report_type: 'suspicious_activity', title: '', description: '', location_name: '', severity: 'medium' })

  const { data: reports, isLoading } = useQuery({
    queryKey: ['community-reports'],
    queryFn: () => citizenAPI.getCommunityReports(),
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description) { toast.error('Fill title and description'); return }
    try {
      await citizenAPI.fileCommunityReport({ ...form, is_anonymous: true })
      toast.success('Report submitted. Thank you!')
      setShowForm(false)
      setForm({ report_type: 'suspicious_activity', title: '', description: '', location_name: '', severity: 'medium' })
      qc.invalidateQueries({ queryKey: ['community-reports'] })
    } catch { toast.error('Failed to submit') }
  }

  const upvote = async (id: number) => {
    try {
      await citizenAPI.upvoteReport(id)
      qc.invalidateQueries({ queryKey: ['community-reports'] })
    } catch { toast.error('Failed') }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-400" /> Community Watch
          </h1>
          <p className="text-sm text-gray-400 mt-1">Report and see local safety concerns. Help each other stay safe.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Close' : 'Report'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass-card p-5 mb-6 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} className="input-field">
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} className="input-field">
              <option value="">Location...</option>
              {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short title" className="input-field w-full" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what you observed..." className="input-field w-full h-20 resize-none" />
          <div className="flex items-center gap-3">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="input-field">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <button type="submit" className="btn-primary flex-1">Submit Anonymously</button>
          </div>
        </form>
      )}

      {isLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports?.map((r: any) => (
            <div key={r.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    r.report_type === 'missing_person' || r.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    'bg-primary-500/20 text-primary-400'
                  }`}>{r.report_type.replace('_', ' ')}</span>
                  {r.status === 'verified' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> Verified</span>}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.severity === 'high' ? 'text-red-400' : 'text-gray-500'}`}>{r.severity}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-200">{r.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{r.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location || 'Unknown'} · {r.created_at}</span>
                <button onClick={() => upvote(r.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-400 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" /> {r.upvotes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
