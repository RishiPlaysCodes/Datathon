import { useState } from 'react'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function InvestigationChecklistPage() {
  const [firId, setFirId] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadChecklist = async () => {
    if (!firId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/investigation/firs/${firId}/checklist`)
      setItems(data)
      toast.success(`Loaded ${data.length} checklist items`)
    } catch {
      toast.error('Failed to load checklist')
    }
    setLoading(false)
  }

  const toggleItem = async (itemId: number, completed: boolean) => {
    try {
      await api.patch(`/investigation/checklist/${itemId}`, { completed: !completed })
      setItems(items.map(i => i.id === itemId ? { ...i, completed: !completed } : i))
      toast.success(completed ? 'Unmarked' : 'Completed!')
    } catch {
      toast.error('Failed to update')
    }
  }

  const completedCount = items.filter(i => i.completed).length
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Investigation Checklist</h1>
      <p className="text-gray-400 text-sm">Auto-generated checklist items for each FIR. Track investigation steps.</p>

      <div className="flex gap-3">
        <input type="text" value={firId} onChange={e => setFirId(e.target.value)} placeholder="Enter FIR ID" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
        <button onClick={loadChecklist} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load Checklist'}
        </button>
      </div>

      {items.length > 0 && (
        <>
          {/* Progress */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-white font-medium">{completedCount}/{items.length} completed</span>
              <span className="text-blue-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} onClick={() => toggleItem(item.id, item.completed)} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${item.completed ? 'bg-green-900/10 border-green-800/50' : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'}`}>
                {item.completed ? <CheckSquare className="w-5 h-5 text-green-400 flex-shrink-0" /> : <Square className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                <span className={`text-sm ${item.completed ? 'text-green-300 line-through' : 'text-white'}`}>{item.description}</span>
                {item.due_date && (
                  <span className={`ml-auto text-xs ${item.completed ? 'text-green-600' : 'text-yellow-500'}`}>{item.due_date}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-gray-600 text-xs">Checklist auto-generated from FIR crime type. Click items to mark complete.</p>
    </div>
  )
}
