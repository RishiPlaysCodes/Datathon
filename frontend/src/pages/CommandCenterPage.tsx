import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI, aiAPI, analysisAPI } from '@/lib/api'
import api from '@/lib/api'
import { Send, Bot, Mic, MicOff, AlertTriangle, Activity, Users, MapPin, TrendingUp, Shield, Zap, Network as NetworkIcon } from 'lucide-react'
import type { ChatMessage, NetworkGraph } from '@/types'
import ReactMarkdown from 'react-markdown'

export function CommandCenterPage() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '**PRAHARI Command Center Active.** Ask me anything about crimes, networks, or threats.', suggestions: ['Show recent chain snatching', 'High risk offenders', 'Crime hotspots'] }
  ])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [isListening, setIsListening] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Data queries
  const { data: dashboard } = useQuery({ queryKey: ['cmd-dashboard'], queryFn: () => crimeAPI.getDashboard({ days: 30 }) })
  const { data: alerts } = useQuery({ queryKey: ['cmd-alerts'], queryFn: async () => { const { data } = await api.get('/alerts/live?since_hours=48'); return data }, refetchInterval: 30000 })
  const { data: hotspots } = useQuery({ queryKey: ['cmd-hotspots'], queryFn: () => crimeAPI.getHotspots({ days: 30 }) })

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || chatLoading) return
    setMessages(p => [...p, { role: 'user', content: msg }])
    setInput('')
    setChatLoading(true)
    try {
      const res = await aiAPI.chat(msg, sessionId)
      setSessionId(res.session_id)
      setMessages(p => [...p, { role: 'assistant', content: res.response, sources: res.sources, suggestions: res.suggestions, data: res.data }])
    } catch { setMessages(p => [...p, { role: 'assistant', content: 'Error processing query.' }]) }
    finally { setChatLoading(false) }
  }

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR(); r.lang = 'en-IN'; r.continuous = false
    r.onstart = () => setIsListening(true)
    r.onend = () => setIsListening(false)
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript) }
    r.start()
  }

  const alertCount = alerts?.total || 0
  const topCrimes = dashboard?.top_crime_types?.slice(0, 4) || []

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col gap-3 overflow-hidden">
      {/* Top Bar - Stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800/60 border border-white/5">
          <Zap className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-bold text-white">COMMAND CENTER</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">LIVE</span>
        </div>
        <StatPill icon={<Activity className="w-3.5 h-3.5" />} label="FIRs (30d)" value={dashboard?.total_firs || 0} color="blue" />
        <StatPill icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Active" value={dashboard?.active_cases || 0} color="orange" />
        <StatPill icon={<Users className="w-3.5 h-3.5" />} label="Repeat" value={dashboard?.repeat_offenders || 0} color="red" />
        <StatPill icon={<Shield className="w-3.5 h-3.5" />} label="Alerts" value={alertCount} color="purple" />
        {topCrimes.map((c: any, i: number) => (
          <span key={i} className="hidden xl:flex text-[10px] px-2 py-1 rounded bg-dark-700/80 text-gray-400">{c.crime_type}: {c.count}</span>
        ))}
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-2 gap-3 min-h-0">

        {/* AI Chat Panel - Left */}
        <div className="col-span-4 row-span-2 glass-card flex flex-col overflow-hidden glow-ring">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-white">AI Intelligence Assistant</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-dark-800/80 text-gray-200 border border-white/5'
                }`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                  {m.suggestions && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.suggestions.map((s, j) => (
                        <button key={j} onClick={() => sendMessage(s)} className="text-[9px] px-2 py-0.5 rounded-full border border-primary-500/30 text-primary-400 hover:bg-primary-500/10">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="px-3 py-2 border-t border-white/5 flex gap-2">
            <button type="button" onClick={isListening ? undefined : startVoice}
              className={`p-2 rounded-lg ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-dark-700 text-gray-400 hover:text-primary-400'}`}>
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..."
              className="flex-1 bg-dark-800/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-primary-500" />
            <button type="submit" disabled={chatLoading || !input.trim()} className="p-2 rounded-lg bg-primary-600 text-white disabled:opacity-30">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Map - Center Top */}
        <div className="col-span-5 row-span-1 glass-card overflow-hidden relative">
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-[10px] font-semibold text-white bg-dark-900/80 px-2 py-0.5 rounded">Live Crime Map</span>
          </div>
          <MiniMap hotspots={hotspots || []} />
        </div>

        {/* Alerts - Right Top */}
        <div className="col-span-3 row-span-1 glass-card overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-white">Live Alerts</span>
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{alertCount}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1.5">
            {alerts?.alerts?.slice(0, 6).map((a: any, i: number) => (
              <div key={i} className={`p-2 rounded-lg border text-[10px] ${
                a.priority === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
              }`}>
                <p className="font-medium text-gray-200 leading-tight">{a.title}</p>
                <p className="text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
              </div>
            )) || <p className="text-[10px] text-gray-600 p-2">No active alerts</p>}
          </div>
        </div>

        {/* Network Graph - Center Bottom */}
        <div className="col-span-5 row-span-1 glass-card overflow-hidden relative">
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
            <NetworkIcon className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-[10px] font-semibold text-white bg-dark-900/80 px-2 py-0.5 rounded">Criminal Network (Top Offenders)</span>
          </div>
          <MiniNetwork />
        </div>

        {/* Risk + Trends - Right Bottom */}
        <div className="col-span-3 row-span-1 glass-card overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-[10px] font-semibold text-white">Top Threats</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1.5">
            {topCrimes.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50">
                <span className="text-[10px] text-gray-300 capitalize">{c.crime_type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (c.count / (topCrimes[0]?.count || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white">{c.count}</span>
                </div>
              </div>
            ))}
            {dashboard?.district_stats?.slice(0, 3).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded bg-dark-800/30 text-[9px]">
                <span className="text-gray-500">{d.district}</span>
                <span className="text-gray-300">{d.count} cases</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = { blue: 'text-primary-400', orange: 'text-orange-400', red: 'text-red-400', purple: 'text-purple-400' }
  return (
    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-white/5">
      <span className={colors[color]}>{icon}</span>
      <span className="text-xs font-bold text-white">{value}</span>
      <span className="text-[9px] text-gray-500">{label}</span>
    </div>
  )
}

function MiniMap({ hotspots }: { hotspots: any[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    let markers: any[] = []

    const setup = (attempt = 0) => {
      const L = (window as any).L
      if (!L) {
        // Leaflet not loaded yet - retry a few times
        if (attempt < 20 && !cancelled) setTimeout(() => setup(attempt + 1), 150)
        return
      }
      if (!ref.current || cancelled) return

      // Create map once
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { zoomControl: false, attributionControl: false })
          .setView([12.9716, 77.5946], 11)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd', maxZoom: 19,
        }).addTo(mapRef.current)
        // Leaflet needs a size recalculation when placed in a flex/grid container
        setTimeout(() => { try { mapRef.current?.invalidateSize() } catch {} }, 200)
      }

      // Clear old markers, add new ones
      markers.forEach(m => { try { mapRef.current.removeLayer(m) } catch {} })
      markers = []
      hotspots.forEach(h => {
        if (h.latitude == null || h.longitude == null) return
        const color = h.count >= 4 ? '#ef4444' : h.count >= 2 ? '#f59e0b' : '#3b82f6'
        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: 4 + Math.min(h.count, 10), fillColor: color, color, fillOpacity: 0.6, weight: 1,
        }).addTo(mapRef.current)
        marker.bindPopup(`<b>${h.location_name || 'Unknown'}</b><br/>${h.crime_type}: ${h.count} cases`)
        markers.push(marker)
      })
    }

    setup()
    return () => {
      cancelled = true
      if (mapRef.current) { try { mapRef.current.remove() } catch {} ; mapRef.current = null }
    }
  }, [hotspots])

  return <div ref={ref} className="w-full h-full absolute inset-0" />
}

