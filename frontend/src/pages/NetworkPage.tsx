import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Search, Network, Users, AlertTriangle } from 'lucide-react'
import type { NetworkGraph } from '@/types'

export function NetworkPage() {
  const [accusedId, setAccusedId] = useState<number | null>(null)
  const [searchName, setSearchName] = useState('')
  const [depth, setDepth] = useState(2)

  const { data: accused, isLoading: loadingAccused } = useQuery({
    queryKey: ['accused-search', searchName],
    queryFn: () => crimeAPI.listAccused({ search: searchName || undefined, repeat_only: false }),
    enabled: searchName.length > 0,
  })

  const { data: network, isLoading: loadingNetwork } = useQuery({
    queryKey: ['network', accusedId, depth],
    queryFn: () => crimeAPI.getNetwork(accusedId!, depth),
    enabled: !!accusedId,
  })

  const { data: entityResolution } = useQuery({
    queryKey: ['entity-resolution', searchName],
    queryFn: () => crimeAPI.resolveEntity(searchName),
    enabled: searchName.length > 2,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Network className="w-6 h-6 text-primary-400" />
          Criminal Network Analysis
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Visualize connections, detect communities, identify key players
        </p>
      </div>

      {/* Search & Controls */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search accused by name to view network..."
              className="input-field w-full pl-9"
            />
          </div>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="input-field"
          >
            <option value={1}>Depth: 1</option>
            <option value={2}>Depth: 2</option>
            <option value={3}>Depth: 3</option>
          </select>
        </div>

        {/* Entity Resolution Results */}
        {entityResolution && entityResolution.matches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dark-700/30">
            <p className="text-xs text-gray-500 mb-2">
              Entity Resolution: {entityResolution.total_potential_matches} potential matches found
            </p>
            <div className="flex flex-wrap gap-2">
              {entityResolution.matches.slice(0, 5).map((match: any) => (
                <button
                  key={match.id}
                  onClick={() => setAccusedId(match.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    accusedId === match.id
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                      : 'border-dark-600 bg-dark-800 text-gray-300 hover:border-primary-500/50'
                  }`}
                >
                  {match.name}
                  {match.alias && <span className="text-gray-500"> ({match.alias})</span>}
                  <span className="ml-1 text-gray-500">
                    {(match.confidence * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accused List */}
        {accused && accused.length > 0 && !entityResolution?.matches.length && (
          <div className="mt-3 pt-3 border-t border-dark-700/30">
            <div className="flex flex-wrap gap-2">
              {accused.slice(0, 8).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccusedId(a.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    accusedId === a.id
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                      : 'border-dark-600 bg-dark-800 text-gray-300 hover:border-primary-500/50'
                  }`}
                >
                  {a.name} (Risk: {a.risk_score.toFixed(0)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Network Visualization */}
      {loadingNetwork ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : network ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Canvas */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Network Graph</h3>
            <NetworkVisualization graph={network} />
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            {/* Graph Stats */}
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Graph Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nodes</span>
                  <span className="text-white font-medium">{network.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Connections</span>
                  <span className="text-white font-medium">{network.edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Communities</span>
                  <span className="text-white font-medium">{network.communities.length}</span>
                </div>
              </div>
            </div>

            {/* Key Players */}
            {network.key_players.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Key Players
                </h4>
                <div className="space-y-2">
                  {network.key_players.map((kp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-200">{kp.name}</span>
                      <span className="text-xs text-primary-400">
                        Centrality: {(kp.centrality * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Legend</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-400">Accused</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-400">FIR</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-400">Location</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">Select an Accused Person</h3>
          <p className="text-sm text-gray-600 mt-1">
            Search by name above to view their criminal network
          </p>
        </div>
      )}
    </div>
  )
}

function NetworkVisualization({ graph }: { graph: NetworkGraph }) {
  const width = 700
  const height = 500
  const [selectedNode, setSelectedNode] = useState<any>(null)

  // Deterministic force-directed layout: iteratively push connected nodes
  // apart while pulling edges together, seeded from type-based circles.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    const byType: Record<string, typeof graph.nodes> = {}
    graph.nodes.forEach(n => {
      if (!byType[n.type]) byType[n.type] = []
      byType[n.type].push(n)
    })
    const typeOrder = ['accused', 'fir', 'location']
    typeOrder.forEach((type, ti) => {
      const nodes = byType[type] || []
      const r = 80 + ti * 130
      nodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) + ti * 0.3
        pos[n.id] = { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) }
      })
    })
    // Simple force iterations to reduce overlap
    for (let iter = 0; iter < 50; iter++) {
      // Repulsion between all nodes
      const ids = Object.keys(pos)
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos[ids[i]], b = pos[ids[j]]
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist < 60) {
            const force = (60 - dist) * 0.3 / dist
            a.x -= dx * force; a.y -= dy * force
            b.x += dx * force; b.y += dy * force
          }
        }
      }
      // Attraction along edges
      graph.edges.forEach(e => {
        const a = pos[e.source], b = pos[e.target]
        if (a && b) {
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist > 150) {
            const force = (dist - 150) * 0.01 / dist
            a.x += dx * force; a.y += dy * force
            b.x -= dx * force; b.y -= dy * force
          }
        }
      })
    }
    // Clamp to bounds
    Object.values(pos).forEach(p => {
      p.x = Math.max(30, Math.min(width - 30, p.x))
      p.y = Math.max(30, Math.min(height - 30, p.y))
    })
    return pos
  })
  const [dragging, setDragging] = useState<string | null>(null)

  const handleMouseDown = (nodeId: string) => setDragging(nodeId)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - svg.left) / svg.width) * width
    const y = ((e.clientY - svg.top) / svg.height) * height
    setPositions(prev => ({ ...prev, [dragging]: { x, y } }))
  }
  const handleMouseUp = () => setDragging(null)

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'accused': return '#ef4444'
      case 'fir': return '#3b82f6'
      case 'location': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <>
    <svg
      width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
      className="bg-dark-900/50 rounded-lg cursor-grab active:cursor-grabbing select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Edges */}
      {graph.edges.map((edge, idx) => {
        const from = positions[edge.source]
        const to = positions[edge.target]
        if (!from || !to) return null
        return (
          <line key={idx} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke="#475569" strokeWidth={Math.max(1, edge.weight * 2)} opacity={0.5}
          />
        )
      })}
      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        const color = getNodeColor(node.type)
        const size = node.type === 'accused' ? 14 : 9
        return (
          <g key={node.id} onMouseDown={() => handleMouseDown(node.id)} onClick={() => setSelectedNode(node)} style={{ cursor: 'pointer' }}>
            <circle cx={pos.x} cy={pos.y} r={size + 4} fill="transparent" />
            <circle cx={pos.x} cy={pos.y} r={size} fill={color} opacity={0.85} stroke={color} strokeWidth={3} strokeOpacity={0.2} />
            <text x={pos.x} y={pos.y + size + 13} textAnchor="middle" className="text-[9px] fill-gray-400 pointer-events-none select-none">
              {node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
            </text>
          </g>
        )
      })}
    </svg>
    {/* Node Evidence Panel */}
    {selectedNode && (
      <div className="mt-3 p-3 bg-gray-900/80 border border-cyan-900/50 rounded-lg text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-cyan-400 font-medium">🔍 Node Evidence: {selectedNode.label}</span>
          <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <p className="text-gray-400">Type: <span className="text-white capitalize">{selectedNode.type}</span></p>
        {selectedNode.type === 'accused' && (
          <>
            <p className="text-gray-400">Connections: {graph.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length} edges</p>
            <p className="text-gray-400">Evidence: Linked through shared FIR records (co-accused relationship)</p>
            <p className="text-gray-400">Confidence: 100% (same FIR = confirmed co-accused link)</p>
          </>
        )}
        {selectedNode.type === 'fir' && <p className="text-gray-400">FIR record node — click to view details in FIR Records page</p>}
        {selectedNode.type === 'location' && <p className="text-gray-400">Geographic node — crimes occurred at this location</p>}
        {graph.communities.length > 0 && (
          <p className="text-gray-400">Community: Detected by Louvain algorithm (modularity-based clustering)</p>
        )}
      </div>
    )}
    </>
  )
}
