import { useState } from 'react'
import { FileWarning, Shield, Search, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import { API_BASE } from '@/lib/api'
import toast from 'react-hot-toast'

const publicApi = axios.create({ baseURL: `${API_BASE}/api/v1/public` })

const CRIME_TYPES = [
  'Theft', 'Robbery', 'Assault', 'Murder', 'Fraud', 'Cyber Crime',
  'Drug Offense', 'Domestic Violence', 'Chain Snatching',
  'Vehicle Theft', 'Burglary', 'Sexual Offense', 'Kidnapping', 'Other',
]

const LAW_SECTIONS = [
  'IPC 302 (Murder)', 'IPC 304 (Culpable Homicide)', 'IPC 379 (Theft)',
  'IPC 392 (Robbery)', 'IPC 420 (Cheating/Fraud)', 'IPC 354 (Assault on Woman)',
  'IPC 376 (Rape)', 'IPC 498A (Cruelty by Husband)',
  'BNS 2023 Section 101 (Murder)', 'BNS 2023 Section 303 (Theft)',
  'BNS 2023 Section 318 (Cheating)', 'IT Act Section 66 (Cyber Crime)',
  'IT Act Section 66C (Identity Theft)', 'IT Act Section 66D (Cheating by Personation)',
  'NDPS Act (Drug Offense)', 'DV Act 2005 (Domestic Violence)',
  'Motor Vehicles Act', 'POCSO Act (Minor involved)', 'Other',
]


export function PublicPortalPage() {
  const [tab, setTab] = useState<'register' | 'scam' | 'track'>('register')

  return (
    <div className="min-h-screen bg-dark-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-primary-400" />
            PRAHARI Public Portal
          </h1>
          <p className="text-gray-400 mt-2">Karnataka State Police — File complaints, detect scams, track status</p>
          <p className="text-xs text-gray-600 mt-1">No login required · AI-powered classification · Auto-assigned to nearest police station</p>
        </div>
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {[
            { id: 'register', label: 'Register Complaint', icon: FileWarning },
            { id: 'scam', label: 'Scam Detector', icon: AlertTriangle },
            { id: 'track', label: 'Track Status', icon: Search },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${tab === id ? 'bg-primary-600 text-white' : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
        {tab === 'register' && <ComplaintForm />}
        {tab === 'scam' && <ScamDetector />}
        {tab === 'track' && <TrackComplaint />}
      </div>
    </div>
  )
}


function ComplaintForm() {
  const [form, setForm] = useState({
    complainant_name: '', complainant_phone: '', complainant_email: '',
    complainant_address: '', complainant_aadhaar: '',
    preferred_contact_time: 'anytime', safe_to_call: true,
    emergency_contact_name: '', emergency_contact_phone: '',
    description: '', crime_type: '', law_sections: [] as string[],
    location_name: '', district: 'Bengaluru Urban',
    suspect_name: '', suspect_description: '', suspect_count: 'unknown',
    suspect_relationship: '', suspect_phone: '', weapon_used: 'unknown',
    cctv_available: false,
    financial_loss: false, loss_amount: '', loss_type: '',
    bank_details: '', transaction_id: '', reported_to_bank: false,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showSuspect, setShowSuspect] = useState(false)
  const [showFinancial, setShowFinancial] = useState(false)
  const [customCrime, setCustomCrime] = useState('')
  const [customLaw, setCustomLaw] = useState('')

  const updateField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const toggleLawSection = (section: string) => {
    setForm(f => ({
      ...f,
      law_sections: f.law_sections.includes(section)
        ? f.law_sections.filter(s => s !== section)
        : [...f.law_sections, section],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.complainant_name.trim()) { toast.error('Name is required'); return }
    if (!form.complainant_phone.trim() || form.complainant_phone.length < 10) { toast.error('Valid 10-digit phone is required'); return }
    if (form.description.trim().length < 20) { toast.error('Description must be at least 20 characters'); return }
    setLoading(true)
    try {
      const payload = {
        ...form,
        crime_type: form.crime_type === 'Other' ? customCrime : form.crime_type || undefined,
        law_sections: form.law_sections.includes('Other')
          ? [...form.law_sections.filter(s => s !== 'Other'), customLaw].filter(Boolean)
          : form.law_sections.length ? form.law_sections : undefined,
        loss_amount: form.loss_amount ? parseFloat(form.loss_amount) : undefined,
      }
      const { data } = await publicApi.post('/complaint', payload)
      setResult(data)
      toast.success('Complaint registered!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setLoading(false) }
  }


  if (result) {
    return (
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-6 h-6" /><h2 className="text-xl font-bold">Complaint Registered</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard label="Tracking Number" value={result.tracking_number} />
          <InfoCard label="Assigned Station" value={result.assigned_station} />
          <InfoCard label="Zone" value={result.zone} />
          <InfoCard label="Status" value={result.status} />
        </div>
        {/* AI suggestion vs user selection */}
        <div className="bg-dark-800/50 rounded-lg p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase">AI Analysis</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-300">AI Crime Type: <b className="text-primary-400">{result.ai_crime_type}</b></span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">{(result.ai_confidence*100).toFixed(0)}% confidence</span>
          </div>
          {result.user_crime_type && result.user_crime_type !== result.ai_crime_type && (
            <p className="text-xs text-yellow-400 mt-1">✅ Your manual selection: <b>{result.user_crime_type}</b> (overrides AI — this is what goes on record)</p>
          )}
          {!result.user_crime_type && (
            <p className="text-[10px] text-gray-500 mt-1">ℹ️ You didn't select a crime type manually — AI's suggestion will be used. To override, go back and select from the dropdown.</p>
          )}
          {result.ai_law_sections?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1.5">Applicable Law Sections (AI Detected):</p>
              <div className="space-y-1">
                {result.ai_law_sections.map((s: string, i: number) => (
                  <p key={i} className="text-xs text-blue-300 bg-blue-500/10 rounded px-2.5 py-1.5 leading-relaxed">{s}</p>
                ))}
              </div>
            </div>
          )}
          {!result.law_violated && (
            <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-300">⚠️ No specific law violation identified. Case registered as 'General Complaint' — duty officer will review.</p>
            </div>
          )}
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-sm text-blue-300">{result.helpline}</p>
        </div>
        <p className="text-xs text-gray-500">{result.message}</p>
        <button onClick={() => { setResult(null); setForm({complainant_name:'',complainant_phone:'',complainant_email:'',complainant_address:'',complainant_aadhaar:'',preferred_contact_time:'anytime',safe_to_call:true,emergency_contact_name:'',emergency_contact_phone:'',description:'',crime_type:'',law_sections:[],location_name:'',district:'Bengaluru Urban',suspect_name:'',suspect_description:'',suspect_count:'unknown',suspect_relationship:'',suspect_phone:'',weapon_used:'unknown',cctv_available:false,financial_loss:false,loss_amount:'',loss_type:'',bank_details:'',transaction_id:'',reported_to_bank:false}) }} className="btn-primary text-sm">Register Another</button>
      </div>
    )
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section 1: Complainant Details */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Complainant Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Full Name *" required value={form.complainant_name} onChange={e=>updateField('complainant_name',e.target.value)} />
          <input className="input-field" placeholder="Phone (10 digits) *" required type="tel" maxLength={10} value={form.complainant_phone} onChange={e=>updateField('complainant_phone',e.target.value.replace(/\D/g,''))} />
          <input className="input-field" placeholder="Email (optional)" type="email" value={form.complainant_email} onChange={e=>updateField('complainant_email',e.target.value)} />
          <select className="input-field" value={form.preferred_contact_time} onChange={e=>updateField('preferred_contact_time',e.target.value)}>
            <option value="anytime">Contact: Anytime</option>
            <option value="morning">Morning (8AM-12PM)</option>
            <option value="afternoon">Afternoon (12PM-5PM)</option>
            <option value="evening">Evening (5PM-9PM)</option>
          </select>
        </div>
        <textarea className="input-field min-h-[60px]" placeholder="Address *" value={form.complainant_address} onChange={e=>updateField('complainant_address',e.target.value)} />
        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={form.safe_to_call} onChange={e=>updateField('safe_to_call',e.target.checked)} className="rounded" />
            Safe to call directly
          </label>
          <input className="input-field w-40" placeholder="Aadhaar (optional)" maxLength={12} value={form.complainant_aadhaar} onChange={e=>updateField('complainant_aadhaar',e.target.value.replace(/\D/g,''))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Emergency Contact Name (optional)" value={form.emergency_contact_name} onChange={e=>updateField('emergency_contact_name',e.target.value)} />
          <input className="input-field" placeholder="Emergency Contact Phone (optional)" type="tel" maxLength={10} value={form.emergency_contact_phone} onChange={e=>updateField('emergency_contact_phone',e.target.value.replace(/\D/g,''))} />
        </div>
      </div>

      {/* Section 2: Incident Details */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Incident Details</h3>
        <textarea className="input-field min-h-[120px]" placeholder="Describe what happened in detail (min 20 characters) *" required value={form.description} onChange={e=>updateField('description',e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Crime Type (your selection — AI will also suggest)</label>
            <select className="input-field" value={form.crime_type} onChange={e=>updateField('crime_type',e.target.value)}>
              <option value="">-- Select Crime Type --</option>
              {CRIME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {form.crime_type === 'Other' && <input className="input-field mt-2" placeholder="Specify crime type" value={customCrime} onChange={e=>setCustomCrime(e.target.value)} />}
          </div>
          <div>
            <input className="input-field" placeholder="Location / Area" value={form.location_name} onChange={e=>updateField('location_name',e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Applicable Law Sections (optional — AI will suggest)</label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-dark-800/50 rounded-lg">
            {LAW_SECTIONS.map(s => (
              <button key={s} type="button" onClick={() => toggleLawSection(s)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${form.law_sections.includes(s) ? 'bg-primary-600 text-white border-primary-500' : 'border-dark-600 text-gray-400 hover:border-primary-500/50'}`}>
                {s}
              </button>
            ))}
          </div>
          {form.law_sections.includes('Other') && <input className="input-field mt-2" placeholder="Specify law section" value={customLaw} onChange={e=>setCustomLaw(e.target.value)} />}
          {!form.crime_type && !form.law_sections.length && (
            <p className="text-[10px] text-yellow-400 mt-1">ℹ️ Both are optional — AI will suggest based on your description. You can accept or override.</p>
          )}
        </div>
      </div>


      {/* Section 3: Suspect Information (collapsible) */}
      <div className="glass-card p-5">
        <button type="button" onClick={()=>setShowSuspect(!showSuspect)} className="flex items-center justify-between w-full">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Suspect / Accused Info (if known)</h3>
          {showSuspect ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
        </button>
        {showSuspect && (
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Suspect Name (or 'Unknown')" value={form.suspect_name} onChange={e=>updateField('suspect_name',e.target.value)} />
              <input className="input-field" placeholder="Suspect Phone (if known)" type="tel" value={form.suspect_phone} onChange={e=>updateField('suspect_phone',e.target.value)} />
              <select className="input-field" value={form.suspect_count} onChange={e=>updateField('suspect_count',e.target.value)}>
                <option value="unknown">Suspects: Unknown</option>
                <option value="1">1 suspect</option>
                <option value="2-3">2-3 suspects</option>
                <option value="4+">4+ suspects</option>
              </select>
              <input className="input-field" placeholder="Relationship (if any)" value={form.suspect_relationship} onChange={e=>updateField('suspect_relationship',e.target.value)} />
            </div>
            <textarea className="input-field min-h-[80px]" placeholder="Suspect Description: height, build, clothing, distinguishing marks, vehicle, etc." value={form.suspect_description} onChange={e=>updateField('suspect_description',e.target.value)} />
            <div className="flex gap-4 items-center flex-wrap">
              <select className="input-field w-auto" value={form.weapon_used} onChange={e=>updateField('weapon_used',e.target.value)}>
                <option value="unknown">Weapon: Unknown</option>
                <option value="no">No weapon</option>
                <option value="knife">Knife/Sharp object</option>
                <option value="firearm">Firearm</option>
                <option value="blunt">Blunt object</option>
                <option value="other">Other weapon</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.cctv_available} onChange={e=>updateField('cctv_available',e.target.checked)} className="rounded" />
                CCTV/Dashcam footage available
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Financial Loss (collapsible) */}
      <div className="glass-card p-5">
        <button type="button" onClick={()=>setShowFinancial(!showFinancial)} className="flex items-center justify-between w-full">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Loss (if applicable)</h3>
          {showFinancial ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
        </button>
        {showFinancial && (
          <div className="space-y-3 mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.financial_loss} onChange={e=>updateField('financial_loss',e.target.checked)} className="rounded" />
              There was financial loss in this incident
            </label>
            {form.financial_loss && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input-field" placeholder="Estimated Loss Amount (₹)" type="number" value={form.loss_amount} onChange={e=>updateField('loss_amount',e.target.value)} />
                <select className="input-field" value={form.loss_type} onChange={e=>updateField('loss_type',e.target.value)}>
                  <option value="">Loss Type</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="goods">Goods/Property</option>
                  <option value="other">Other</option>
                </select>
                <input className="input-field" placeholder="Bank/UPI details (if transaction)" value={form.bank_details} onChange={e=>updateField('bank_details',e.target.value)} />
                <input className="input-field" placeholder="Transaction ID (if available)" value={form.transaction_id} onChange={e=>updateField('transaction_id',e.target.value)} />
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer col-span-full">
                  <input type="checkbox" checked={form.reported_to_bank} onChange={e=>updateField('reported_to_bank',e.target.checked)} className="rounded" />
                  Already reported to bank
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {loading ? 'Analyzing & Submitting...' : 'Submit Complaint (AI will classify & assign station)'}
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
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Analysis failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Scam Detection Engine</h2>
      <p className="text-xs text-gray-500">Paste a suspicious message, email, or call transcript — AI will analyze it</p>
      <div className="flex gap-2 flex-wrap">
        {['whatsapp','sms','email','call_transcript'].map(s=>(
          <button key={s} onClick={()=>setSource(s)} className={`text-xs px-3 py-1.5 rounded-full ${source===s?'bg-primary-600 text-white':'bg-dark-800 text-gray-400'}`}>{s.replace('_',' ')}</button>
        ))}
      </div>
      <textarea className="input-field min-h-[100px]" placeholder='Paste the suspicious message here...' value={content} onChange={e=>setContent(e.target.value)} />
      <button onClick={analyze} disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading?'Analyzing...':'Detect Scam'}</button>
      {result && (
        <div className={`rounded-lg p-4 border ${result.is_scam?'border-red-500/50 bg-red-500/5':'border-green-500/50 bg-green-500/5'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.is_scam?<XCircle className="w-5 h-5 text-red-400"/>:<CheckCircle2 className="w-5 h-5 text-green-400"/>}
            <span className={`font-bold ${result.is_scam?'text-red-400':'text-green-400'}`}>
              {result.is_scam?`SCAM DETECTED: ${result.scam_description}`:'No scam patterns detected'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><span className="text-gray-500">Confidence:</span> <span className="text-white">{(result.confidence*100).toFixed(0)}%</span></div>
            <div><span className="text-gray-500">Risk:</span> <span className={result.risk_level==='critical'?'text-red-400':result.risk_level==='high'?'text-orange-400':'text-yellow-400'}>{result.risk_level?.toUpperCase()}</span></div>
          </div>
          {result.matched_patterns?.length>0&&(<div className="mb-3"><p className="text-xs text-gray-500 mb-1">Matched:</p><div className="flex flex-wrap gap-1">{result.matched_patterns.map((p:string,i:number)=><span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">{p}</span>)}</div></div>)}
          <div className="bg-dark-800/50 rounded p-3 mb-3"><p className="text-sm text-yellow-300">{result.advisory}</p></div>
          <div className="space-y-1"><p className="text-xs text-gray-500">Actions:</p>{result.recommended_actions?.map((a:string,i:number)=><p key={i} className="text-xs text-gray-300">• {a}</p>)}</div>
          <div className="mt-3 pt-3 border-t border-dark-700">{result.report_links?.map((l:string,i:number)=><p key={i} className="text-xs text-primary-400">{l}</p>)}</div>
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
    if (!number.trim()) { toast.error('Enter complaint/tracking number'); return }
    setLoading(true)
    try {
      const { data } = await publicApi.get(`/complaint/${encodeURIComponent(number.trim())}`)
      setResult(data)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Not found'); setResult(null) }
    finally { setLoading(false) }
  }

  const stages = ['pending', 'under_review', 'fir_filed', 'investigating', 'resolved']
  const stageLabels: Record<string, string> = { pending: 'Submitted', under_review: 'Under Review', fir_filed: 'FIR Filed', investigating: 'Investigation', resolved: 'Resolved' }
  const currentIdx = result ? Math.max(stages.indexOf(result.status), 0) : -1

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-bold text-white">Track Your Complaint</h2>
      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="Enter tracking number (PUB-YYYYMMDD-XXXXXXXX)" value={number} onChange={e=>setNumber(e.target.value)} onKeyDown={e=>e.key==='Enter'&&track()} />
        <button onClick={track} disabled={loading} className="btn-primary disabled:opacity-50">{loading?'...':'Track'}</button>
      </div>
      {result && (
        <div className="space-y-4">
          {/* Visual timeline */}
          <div className="flex items-center justify-between relative px-2">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-dark-700 -translate-y-1/2 mx-8" />
            {stages.map((stage, i) => (
              <div key={stage} className="relative flex flex-col items-center z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentIdx ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-500'}`}>
                  {i <= currentIdx ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 text-center w-16 ${i <= currentIdx ? 'text-primary-400' : 'text-gray-600'}`}>{stageLabels[stage]}</span>
              </div>
            ))}
          </div>
          <div className="bg-dark-800/50 rounded-lg p-4 grid grid-cols-2 gap-3">
            <InfoCard label="Complaint No" value={result.complaint_number} />
            <InfoCard label="Status" value={result.status?.replace('_',' ')} />
            <InfoCard label="Crime Type" value={result.ai_crime_type} />
            <InfoCard label="Severity" value={result.ai_severity} />
            <InfoCard label="Submitted" value={result.submitted_at?.split('T')[0]} />
            {result.resolved_at && <InfoCard label="Resolved" value={result.resolved_at?.split('T')[0]} />}
          </div>
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
