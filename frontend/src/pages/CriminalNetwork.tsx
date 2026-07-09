import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Share2, Users, AlertTriangle, Search, Loader2,
  Target, Zap, UserCheck, Filter
} from "lucide-react"

interface NetworkNode {
  id: string
  label: string
  type: string
  risk_score: number
  gang: string
  is_repeat: boolean
  area: string
  pagerank: number
  community: number
  entity_id: number
}

interface NetworkEdge {
  source: string
  target: string
  relationship: string
  weight: number
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  stats: { total_nodes: number; total_edges: number; communities: number; density: number }
}

interface Community {
  community_id: number
  size: number
  members: { id: string; label: string; entity_id: number; risk_score: number; gang: string }[]
  primary_gang: string
}

interface EntityMatch {
  id: number
  name: string
  alias: string | null
  confidence: number
  match_type: string
  risk_score: number
  gang: string | null
  total_cases: number
  area: string | null
}


const COMMUNITY_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
]

const CriminalNetwork = () => {
  const { token } = useAuth()
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [communities, setCommunities] = useState<Community[]>([])
  const [keyPlayers, setKeyPlayers] = useState<any[]>([])
  const [entitySearch, setEntitySearch] = useState("")
  const [entityResults, setEntityResults] = useState<EntityMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"graph" | "communities" | "entity">("graph")
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const [graphRes, commRes, playersRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/network/graph`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/network/communities`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/network/key-players?top_n=10`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (graphRes.ok) setNetworkData(await graphRes.json())
        if (commRes.ok) setCommunities(await commRes.json())
        if (playersRes.ok) setKeyPlayers(await playersRes.json())
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNetwork()
  }, [token])

  // Draw force-directed graph on canvas
  useEffect(() => {
    if (!networkData || !canvasRef.current || activeTab !== "graph") return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width = canvas.offsetWidth * 2
    const height = canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const w = width / 2
    const h = height / 2

    // Simple force layout positions
    const positions: Record<string, { x: number; y: number }> = {}
    const nodes = networkData.nodes
    const edges = networkData.edges

    // Initialize positions in a circle grouped by community
    nodes.forEach((node, i) => {
      const communityAngle = (node.community / (networkData.stats.communities || 1)) * Math.PI * 2
      const radius = 120 + Math.random() * 80
      positions[node.id] = {
        x: w / 2 + Math.cos(communityAngle + (i * 0.3)) * radius + (Math.random() - 0.5) * 60,
        y: h / 2 + Math.sin(communityAngle + (i * 0.3)) * radius + (Math.random() - 0.5) * 60,
      }
    })

    // Simple force simulation (few iterations for speed)
    for (let iter = 0; iter < 50; iter++) {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = positions[nodes[i].id]
          const b = positions[nodes[j].id]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
          const force = 500 / (dist * dist)
          a.x -= (dx / dist) * force
          a.y -= (dy / dist) * force
          b.x += (dx / dist) * force
          b.y += (dy / dist) * force
        }
      }
      // Attraction along edges
      edges.forEach((edge) => {
        const a = positions[edge.source]
        const b = positions[edge.target]
        if (!a || !b) return
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const force = (dist - 80) * 0.01
        a.x += (dx / dist) * force
        a.y += (dy / dist) * force
        b.x -= (dx / dist) * force
        b.y -= (dy / dist) * force
      })
      // Center gravity
      nodes.forEach((node) => {
        const p = positions[node.id]
        p.x += (w / 2 - p.x) * 0.01
        p.y += (h / 2 - p.y) * 0.01
      })
    }


    // Draw
    ctx.clearRect(0, 0, w, h)

    // Draw edges
    edges.forEach((edge) => {
      const a = positions[edge.source]
      const b = positions[edge.target]
      if (!a || !b) return
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = edge.relationship === "co_accused" ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)"
      ctx.lineWidth = Math.min(3, edge.weight)
      ctx.stroke()
    })

    // Draw nodes
    nodes.forEach((node) => {
      const p = positions[node.id]
      if (!p) return
      const radius = 4 + (node.risk_score / 25)
      const color = COMMUNITY_COLORS[node.community % COMMUNITY_COLORS.length] || "#94a3b8"

      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = node.is_repeat ? color : color + "80"
      ctx.fill()
      if (node.is_repeat) {
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Label for high-risk
      if (node.risk_score > 60 || node.pagerank > 0.02) {
        ctx.font = "9px sans-serif"
        ctx.fillStyle = "#1e293b"
        ctx.textAlign = "center"
        ctx.fillText(node.label.split(" ")[0], p.x, p.y - radius - 4)
      }
    })
  }, [networkData, activeTab])

  const handleEntitySearch = async () => {
    if (!entitySearch.trim()) return
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/network/entity-resolution/search?name=${encodeURIComponent(entitySearch)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) setEntityResults(await res.json())
    } catch (e) {
      console.error(e)
    }
  }


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
          <h1 className="text-3xl font-bold tracking-tight">Criminal Network Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Graph-based visualization of criminal relationships and communities
          </p>
        </div>
        <div className="flex gap-2">
          {["graph", "communities", "entity"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab as any)}
            >
              {tab === "graph" && <Share2 className="w-3.5 h-3.5 mr-1.5" />}
              {tab === "communities" && <Users className="w-3.5 h-3.5 mr-1.5" />}
              {tab === "entity" && <UserCheck className="w-3.5 h-3.5 mr-1.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      {networkData && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Nodes", value: networkData.stats.total_nodes, icon: Target },
            { label: "Edges", value: networkData.stats.total_edges, icon: Share2 },
            { label: "Communities", value: networkData.stats.communities, icon: Users },
            { label: "Density", value: networkData.stats.density.toFixed(3), icon: Zap },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* GRAPH TAB */}
      {activeTab === "graph" && (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              <div className="relative h-[500px] bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{ width: "100%", height: "100%" }}
                />
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur border p-3 rounded-lg">
                  <p className="text-[10px] font-bold uppercase mb-2">Legend</p>
                  <div className="space-y-1.5">
                    {communities.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COMMUNITY_COLORS[i] }} />
                        <span>{c.primary_gang || `Community ${c.community_id}`}</span>
                        <span className="text-muted-foreground">({c.size})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Players Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key Players (PageRank)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {keyPlayers.slice(0, 8).map((player, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-xs">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.label}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{player.connections} links</span>
                      {player.gang && <Badge variant="outline" className="text-[9px] px-1 py-0">{player.gang.split(" ")[0]}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${player.risk_score > 60 ? "text-red-600" : "text-orange-600"}`}>
                      {player.risk_score.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-muted-foreground">risk</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}


      {/* COMMUNITIES TAB */}
      {activeTab === "communities" && (
        <div className="grid gap-4 md:grid-cols-2">
          {communities.map((comm) => (
            <Card key={comm.community_id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COMMUNITY_COLORS[comm.community_id % COMMUNITY_COLORS.length] }}
                    />
                    {comm.primary_gang || `Community ${comm.community_id}`}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {comm.size} members
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {comm.members.slice(0, 6).map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                      <span className="font-medium">{member.label}</span>
                      <div className="flex items-center gap-2">
                        {member.risk_score > 60 && (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`font-mono ${member.risk_score > 60 ? "text-red-600" : "text-muted-foreground"}`}>
                          {member.risk_score.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {comm.size > 6 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      +{comm.size - 6} more members
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ENTITY RESOLUTION TAB */}
      {activeTab === "entity" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entity Resolution - Fuzzy Name Search</CardTitle>
              <p className="text-xs text-muted-foreground">
                Search criminals by name. System uses fuzzy matching to find duplicates and aliases.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder='Try: "Ravi", "R Kumar", "Naveen"...'
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEntitySearch()}
                  className="flex-1"
                />
                <Button onClick={handleEntitySearch}>
                  <Search className="w-4 h-4 mr-2" /> Resolve
                </Button>
              </div>
            </CardContent>
          </Card>

          {entityResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Matches Found: {entityResults.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entityResults.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{match.name}</span>
                          {match.alias && (
                            <Badge variant="outline" className="text-[10px]">
                              alias: {match.alias}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {match.area && <span>Area: {match.area}</span>}
                          {match.gang && <span>Gang: {match.gang}</span>}
                          <span>Cases: {match.total_cases}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          match.confidence > 80 ? "text-green-600" :
                          match.confidence > 60 ? "text-yellow-600" : "text-muted-foreground"
                        }`}>
                          {match.confidence.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {match.match_type} match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default CriminalNetwork
