import { useState, useRef } from 'react'
import { Camera, Upload, User, AlertTriangle, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function CCTVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) {
      toast.error('Upload JPG, PNG, GIF, WEBP or BMP')
      return
    }
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/public/cctv-match', formData)
      setResult(data)
      if (data.matches_found > 0) {
        toast.success(`${data.matches_found} potential match(es) found!`)
      } else {
        toast('No matches above threshold')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-400" />
          CCTV Suspect Face Match
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Upload a CCTV frame or suspect image — system matches against the accused database
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">Upload Suspect Image</h2>
          <div
            className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500/50 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="Suspect" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">Click or drag CCTV frame</p>
                <p className="text-xs text-gray-600">JPG, PNG, WEBP — max 20MB</p>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <button onClick={analyze} disabled={!file || loading} className="btn-primary w-full disabled:opacity-40">
            {loading ? 'Scanning accused database...' : 'Match Against Accused Database'}
          </button>
        </div>

        {/* Results */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">Match Results</h2>
          {!result ? (
            <div className="text-center py-12 text-gray-600">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Upload an image to scan</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Scanned: {result.total_suspects_scanned} accused</span>
                <span>Matches: {result.matches_found}</span>
              </div>
              {result.matches_found === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 text-sm">No matches found in database</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {result.matches.map((m: any, i: number) => (
                    <div key={i} className={`rounded-lg p-3 border ${m.match_level === 'high' ? 'border-red-500/50 bg-red-500/5' : m.match_level === 'medium' ? 'border-orange-500/50 bg-orange-500/5' : 'border-dark-600 bg-dark-800/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-medium text-sm">{m.name}</span>
                          {m.alias && <span className="text-xs text-gray-500">({m.alias})</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.match_level === 'high' ? 'bg-red-500/20 text-red-400' : m.match_level === 'medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {(m.confidence * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>Risk: {m.risk_score?.toFixed(0)}/100</span>
                        <span>Cases: {m.total_cases}</span>
                        {m.is_repeat_offender && <span className="text-red-400">Repeat Offender</span>}
                        {m.gang_id && <span className="text-purple-400">Gang: {m.gang_id}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-dark-800/50 rounded p-3">
                <p className="text-xs text-yellow-300">{result.advisory}</p>
                <p className="text-[10px] text-gray-600 mt-1">{result.analysis_method}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
