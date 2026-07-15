import { useQuery } from '@tanstack/react-query'
import { citizenAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TrendingUp, Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS: Record<string, string> = {
  submitted: '#f59e0b', acknowledged: '#3b82f6', fir_registered: '#8b5cf6',
  investigating: '#06b6d4', resolved: '#10b981', escalated: '#ef4444',
}

export function CitizenTransparency() {
  const { data, isLoading } = useQuery({
    queryKey: ['transparency'],
    queryFn: () => citizenAPI.getTransparency(),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const byStatus = data?.by_status || {}
  const pieData = Object.entries(byStatus).map(([k, v]) => ({ name: k.replace('_', ' '), value: v as number, key: k }))

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-400" /> Public Accountability Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">Full transparency on how citizen complaints are handled. This fights corruption and inaction.</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Complaints" value={data?.total_complaints || 0} color="blue" />
        <StatCard label="FIR Conversion" value={`${data?.fir_conversion_rate || 0}%`} color="green" />
        <StatCard label="Pending Action" value={data?.pending_action || 0} color="orange" />
        <StatCard label="Auto-Escalated" value={data?.escalated_total || 0} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Complaint Status Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                {pieData.map((e) => <Cell key={e.key} fill={COLORS[e.key] || '#6b7280'} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {pieData.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300 capitalize">{s.name}</span>
                  <span className="text-gray-200 font-medium">{s.value}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.value / (data?.total_complaints || 1)) * 100}%`, background: COLORS[s.key] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency note */}
      <div className="glass-card p-5 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">Why this matters</h4>
            <p className="text-xs text-gray-400 mt-1">{data?.transparency_note}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Every complaint is tracked</span>
              <span className="text-xs text-gray-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Inaction auto-escalates in 7 days</span>
              <span className="text-xs text-gray-400 flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-primary-400" /> Public visibility ensures accountability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-primary-500/20 to-primary-600/5 border-primary-500/20',
    green: 'from-green-500/20 to-green-600/5 border-green-500/20',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20',
  }
  return (
    <div className={`card-3d rounded-2xl bg-gradient-to-br ${colors[color]} border p-5`}>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}
