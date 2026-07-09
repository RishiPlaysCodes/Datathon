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
  // SVG-based network visualization
  const width = 700
  const height = 500
  const centerX = width / 2
  const centerY = height / 2

  // Position nodes in a force-directed-like layout
  const nodePositions: Record<string, { x: number; y: number }> = {}
  const nodesByType: Record<string, typeof graph.nodes> = {}

  graph.nodes.forEach(node => {
    if (!nodesByType[node.type]) nodesByType[node.type] = []
    nodesByType[node.type].push(node)
  })

  // Layout nodes in concentric circles by type
  const typeOrder = ['accused', 'fir', 'location']
  let radius = 0

  typeOrder.forEach((type, typeIdx) => {
    const nodes = nodesByType[type] || []
    radius = 80 + typeIdx * 120
    nodes.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1)
      nodePositions[node.id] = {
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
      }
    })
  })

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'accused': return '#ef4444'
      case 'fir': return '#3b82f6'
      case 'location': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-dark-900/50 rounded-lg">
      {/* Edges */}
      {graph.edges.map((edge, idx) => {
        const from = nodePositions[edge.source]
        const to = nodePositions[edge.target]
        if (!from || !to) return null
        return (
          <line
            key={idx}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#334155"
            strokeWidth={edge.weight * 2}
            opacity={0.6}
          />
        )
      })}

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = nodePositions[node.id]
        if (!pos) return null
        const color = getNodeColor(node.type)
        const size = node.type === 'accused' ? 12 : 8

        return (
          <g key={node.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={color}
              opacity={0.8}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.3}
            />
            <text
              x={pos.x}
              y={pos.y + size + 12}
              textAnchor="middle"
              className="text-[9px] fill-gray-400"
            >
              {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
