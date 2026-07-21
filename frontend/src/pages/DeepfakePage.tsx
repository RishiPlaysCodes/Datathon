import { useState, useRef } from 'react'
import { deepfakeAPI, getApiErrorMessage } from '@/lib/api'
import { ScanSearch, Upload, AlertTriangle, CheckCircle, Shield, FileWarning, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface DeepfakeResult {
  filename: string
  file_size: number
  is_deepfake: boolean
  confidence: number
  risk_level: string
  analysis_details: Record<string, any>
  recommendations: string[]
}

export function DeepfakePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DeepfakeResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (selected: File) => {
    const extension = selected.name.includes('.')
      ? `.${selected.name.split('.').pop()?.toLowerCase()}`
      : ''
    const allowedExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov', '.mkv',
    ])
    if (!allowedExtensions.has(extension)) {
      toast.error('Unsupported file type. Upload JPG, PNG, GIF, WebP, MP4, AVI, MOV, or MKV.')
      return
    }
    if (selected.size === 0) {
      toast.error('The selected file is empty')
      return
    }
    if (selected.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB')
      return
    }

    setFile(selected)
    setResult(null)
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setPreview(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) processFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) processFile(dropped)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const data = await deepfakeAPI.detect(file)
      setResult(data)
      if (data.is_deepfake) {
        toast.error('Deepfake detected!', { icon: '🚨' })
      } else {
        toast.success('Media appears authentic', { icon: '✅' })
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Analysis failed'))
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default: return 'text-green-400 bg-green-500/20 border-green-500/30'
    }
  }

  const confidenceColor = (conf: number) => {
    if (conf >= 0.65) return 'text-red-400'
    if (conf >= 0.40) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-primary-400" />
          Deepfake Detection
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI-powered media forensics — detect synthetic manipulation in images and videos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="glass-card p-8 border-2 border-dashed border-dark-600 hover:border-primary-500/50 transition-colors cursor-pointer text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-dark-900/80 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : file ? (
              <div className="py-8">
                <FileWarning className="w-12 h-12 text-primary-400 mx-auto mb-3" />
                <p className="text-sm text-gray-200 font-medium">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB | {file.type}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                  className="mt-3 text-xs text-red-400 hover:text-red-300"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="py-8">
                <Upload className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-300 font-medium">
                  Drop image/video here or click to browse
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Supports: JPG, PNG, GIF, WebP, MP4, AVI, MOV (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="btn-primary w-full py-3 text-center disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing with CNN ensemble...
              </>
            ) : (
              <>
                <ScanSearch className="w-4 h-4" />
                Analyze for Deepfake
              </>
            )}
          </button>

          {/* Model Info */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detection Models</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>EfficientNet-B7</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>XceptionNet</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frequency Domain Analysis</span>
                <span className="text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GAN Fingerprint Scanner</span>
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Verdict Card */}
              <div className={`glass-card p-6 border ${result.is_deepfake ? 'border-red-500/30' : 'border-green-500/30'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {result.is_deepfake ? (
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {result.is_deepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC'}
                      </h3>
                      <p className="text-xs text-gray-500">{result.filename}</p>
                    </div>
                  </div>
                  <div className={`text-center px-3 py-1 rounded-lg border ${riskColor(result.risk_level)}`}>
                    <p className="text-lg font-bold">{(result.confidence * 100).toFixed(1)}%</p>
                    <p className="text-[10px] uppercase">{result.risk_level} risk</p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Manipulation Probability</span>
                    <span className={confidenceColor(result.confidence)}>
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        result.confidence >= 0.65 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        result.confidence >= 0.40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                        'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Analysis Details */}
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-400" />
                  Forensic Analysis
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(result.analysis_details)
                    .filter(([key]) => key !== 'model_used' && key !== 'processing_time_ms')
                    .map(([key, value]) => (
                      <div key={key} className="bg-dark-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-200 font-medium mt-0.5">
                          {typeof value === 'number' ? value.toFixed(3) :
                           typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                           String(value)}
                        </p>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-dark-700/30 flex items-center justify-between text-xs text-gray-500">
                  <span>Model: {result.analysis_details.model_used}</span>
                  <span>{result.analysis_details.processing_time_ms}ms</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        result.is_deepfake ? 'bg-red-400' : 'bg-green-400'
                      }`} />
                      <span className="text-gray-400">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <ScanSearch className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400">Upload Media to Analyze</h3>
              <p className="text-sm text-gray-600 mt-1">
                Our AI ensemble will scan for deepfake markers, GAN fingerprints, and manipulation artifacts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
