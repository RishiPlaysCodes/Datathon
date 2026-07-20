import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Camera, Wifi, WifiOff, AlertTriangle, Eye, MapPin } from 'lucide-react'
import api from '@/lib/api'

export function CCTVPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cctv'],
    queryFn: async () => { const { data } = await api.get('/intelligence/cctv-feeds'); return data },
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const cameras = data?.cameras || []
  const detections = data?.detections || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Camera className="w-6 h-6 text-primary-400" />
          CCTV & IoT Integration
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time camera feeds with AI-powered vehicle recognition, face match, and anomaly detection
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{data?.online || 0}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1"><Wifi className="w-3 h-3" /> Online</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{data?.offline || 0}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1"><WifiOff className="w-3 h-3" /> Offline</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{detections.length}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Detections</p>
        </div>
      </div>

      {/* AI Models */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-2">AI Models Active</h3>
        <div className="flex flex-wrap gap-2">
          {data?.ai_models?.map((m: string, i: number) => (
            <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">{m}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Detections */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4" /> AI Detections (Live)
          </h3>
          <div className="space-y-3">
            {detections.map((d: any, i: number) => (
              <div key={i} className={`p-3 rounded-xl border ${
                d.priority === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-200">{d.camera}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    d.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>{d.priority.toUpperCase()}</span>
                </div>
                <p className="text-xs text-gray-300">{d.detail}</p>
                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                  <span>Type: {d.type}</span>
                  <span>Confidence: {d.confidence}%</span>
                  <span>{d.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Grid */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary-400" /> Camera Network ({cameras.length})
          </h3>
          <div className="space-y-2">
            {cameras.map((cam: any) => (
              <div key={cam.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/50 border border-dark-700/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    cam.status === 'online' ? 'bg-green-400 animate-pulse' : cam.status === 'maintenance' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-xs font-medium text-gray-200">{cam.id}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {cam.location}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  cam.status === 'online' ? 'bg-green-500/20 text-green-400' : cam.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                }`}>{cam.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
