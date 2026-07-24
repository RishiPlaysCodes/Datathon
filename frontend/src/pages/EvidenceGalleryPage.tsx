import { useState, useRef } from 'react'
import { Upload, FileText, Image, Video, File, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const FILE_ICONS: Record<string, any> = {
  image: Image,
  video: Video,
  document: FileText,
  other: File,
}

function getFileCategory(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.includes('pdf') || contentType.includes('document')) return 'document'
  return 'other'
}

export function EvidenceGalleryPage() {
  const [firId, setFirId] = useState('')
  const [evidence, setEvidence] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadEvidence = async () => {
    if (!firId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/investigation/firs/${firId}/evidence`)
      setEvidence(data)
      toast.success(`Loaded ${data.length} evidence items`)
    } catch {
      toast.error('Failed to load evidence')
    }
    setLoading(false)
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firId) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', file.name)
      const { data } = await api.post(`/investigation/firs/${firId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEvidence([data, ...evidence])
      toast.success('Evidence uploaded')
    } catch {
      toast.error('Upload failed')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Evidence Gallery</h1>
      <p className="text-gray-400 text-sm">Upload and manage evidence files per FIR. Chain of custody maintained.</p>

      <div className="flex gap-3">
        <input type="text" value={firId} onChange={e => setFirId(e.target.value)} placeholder="Enter FIR ID" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
        <button onClick={loadEvidence} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load Evidence'}
        </button>
      </div>

      {firId && (
        <div className="flex items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Add Evidence'}
          </button>
          <span className="text-gray-500 text-xs">Max 10MB per file. Images, videos, PDFs accepted.</span>
        </div>
      )}

      {/* Evidence Grid */}
      {evidence.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((item: any) => {
            const category = getFileCategory(item.content_type || 'other')
            const Icon = FILE_ICONS[category]
            return (
              <div key={item.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.filename}</p>
                    <p className="text-gray-500 text-xs">{(item.file_size / 1024).toFixed(1)} KB • {category}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Uploaded: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'Just now'}</p>
                  {item.uploaded_by_name && <p>By: {item.uploaded_by_name}</p>}
                  {item.description && <p className="text-gray-400 mt-1">{item.description}</p>}
                </div>
                {item.chain_hash && (
                  <p className="text-xs text-cyan-600 font-mono truncate" title={item.chain_hash}>Chain: {item.chain_hash.slice(0, 16)}...</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {evidence.length === 0 && firId && !loading && (
        <div className="text-center py-12 text-gray-500">
          <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No evidence uploaded yet for this FIR.</p>
        </div>
      )}

      <p className="text-gray-600 text-xs">Evidence files stored with SHA-256 chain hash for tamper detection.</p>
    </div>
  )
}
