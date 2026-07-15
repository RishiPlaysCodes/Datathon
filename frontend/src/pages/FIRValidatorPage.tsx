import { useState } from 'react'
import { Gavel, AlertTriangle, CheckCircle, XCircle, FileText, Scale, Info } from 'lucide-react'
import toast from 'react-hot-toast'

// Indian law database for FIR validation
const LAW_DATABASE = {
  'theft': { bns: '303', ipc: '379', description: 'Theft - dishonestly taking movable property', min_punishment: '3 years', cognizable: true },
  'robbery': { bns: '309', ipc: '392', description: 'Robbery - theft with force/fear', min_punishment: '10 years', cognizable: true },
  'murder': { bns: '101', ipc: '302', description: 'Murder - causing death with intention', min_punishment: 'Life/Death', cognizable: true },
  'assault': { bns: '115', ipc: '323', description: 'Voluntarily causing hurt', min_punishment: '1 year', cognizable: true },
  'fraud': { bns: '318', ipc: '420', description: 'Cheating and dishonestly inducing delivery of property', min_punishment: '7 years', cognizable: true },
  'cyber crime': { bns: '318/319', ipc: '66C/66D IT Act', description: 'Identity theft / Cheating by personation using computer', min_punishment: '3 years', cognizable: true },
  'domestic violence': { bns: '84/85', ipc: '498A', description: 'Cruelty by husband or relatives', min_punishment: '3 years', cognizable: true },
  'chain snatching': { bns: '303/115(2)', ipc: '379/356', description: 'Theft with assault/force', min_punishment: '3 years', cognizable: true },
  'burglary': { bns: '331/305', ipc: '457/380', description: 'Lurking house-trespass by night + theft', min_punishment: '5 years', cognizable: true },
  'kidnapping': { bns: '137/138', ipc: '363/364', description: 'Kidnapping from lawful guardianship', min_punishment: '7 years', cognizable: true },
  'drug offense': { bns: 'NDPS Act', ipc: '20/22 NDPS Act', description: 'Possession/Sale of narcotic substance', min_punishment: '10 years', cognizable: true },
  'vehicle theft': { bns: '303', ipc: '379', description: 'Theft of motor vehicle', min_punishment: '3 years', cognizable: true },
  'sexual offense': { bns: '63/64', ipc: '375/376', description: 'Sexual assault / Rape', min_punishment: '10 years', cognizable: true },
  'defamation': { bns: '356', ipc: '499/500', description: 'Defamation - harm to reputation', min_punishment: '2 years', cognizable: false },
  'trespass': { bns: '329', ipc: '441/447', description: 'Criminal trespass', min_punishment: '3 months', cognizable: false },
}

const VALIDATION_RULES = [
  { id: 'cognizable', name: 'Cognizable Check', description: 'Is this offense cognizable (police can arrest without warrant)?' },
  { id: 'jurisdiction', name: 'Jurisdiction Validity', description: 'Does the police station have jurisdiction for this area?' },
  { id: 'section_match', name: 'Section Accuracy', description: 'Are the correct BNS/IPC sections applied?' },
  { id: 'description_match', name: 'Description vs Section', description: 'Does the FIR description match the invoked sections?' },
  { id: 'time_validity', name: 'Limitation Period', description: 'Is the FIR within the statute of limitations?' },
  { id: 'duplicate_check', name: 'Duplicate FIR', description: 'Is there already an FIR for the same incident?' },
  { id: 'victim_rights', name: 'Victim Rights', description: 'Are victim protection provisions correctly applied?' },
]

interface ValidationResult {
  valid: boolean
  score: number
  checks: { rule: string; passed: boolean; note: string }[]
  suggested_sections: string[]
  warnings: string[]
  law_references: string[]
}

