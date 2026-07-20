import { useState } from 'react'
import { ScanFace, Upload, AlertTriangle, CheckCircle, Shield, Activity } from 'lucide-react'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import toast from 'react-hot-toast'

export function DeepfakePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [fileType, setFileType] = useState<'audio' | 'video'>('audio')

  const analyze = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/intelligence/deepfake-analysis')
      setResult(data)
      toast.success('Analysis complete')
    } catch { toast.error('Analysis failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanFace className="w-6 h-6 text-primary-400" />
          Deepfake Detection Module
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI-powered detection of manipulated audio/video — identifies voice cloning, face swaps, and splicing
        </p>
      </div>

      {/* Upload Section */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Upload Evidence for Analysis</h3>
        <div className="flex gap-3 mb-4">
          <button onClick={() => setFileType('audio')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${fileType === 'audio' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400'}`}>
            🎤 Audio File
          </button>
          <button onClick={() => setFileType('video')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${fileType === 'video' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-gray-400'}`}>
            🎥 Video File
          </button>
        </div>
        <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors cursor-pointer" onClick={analyze}>
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-300">Click to upload {fileType} file for deepfake analysis</p>
          <p className="text-xs text-gray-500 mt-1">Supported: {fileType === 'audio' ? 'MP3, WAV, OGG, M4A' : 'MP4, AVI, MOV, WebM'}</p>
        </div>
        <button onClick={analyze} disabled={loading} className="btn-primary w-full mt-4 py-3 disabled:opacity-50">
          {loading ? 'Analyzing with AI models...' : `Analyze ${fileType === 'audio' ? 'Audio' : 'Video'} for Deepfake`}
        </button>
      </div>

      {loading && <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict */}
          <div className={`glass-card p-6 border-l-4 ${result.risk === 'high' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-white">{result.verdict}</h3>
                <p className="text-xs text-gray-400">File type: {result.file_type} | Detection confidence: {result.confidence}%</p>
              </div>
              <div className={`text-4xl font-bold ${result.risk === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                {result.confidence}%
              </div>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden mt-3">
              <div className={`h-full rounded-full ${result.risk === 'high' ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'}`}
                style={{ width: `${result.confidence}%` }} />
            </div>
          </div>

          {/* Indicators */}
          <div className="glass-card p-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" /> Detection Indicators
            </h4>
            <div className="space-y-3">
              {result.indicators?.map((ind: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-200">{ind.name}</span>
                    <span className={`text-sm font-bold ${ind.score >= 80 ? 'text-red-400' : ind.score >= 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {ind.score}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${ind.score >= 80 ? 'bg-red-500' : ind.score >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${ind.score}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-500">{ind.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Models + Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-400" /> AI Models Used
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.models_used?.map((m: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">{m}</span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Case relevance: {result.case_relevance}</p>
            </div>
            <div className="glass-card p-5 border-l-4 border-l-orange-500">
              <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Recommendation
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">{result.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
