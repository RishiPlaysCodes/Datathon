/**
 * Professional PDF export using browser print API.
 * Creates a styled HTML document with color coding, badges, and proper formatting.
 */

interface PdfOptions {
  title: string
  subtitle?: string
  content: string  // HTML string
  filename?: string
  firNumber?: string
}

export function exportToPdf({ title, subtitle, content, filename, firNumber }: PdfOptions): void {
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
  const html = `
<!DOCTYPE html>
<html>
<head>
<title>${title} - PRAHARI Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; padding: 30px 40px; color: #1a1a1a; font-size: 11px; line-height: 1.6; }
  
  /* Header */
  .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 18px; color: #1e3a5f; letter-spacing: 0.5px; }
  .header-left h2 { font-size: 13px; color: #4b5563; font-weight: 500; margin-top: 2px; }
  .header-left p { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .fir-badge { background: #1e3a5f; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
  .header-right .page-info { font-size: 9px; color: #9ca3af; margin-top: 4px; }
  
  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  .badge-critical { background: #fecaca; color: #b91c1c; border: 1px solid #f87171; }
  .badge-high { background: #fed7aa; color: #c2410c; border: 1px solid #fb923c; }
  .badge-medium { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
  .badge-low { background: #d1fae5; color: #065f46; border: 1px solid #34d399; }
  .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #60a5fa; }
  .badge-purple { background: #ede9fe; color: #5b21b6; border: 1px solid #a78bfa; }
  
  /* Confidence bar */
  .confidence-bar { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; }
  .confidence-track { width: 100px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .confidence-fill { height: 100%; border-radius: 4px; }
  .confidence-high { background: #16a34a; }
  .confidence-medium { background: #eab308; }
  .confidence-low { background: #dc2626; }
  
  /* Sections */
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-title { font-size: 12px; font-weight: 700; color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 8px; margin-bottom: 8px; }
  .section-title.red { border-left-color: #dc2626; color: #991b1b; }
  .section-title.green { border-left-color: #16a34a; color: #166534; }
  .section-title.purple { border-left-color: #7c3aed; color: #5b21b6; }
  .section-title.orange { border-left-color: #ea580c; color: #9a3412; }
  .section-title.cyan { border-left-color: #0891b2; color: #155e75; }
  
  /* Tables */
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
  th, td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; color: #374151; }
  tr:nth-child(even) { background: #f9fafb; }
  
  /* Priority rows */
  .priority-1 { border-left: 3px solid #dc2626; }
  .priority-2 { border-left: 3px solid #ea580c; }
  .priority-3 { border-left: 3px solid #eab308; }
  .priority-4 { border-left: 3px solid #6b7280; }
  
  /* Info box */
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; margin: 8px 0; }
  .info-box.warning { background: #fffbeb; border-color: #fde68a; }
  .info-box.danger { background: #fef2f2; border-color: #fecaca; }
  .info-box.success { background: #f0fdf4; border-color: #bbf7d0; }
  .info-box p { font-size: 10px; color: #374151; }
  .info-box .label { font-weight: 700; color: #1e3a5f; }
  
  /* Separator */
  hr { border: none; border-top: 1px dashed #d1d5db; margin: 16px 0; }
  
  /* Footer */
  .footer { margin-top: 24px; padding-top: 10px; border-top: 2px solid #1e3a5f; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; }
  .footer-left { }
  .footer-right { text-align: right; }
  
  /* Lists */
  ul { padding-left: 16px; margin: 4px 0; }
  li { margin-bottom: 3px; font-size: 10px; }
  li.check { list-style: none; padding-left: 0; }
  li.check::before { content: "✓ "; color: #16a34a; font-weight: bold; }
  
  @media print { 
    body { padding: 15px 20px; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🛡️ PRAHARI — Karnataka State Police</h1>
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <p>Generated: ${timestamp}</p>
    </div>
    <div class="header-right">
      ${firNumber ? `<div class="fir-badge">${firNumber}</div>` : ''}
      <p class="page-info">Crime Intelligence Operating System</p>
    </div>
  </div>
  ${content}
  <div class="footer">
    <div class="footer-left">
      <p><strong>PRAHARI</strong> — Predictive Relational AI for Holistic Analytics & Response Intelligence</p>
      <p>System-generated report. Verify authenticity with the investigating officer.</p>
    </div>
    <div class="footer-right">
      <p>${timestamp}</p>
      <p>Karnataka State Police</p>
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename || title.replace(/\s+/g, '_')}_PRAHARI.html`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300)
  }
}

// ─── Helpers ───

export function severityBadge(severity: string): string {
  const cls = severity === 'critical' ? 'badge-critical' : severity === 'high' ? 'badge-high' : severity === 'medium' ? 'badge-medium' : 'badge-low'
  return `<span class="badge ${cls}">${severity.toUpperCase()}</span>`
}

export function confidenceBar(confidence: number): string {
  const pct = Math.round(confidence * 100)
  const cls = pct >= 75 ? 'confidence-high' : pct >= 50 ? 'confidence-medium' : 'confidence-low'
  return `<div class="confidence-bar">
    <div class="confidence-track"><div class="confidence-fill ${cls}" style="width:${pct}%"></div></div>
    <span style="font-size:10px;font-weight:600">${pct}%</span>
    <span style="font-size:9px;color:#6b7280">${pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : 'Low'} confidence</span>
  </div>`
}

export function objectToTable(data: Record<string, any>, title?: string): string {
  const rows = Object.entries(data)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><th style="width:35%">${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th><td>${v}</td></tr>`)
    .join('')
  return `${title ? `<div class="section-title">${title}</div>` : ''}<table>${rows}</table>`
}

export function arrayToTable(data: Record<string, any>[], title?: string): string {
  if (!data.length) return title ? `<div class="section-title">${title}</div><p style="color:#6b7280;font-size:10px">No data available.</p>` : ''
  const headers = Object.keys(data[0])
  const headerRow = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')
  const bodyRows = data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? '-'}</td>`).join('')}</tr>`).join('')
  return `${title ? `<div class="section-title">${title}</div>` : ''}<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`
}
