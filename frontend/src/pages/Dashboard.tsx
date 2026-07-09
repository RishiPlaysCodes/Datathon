import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { Shield, FileText, Users, AlertCircle } from "lucide-react"

const Dashboard = () => {
  const { user } = useAuth()

  const stats = [
    { title: "Active Cases", value: "24", icon: FileText, color: "text-blue-600" },
    { title: "Investigations", value: "12", icon: Shield, color: "text-green-600" },
    { title: "Suspects Tracked", value: "156", icon: Users, color: "text-orange-600" },
    { title: "Urgent Alerts", value: "3", icon: AlertCircle, color: "text-red-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.full_name}</h1>
        <p className="text-muted-foreground mt-1">
          Here is an overview of the current crime investigation status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">+2 since yesterday</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      New evidence uploaded for Case #2024-0{i}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      2 hours ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Engine</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Secure</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
