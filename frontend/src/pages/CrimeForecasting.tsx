import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Bell, TrendingUp, MapPin, Check, AlertTriangle, Shield } from "lucide-react"

interface Alert { id: number; title: string; description: string; severity: string; alert_type: string; location: string; confidence_score: number; is_acknowledged: boolean; created_at: string; recommended_action: string }
interface Prediction { id: number; type: string; location: string; district: string; crime_type: string; probability: number; confidence: string; predicted_start: string | null; predicted_end: string | null; recommended_action: string; basis: any }

const CrimeForecasting = () => {
  const { token } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/forecasting/alerts`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/forecasting/predictions`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (aRes.ok) setAlerts(await aRes.json())
        if (pRes.ok) setPredictions(await pRes.json())
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [token])

  const acknowledgeAlert = async (id: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/analytics/forecasting/alerts/${id}/acknowledge`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a))
    } catch (e) { console.error(e) }
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crime Forecasting & Early Warning</h1>
        <p className="text-muted-foreground mt-1">Predictive alerts and event-aware crime forecasting</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Bell className="w-5 h-5 text-red-500" /><div><p className="text-[10px] text-muted-foreground uppercase">Active Alerts</p><p className="text-xl font-bold">{alerts.filter(a => !a.is_acknowledged).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="w-5 h-5 text-blue-500" /><div><p className="text-[10px] text-muted-foreground uppercase">Predictions</p><p className="text-xl font-bold">{predictions.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-orange-500" /><div><p className="text-[10px] text-muted-foreground uppercase">Critical</p><p className="text-xl font-bold">{alerts.filter(a => a.severity === "critical").length}</p></div></CardContent></Card>
      </div>


      {/* Alerts */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" />Active Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-lg border ${alert.is_acknowledged ? "opacity-60" : ""} ${
              alert.severity === "critical" ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" :
              alert.severity === "high" ? "border-orange-200 bg-orange-50/50 dark:bg-orange-900/10" : ""
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === "critical" ? "destructive" : alert.severity === "high" ? "default" : "secondary"} className="text-[10px]">
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{alert.alert_type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{Math.round(alert.confidence_score * 100)}% confidence</span>
                  </div>
                  <h3 className="font-medium text-sm">{alert.title}</h3>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <MapPin className="w-3 h-3" />{alert.location}
                    <span className="text-muted-foreground">|</span>
                    <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                  {alert.recommended_action && (
                    <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-800 dark:text-blue-200">
                      <Shield className="inline w-3 h-3 mr-1" />
                      <strong>Action:</strong> {alert.recommended_action}
                    </div>
                  )}
                </div>
                {!alert.is_acknowledged && (
                  <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                    <Check className="w-3 h-3 mr-1" />Ack
                  </Button>
                )}
                {alert.is_acknowledged && <Badge variant="secondary" className="text-[9px]"><Check className="w-3 h-3 mr-1" />Done</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Predictions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Crime Predictions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {predictions.map(pred => (
              <div key={pred.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{pred.type}</Badge>
                  <span className={`text-sm font-bold ${pred.probability > 0.7 ? "text-red-600" : pred.probability > 0.5 ? "text-orange-600" : "text-green-600"}`}>
                    {(pred.probability * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs font-medium">{pred.crime_type} - {pred.location}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <Badge variant={pred.confidence === "high" ? "default" : "secondary"} className="text-[9px]">{pred.confidence}</Badge>
                  {pred.predicted_start && <span>From: {new Date(pred.predicted_start).toLocaleDateString()}</span>}
                </div>
                {pred.recommended_action && <p className="text-[10px] italic text-muted-foreground">{pred.recommended_action}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CrimeForecasting
