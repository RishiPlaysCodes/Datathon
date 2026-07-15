import { useState } from 'react'
import { ShieldAlert, Phone, MapPin, CheckCircle } from 'lucide-react'
import { citizenAPI } from '@/lib/api'
import toast from 'react-hot-toast'

const ALERT_TYPES = [
  { value: 'general', label: 'General Emergency', emoji: '🚨' },
  { value: 'women_safety', label: 'Women Safety', emoji: '🛡️' },
  { value: 'medical', label: 'Medical', emoji: '🏥' },
  { value: 'accident', label: 'Accident', emoji: '🚗' },
]

export function CitizenSOS() {
  const [sent, setSent] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [alertType, setAlertType] = useState('general')

  const triggerSOS = async () => {
    setLoading(true)
    // Try to grab geolocation
    const send = async (lat?: number, lng?: number) => {
      try {
        const data = await citizenAPI.sendSOS({
          alert_type: alertType,
          latitude: lat, longitude: lng,
          location_name: lat ? `${lat.toFixed(4)}, ${lng!.toFixed(4)}` : 'Location unavailable',
        })
        setSent(data)
        toast.success('SOS sent!')
      } catch { toast.error('Failed to send SOS') }
      finally { setLoading(false) }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => send(pos.coords.latitude, pos.coords.longitude),
        () => send(),
        { timeout: 5000 }
      )
    } else { send() }
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-400" /> Emergency SOS
        </h1>
        <p className="text-sm text-gray-400 mt-1">One tap sends your location to police and emergency services.</p>
      </div>

      {sent ? (
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">SOS Alert Sent</h2>
          <p className="text-sm text-gray-400 mt-2">{sent.message}</p>
          <p className="text-xs text-primary-400 mt-2">{sent.nearest_station}</p>

          <div className="mt-6 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Emergency Contacts</p>
            {sent.emergency_contacts?.map((c: any, i: number) => (
              <a key={i} href={`tel:${c.number}`} className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-white/5 hover:border-red-500/30 transition-all">
                <span className="text-sm text-gray-200">{c.name}</span>
                <span className="flex items-center gap-2 text-red-400 font-bold"><Phone className="w-4 h-4" /> {c.number}</span>
              </a>
            ))}
          </div>
          <button onClick={() => setSent(null)} className="btn-secondary w-full mt-6 py-2.5">Back</button>
        </div>
      ) : (
        <div className="glass-card p-8">
          {/* Alert type selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ALERT_TYPES.map(t => (
              <button key={t.value} onClick={() => setAlertType(t.value)}
                className={`p-3 rounded-xl border transition-all ${
                  alertType === t.value ? 'border-red-500 bg-red-500/10' : 'border-white/5 bg-dark-800/60'
                }`}>
                <div className="text-2xl mb-1">{t.emoji}</div>
                <p className="text-xs text-gray-300">{t.label}</p>
              </button>
            ))}
          </div>

          {/* Big SOS button */}
          <button onClick={triggerSOS} disabled={loading}
            className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-2xl shadow-2xl animate-pulse-glow hover:scale-105 transition-transform disabled:opacity-50 block">
            {loading ? '...' : 'SOS'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Your live location will be shared with responders
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <a href="tel:100" className="btn-secondary text-center py-2.5 text-sm">📞 Police 100</a>
            <a href="tel:112" className="btn-secondary text-center py-2.5 text-sm">📞 Emergency 112</a>
          </div>
        </div>
      )}
    </div>
  )
}
