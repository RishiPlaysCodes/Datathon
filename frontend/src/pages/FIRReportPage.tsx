import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FileText, RefreshCw, Download, Shield, Network, MapPin, Lightbulb, DollarSign, Globe, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToPdf, objectToTable, severityBadge, confidenceBar, arrayToTable } from '@/lib/pdfExport'

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
      <!-- Section 1: Case Summary -->
      <div class="section">
        <div class="section-title">1. CASE SUMMARY</div>
        <div class="info-box">
          <p>${report.case_summary?.summary || 'No summary available.'}</p>
        </div>
        <table>
          <tr><th>Incident Date</th><td>${report.case_summary?.incident_date || '-'}</td><th>Location</th><td>${report.case_summary?.location || '-'}</td></tr>
          <tr><th>Crime Type</th><td>${report.case_summary?.crime_type || '-'}</td><th>Status</th><td>${report.case_summary?.status || '-'}</td></tr>
          <tr><th>Severity</th><td>${severityBadge(report.case_summary?.severity || 'medium')}</td><th>Zone</th><td>${report.case_summary?.zone || '-'}</td></tr>
          <tr><th>Complainant</th><td>${report.case_summary?.complainant || '-'}</td><th>IO</th><td>${report.case_summary?.investigating_officer || 'To be assigned'}</td></tr>
        </table>
        ${report.case_summary?.modus_operandi && report.case_summary.modus_operandi !== 'Not specified' ? `<div class="info-box warning"><p><span class="label">Modus Operandi:</span> ${report.case_summary.modus_operandi}</p></div>` : ''}
      </div>

      <!-- Section 2: Crime Classification -->
      <div class="section">
        <div class="section-title purple">2. CRIME CLASSIFICATION</div>
        <table>
          <tr><th>Primary Type</th><td><strong>${report.crime_classification?.primary_type || '-'}</strong></td></tr>
          <tr><th>IPC Section</th><td>${report.crime_classification?.ipc_section || 'N/A'}</td></tr>
          <tr><th>BNS Section</th><td>${report.crime_classification?.bns_section || 'N/A'}</td></tr>
          <tr><th>Severity</th><td>${severityBadge(report.crime_classification?.severity || 'medium')}</td></tr>
        </table>
        <p style="margin-top:6px">AI Confidence: ${confidenceBar(report.crime_classification?.ai_confidence || 0.75)}</p>
        <div class="info-box" style="margin-top:6px"><p style="font-size:9px;color:#6b7280">Confidence based on keyword match against FIR description, metadata analysis, and comparison with historical case patterns in the KSP database.</p></div>
      </div>

      <!-- Section 3: Similar Cases -->
      <div class="section">
        <div class="section-title cyan">3. SIMILAR CASES IN DATABASE (${report.similar_cases?.length || 0} found)</div>
        ${report.similar_cases?.length ? `
          <table>
            <thead><tr><th>FIR Number</th><th>Crime Type</th><th>Location</th><th>Status</th><th>Similarity</th><th>Key Learning</th></tr></thead>
            <tbody>${report.similar_cases.map((c: any) => `
              <tr>
                <td><strong>${c.fir_number}</strong></td>
                <td>${c.crime_type}</td>
                <td>${c.location || '-'}</td>
                <td>${c.status === 'closed' ? '<span class="badge badge-low">SOLVED</span>' : `<span class="badge badge-medium">${c.status}</span>`}</td>
                <td>${c.similarity_score}%</td>
                <td style="font-size:9px">${c.key_learning || '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : '<p style="color:#6b7280">No sufficiently similar cases found in the database.</p>'}
      </div>

      <!-- Section 4: Criminal Network Analysis -->
      <div class="section">
        <div class="section-title red">4. CRIMINAL NETWORK ANALYSIS</div>
        ${report.network_analysis?.linked_accused?.length ? `
          <table>
            <thead><tr><th>Name</th><th>Risk Score</th><th>Cases</th><th>Repeat?</th><th>Gang</th></tr></thead>
            <tbody>${report.network_analysis.linked_accused.map((a: any) => `
              <tr>
                <td><strong>${a.name}</strong>${a.alias ? ` (${a.alias})` : ''}</td>
                <td>${severityBadge(a.risk_score >= 80 ? 'critical' : a.risk_score >= 60 ? 'high' : a.risk_score >= 40 ? 'medium' : 'low')} ${a.risk_score?.toFixed(0)}/100</td>
                <td>${a.total_cases}</td>
                <td>${a.is_repeat_offender ? '🔴 Yes' : 'No'}</td>
                <td>${a.gang_id || '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          ${report.network_analysis.gang_involvement ? `<div class="info-box danger"><p><span class="label">⚠️ Gang Involvement:</span> ${report.network_analysis.gang_involvement} | Network size: ${report.network_analysis.total_network_size} connections</p></div>` : ''}
          ${report.network_analysis.network_connections?.length ? `<p style="margin-top:6px;font-size:10px"><strong>Associates:</strong> ${report.network_analysis.network_connections.map((c: any) => `${c.name} (${c.relationship}, ${c.total_cases} cases)`).join(' · ')}</p>` : ''}
        ` : '<p style="color:#6b7280">No linked accused found in database for this FIR.</p>'}
      </div>

      <!-- Section 5: Hotspot Analysis -->
      <div class="section">
        <div class="section-title orange">5. HOTSPOT ANALYSIS</div>
        <table>
          <tr><th>Location</th><td>${report.hotspot_analysis?.location || 'Not specified'}</td><th>Crime Density</th><td>${severityBadge(report.hotspot_analysis?.density === 'HIGH' ? 'critical' : report.hotspot_analysis?.density === 'MEDIUM' ? 'medium' : 'low')} ${report.hotspot_analysis?.density || 'Unknown'}</td></tr>
          <tr><th>Cases in 90 Days</th><td>${report.hotspot_analysis?.cases_in_90_days || 0}</td><th>Peak Time Window</th><td><strong>${report.hotspot_analysis?.peak_time_window || 'Unknown'}</strong></td></tr>
        </table>
        ${report.hotspot_analysis?.is_hotspot ? `<div class="info-box danger"><p>🔴 <span class="label">ACTIVE HOTSPOT</span> — This location has ${report.hotspot_analysis.cases_in_90_days} cases in the last 90 days. Increased patrol recommended during ${report.hotspot_analysis.peak_time_window}.</p></div>` : ''}
      </div>

      <hr/>

      <!-- Section 6: Recommended Actions -->
      <div class="section">
        <div class="section-title green">6. RECOMMENDED INVESTIGATION ACTIONS</div>
        <table>
          <thead><tr><th style="width:8%">Priority</th><th style="width:52%">Action</th><th style="width:20%">Category</th><th style="width:20%">Timeline</th></tr></thead>
          <tbody>${(report.recommended_actions || []).map((a: any, i: number) => `
            <tr class="priority-${Math.min(a.priority, 4)}">
              <td><span class="badge ${a.priority <= 1 ? 'badge-critical' : a.priority <= 2 ? 'badge-high' : 'badge-medium'}">P${a.priority}</span></td>
              <td>${a.action}</td>
              <td>${a.category}</td>
              <td>${a.priority <= 2 ? 'Within 24 hours' : a.priority <= 4 ? 'Within 72 hours' : 'Within 7 days'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Section 7: Prevention Measures -->
      <div class="section">
        <div class="section-title green">7. CRIME PREVENTION MEASURES</div>
        <ul>${(report.prevention_measures || []).map((m: string) => `<li class="check">${m}</li>`).join('')}</ul>
      </div>

      <!-- Section 8: Financial Trail -->
      ${report.financial_trail?.applicable ? `
      <div class="section">
        <div class="section-title orange">8. FINANCIAL TRAIL ANALYSIS</div>
        <table>
          <tr><th>Loss Amount</th><td><strong>${report.financial_trail.loss_amount ? '₹' + report.financial_trail.loss_amount.toLocaleString('en-IN') : 'N/A'}</strong></td><th>Type</th><td>${report.financial_trail.loss_type || 'N/A'}</td></tr>
          <tr><th>Transaction ID</th><td>${report.financial_trail.transaction_id || 'N/A'}</td><th>Risk Flag</th><td>${report.financial_trail.risk_flag ? `<span class="badge badge-critical">${report.financial_trail.risk_flag}</span>` : 'None'}</td></tr>
        </table>
        ${report.financial_trail.suspicious_transactions?.length ? `
          <p style="margin-top:6px;font-weight:600">Linked Transactions:</p>
          <table><thead><tr><th>Amount</th><th>Type</th><th>From</th><th>To</th><th>Suspicious</th></tr></thead>
          <tbody>${report.financial_trail.suspicious_transactions.map((t: any) => `<tr><td>₹${t.amount}</td><td>${t.type}</td><td>${t.from_account}</td><td>${t.to_account}</td><td>${t.is_suspicious ? '<span class="badge badge-critical">🚨 YES</span>' : 'No'}</td></tr>`).join('')}</tbody></table>
        ` : ''}
      </div>` : `
      <div class="section">
        <div class="section-title">8. FINANCIAL TRAIL</div>
        <div class="info-box success"><p>No financial loss reported in this case.</p></div>
      </div>`}

      <!-- Section 9: Cyber Crime Analysis -->
      ${report.cyber_analysis?.applicable ? `
      <div class="section">
        <div class="section-title purple">9. CYBER CRIME ANALYSIS</div>
        <table>
          <thead><tr><th>Attack Vector</th><th>Recommendation</th></tr></thead>
          <tbody>${(report.cyber_analysis.attack_vectors || []).map((v: any) => `<tr><td><strong>${v.type}</strong></td><td>${v.recommendation}</td></tr>`).join('')}</tbody>
        </table>
        <div class="info-box"><p><span class="label">Report to:</span> ${(report.cyber_analysis.recommended_report_to || []).join(' | ')}</p></div>
      </div>` : `
      <div class="section">
        <div class="section-title">9. CYBER CRIME ANALYSIS</div>
        <div class="info-box success"><p>Not applicable — this is not a cyber crime case.</p></div>
      </div>`}

      <!-- Overall AI Confidence -->
      <hr/>
      <div class="section">
        <div class="info-box">
          <p><span class="label">Overall AI Report Confidence:</span> <span class="badge badge-blue">${report.ai_confidence || 'Medium'}</span></p>
          <p style="font-size:9px;color:#6b7280;margin-top:4px">This confidence level is determined by: number of similar cases found in database, strength of network connections, availability of financial trail data, and specificity of hotspot patterns. Higher confidence indicates more corroborating evidence from multiple analytical dimensions.</p>
        </div>
      </div>
    `
    exportToPdf({
      title: 'AI Investigation Report',
      subtitle: `Generated: ${report.generated_at} | Confidence: ${report.ai_confidence}`,
      content,
      filename: `PRAHARI_Investigation_Report_${report.fir_number?.replace(/[\/\s]/g, '_')}`,
      firNumber: report.fir_number,
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
