import { useState } from 'react'
import { FilePlus, CheckCircle, Copy, ArrowRight } from 'lucide-react'
import { citizenAPI } from '@/lib/api'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const CRIME_TYPES = ['theft', 'chain snatching', 'robbery', 'assault', 'fraud', 'cyber crime',
  'domestic violence', 'vehicle theft', 'kidnapping', 'harassment', 'other']
const LOCALITIES = ['Koramangala', 'Jayanagar', 'Indiranagar', 'Whitefield', 'BTM Layout',
  'HSR Layout', 'Marathahalli', 'Electronic City', 'Yelahanka', 'Malleswaram', 'MG Road', 'Other']

export function CitizenReport() {
  const [form, setForm] = useState({ complainant_name: '', phone: '', crime_type: '', description: '', location_name: '', is_anonymous: false })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.crime_type || !form.description) {
      toast.error('Please fill crime type and description')
      return
    }
    setLoading(true)
    try {
      const data = await citizenAPI.fileComplaint({ ...form, district: 'Bengaluru Urban' })
      setResult(data)
      toast.success('Complaint filed!')
    } catch {
      toast.error('Failed to file. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Complaint Filed Successfully</h2>
          <p className="text-sm text-gray-400 mt-2">{result.message}</p>

          <div className="mt-6 p-4 rounded-xl bg-dark-800/60 border border-primary-500/20">
            <p className="text-xs text-gray-500">Your Tracking ID</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gradient font-mono">{result.tracking_id}</span>
              <button onClick={() => { navigator.clipboard.writeText(result.tracking_id); toast.success('Copied!') }}
                className="p-1.5 rounded bg-dark-700 text-gray-400 hover:text-white">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-orange-400 mt-4 leading-relaxed">{result.escalation_policy}</p>

          <div className="flex gap-3 mt-6">
            <Link to="/citizen/track" className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
              Track Status <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => { setResult(null); setForm({ complainant_name: '', phone: '', crime_type: '', description: '', location_name: '', is_anonymous: false }) }}
              className="btn-secondary flex-1 py-2.5">File Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-primary-400" /> File a Complaint
        </h1>
        <p className="text-sm text-gray-400 mt-1">Report a crime from home. You'll get a tracking ID and full transparency.</p>
      </div>

      <form onSubmit={submit} className="glass-card p-6 space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
            className="rounded border-dark-600 bg-dark-800 text-primary-500" />
          File anonymously (your identity stays hidden)
        </label>

        {!form.is_anonymous && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Your Name</label>
              <input value={form.complainant_name} onChange={(e) => setForm({ ...form, complainant_name: e.target.value })}
                className="input-field w-full" placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field w-full" placeholder="Mobile number" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Crime Type *</label>
            <select value={form.crime_type} onChange={(e) => setForm({ ...form, crime_type: e.target.value })} className="input-field w-full">
              <option value="">Select...</option>
              {CRIME_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Location</label>
            <select value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} className="input-field w-full">
              <option value="">Select...</option>
              {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">What happened? *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field w-full h-28 resize-none" placeholder="Describe the incident: what, where, when, who..." />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Filing...' : 'Submit Complaint'}
        </button>
        <p className="text-[10px] text-gray-600 text-center">
          Your complaint is logged in the official system. If not acted upon in 7 days, it auto-escalates to higher authorities.
        </p>
      </form>
    </div>
  )
}
