import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin, Loader2, Clock, Shield, TrendingUp, Navigation
} from "lucide-react"

interface HotspotPoint {
  lat: number
  lng: number
  intensity: number
  fir_number: string
  location: string
  severity: string
  time_of_day: string
}

interface HotspotData {
  points: HotspotPoint[]
  top_hotspots: { location: string; count: number }[]
  total_incidents: number
  time_range_days: number
}

interface TimeDistribution {
  by_time_of_day: Record<string, number>
  by_day_of_week: Record<string, number>
}

interface PatrolRec {
  location: string
  peak_crime_time: string
  total_incidents_90d: number
  priority: string
}


const CrimeHotspots = () => {
  const { token } = useAuth()
  const [hotspotData, setHotspotData] = useState<HotspotData | null>(null)
  const [timeDist, setTimeDist] = useState<TimeDistribution | null>(null)
  const [patrols, setPatrols] = useState<PatrolRec[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<"map" | "time" | "patrol">("map")
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotRes, timeRes, patrolRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/hotspots?days=180`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/hotspots/time-distribution`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/hotspots/patrol-recommendations`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (hotRes.ok) setHotspotData(await hotRes.json())
        if (timeRes.ok) setTimeDist(await timeRes.json())
        if (patrolRes.ok) {
          const data = await patrolRes.json()
          setPatrols(data.recommendations || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crime Hotspots</h1>
          <p className="text-muted-foreground mt-1">
            Geospatial crime density analysis across Karnataka
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { key: "map", label: "Heatmap", icon: MapPin },
            { key: "time", label: "Time Analysis", icon: Clock },
            { key: "patrol", label: "Patrol", icon: Navigation },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeView === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView(key as any)}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Incidents</p>
              <p className="text-xl font-bold">{hotspotData?.total_incidents || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Top Hotspots</p>
              <p className="text-xl font-bold">{hotspotData?.top_hotspots?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Time Range</p>
              <p className="text-xl font-bold">{hotspotData?.time_range_days || 0} days</p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* MAP VIEW */}
      {activeView === "map" && (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              <div ref={mapRef} className="relative h-[500px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
                {/* Canvas-based heatmap visualization */}
                <HeatmapCanvas points={hotspotData?.points || []} />
                {/* Map overlay info */}
                <div className="absolute top-4 left-4 bg-background/90 backdrop-blur border p-3 rounded-lg">
                  <p className="text-xs font-bold">Bengaluru Crime Heatmap</p>
                  <p className="text-[10px] text-muted-foreground">
                    {hotspotData?.total_incidents} incidents plotted
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Hotspots Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                Top Crime Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hotspotData?.top_hotspots?.map((spot, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < 3 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {i + 1}
                    </div>
                    <span className="font-medium truncate max-w-[120px]">{spot.location}</span>
                  </div>
                  <Badge variant={i < 3 ? "destructive" : "secondary"} className="text-[10px]">
                    {spot.count} cases
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TIME ANALYSIS VIEW */}
      {activeView === "time" && timeDist && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">By Time of Day</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(timeDist.by_time_of_day)
                  .sort((a, b) => b[1] - a[1])
                  .map(([time, count]) => {
                    const maxCount = Math.max(...Object.values(timeDist.by_time_of_day))
                    return (
                      <div key={time} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize font-medium">{time}</span>
                          <span className="text-muted-foreground">{count} cases</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              time === "night" ? "bg-purple-500" :
                              time === "evening" ? "bg-orange-500" :
                              time === "morning" ? "bg-yellow-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">By Day of Week</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                  .filter(d => timeDist.by_day_of_week[d])
                  .map((day) => {
                    const count = timeDist.by_day_of_week[day] || 0
                    const maxCount = Math.max(...Object.values(timeDist.by_day_of_week))
                    return (
                      <div key={day} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{day}</span>
                          <span className="text-muted-foreground">{count} cases</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* PATROL VIEW */}
      {activeView === "patrol" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Patrol Deployment Recommendations
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              AI-generated patrol suggestions based on 90-day crime pattern analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patrols.map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{rec.location}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Peak: <strong className="text-foreground">{rec.peak_crime_time}</strong></span>
                      <span>Incidents (90d): <strong className="text-foreground">{rec.total_incidents_90d}</strong></span>
                    </div>
                  </div>
                  <Badge variant={
                    rec.priority === "HIGH" ? "destructive" :
                    rec.priority === "MEDIUM" ? "default" : "secondary"
                  }>
                    {rec.priority}
                  </Badge>
                </div>
              ))}
              {patrols.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No patrol recommendations available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Simple canvas-based heatmap component
function HeatmapCanvas({ points }: { points: HotspotPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || points.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    // Bengaluru bounds
    const minLat = 12.82, maxLat = 13.12
    const minLng = 77.45, maxLng = 77.78

    // Draw background map grid
    ctx.fillStyle = "#f1f5f9"
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath()
      ctx.moveTo((i / 10) * w, 0)
      ctx.lineTo((i / 10) * w, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (i / 10) * h)
      ctx.lineTo(w, (i / 10) * h)
      ctx.stroke()
    }

    // Draw heatmap points
    points.forEach((point) => {
      const x = ((point.lng - minLng) / (maxLng - minLng)) * w
      const y = (1 - (point.lat - minLat) / (maxLat - minLat)) * h
      const radius = 8 + point.intensity * 12

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      if (point.severity === "critical") {
        gradient.addColorStop(0, "rgba(239, 68, 68, 0.6)")
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)")
      } else if (point.severity === "high") {
        gradient.addColorStop(0, "rgba(249, 115, 22, 0.5)")
        gradient.addColorStop(1, "rgba(249, 115, 22, 0)")
      } else {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.4)")
        gradient.addColorStop(1, "rgba(59, 130, 246, 0)")
      }

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    })

    // Labels for known areas
    const labels = [
      { name: "Koramangala", lat: 12.935, lng: 77.625 },
      { name: "Whitefield", lat: 12.970, lng: 77.750 },
      { name: "Majestic", lat: 12.977, lng: 77.571 },
      { name: "Electronic City", lat: 12.846, lng: 77.660 },
      { name: "Hebbal", lat: 13.036, lng: 77.597 },
    ]
    ctx.font = "10px sans-serif"
    ctx.fillStyle = "#475569"
    labels.forEach(({ name, lat, lng }) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * w
      const y = (1 - (lat - minLat) / (maxLat - minLat)) * h
      ctx.fillText(name, x - 20, y - 5)
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = "#1e293b"
      ctx.fill()
      ctx.fillStyle = "#475569"
    })
  }, [points])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
}

export default CrimeHotspots
