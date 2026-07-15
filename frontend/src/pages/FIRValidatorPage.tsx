import { useState } from 'react'
import { Gavel, AlertTriangle, CheckCircle, XCircle, FileText, Scale } from 'lucide-react'
import { analysisAPI } from '@/lib/api'
import toast from 'react-hot-toast'

const CRIME_TYPES = [
  'theft', 'robbery', 'murder', 'assault', 'fraud', 'cyber crime',
  'domestic violence', 'chain snatching', 'burglary', 'kidnapping',
  'drug offense', 'vehicle theft', 'sexual offense', 'defamation', 'trespass',
]

interface ValidationResult {
  detected_crime_type: string
  valid: boolean
  score: number
  checks: { rule: string; passed: boolean; note: string }[]
  suggested_sections: string[]
  warnings: string[]
  law_references: string[]
  needs_review: boolean
}

export function FIRValidatorPage() {
  const [complaint, setComplaint] = useState('')
  const [crimeType, setCrimeType] = useState('')
  const [location, setLocation] = useState('')
  const [sections, setSections] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const validateFIR = async () => {
    if (!complaint.trim()) {
      toast.error('Please enter the complaint description')
      return
    }
    setLoading(true)
    try {
      const data = await analysisAPI.validateFIR({
        complaint, crime_type: crimeType, location, sections,
      })
      setResult(data)
      toast.success('FIR validated against Indian law')
    } catch {
      toast.error('Validation failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary-400" />
          AI FIR Validator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Validates FIR against BNS 2023, IPC, IT Act, BNSS - checks sections, jurisdiction, and rights
        </p>
      </div>

      <div className="glass-card p-4 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">How it works</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              When a citizen files an FIR, this AI validates it against Indian law in real time.
              It checks correct sections, cognizability, jurisdiction, and rights, then flags
              incorrect FIRs for police review without rejecting them.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">FIR Details</h3>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Complaint Description *</label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. 'Two men on a bike snatched my gold chain near Koramangala at 9PM yesterday'"
              className="input-field w-full h-32 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Crime Type</label>
              <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)} className="input-field w-full">
                <option value="">Auto-detect</option>
                {CRIME_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Location/PS</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala PS" className="input-field w-full" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Sections Applied (optional)</label>
            <input value={sections} onChange={(e) => setSections(e.target.value)} placeholder="e.g. 379/356 IPC or 303 BNS" className="input-field w-full" />
          </div>
          <button onClick={validateFIR} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
            {loading ? 'Validating against Indian Law...' : 'Validate FIR'}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className={`glass-card p-5 border-l-4 ${
                result.score >= 80 ? 'border-l-green-500' : result.score >= 50 ? 'border-l-yellow-500' : 'border-l-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">Validation Score</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Detected: <span className="text-primary-400 capitalize">{result.detected_crime_type}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {result.valid ? 'FIR appears legally valid' : 'FIR has legal issues - flagged for review'}
                    </p>
                  </div>
                  <div className={`text-3xl font-bold ${
                    result.score >= 80 ? 'text-green-400' : result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{result.score}%</div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Legal Checks</h4>
                <div className="space-y-2">
                  {result.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-dark-800/50">
                      {c.passed ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                      <div>
                        <p className="text-xs font-medium text-gray-200">{c.rule}</p>
                        <p className="text-[11px] text-gray-500">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.suggested_sections.length > 0 && (
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Suggested Legal Sections</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.suggested_sections.map((s, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="glass-card p-5 border-l-4 border-l-orange-500">
                  <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Police Review Required
                  </h4>
                  <div className="space-y-1">
                    {result.warnings.map((w, i) => <p key={i} className="text-xs text-gray-300">• {w}</p>)}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">FIR will be registered but flagged for review.</p>
                </div>
              )}

              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" /> Applicable Law References
                </h4>
                <div className="space-y-1">
                  {result.law_references.map((r, i) => <p key={i} className="text-xs text-gray-400">{r}</p>)}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <Gavel className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400">Enter FIR Details</h3>
              <p className="text-sm text-gray-600 mt-1">AI validates against BNS 2023, IPC, IT Act, and BNSS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