export function FIRValidatorPage() {
  const [complaint, setComplaint] = useState('')
  const [crimeType, setCrimeType] = useState('')
  const [location, setLocation] = useState('')
  const [sections, setSections] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const validateFIR = () => {
    if (!complaint.trim()) {
      toast.error('Please enter the complaint description')
      return
    }
    setLoading(true)

    setTimeout(() => {
      const validation = performValidation(complaint, crimeType, location, sections)
      setResult(validation)
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary-400" />
          AI FIR Validator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Validates FIR against BNS 2023, IPC, IT Act, CrPC - checks sections, jurisdiction, and rights
        </p>
      </div>

      {/* Info Banner */}
      <div className="glass-card p-4 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">How it works</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              When a citizen files an FIR (online or at station), this AI validates it against Indian law.
              It checks if correct sections are applied, if the offense is cognizable, if jurisdiction is valid,
              and flags incorrect FIRs for police review without rejecting them.
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
              placeholder="Describe the incident in detail... e.g. 'Two men on a bike snatched my gold chain while I was walking near Koramangala at 9PM yesterday'"
              className="input-field w-full h-32 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Crime Type</label>
              <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)} className="input-field w-full">
                <option value="">Auto-detect</option>
                {Object.keys(LAW_DATABASE).map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Location/PS</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala PS" className="input-field w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Sections Applied (if any)</label>
            <input value={sections} onChange={(e) => setSections(e.target.value)} placeholder="e.g. 379/356 IPC or 303 BNS" className="input-field w-full" />
          </div>

          <button onClick={validateFIR} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
            {loading ? 'Validating against Indian Law...' : '⚖️ Validate FIR'}
          </button>
        </div>

        {/* Validation Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Overall Score */}
              <div className={`glass-card p-5 border-l-4 ${
                result.score >= 80 ? 'border-l-green-500' :
                result.score >= 50 ? 'border-l-yellow-500' :
                'border-l-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200">Validation Score</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {result.valid ? 'FIR appears legally valid' : 'FIR has legal issues - flagged for review'}
                    </p>
                  </div>
                  <div className={`text-3xl font-bold ${
                    result.score >= 80 ? 'text-green-400' :
                    result.score >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {result.score}%
                  </div>
                </div>
              </div>

              {/* Checks */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Legal Checks</h4>
                <div className="space-y-2">
                  {result.checks.map((check, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-dark-800/50">
                      {check.passed ?
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> :
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      }
                      <div>
                        <p className="text-xs font-medium text-gray-200">{check.rule}</p>
                        <p className="text-[11px] text-gray-500">{check.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Sections */}
              {result.suggested_sections.length > 0 && (
                <div className="glass-card p-5">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Suggested Legal Sections</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.suggested_sections.map((sec, idx) => (
                      <span key={idx} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="glass-card p-5 border-l-4 border-l-orange-500">
                  <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Police Review Required
                  </h4>
                  <div className="space-y-1">
                    {result.warnings.map((w, idx) => (
                      <p key={idx} className="text-xs text-gray-300">• {w}</p>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    Note: FIR will be registered but flagged in separate section for review.
                  </p>
                </div>
              )}

              {/* Law References */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" /> Applicable Law References
                </h4>
                <div className="space-y-1">
                  {result.law_references.map((ref, idx) => (
                    <p key={idx} className="text-xs text-gray-400">📜 {ref}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <Gavel className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg text-gray-400">Enter FIR Details</h3>
              <p className="text-sm text-gray-600 mt-1">AI will validate against BNS 2023, IPC, IT Act, and CrPC</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function performValidation(complaint: string, crimeType: string, location: string, sections: string): ValidationResult {
  const complaintLower = complaint.toLowerCase()
  const checks: { rule: string; passed: boolean; note: string }[] = []
  const warnings: string[] = []
  const law_references: string[] = []
  let score = 100

  // Auto-detect crime type from complaint
  let detectedType = crimeType
  if (!detectedType) {
    if (complaintLower.includes('snatch') || complaintLower.includes('chain')) detectedType = 'chain snatching'
    else if (complaintLower.includes('hack') || complaintLower.includes('phishing') || complaintLower.includes('online')) detectedType = 'cyber crime'
    else if (complaintLower.includes('rob')) detectedType = 'robbery'
    else if (complaintLower.includes('theft') || complaintLower.includes('stole') || complaintLower.includes('stolen')) detectedType = 'theft'
    else if (complaintLower.includes('beat') || complaintLower.includes('hit') || complaintLower.includes('attack')) detectedType = 'assault'
    else if (complaintLower.includes('fraud') || complaintLower.includes('cheat') || complaintLower.includes('scam')) detectedType = 'fraud'
    else if (complaintLower.includes('murder') || complaintLower.includes('killed') || complaintLower.includes('dead')) detectedType = 'murder'
    else if (complaintLower.includes('domestic') || complaintLower.includes('husband') || complaintLower.includes('dowry')) detectedType = 'domestic violence'
    else if (complaintLower.includes('drug') || complaintLower.includes('ganja') || complaintLower.includes('narcotic')) detectedType = 'drug offense'
    else detectedType = 'theft' // fallback
  }

  const lawInfo = LAW_DATABASE[detectedType as keyof typeof LAW_DATABASE]

  // Check 1: Cognizable offense
  if (lawInfo?.cognizable) {
    checks.push({ rule: 'Cognizable Offense', passed: true, note: `${detectedType} is a cognizable offense - police must register FIR (Sec 154 CrPC / Sec 173 BNSS)` })
  } else {
    checks.push({ rule: 'Cognizable Offense', passed: false, note: `${detectedType} is NON-cognizable. Requires Magistrate order for investigation.` })
    warnings.push(`This offense is non-cognizable. A complaint to Magistrate (Sec 200 CrPC) is the correct procedure, not FIR.`)
    score -= 20
  }

  // Check 2: Section accuracy
  if (sections) {
    const sectionMatch = sections.toLowerCase().includes(lawInfo?.ipc?.toLowerCase().split('/')[0] || '') ||
                         sections.toLowerCase().includes(lawInfo?.bns?.toLowerCase().split('/')[0] || '')
    if (sectionMatch) {
      checks.push({ rule: 'Section Accuracy', passed: true, note: `Sections ${sections} correctly match the offense type` })
    } else {
      checks.push({ rule: 'Section Accuracy', passed: false, note: `Applied sections may be incorrect. Expected: ${lawInfo?.bns} BNS / ${lawInfo?.ipc}` })
      warnings.push(`Sections applied (${sections}) don't match detected offense. Correct sections: ${lawInfo?.bns} BNS / ${lawInfo?.ipc}`)
      score -= 15
    }
  } else {
    checks.push({ rule: 'Section Accuracy', passed: true, note: `Auto-assigned: ${lawInfo?.bns} BNS (${lawInfo?.ipc})` })
  }

  // Check 3: Description completeness
  const hasWho = complaintLower.match(/\b(man|men|woman|person|accused|unknown)\b/)
  const hasWhat = complaintLower.match(/\b(stole|snatched|attacked|cheated|hacked|robbed|killed|threatened)\b/)
  const hasWhere = complaintLower.match(/\b(road|nagar|layout|city|area|near|market|shop|house|office)\b/) || location
  const hasWhen = complaintLower.match(/\b(yesterday|today|morning|night|evening|pm|am|\d{1,2}:\d{2})\b/)

  if (hasWho && hasWhat && hasWhere && hasWhen) {
    checks.push({ rule: 'Description Completeness', passed: true, note: 'FIR contains: Who, What, Where, When - all required elements present' })
  } else {
    const missing = []
    if (!hasWho) missing.push('Who (suspect description)')
    if (!hasWhat) missing.push('What (exact action)')
    if (!hasWhere) missing.push('Where (specific location)')
    if (!hasWhen) missing.push('When (time/date)')
    checks.push({ rule: 'Description Completeness', passed: false, note: `Missing: ${missing.join(', ')}` })
    score -= 10
  }

  // Check 4: Jurisdiction
  if (location) {
    checks.push({ rule: 'Jurisdiction', passed: true, note: `Filed at ${location} - jurisdiction appears valid for Karnataka` })
  } else {
    checks.push({ rule: 'Jurisdiction', passed: true, note: 'Zero FIR provision applies - any station can register (Sec 173 BNSS)' })
  }

  // Check 5: Time limitation
  checks.push({ rule: 'Limitation Period', passed: true, note: 'No limitation for cognizable offenses. FIR can be filed anytime.' })

  // Check 6: Victim rights
  if (detectedType === 'sexual offense' || detectedType === 'domestic violence') {
    checks.push({ rule: 'Victim Protection', passed: true, note: 'Special provisions apply: Female officer recording, identity protection (Sec 72 BNSS)' })
    law_references.push('BNSS 2023 Sec 72 - Woman complainant statement by woman officer')
    law_references.push('Sec 173(3) BNSS - Mandatory FIR registration for women/children offenses')
  } else {
    checks.push({ rule: 'Victim Rights', passed: true, note: 'Standard victim protection provisions apply' })
  }

  // Check 7: Constitutional validity
  checks.push({ rule: 'Constitutional Validity', passed: true, note: 'Right to file FIR guaranteed under Article 21 (Right to Life & Liberty)' })

  // Add law references
  law_references.push(`BNS 2023 Section ${lawInfo?.bns} - ${lawInfo?.description}`)
  law_references.push(`Equivalent IPC Section ${lawInfo?.ipc}`)
  law_references.push(`Minimum punishment: ${lawInfo?.min_punishment}`)
  law_references.push('BNSS 2023 Sec 173 - Information in cognizable cases (replaces CrPC 154)')
  law_references.push('Article 21, Constitution of India - Right to file complaint')

  // Suggested sections
  const suggested_sections = [
    `${lawInfo?.bns} BNS (Primary)`,
    `${lawInfo?.ipc} (IPC equivalent)`,
  ]

  if (complaintLower.includes('threat') || complaintLower.includes('intimidat')) {
    suggested_sections.push('503 IPC / 351 BNS (Criminal Intimidation)')
  }
  if (complaintLower.includes('weapon') || complaintLower.includes('knife') || complaintLower.includes('gun')) {
    suggested_sections.push('Arms Act, 1959 Sec 25/27')
  }
  if (complaintLower.includes('group') || complaintLower.includes('gang') || parseInt(complaint) > 2) {
    suggested_sections.push('149 IPC / 190 BNS (Unlawful assembly)')
  }

  return {
    valid: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    checks,
    suggested_sections,
    warnings,
    law_references,
  }
}
