import { useState } from 'react'
import { Fingerprint, Shield, AlertTriangle, Search, CheckCircle } from 'lucide-react'
import { analysisAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'

const ATTACK_LABELS: Record<string, string> = {
  phishing: 'Phishing', sim_swap: 'SIM Swap', upi_fraud: 'UPI Fraud',
  ransomware: 'Ransomware', social_media_hack: 'Social Media Hack',
}

interface Analysis {
  name: string
  description: string
  steps: string[]
  forensics: string[]
  evidence: string[]
  laws: string[]
}

export function CyberForensicsPage() {
  const [complaint, setComplaint] = useState('')
  const [detected, setDetected] = useState<string>('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [allTypes, setAllTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const analyze = async (attackType?: string) => {
    if (!complaint.trim() && !attackType) {
      toast.error('Paste a complaint or select an attack type')
      return
    }
    setLoading(true)
    try {
      const data = await analysisAPI.cyberForensics({
        complaint: complaint || 'manual selection',
        attack_type: attackType || '',
      })
      setDetected(data.detected_attack)
      setAnalysis(data.analysis)
      setAllTypes(data.all_types)
    } catch {
      toast.error('Analysis failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Fingerprint className="w-6 h-6 text-primary-400" />
          Cyber Crime Forensics
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Attack method detection, forensic analysis, and investigation guidance
        </p>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Paste Cyber Crime Complaint</h3>
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="Paste the victim's complaint... AI auto-detects the attack method and provides forensic guidance"
          className="input-field w-full h-24 resize-none"
        />
        <button onClick={() => analyze()} disabled={loading} className="btn-primary mt-3 disabled:opacity-50">
          <Search className="w-4 h-4 inline mr-2" /> Detect Attack Method
        </button>
      </div>

      {allTypes.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Or Select Attack Type</h3>
          <div className="flex flex-wrap gap-2">
            {allTypes.map((key) => (
              <button key={key} onClick={() => analyze(key)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                  detected === key ? 'border-primary-500 bg-primary-500/20 text-primary-400' : 'border-dark-600 bg-dark-800 text-gray-300 hover:border-primary-500/50'
                }`}>
                {ATTACK_LABELS[key] || key}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>}

      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-red-400 mb-1">{analysis.name}</h4>
            <p className="text-xs text-gray-400 mb-4">{analysis.description}</p>
            <h5 className="text-xs font-semibold text-gray-300 mb-2">How The Attack Happened:</h5>
            <div className="space-y-2">
              {analysis.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">{i + 1}</span>
                  <p className="text-xs text-gray-300">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-dark-700/30">
              <h5 className="text-xs font-semibold text-gray-300 mb-2">Applicable Laws:</h5>
              <div className="flex flex-wrap gap-1.5">
                {analysis.laws.map((law, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">{law}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Forensic Investigation Steps
              </h4>
              <div className="space-y-2">
                {analysis.forensics.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-dark-800/50">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Evidence to Collect
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.evidence.map((ev, i) => (
                  <span key={i} className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">{ev}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
