import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Search, Network, Users, AlertTriangle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
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
            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center justify-between">
              <span>Network Graph</span>
              <span className="text-[10px] text-gray-500 font-normal">Scroll to zoom • Drag to pan • Drag nodes to move</span>
            </h3>
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
  const svgRef = useRef<SVGSVGElement>(null)
  const width = 700
  const height = 500
  const centerX = width / 2
  const centerY = height / 2

  // Interactive state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragging, setDragging] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Initialize node positions
  useEffect(() => {
    const nodePositions: Record<string, { x: number; y: number }> = {}
    const nodesByType: Record<string, typeof graph.nodes> = {}

    graph.nodes.forEach(node => {
      if (!nodesByType[node.type]) nodesByType[node.type] = []
      nodesByType[node.type].push(node)
    })

    const typeOrder = ['accused', 'fir', 'location']
    typeOrder.forEach((type, typeIdx) => {
      const nodes = nodesByType[type] || []
      const radius = 80 + typeIdx * 120
      nodes.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(nodes.length, 1)
        nodePositions[node.id] = {
          x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 15,
          y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 15,
        }
      })
    })

    setPositions(nodePositions)
  }, [graph])

  // Mouse to SVG coordinate conversion
  const getMouseSVG = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    }
  }, [width, height])

  // Zoom handler (scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(5, z * delta)))
  }, [])

  // Mouse down - start drag or pan
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId?: string) => {
    e.preventDefault()
    if (nodeId) {
      setDragging(nodeId)
    } else {
      setPanning(true)
    }
    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [])

  // Mouse move - drag node or pan canvas
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - lastMouse.x
    const dy = e.clientY - lastMouse.y

    if (dragging) {
      setPositions(prev => ({
        ...prev,
        [dragging]: {
          x: (prev[dragging]?.x || 0) + dx / zoom,
          y: (prev[dragging]?.y || 0) + dy / zoom,
        }
      }))
      setLastMouse({ x: e.clientX, y: e.clientY })
    } else if (panning) {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastMouse({ x: e.clientX, y: e.clientY })
    }
  }, [dragging, panning, lastMouse, zoom])

  // Mouse up - stop drag/pan
  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setPanning(false)
  }, [])

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(5, z * 1.3))
  const zoomOut = () => setZoom(z => Math.max(0.3, z * 0.7))
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'accused': return '#ef4444'
      case 'fir': return '#3b82f6'
      case 'location': return '#10b981'
      default: return '#6b7280'
    }
  }

  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button onClick={zoomIn} className="p-1.5 rounded bg-dark-700/80 hover:bg-dark-600 text-gray-300" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={zoomOut} className="p-1.5 rounded bg-dark-700/80 hover:bg-dark-600 text-gray-300" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={resetView} className="p-1.5 rounded bg-dark-700/80 hover:bg-dark-600 text-gray-300" title="Reset View">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-2 left-2 z-10 text-[10px] text-gray-500 bg-dark-800/80 px-2 py-1 rounded">
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-dark-900/50 rounded-lg cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={transform}>
          {/* Edges */}
          {graph.edges.map((edge, idx) => {
            const from = positions[edge.source]
            const to = positions[edge.target]
            if (!from || !to) return null
            const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target
            return (
              <line
                key={idx}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? '#60a5fa' : '#334155'}
                strokeWidth={isHighlighted ? edge.weight * 3 : edge.weight * 2}
                opacity={isHighlighted ? 0.9 : 0.5}
                style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
              />
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = positions[node.id]
            if (!pos) return null
            const color = getNodeColor(node.type)
            const isHovered = hoveredNode === node.id
            const size = node.type === 'accused' ? (isHovered ? 16 : 12) : (isHovered ? 11 : 8)

            return (
              <g
                key={node.id}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, node.id) }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow effect on hover */}
                {isHovered && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size + 6}
                    fill={color}
                    opacity={0.15}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size}
                  fill={color}
                  opacity={isHovered ? 1 : 0.8}
                  stroke={isHovered ? '#fff' : color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeOpacity={isHovered ? 0.9 : 0.3}
                  style={{ transition: 'r 0.15s, opacity 0.15s' }}
                />
                <text
                  x={pos.x}
                  y={pos.y + size + 13}
                  textAnchor="middle"
                  className={`fill-gray-400 ${isHovered ? 'text-[11px] font-medium fill-white' : 'text-[9px]'}`}
                >
                  {node.label.length > 18 ? node.label.slice(0, 18) + '...' : node.label}
                </text>

                {/* Tooltip on hover */}
                {isHovered && node.properties && (
                  <g>
                    <rect
                      x={pos.x + size + 8}
                      y={pos.y - 30}
                      width={140}
                      height={50}
                      rx={4}
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth={1}
                    />
                    <text x={pos.x + size + 14} y={pos.y - 14} className="text-[9px] fill-white font-medium">
                      {node.label}
                    </text>
                    <text x={pos.x + size + 14} y={pos.y} className="text-[8px] fill-gray-400">
                      Type: {node.type}
                    </text>
                    <text x={pos.x + size + 14} y={pos.y + 12} className="text-[8px] fill-gray-400">
                      {node.type === 'accused' ? `Risk: ${node.properties.risk_score?.toFixed(0) || 'N/A'}` :
                       node.type === 'fir' ? `Crime: ${node.properties.crime_type || 'N/A'}` :
                       `Location node`}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
