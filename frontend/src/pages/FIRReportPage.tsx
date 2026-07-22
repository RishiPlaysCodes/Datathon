import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FileText, RefreshCw, Download, Shield, Network, MapPin, Lightbulb, DollarSign, Globe, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToPdf, objectToTable } from '@/lib/pdfExport'

export function FIRReportPage() {
  const [firId, setFirId] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['fir-report', activeId],
    queryFn: () => crimeAPI.getFIRReport(activeId!),
    enabled: !!activeId,
  })

  const search = () => {
    const id = parseInt(firId)
    if (!id) { toast.error('Enter a valid FIR ID'); return }
    setActiveId(id)
  }

  const regenerate = async () => {
    if (!activeId) return
    try {
      await crimeAPI.getFIRReport(activeId, true)
      queryClient.invalidateQueries({ queryKey: ['fir-report', activeId] })
      toast.success('Report regenerated')
    } catch { toast.error('Regeneration failed') }
  }

  const downloadPdf = () => {
    if (!report) return
    const content = `
      <div class="section"><div class="section-title">1. Case Summary</div>
        ${objectToTable(report.case_summary)}
      </div>
      <div class="section"><div class="section-title">2. Crime Classification</div>
        ${objectToTable(report.crime_classification)}
      </div>
      <div class="section"><div class="section-title">3. Similar Cases (${report.similar_cases?.length || 0} found)</div>
        <table><thead><tr><th>FIR #</th><th>Crime</th><th>Location</th><th>Status</th><th>Score</th></tr></thead><tbody>
        ${(report.similar_cases || []).map((c: any) => `<tr><td>${c.fir_number}</td><td>${c.crime_type}</td><td>${c.location || '-'}</td><td>${c.status}</td><td>${c.similarity_score}%</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="section"><div class="section-title">4. Criminal Network Analysis</div>
        ${report.network_analysis?.linked_accused?.length
          ? `<table><thead><tr><th>Name</th><th>Risk Score</th><th>Cases</th><th>Repeat?</th><th>Gang</th></tr></thead><tbody>
             ${report.network_analysis.linked_accused.map((a: any) => `<tr><td>${a.name}</td><td>${a.risk_score?.toFixed(0)}/100</td><td>${a.total_cases}</td><td>${a.is_repeat_offender ? 'Yes' : 'No'}</td><td>${a.gang_id || '-'}</td></tr>`).join('')}
             </tbody></table>
             <p>Network size: ${report.network_analysis.total_network_size} connections</p>`
          : '<p>No linked accused in database.</p>'}
      </div>
      <div class="section"><div class="section-title">5. Hotspot Analysis</div>
        ${objectToTable({
          Location: report.hotspot_analysis?.location,
          Density: report.hotspot_analysis?.density,
          'Cases (90 days)': report.hotspot_analysis?.cases_in_90_days,
          'Peak Time': report.hotspot_analysis?.peak_time_window,
        })}
      </div>
      <div class="section"><div class="section-title">6. Recommended Investigation Actions</div>
        <table><thead><tr><th>Priority</th><th>Action</th><th>Category</th></tr></thead><tbody>
        ${(report.recommended_actions || []).map((a: any) => `<tr><td>P${a.priority}</td><td>${a.action}</td><td>${a.category}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="section"><div class="section-title">7. Prevention Measures</div>
        <ul>${(report.prevention_measures || []).map((m: string) => `<li>${m}</li>`).join('')}</ul>
      </div>
      ${report.financial_trail?.applicable ? `
      <div class="section"><div class="section-title">8. Financial Trail</div>
        ${objectToTable({
          'Loss Amount': report.financial_trail.loss_amount ? '₹' + report.financial_trail.loss_amount : 'N/A',
          'Loss Type': report.financial_trail.loss_type || 'N/A',
          'Transaction ID': report.financial_trail.transaction_id || 'N/A',
          'Risk Flag': report.financial_trail.risk_flag || 'None',
        })}
      </div>` : ''}
      ${report.cyber_analysis?.applicable ? `
      <div class="section"><div class="section-title">9. Cyber Crime Analysis</div>
        <table><thead><tr><th>Attack Vector</th><th>Recommendation</th></tr></thead><tbody>
        ${(report.cyber_analysis.attack_vectors || []).map((v: any) => `<tr><td>${v.type}</td><td>${v.recommendation}</td></tr>`).join('')}
        </tbody></table>
        <p>Report to: ${(report.cyber_analysis.recommended_report_to || []).join(', ')}</p>
      </div>` : ''}
    `
    exportToPdf({
      title: `AI Investigation Report — ${report.fir_number}`,
      subtitle: `Generated: ${report.generated_at} | Confidence: ${report.ai_confidence}`,
      content,
      filename: `PRAHARI_AI_Report_${report.fir_number?.replace(/[\/\s]/g, '_')}`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-400" />AI Investigation Report
        </h1>
        <p className="text-xs text-gray-500 mt-1">9-section AI-generated report grounded in real database records</p>
      </div>


      <div className="glass-card p-4 flex gap-3 items-center">
        <input className="input-field flex-1" type="text" placeholder="Enter FIR ID (e.g. 1, 5, 10...)" value={firId} onChange={e => setFirId(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <button onClick={search} disabled={isLoading} className="btn-primary px-6 disabled:opacity-40">
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {isLoading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="text-red-400 text-center py-8">Failed to generate report. Check FIR ID.</div>}

      {report && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-primary-400 font-mono text-sm">{report.fir_number}</p>
              <p className="text-xs text-gray-500">Generated: {report.generated_at} | Confidence: {report.ai_confidence}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={regenerate} className="text-xs px-3 py-1.5 rounded-lg border border-dark-600 text-gray-400 hover:text-white flex items-center gap-1"><RefreshCw className="w-3 h-3"/>Regenerate</button>
              <button onClick={downloadPdf} className="text-xs px-3 py-1.5 rounded-lg border border-dark-600 text-gray-400 hover:text-white flex items-center gap-1"><Download className="w-3 h-3"/>PDF</button>
            </div>
          </div>

          {/* 1. Case Summary */}
          <ReportSection icon={FileText} title="1. Case Summary" color="blue">
            <p className="text-sm text-gray-300 leading-relaxed">{report.case_summary?.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <MiniCard label="Date" value={report.case_summary?.incident_date} />
              <MiniCard label="Location" value={report.case_summary?.location} />
              <MiniCard label="Status" value={report.case_summary?.status} />
              <MiniCard label="Severity" value={report.case_summary?.severity} />
            </div>
            {report.case_summary?.modus_operandi !== 'Not specified' && (
              <div className="mt-2 bg-dark-800/50 rounded p-2"><p className="text-xs text-gray-400"><b>MO:</b> {report.case_summary?.modus_operandi}</p></div>
            )}
          </ReportSection>

          {/* 2. Classification */}
          <ReportSection icon={Shield} title="2. Crime Classification" color="purple">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <MiniCard label="Primary Type" value={report.crime_classification?.primary_type} />
              <MiniCard label="IPC Section" value={report.crime_classification?.ipc_section || 'N/A'} />
              <MiniCard label="BNS Section" value={report.crime_classification?.bns_section || 'N/A'} />
            </div>
          </ReportSection>

          {/* 3. Similar Cases */}
          <ReportSection icon={Clock} title="3. Similar Cases in Database" color="cyan">
            {report.similar_cases?.length === 0 ? (
              <p className="text-gray-500 text-sm">No sufficiently similar cases found.</p>
            ) : (
              <div className="space-y-2">
                {report.similar_cases?.map((c: any, i: number) => (
                  <div key={i} className="bg-dark-800/50 rounded-lg p-3 border border-dark-600">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primary-400">{c.fir_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${c.status==='closed'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.key_learning}</p>
                    <div className="flex gap-1 mt-1">{c.reasons?.map((r: string, j: number) => <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-300">{r}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>

          {/* 4. Network */}
          <ReportSection icon={Network} title="4. Criminal Network Analysis" color="red">
            {report.network_analysis?.linked_accused?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.network_analysis.linked_accused.map((a: any) => (
                    <div key={a.id} className="bg-dark-800/50 rounded p-2 flex items-center justify-between">
                      <div><p className="text-sm text-white">{a.name}</p><p className="text-[10px] text-gray-500">{a.total_cases} cases | Risk: {a.risk_score?.toFixed(0)}</p></div>
                      {a.is_repeat_offender && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Repeat</span>}
                    </div>
                  ))}
                </div>
                {report.network_analysis.gang_involvement && <p className="text-xs text-purple-400 mt-2">Gang: {report.network_analysis.gang_involvement}</p>}
                {report.network_analysis.network_connections?.length > 0 && (
                  <div className="mt-2"><p className="text-xs text-gray-500 mb-1">Associates ({report.network_analysis.total_network_size} total):</p>
                    {report.network_analysis.network_connections.map((c: any, i: number) => <p key={i} className="text-xs text-gray-400">• {c.name} ({c.relationship}) — {c.total_cases} cases</p>)}
                  </div>
                )}
              </div>
            ) : <p className="text-gray-500 text-sm">No linked accused in database for this FIR.</p>}
          </ReportSection>

          {/* 5. Hotspot */}
          <ReportSection icon={MapPin} title="5. Hotspot Analysis" color="orange">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <MiniCard label="Location" value={report.hotspot_analysis?.location || 'N/A'} />
              <MiniCard label="Density" value={report.hotspot_analysis?.density} />
              <MiniCard label="Cases (90d)" value={report.hotspot_analysis?.cases_in_90_days} />
              <MiniCard label="Peak Window" value={report.hotspot_analysis?.peak_time_window} />
            </div>
          </ReportSection>

          {/* 6. Recommended Actions */}
          <ReportSection icon={Lightbulb} title="6. Recommended Investigation Actions" color="green">
            <div className="space-y-2">
              {report.recommended_actions?.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-dark-800/50 rounded-lg p-3">
                  <span className="text-xs font-bold text-primary-400 bg-primary-500/20 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">P{a.priority}</span>
                  <div><p className="text-sm text-gray-200">{a.action}</p><p className="text-[10px] text-gray-500">{a.category}</p></div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* 7. Prevention */}
          <ReportSection icon={Shield} title="7. Prevention Measures" color="teal">
            <ul className="space-y-1.5">
              {report.prevention_measures?.map((m: string, i: number) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"/>{m}</li>
              ))}
            </ul>
          </ReportSection>

          {/* 8. Financial Trail */}
          {report.financial_trail?.applicable && (
            <ReportSection icon={DollarSign} title="8. Financial Trail" color="yellow">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <MiniCard label="Loss Amount" value={report.financial_trail.loss_amount ? `₹${report.financial_trail.loss_amount}` : 'N/A'} />
                <MiniCard label="Loss Type" value={report.financial_trail.loss_type || 'N/A'} />
                <MiniCard label="Transaction ID" value={report.financial_trail.transaction_id || 'N/A'} />
              </div>
              {report.financial_trail.risk_flag && <p className="text-xs text-red-400 mt-2">⚠️ {report.financial_trail.risk_flag}</p>}
              {report.financial_trail.suspicious_transactions?.length > 0 && (
                <div className="mt-2"><p className="text-xs text-gray-500 mb-1">Linked Transactions:</p>
                  {report.financial_trail.suspicious_transactions.map((t: any, i: number) => (
                    <p key={i} className={`text-xs ${t.is_suspicious?'text-red-400':'text-gray-400'}`}>• ₹{t.amount} ({t.type}) {t.from_account} → {t.to_account} {t.is_suspicious?'🚨 SUSPICIOUS':''}</p>
                  ))}
                </div>
              )}
            </ReportSection>
          )}

          {/* 9. Cyber Analysis */}
          {report.cyber_analysis?.applicable && (
            <ReportSection icon={Globe} title="9. Cyber Crime Analysis" color="pink">
              <div className="space-y-2">
                {report.cyber_analysis.attack_vectors?.map((v: any, i: number) => (
                  <div key={i} className="bg-dark-800/50 rounded p-3">
                    <p className="text-sm text-white font-medium">{v.type}</p>
                    <p className="text-xs text-gray-400">{v.recommendation}</p>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-1">{report.cyber_analysis.recommended_report_to?.map((r: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-pink-500/10 text-pink-300">{r}</span>)}</div>
              </div>
            </ReportSection>
          )}
        </div>
      )}

      {!report && !isLoading && !error && (
        <div className="glass-card p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter a FIR ID to generate a comprehensive AI investigation report</p>
        </div>
      )}
    </div>
  )
}

function ReportSection({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <h3 className={`text-sm font-bold text-${color}-400 uppercase tracking-wider flex items-center gap-2 mb-3`}>
        <Icon className="w-4 h-4" />{title}
      </h3>
      {children}
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-dark-800/30 rounded p-2">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-200 font-medium">{value ?? '-'}</p>
    </div>
  )
}
