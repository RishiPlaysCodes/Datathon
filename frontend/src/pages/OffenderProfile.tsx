import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle, User, Shield, TrendingUp, MapPin,
  Loader2, Search, FileText, Clock
} from "lucide-react"

interface Offender {
  id: number; name: string; alias: string | null
  risk_score: number; total_cases: number
  gang_affiliation: string | null; is_repeat_offender: boolean
  active_area: string | null; behavioral_profile: string | null
  modus_operandi: string | null
}

interface OffenderProfile {
  id: number; name: string; alias: string | null
  age: number | null; gender: string | null
  address: string; phone_number: string | null
  active_area: string | null; gang_affiliation: string | null
  is_repeat_offender: boolean; total_cases: number
  risk_score: number; risk_breakdown: Record<string, number>
  behavioral_profile: string | null; modus_operandi: string | null
  mo_timeline: { date: string; crime_type: string; severity: string; location: string; fir_number: string; status: string }[]
  linked_firs_count: number; recidivism_probability: number
  last_known_location: { lat: number; lng: number } | null
}


const OffenderProfilePage = () => {
  const { token } = useAuth()
  const [offenders, setOffenders] = useState<Offender[]>([])
  const [selectedProfile, setSelectedProfile] = useState<OffenderProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchHighRisk()
  }, [token])

  const fetchHighRisk = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/offenders/high-risk?min_score=30&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setOffenders(await res.json())
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  const fetchProfile = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/offender-profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSelectedProfile(await res.json())
    } catch (e) { console.error(e) }
  }

  const filtered = offenders.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.gang_affiliation || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Offender Profiling & Risk Assessment</h1>
        <p className="text-muted-foreground mt-1">Criminology-based risk scoring with explainable breakdown</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Offender List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">High-Risk Offenders</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {filtered.map((off) => (
              <button
                key={off.id}
                onClick={() => fetchProfile(off.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors hover:bg-accent ${
                  selectedProfile?.id === off.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{off.name}</span>
                  <div className={`text-xs font-bold ${off.risk_score > 70 ? "text-red-600" : off.risk_score > 50 ? "text-orange-600" : "text-yellow-600"}`}>
                    {off.risk_score.toFixed(0)}
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  {off.is_repeat_offender && <Badge variant="destructive" className="text-[9px] px-1 py-0">Repeat</Badge>}
                  {off.gang_affiliation && <Badge variant="outline" className="text-[9px] px-1 py-0">{off.gang_affiliation.split(" ")[0]}</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>


        {/* Profile Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedProfile ? (
            <>
              {/* Risk Score Header */}
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
                      {selectedProfile.alias && <p className="text-sm text-muted-foreground">Alias: {selectedProfile.alias}</p>}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {selectedProfile.age && <span>Age: {selectedProfile.age}</span>}
                        {selectedProfile.gender && <span>Gender: {selectedProfile.gender}</span>}
                        {selectedProfile.active_area && <span><MapPin className="inline w-3 h-3" /> {selectedProfile.active_area}</span>}
                      </div>
                      {selectedProfile.gang_affiliation && (
                        <Badge variant="destructive">{selectedProfile.gang_affiliation}</Badge>
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${
                        selectedProfile.risk_score > 70 ? "text-red-600" :
                        selectedProfile.risk_score > 50 ? "text-orange-600" : "text-yellow-600"
                      }`}>
                        {selectedProfile.risk_score.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Risk Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Breakdown */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Score Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(selectedProfile.risk_breakdown).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono">{value.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, value * 2.5)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200">
                    <p className="text-xs">
                      <strong>Recidivism Probability:</strong>{" "}
                      <span className="font-bold text-orange-700">{(selectedProfile.recidivism_probability * 100).toFixed(0)}%</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Behavioral Profile */}
              {selectedProfile.behavioral_profile && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Behavioral Profile</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{selectedProfile.behavioral_profile}</p>
                  </CardContent>
                </Card>
              )}

              {/* MO Timeline */}
              {selectedProfile.mo_timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">MO Evolution Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedProfile.mo_timeline.map((event, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              event.severity === "critical" ? "bg-red-500" :
                              event.severity === "high" ? "bg-orange-500" : "bg-blue-500"
                            }`} />
                            {i < selectedProfile.mo_timeline.length - 1 && <div className="w-0.5 h-8 bg-border mt-1" />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{event.crime_type}</span>
                              <Badge variant="outline" className="text-[9px]">{event.fir_number}</Badge>
                            </div>
                            <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                              <span><Clock className="inline w-2.5 h-2.5" /> {new Date(event.date).toLocaleDateString()}</span>
                              <span><MapPin className="inline w-2.5 h-2.5" /> {event.location}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Select an offender to view profile</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default OffenderProfilePage
