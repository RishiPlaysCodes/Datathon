import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Globe, AlertTriangle, Shield, Eye, Activity } from 'lucide-react'
import api from '@/lib/api'

export function DarkWebPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['darkweb'],
    queryFn: async () => { const { data } = await api.get('/intelligence/darkweb'); return data },
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const threats = data?.threats || []
  const stats = data?.stats || {}

  const sevColor = (s: string) => s === 'critical' ? 'border-red-500/40 bg-red-500/5' : s === 'high' ? 'border-orange-500/30 bg-orange-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
  const sevBadge = (s: string) => s === 'critical' ? 'bg-red-500/20 text-red-400' : s === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-400" />
          Dark Web Threat Intelligence
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Monitoring underground forums, leak sites, and crypto flows for threats against Karnataka
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-3d glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total_threats}</p>
          <p className="text-xs text-gray-400 mt-1">Active Threats</p>
        </div>
        <div className="card-3d glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
          <p className="text-xs text-gray-400 mt-1">Critical</p>
        </div>
        <div className="card-3d glass-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
          <p className="text-xs text-gray-400 mt-1">High</p>
        </div>
        <div className="card-3d glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-400">{stats.monitoring_sources}</p>
          <p className="text-xs text-gray-400 mt-1">Sources Monitored</p>
        </div>
      </div>

      {/* Threat Feed */}
      <div className="space-y-4">
        {threats.map((t: any) => (
          <div key={t.id} className={`glass-card p-5 border-l-4 ${sevColor(t.severity)}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sevBadge(t.severity)}`}>{t.severity.toUpperCase()}</span>
                  <span className="text-[10px] text-gray-500">{t.source}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-dark-700 text-gray-400">{t.type.replace('_', ' ')}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-200">{t.title}</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                t.status === 'active' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                t.status === 'investigating' ? 'bg-blue-500/20 text-blue-400' :
                t.status === 'escalated' ? 'bg-purple-500/20 text-purple-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>{t.status}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Eye className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Indicators:</span>
              {t.indicators?.map((ind: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-dark-800 text-gray-400 font-mono">{ind}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Discovered: {t.discovered}</p>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="glass-card p-4 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">How This Works</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              PRAHARI monitors {stats.monitoring_sources} dark web sources including underground forums, Telegram channels,
              ransomware leak sites, and cryptocurrency mixers. AI crawlers scan for keywords related to Karnataka,
              KSP, and local entities. Critical threats are auto-escalated to the cyber crime cell.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
