import { useState } from 'react'
import { StickyNote, Send, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function OfficerNotesPage() {
  const [firId, setFirId] = useState('')
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('observation')
  const [loading, setLoading] = useState(false)

  const loadNotes = async () => {
    if (!firId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/investigation/firs/${firId}/notes`)
      setNotes(data)
      toast.success(`Loaded ${data.length} notes`)
    } catch {
      toast.error('Failed to load notes')
    }
    setLoading(false)
  }

  const addNote = async () => {
    if (!firId || !newNote.trim()) return
    try {
      const { data } = await api.post(`/investigation/firs/${firId}/notes`, { content: newNote, note_type: noteType })
      setNotes([data, ...notes])
      setNewNote('')
      toast.success('Note added')
    } catch {
      toast.error('Failed to add note')
    }
  }

  const typeColors: Record<string, string> = {
    observation: 'bg-blue-900/30 text-blue-400 border-blue-700',
    lead: 'bg-green-900/30 text-green-400 border-green-700',
    evidence: 'bg-purple-900/30 text-purple-400 border-purple-700',
    warning: 'bg-red-900/30 text-red-400 border-red-700',
    update: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Officer Notes</h1>
      <p className="text-gray-400 text-sm">Add timestamped investigation notes per FIR.</p>

      <div className="flex gap-3">
        <input type="text" value={firId} onChange={e => setFirId(e.target.value)} placeholder="Enter FIR ID" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
        <button onClick={loadNotes} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load Notes'}
        </button>
      </div>

      {firId && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            {['observation', 'lead', 'evidence', 'warning', 'update'].map(t => (
              <button key={t} onClick={() => setNoteType(t)} className={`px-3 py-1 rounded-full text-xs border ${noteType === t ? typeColors[t] : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Write your note..." rows={2} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm resize-none" />
            <button onClick={addNote} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg self-end">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.map((note: any) => (
          <div key={note.id} className={`p-4 rounded-xl border ${typeColors[note.note_type] || 'bg-gray-800/30 border-gray-700'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium uppercase">{note.note_type}</span>
              <span className="text-xs text-gray-500">{note.created_at ? new Date(note.created_at).toLocaleString() : 'Just now'}</span>
            </div>
            <p className="text-white text-sm">{note.content}</p>
            {note.officer_name && <p className="text-gray-500 text-xs mt-2">— {note.officer_name} ({note.officer_role})</p>}
          </div>
        ))}
        {notes.length === 0 && firId && !loading && (
          <p className="text-gray-500 text-center py-8">No notes yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}
