import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { crimeAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Map, Filter, AlertTriangle } from 'lucide-react'

export function HotspotsPage() {
  const [crimeType, setCrimeType] = useState('')
  const [days, setDays] = useState(90)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const { data: hotspots, isLoading } = useQuery({
    queryKey: ['hotspots', crimeType, days],
    queryFn: () => crimeAPI.getHotspots({
      crime_type: crimeType || undefined,
      days,
      all_stations: true,
    }),
  })

  useEffect(() => {
    if (!mapRef.current || !hotspots || hotspots.length === 0) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
    }

    const map = L.map(mapRef.current).setView([12.9716, 77.5946], 12)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    hotspots.forEach((spot) => {
      const color = spot.count >= 5 ? '#ef4444' : spot.count >= 3 ? '#f59e0b' : '#3b82f6'
      const radius = Math.max(200, spot.count * 150)

      L.circle([spot.latitude, spot.longitude], {
        color,
        fillColor: color,
        fillOpacity: 0.3,
        radius,
      })
        .addTo(map)
        .bindPopup(
          `<b>${spot.location_name || 'Unknown'}</b><br/>
           Crime: ${spot.crime_type}<br/>
           Cases: ${spot.count}`
        )

      L.circleMarker([spot.latitude, spot.longitude], {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 1,
        fillOpacity: 0.9,
      }).addTo(map)
    })

    return () => {
      map.remove()
      if (mapInstanceRef.current === map) mapInstanceRef.current = null
    }
  }, [hotspots])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Map className="w-6 h-6 text-primary-400" />
          Crime Hotspot Map
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Spatial analysis of crime concentration zones in Karnataka
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={crimeType}
            onChange={(e) => setCrimeType(e.target.value)}
            className="input-field"
          >
            <option value="">All Crime Types</option>
            <option value="chain snatching">Chain Snatching</option>
            <option value="theft">Theft</option>
            <option value="robbery">Robbery</option>
            <option value="burglary">Burglary</option>
            <option value="assault">Assault</option>
            <option value="vehicle theft">Vehicle Theft</option>
            <option value="fraud">Fraud</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input-field"
          >
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 6 Months</option>
            <option value={365}>Last Year</option>
          </select>
          {hotspots && (
            <span className="text-sm text-gray-400 ml-auto">
              {hotspots.length} hotspots identified
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div
              ref={mapRef}
              className="w-full h-[500px] rounded-xl overflow-hidden border border-dark-700/50"
              style={{ background: '#1a1a2e' }}
            />
          </div>

          {/* Hotspot List */}
          <div className="glass-card p-4 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Top Hotspots
            </h3>
            <div className="space-y-2">
              {hotspots?.slice(0, 15).map((spot, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-dark-800/50 border border-dark-700/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-200">
                      {spot.location_name || 'Unknown'}
                    </span>
                    <span className={`text-xs font-bold ${
                      spot.count >= 5 ? 'text-red-400' : spot.count >= 3 ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                      {spot.count}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 capitalize mt-0.5">{spot.crime_type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
