import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysisAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DollarSign, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

export function FinancialPage() {
  const [filter, setFilter] = useState<'all' | 'suspicious'>('suspicious')

  const { data, isLoading } = useQuery({
    queryKey: ['financial'],
    queryFn: () => analysisAPI.getFinancial(),
  })

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  const transactions = data?.transactions || []
  const filtered = filter === 'suspicious' ? transactions.filter((t: any) => t.suspicious) : transactions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary-400" />
          Financial Crime & Transaction Analysis
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Real transaction data - suspicious patterns, structuring detection, money trails
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={data?.total_transactions || 0} color="blue" icon={<Activity className="w-5 h-5" />} />
        <StatCard label="Suspicious Flagged" value={data?.suspicious_count || 0} color="red" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Flagged Amount" value={`₹${((data?.total_flagged_amount || 0) / 100000).toFixed(1)}L`} color="orange" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Structuring Cases" value={data?.structuring_detected || 0} color="purple" icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Detected Patterns */}
      {data?.patterns?.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            AI-Detected Money Laundering Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.patterns.map((p: any, i: number) => (
              <div key={i} className="p-4 rounded-lg bg-dark-800/50 border border-orange-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-orange-400">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">{p.count}</span>
                </div>
                <p className="text-xs text-gray-400">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" /> Transaction Records
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setFilter('suspicious')} className={`text-xs px-3 py-1 rounded ${filter === 'suspicious' ? 'bg-red-500/20 text-red-400' : 'bg-dark-700 text-gray-400'}`}>Suspicious</button>
            <button onClick={() => setFilter('all')} className={`text-xs px-3 py-1 rounded ${filter === 'all' ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-gray-400'}`}>All</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="text-left p-3 text-xs font-semibold text-gray-400">From</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">To</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Amount</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Type</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Date</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx: any) => (
                <tr key={tx.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                  <td className="p-3 text-gray-200 text-xs">{tx.from_account}{tx.accused_name && <span className="text-gray-500"> ({tx.accused_name})</span>}</td>
                  <td className="p-3 text-gray-200 text-xs">{tx.to_account}</td>
                  <td className="p-3 text-gray-200 font-medium">₹{tx.amount.toLocaleString()}</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-300 uppercase">{tx.type}</span></td>
                  <td className="p-3 text-gray-400 text-xs">{tx.timestamp}</td>
                  <td className="p-3">
                    {tx.suspicious ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">SUSPICIOUS</span>
                        {tx.notes && <p className="text-[10px] text-gray-500 mt-0.5">{tx.notes}</p>}
                      </div>
                    ) : <span className="text-xs text-green-400">Clear</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-6">No transactions found.</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: any; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'from-primary-500/20 to-primary-600/5 border-primary-500/20 text-primary-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
  }
  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} border p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  )
}
