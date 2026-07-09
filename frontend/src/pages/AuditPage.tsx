import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Shield, Lock, Hash, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function AuditPage() {
  const { user } = useAuthStore()
  const isSupervisor = user?.role === 'supervisor'

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => crimeAPI.getAuditLogs({ page: 1, limit: 50 }),
    enabled: isSupervisor,
  })

  if (!isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Lock className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-xl font-bold text-gray-400">Access Restricted</h2>
        <p className="text-sm text-gray-600 mt-2">
          Audit logs are only accessible to Supervisor-level users.
        </p>
        <p className="text-xs text-gray-700 mt-1">
          Current role: <span className="capitalize text-gray-500">{user?.role}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-400" />
          Audit Logs
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Tamper-evident, hash-chained activity trail (SHA-256)
        </p>
      </div>

      {/* Security Note */}
      <div className="glass-card p-4 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <Hash className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-200">Hash-Chained Integrity</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Each log entry stores a SHA-256 hash of the previous entry. Any tampering
              breaks the chain and is cryptographically detectable.
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Timestamp</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">User</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Action</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Details</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Risk</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Hash</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map((log: any) => (
                  <tr key={log.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 text-xs text-gray-200">{log.username}</td>
                    <td className="p-4 text-xs text-gray-300 font-medium">{log.action}</td>
                    <td className="p-4 text-xs text-gray-500 max-w-[200px] truncate">
                      {log.details || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.risk_level === 'high' ? 'bg-red-500/20 text-red-400' :
                        log.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {log.risk_level}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-600">
                      {log.entry_hash?.slice(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!logs || logs.length === 0) && (
            <div className="p-8 text-center text-gray-500 text-sm">
              No audit logs available yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
