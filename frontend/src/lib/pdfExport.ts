/**
 * Lightweight PDF export using browser print API.
 * Creates a styled HTML document in a hidden iframe and triggers print/save-as-PDF.
 * No external dependency needed (jsPDF is heavy and Catalyst bundle is already large).
 */

interface PdfOptions {
  title: string
  subtitle?: string
  content: string  // HTML string
  filename?: string
}

export function exportToPdf({ title, subtitle, content, filename }: PdfOptions): void {
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
  const html = `
<!DOCTYPE html>
<html>
<head>
<title>${title} - PRAHARI Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1a1a1a; font-size: 12px; line-height: 1.6; }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; color: #1e40af; }
  .header p { font-size: 11px; color: #666; margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-size: 11px; }
  th { background: #f3f4f6; font-weight: 600; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <h1>PRAHARI — ${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    <p>Generated: ${timestamp} | Karnataka State Police Crime Intelligence OS</p>
  </div>
  ${content}
  <div class="footer">
    <p>This is a system-generated report from PRAHARI Crime Intelligence Platform.</p>
    <p>For official use only. Verify authenticity with the investigating officer.</p>
  </div>
</body>
</html>`

  // Open print dialog (user can "Save as PDF" from browser print)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    // Fallback: create blob and download
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename || title.replace(/\s+/g, '_')}_PRAHARI_Report.html`
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

// Helper: convert object to HTML table
export function objectToTable(data: Record<string, any>, title?: string): string {
  const rows = Object.entries(data)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><th>${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th><td>${v}</td></tr>`)
    .join('')
  return `${title ? `<div class="section-title">${title}</div>` : ''}<table>${rows}</table>`
}

// Helper: array of objects to HTML table
export function arrayToTable(data: Record<string, any>[], title?: string): string {
  if (!data.length) return ''
  const headers = Object.keys(data[0])
  const headerRow = headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')
  const bodyRows = data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')
  return `${title ? `<div class="section-title">${title}</div>` : ''}<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`
}
