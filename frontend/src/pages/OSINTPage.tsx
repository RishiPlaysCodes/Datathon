import { useState } from 'react'
import { Search, Globe, Phone, User, Building, Scale, AlertTriangle, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'

export function OSINTPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const lookup = async () => {
    if (!query.trim()) { toast.error('Enter a phone, email, or name to search'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/intelligence/osint-lookup')
      setResult(data)
      toast.success('OSINT lookup complete')
    } catch { toast.error('Lookup failed') }
    finally { setLoading(false) }
  }

  const iconMap: Record<string, any> = {
    phone_identity: Phone, social_presence: Globe, business_links: Building,
    media_mentions: ExternalLink, legal_history: Scale,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-400" />
          OSINT Intelligence Engine
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Open Source Intelligence — aggregate public data across platforms to build suspect profiles
        </p>
      </div>

      {/* Search */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Subject Lookup</h3>
        <div className="flex gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter phone number, email, name, or UPI ID..."
            className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && lookup()} />
          <button onClick={lookup} disabled={loading} className="btn-primary px-6 disabled:opacity-50">
            {loading ? '...' : 'OSINT Lookup'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">Sources: Truecaller</span>
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">Social Media</span>
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">Company Registrar (MCA)</span>
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">News Archives</span>
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">eCourts</span>
          <span className="text-[10px] px-2 py-1 rounded bg-dark-700 text-gray-400">WHOIS</span>
        </div>
      </div>

      {loading && <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>}

      {result && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Risk Assessment */}
          <div className={`glass-card p-5 border-l-4 ${
            result.risk_assessment.overall_risk === 'HIGH' ? 'border-l-red-500' : 'border-l-yellow-500'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Overall Risk Assessment</h3>
                <p className="text-xs text-gray-400 mt-1">{result.risk_assessment.summary}</p>
              </div>
              <div className={`text-3xl font-bold ${
                result.risk_assessment.overall_risk === 'HIGH' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {result.risk_assessment.score}/100
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Subject Searched</p>
            <p className="text-sm font-medium text-gray-200 font-mono mt-0.5">{result.subject}</p>
            <p className="text-xs text-gray-500 mt-1">Sources queried: {result.lookup_sources?.join(', ')}</p>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            {result.findings?.map((f: any, i: number) => {
              const Icon = iconMap[f.type] || Globe
              return (
                <div key={i} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-200">{f.source}</h4>
                        <p className="text-[10px] text-gray-500">{f.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                      f.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>Confidence: {f.confidence}%</span>
                  </div>
                  <div className="bg-dark-800/50 rounded-lg p-3">
                    {Object.entries(f.data).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2 mb-1.5 last:mb-0">
                        <span className="text-[10px] text-gray-500 min-w-[100px] capitalize">{key.replace('_', ' ')}:</span>
                        <span className="text-xs text-gray-300">
                          {Array.isArray(val) ? (val as string[]).map((v, j) => <span key={j} className="block">{v}</span>) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legal Note + Simulation Disclaimer */}
          <div className="glass-card p-4 border-l-4 border-l-primary-500">
            <p className="text-xs text-gray-400">{result.legal_note}</p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-yellow-400/80">
              <b>Demo Note:</b> In production, this connects to live APIs (Truecaller, MCA, eCourts, social platforms).
              Currently showing representative intelligence output to demonstrate the system architecture.
              Real deployment requires API subscriptions and legal authorization for each data source.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