function MiniNetwork() {
  // Simple SVG network for top accused
  const nodes = [
    { x: 200, y: 100, label: 'Ravi K', risk: 89, r: 14 },
    { x: 120, y: 180, label: 'Suresh G', risk: 75, r: 11 },
    { x: 300, y: 160, label: 'Deepak R', risk: 72, r: 11 },
    { x: 160, y: 60, label: 'Ganesh H', risk: 68, r: 10 },
    { x: 280, y: 80, label: 'Manjunath', risk: 65, r: 10 },
    { x: 80, y: 100, label: 'FIR #0042', risk: 0, r: 7 },
    { x: 340, y: 120, label: 'FIR #0098', risk: 0, r: 7 },
  ]
  const edges = [[0,1],[0,2],[0,3],[0,4],[1,5],[2,6],[3,4],[1,3]]

  return (
    <svg width="100%" height="100%" viewBox="0 0 400 240" className="p-2">
      {edges.map(([a,b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#334155" strokeWidth={1.5} opacity={0.5} />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r}
            fill={n.risk >= 80 ? '#ef4444' : n.risk >= 60 ? '#f59e0b' : '#3b82f6'}
            opacity={0.8} />
          <text x={n.x} y={n.y + n.r + 10} textAnchor="middle" className="text-[8px] fill-gray-400">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
