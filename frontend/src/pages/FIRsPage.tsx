import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Search, Filter, FileText, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { formatDate, getRiskBadge } from '@/lib/utils'

export function FIRsPage() {
  const [search, setSearch] = useState('')
  const [crimeType, setCrimeType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['firs', search, crimeType, status, page],
    queryFn: () => crimeAPI.listFIRs({
      search: search || undefined,
      crime_type: crimeType || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
  })

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'bg-blue-500/20 text-blue-400'
      case 'investigating': return 'bg-purple-500/20 text-purple-400'
      case 'closed': return 'bg-green-500/20 text-green-400'
      case 'chargesheeted': return 'bg-teal-500/20 text-teal-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">FIR Records</h1>
        <p className="text-gray-400 text-sm mt-1">Browse and search First Information Reports</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search FIRs by description, number..."
              className="input-field w-full pl-9"
            />
          </div>
          <select
            value={crimeType}
            onChange={(e) => { setCrimeType(e.target.value); setPage(1) }}
            className="input-field"
          >
            <option value="">All Crime Types</option>
            <option value="chain snatching">Chain Snatching</option>
            <option value="theft">Theft</option>
            <option value="robbery">Robbery</option>
            <option value="burglary">Burglary</option>
            <option value="fraud">Fraud</option>
            <option value="cyber crime">Cyber Crime</option>
            <option value="assault">Assault</option>
            <option value="murder">Murder</option>
            <option value="vehicle theft">Vehicle Theft</option>
            <option value="drug offense">Drug Offense</option>
            <option value="domestic violence">Domestic Violence</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
            <option value="chargesheeted">Chargesheeted</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {data?.firs.length || 0} of {data?.total || 0} FIRs
            </p>
          </div>

          <div className="space-y-3">
            {data?.firs.map((fir) => (
              <div key={fir.id} className="glass-card-hover p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-primary-400">{fir.fir_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColor(fir.severity)}`}>
                        {fir.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(fir.status)}`}>
                        {fir.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 mb-2 line-clamp-2">{fir.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1 capitalize">
                        <AlertCircle className="w-3 h-3" /> {fir.crime_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {fir.location_name || fir.district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(fir.date_of_occurrence)}
                      </span>
                    </div>
                  </div>
                </div>
                {fir.modus_operandi && (
                  <div className="mt-3 pt-3 border-t border-dark-700/30">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-400">MO:</span> {fir.modus_operandi}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-400">
                Page {page} of {Math.ceil(data.total / 20)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= data.total}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
