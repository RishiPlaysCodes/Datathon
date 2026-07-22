import { useState } from 'react'
import { FileWarning, Shield, Search, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import axios from 'axios'
import { API_BASE } from '@/lib/api'
import toast from 'react-hot-toast'

const publicApi = axios.create({ baseURL: `${API_BASE}/api/v1/public` })

export function PublicPortalPage() {
  const [tab, setTab] = useState<'register' | 'scam' | 'track'>('register')

  return (
    <div className="min-h-screen bg-dark-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-primary-400" />
            PRAHARI Public Portal
          </h1>
          <p className="text-gray-400 mt-2">
            Karnataka State Police — File complaints, detect scams, track status
          </p>
          <p className="text-xs text-gray-600 mt-1">
            No login required · AI-powered crime classification · Complaints visible publicly after 7 days if unresolved
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {[
            { id: 'register', label: 'Register Complaint', icon: FileWarning },
            { id: 'scam', label: 'Scam Detector', icon: AlertTriangle },
            { id: 'track', label: 'Track Status', icon: Search },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                tab === id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'register' && <ComplaintForm />}
        {tab === 'scam' && <ScamDetector />}
        {tab === 'track' && <TrackComplaint />}
      </div>
    </div>
  )
}

function ComplaintForm() {
  const [form, setForm] = useState({ complainant_name: '', complainant_phone: '', complainant_email: '', description: '', location_name: '', district: 'Bengaluru Urban' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.complainant_name.trim() || form.description.trim().length < 20) {
      toast.error('Name and description (min 20 chars) are required')
      return
    }
    setLoading(true)
    try {
      const { data } = await publicApi.post('/complaint', form)
      setResult(data)
      toast.success('Complaint registered successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-6 h-6" />
          <h2 className="text-xl font-bold">Complaint Registered</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="Complaint Number" value={result.complaint_number} />
          <InfoCard label="Status" value={result.status} />
          <InfoCard label="AI Crime Type" value={result.ai_crime_type} />
          <InfoCard label="AI Confidence" value={`${(result.ai_confidence * 100).toFixed(0)}%`} />
          <InfoCard label="Severity" value={result.ai_severity} />
          <InfoCard label="Law Violated" value={result.law_violated ? 'Yes' : 'Not detected'} />
        </div>
        {result.ai_law_sections?.length > 0 && (
          <div className="bg-dark-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase mb-1">Applicable Law Sections</p>
            {result.ai_law_sections.map((s: string, i: number) => (
              <p key={i} className="text-sm text-gray-300">{s}</p>
            ))}
          </div>
        )}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300">{result.advisory}</p>
        </div>
        <p className="text-xs text-gray-500">{result.message}</p>
        <button onClick={() => { setResult(null); setForm({ complainant_name: '', complainant_phone: '', complainant_email: '', description: '', location_name: '', district: 'Bengaluru Urban' }) }} className="btn-primary text-sm">
          Register Another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Register a Complaint</h2>
      <p className="text-xs text-gray-500">AI will auto-detect crime type and applicable Indian laws</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="input-field" placeholder="Your Name *" value={form.complainant_name} onChange={e => setForm({ ...form, complainant_name: e.target.value })} required />
        <input className="input-field" placeholder="Phone (optional)" value={form.complainant_phone} onChange={e => setForm({ ...form, complainant_phone: e.target.value })} />
        <input className="input-field" placeholder="Email (optional)" value={form.complainant_email} onChange={e => setForm({ ...form, complainant_email: e.target.value })} />
        <input className="input-field" placeholder="Location" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} />
      </div>
      <textarea className="input-field min-h-[120px]" placeholder="Describe what happened in detail (min 20 characters)... The AI will analyze this to detect crime type and applicable laws." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
        {loading ? 'Analyzing & Submitting...' : 'Submit Complaint (AI will classify)'}
      </button>
    </form>
  )
}

function ScamDetector() {
  const [content, setContent] = useState('')
  const [source, setSource] = useState('whatsapp')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const analyze = async () => {
    if (content.trim().length < 5) { toast.error('Paste the suspicious message'); return }
    setLoading(true)
    try {
      const { data } = await publicApi.post('/scam-detect', { content, source })
      setResult(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Scam Detection Engine</h2>
      <p className="text-xs text-gray-500">Paste a suspicious message, email, or call transcript — AI will analyze it</p>
      <div className="flex gap-2">
        {['whatsapp', 'sms', 'email', 'call_transcript'].map(s => (
          <button key={s} onClick={() => setSource(s)} className={`text-xs px-3 py-1.5 rounded-full ${source === s ? 'bg-primary-600 text-white' : 'bg-dark-800 text-gray-400'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <textarea className="input-field min-h-[100px]" placeholder='Paste the suspicious message here, e.g.: "Your account is blocked. Click this link to verify KYC immediately: bit.ly/xyz"' value={content} onChange={e => setContent(e.target.value)} />
      <button onClick={analyze} disabled={loading} className="btn-primary w-full disabled:opacity-50">
        {loading ? 'Analyzing...' : 'Detect Scam'}
      </button>

      {result && (
        <div className={`rounded-lg p-4 border ${result.is_scam ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.is_scam ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-green-400" />}
            <span className={`font-bold ${result.is_scam ? 'text-red-400' : 'text-green-400'}`}>
              {result.is_scam ? `SCAM DETECTED: ${result.scam_description}` : 'No scam patterns detected'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><span className="text-gray-500">Confidence:</span> <span className="text-white">{(result.confidence * 100).toFixed(0)}%</span></div>
            <div><span className="text-gray-500">Risk Level:</span> <span className={`font-medium ${result.risk_level === 'critical' ? 'text-red-400' : result.risk_level === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>{result.risk_level?.toUpperCase()}</span></div>
          </div>
          {result.matched_patterns?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Matched patterns:</p>
              <div className="flex flex-wrap gap-1">{result.matched_patterns.map((p: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">{p}</span>)}</div>
            </div>
          )}
          <div className="bg-dark-800/50 rounded p-3 mb-3">
            <p className="text-sm text-yellow-300 font-medium">{result.advisory}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Recommended actions:</p>
            {result.recommended_actions?.map((a: string, i: number) => <p key={i} className="text-xs text-gray-300">• {a}</p>)}
          </div>
          <div className="mt-3 pt-3 border-t border-dark-700">
            <p className="text-xs text-gray-500">Report at:</p>
            {result.report_links?.map((l: string, i: number) => <p key={i} className="text-xs text-primary-400">{l}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}

function TrackComplaint() {
  const [number, setNumber] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const track = async () => {
    if (!number.trim()) { toast.error('Enter complaint number'); return }
    setLoading(true)
    try {
      const { data } = await publicApi.get(`/complaint/${encodeURIComponent(number.trim())}`)
      setResult(data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Not found')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Track Your Complaint</h2>
      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="Enter complaint number (e.g. PUB/20260722/A1B2C3D4)" value={number} onChange={e => setNumber(e.target.value)} />
        <button onClick={track} disabled={loading} className="btn-primary disabled:opacity-50">{loading ? '...' : 'Track'}</button>
      </div>
      {result && (
        <div className="bg-dark-800/50 rounded-lg p-4 space-y-2">
          <InfoCard label="Complaint Number" value={result.complaint_number} />
          <InfoCard label="Status" value={result.status} />
          <InfoCard label="Crime Type (AI)" value={result.ai_crime_type} />
          <InfoCard label="Severity" value={result.ai_severity} />
          <InfoCard label="Submitted" value={result.submitted_at} />
          {result.resolved_at && <InfoCard label="Resolved" value={result.resolved_at} />}
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-800/30 rounded p-2">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value || '-'}</p>
    </div>
  )
}
