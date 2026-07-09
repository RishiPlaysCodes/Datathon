import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, BarChart3, TrendingUp, Users } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts"

interface DistrictData {
  district: string; population: number; literacy_rate: number
  unemployment_rate: number; poverty_rate: number; crime_rate_per_lakh: number
  social_risk_score: number; risk_factors: Record<string, number>
}

interface Correlation { factor: string; correlation: number; strength: string; direction: string }

const Settings = () => {
  const { token, user } = useAuth()
  const [districts, setDistricts] = useState<DistrictData[]>([])
  const [correlations, setCorrelations] = useState<Correlation[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [distRes, corrRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/sociological/districts`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/sociological/correlations`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (distRes.ok) setDistricts(await distRes.json())
        if (corrRes.ok) {
          const data = await corrRes.json()
          setCorrelations(data.correlations || [])
          setInsights(data.insights || [])
        }
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [token])

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sociological Crime Insights</h1>
        <p className="text-muted-foreground mt-1">Correlation analysis between socio-economic factors and crime rates</p>
      </div>

      {/* Correlation Insights */}
      {insights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-600" />Key Insights</h3>
            <div className="space-y-1">
              {insights.map((ins, i) => (
                <p key={i} className="text-xs">• {ins}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlations */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Socio-Economic Factor Correlations with Crime</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {correlations.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize font-medium">{c.factor.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.strength === "strong" ? "destructive" : c.strength === "moderate" ? "default" : "secondary"} className="text-[9px]">
                      {c.strength}
                    </Badge>
                    <span className="font-mono">{c.correlation.toFixed(3)}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.correlation > 0 ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${Math.abs(c.correlation) * 100}%`, marginLeft: c.correlation < 0 ? `${(1 - Math.abs(c.correlation)) * 100}%` : "0" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* District Risk Scores */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">District Social Risk Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districts.sort((a, b) => b.social_risk_score - a.social_risk_score).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="social_risk_score" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Crime Rate vs Unemployment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="unemployment_rate" name="Unemployment %" tick={{ fontSize: 10 }} label={{ value: "Unemployment %", position: "bottom", fontSize: 10 }} />
                  <YAxis dataKey="crime_rate_per_lakh" name="Crime Rate" tick={{ fontSize: 10 }} label={{ value: "Crime/Lakh", angle: -90, position: "left", fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={districts} fill="#2563eb" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* District Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">District Socio-Economic Data</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b">
              <th className="text-left p-2">District</th><th className="p-2">Population</th>
              <th className="p-2">Literacy</th><th className="p-2">Unemployment</th>
              <th className="p-2">Poverty</th><th className="p-2">Crime Rate</th><th className="p-2">Risk Score</th>
            </tr></thead>
            <tbody>
              {districts.map(d => (
                <tr key={d.district} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{d.district}</td>
                  <td className="p-2 text-center">{(d.population/1000000).toFixed(1)}M</td>
                  <td className="p-2 text-center">{d.literacy_rate}%</td>
                  <td className="p-2 text-center">{d.unemployment_rate}%</td>
                  <td className="p-2 text-center">{d.poverty_rate}%</td>
                  <td className="p-2 text-center">{d.crime_rate_per_lakh}</td>
                  <td className="p-2 text-center">
                    <span className={`font-bold ${d.social_risk_score > 60 ? "text-red-600" : d.social_risk_score > 40 ? "text-orange-600" : "text-green-600"}`}>
                      {d.social_risk_score?.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
