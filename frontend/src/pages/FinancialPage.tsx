import { useState } from 'react'
import { DollarSign, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react'

// Simulated financial transaction data
const TRANSACTIONS = [
  { id: 1, from: 'Ravi Kumar (XXXX4521)', to: 'Unknown (XXXX8932)', amount: 45000, type: 'UPI', suspicious: true, date: '2026-06-15', reason: 'Large transfer after robbery FIR' },
  { id: 2, from: 'Unknown (XXXX8932)', to: 'Shell Co. (XXXX1122)', amount: 44500, type: 'Bank', suspicious: true, date: '2026-06-15', reason: 'Rapid forwarding - structuring pattern' },
  { id: 3, from: 'Shell Co. (XXXX1122)', to: 'Suresh G (XXXX7788)', amount: 43000, type: 'Bank', suspicious: true, date: '2026-06-16', reason: 'Known associate of accused' },
  { id: 4, from: 'Deepak Raj (XXXX3344)', to: 'Unknown (XXXX5566)', amount: 49900, type: 'UPI', suspicious: true, date: '2026-06-20', reason: 'Just below 50K reporting threshold' },
  { id: 5, from: 'Deepak Raj (XXXX3344)', to: 'Unknown (XXXX7799)', amount: 49800, type: 'UPI', suspicious: true, date: '2026-06-20', reason: 'Multiple transactions below threshold' },
  { id: 6, from: 'Ganesh H (XXXX2211)', to: 'Ravi Kumar (XXXX4521)', amount: 15000, type: 'Cash', suspicious: false, date: '2026-06-22', reason: '' },
  { id: 7, from: 'Unknown (XXXX9900)', to: 'Crypto Wallet 0x3f...', amount: 200000, type: 'Crypto', suspicious: true, date: '2026-06-25', reason: 'Crypto conversion - potential laundering' },
  { id: 8, from: 'Manjunath (XXXX6655)', to: 'Multiple (Split)', amount: 95000, type: 'UPI', suspicious: true, date: '2026-06-28', reason: 'Circular transaction pattern detected' },
]

const MONEY_TRAIL = [
  { step: 1, entity: 'Victim Account', amount: '₹5,00,000', type: 'source', status: 'confirmed' },
  { step: 2, entity: 'Mule Account (XXXX8932)', amount: '₹4,85,000', type: 'transfer', status: 'confirmed' },
  { step: 3, entity: 'Shell Company A/C', amount: '₹4,50,000', type: 'transfer', status: 'confirmed' },
  { step: 4, entity: 'Split: 3 UPI accounts', amount: '₹1,50,000 each', type: 'split', status: 'traced' },
  { step: 5, entity: 'Crypto Exchange', amount: '₹2,00,000', type: 'conversion', status: 'investigating' },
  { step: 6, entity: 'Final Beneficiary', amount: '₹2,50,000 (cash)', type: 'destination', status: 'unknown' },
]

export function FinancialPage() {
  const [filter, setFilter] = useState<'all' | 'suspicious'>('suspicious')

  const filteredTx = filter === 'suspicious'
    ? TRANSACTIONS.filter(t => t.suspicious)
    : TRANSACTIONS

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary-400" />
          Financial Crime & Transaction Analysis
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Money trail visualization, suspicious patterns, and transaction links
        </p>
      </div>

      {/* Money Trail Visualization */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          Money Trail Visualization (Case: Online Fraud #KSP/BEN/2026/0089)
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {MONEY_TRAIL.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-shrink-0">
              <div className={`p-3 rounded-lg border min-w-[140px] ${
                step.status === 'confirmed' ? 'border-green-500/30 bg-green-500/5' :
                step.status === 'traced' ? 'border-blue-500/30 bg-blue-500/5' :
                step.status === 'investigating' ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-red-500/30 bg-red-500/5'
              }`}>
                <p className="text-xs text-gray-400">Step {step.step}</p>
                <p className="text-sm font-medium text-gray-200 mt-0.5">{step.entity}</p>
                <p className="text-xs text-primary-400 mt-1">{step.amount}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${
                  step.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                  step.status === 'traced' ? 'bg-blue-500/20 text-blue-400' :
                  step.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{step.status}</span>
              </div>
              {idx < MONEY_TRAIL.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suspicious Transactions */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Transaction Records
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setFilter('suspicious')}
              className={`text-xs px-3 py-1 rounded ${filter === 'suspicious' ? 'bg-red-500/20 text-red-400' : 'bg-dark-700 text-gray-400'}`}>
              Suspicious Only
            </button>
            <button onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1 rounded ${filter === 'all' ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-gray-400'}`}>
              All
            </button>
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
                <th className="text-left p-3 text-xs font-semibold text-gray-400">Flag</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                  <td className="p-3 text-gray-200 text-xs">{tx.from}</td>
                  <td className="p-3 text-gray-200 text-xs">{tx.to}</td>
                  <td className="p-3 text-gray-200 font-medium">₹{tx.amount.toLocaleString()}</td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-gray-300">{tx.type}</span></td>
                  <td className="p-3 text-gray-400 text-xs">{tx.date}</td>
                  <td className="p-3">
                    {tx.suspicious ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">SUSPICIOUS</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">{tx.reason}</p>
                      </div>
                    ) : <span className="text-xs text-green-400">Clear</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
