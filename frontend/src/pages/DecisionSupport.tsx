import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2, Search, FileText, AlertTriangle, CheckCircle2,
  Clock, Lightbulb, Shield, XCircle
} from "lucide-react"

interface CaseSummary {
  fir: { id: number; fir_number: string; incident_date: string; location: string; description: string; status: string; severity: string; category: string }
  summary: string
  accused: { id: number; name: string; risk_score: number }[]
  victims: { id: number; name: string; age: number | null; gender: string | null }[]
  evidence_count: number
  evidence_types: string[]
  reports_count: number
  investigation_leads: { priority: string; suggestion: string; basis: string }[]
  missing_evidence: string[]
  case_difficulty: string
  timeline: { date: string; event: string; type: string }[]
}

const DecisionSupport = () => {
  const { token } = useAuth()
  const [firId, setFirId] = useState("1")
  const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCase = async () => {
    if (!firId) return
    setIsLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/decision-support/case-summary/${firId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setCaseSummary(await res.json())
      else setCaseSummary(null)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchCase() }, [])


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investigation Decision Support</h1>
        <p className="text-muted-foreground mt-1">AI-powered case analysis with investigation leads and evidence tracking</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input placeholder="Enter FIR ID (e.g. 1, 2, 3...)" value={firId} onChange={e => setFirId(e.target.value)} className="max-w-xs" />
            <Button onClick={fetchCase} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Analyze Case</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {caseSummary && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {caseSummary.fir.fir_number}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={caseSummary.fir.status === "open" ? "destructive" : "secondary"}>
                      {caseSummary.fir.status}
                    </Badge>
                    <Badge variant="outline" className={
                      caseSummary.case_difficulty === "hard" ? "border-red-300 text-red-700" :
                      caseSummary.case_difficulty === "cold" ? "border-purple-300 text-purple-700" : ""
                    }>
                      {caseSummary.case_difficulty} case
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{caseSummary.summary}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{caseSummary.accused.length}</p><p className="text-[10px] text-muted-foreground">Accused</p></div>
                  <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{caseSummary.evidence_count}</p><p className="text-[10px] text-muted-foreground">Evidence</p></div>
                  <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{caseSummary.reports_count}</p><p className="text-[10px] text-muted-foreground">Reports</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Investigation Leads */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />AI Investigation Leads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caseSummary.investigation_leads.map((lead, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <div className="flex items-start gap-2">
                      <Badge variant={lead.priority === "HIGH" ? "destructive" : lead.priority === "MEDIUM" ? "default" : "secondary"} className="text-[9px] mt-0.5 shrink-0">
                        {lead.priority}
                      </Badge>
                      <div>
                        <p className="text-xs font-medium">{lead.suggestion}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 italic">Basis: {lead.basis}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Missing Evidence */}
            {caseSummary.missing_evidence.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                    <XCircle className="w-4 h-4" />Missing Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {caseSummary.missing_evidence.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-orange-800">
                        <AlertTriangle className="w-3 h-3 shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {caseSummary.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      event.type === "incident" ? "bg-red-500" :
                      event.type === "registration" ? "bg-blue-500" :
                      event.type === "evidence" ? "bg-green-500" : "bg-purple-500"
                    }`} />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                      <p className="text-xs">{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default DecisionSupport
