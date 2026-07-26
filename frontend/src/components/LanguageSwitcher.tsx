import { useState } from 'react'
import { Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
]

export function LanguageSwitcher() {
  const { user, setUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const currentLang = user?.language || 'en'

  const switchLanguage = async (code: string) => {
    try {
      const { data } = await api.put('/auth/language', { language: code })
      if (user) {
        setUser({ ...user, language: code })
      }
      toast.success(data.message || `Language: ${code}`)
    } catch {
      toast.error('Failed to change language')
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-dark-700 transition-all border border-dark-600"
        title="Change Language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{LANGUAGES.find(l => l.code === currentLang)?.native || 'EN'}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-36 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full text-left px-3 py-2 text-xs transition-all ${
                currentLang === lang.code
                  ? 'bg-primary-600/20 text-primary-400 font-medium'
                  : 'text-gray-300 hover:bg-dark-700'
              }`}
            >
              {lang.native} <span className="text-gray-500 ml-1">({lang.label})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
