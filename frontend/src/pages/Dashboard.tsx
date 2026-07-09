import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import {
  Shield, FileText, Users, AlertTriangle, TrendingUp,
  MapPin, Activity, Bell, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from "recharts"
import { Link } from "react-router-dom"

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#be185d"]

interface DashboardStats {
  total_firs: number
  open_cases: number
  under_investigation: number
  closed_cases: number
  total_criminals: number
  repeat_offenders: number
  active_alerts: number
  recent_30_days: number
  category_distribution: { name: string; value: number }[]
  district_distribution: { name: string; value: number }[]
  monthly_trend: { month: string; count: number }[]
  clearance_rate: number
}

interface Alert {
  id: number
  title: string
  severity: string
  confidence_score: number
  location: string
  created_at: string
  alert_type: string
}


const Dashboard = () => {
  const { user, token } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/analytics/forecasting/alerts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (alertsRes.ok) setAlerts(await alertsRes.json())
      } catch (e) {
        console.error("Dashboard fetch error:", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const statCards = [
    { title: "Total FIRs", value: stats?.total_firs || 0, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Open Cases", value: stats?.open_cases || 0, icon: Shield, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Under Investigation", value: stats?.under_investigation || 0, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
    { title: "Repeat Offenders", value: stats?.repeat_offenders || 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Active Alerts", value: stats?.active_alerts || 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Last 30 Days", value: stats?.recent_30_days || 0, icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
    { title: "Clearance Rate", value: `${stats?.clearance_rate || 0}%`, icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Total Criminals", value: stats?.total_criminals || 0, icon: Users, color: "text-slate-600", bg: "bg-slate-50" },
  ]


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            PRAHARI Crime Intelligence Dashboard - Real-time overview
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          System Online
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crime Trend (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthly_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone" dataKey="count"
                    stroke="#2563eb" fill="#2563eb" fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crime Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.category_distribution || []}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    {(stats?.category_distribution || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mt-2">
              {(stats?.category_distribution || []).slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Second Charts Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* District Distribution */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">District-wise Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.district_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                Active Alerts
              </CardTitle>
              <Link to="/alerts" className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-dashed"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  alert.severity === "critical" ? "bg-red-500" :
                  alert.severity === "high" ? "bg-orange-500" :
                  "bg-yellow-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{alert.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        alert.severity === "critical" ? "border-red-300 text-red-700" :
                        alert.severity === "high" ? "border-orange-300 text-orange-700" :
                        "border-yellow-300 text-yellow-700"
                      }`}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(alert.confidence_score * 100)}% conf
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No active alerts
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "AI Assistant", path: "/ai-assistant", icon: "🤖" },
              { label: "Crime Hotspots", path: "/hotspots", icon: "🗺️" },
              { label: "Criminal Network", path: "/network", icon: "🔗" },
              { label: "Forecasting", path: "/alerts", icon: "📊" },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
