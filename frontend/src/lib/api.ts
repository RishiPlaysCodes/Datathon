import axios from 'axios'
import type { TokenResponse, Dashboard, FIR, Accused, NetworkGraph, HotspotData, ChatResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Lightweight global notifier for network/server errors (debounced to avoid spam)
let _lastErrorToast = 0
function notifyApiError(message: string) {
  const now = Date.now()
  if (now - _lastErrorToast < 4000) return // debounce: max 1 toast / 4s
  _lastErrorToast = now
  import('react-hot-toast').then(({ default: toast }) => toast.error(message)).catch(() => {})
}

// Handle 401 (auth) + graceful network/server error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status

    if (status === 401) {
      // Try refresh token
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token } = res.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          error.config.headers.Authorization = `Bearer ${access_token}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    } else if (!error.response) {
      // No response = network error / backend down
      notifyApiError('Cannot reach the server. Is the backend running on port 8001?')
    } else if (status >= 500) {
      notifyApiError('Server error. Please try again in a moment.')
    } else if (status === 403) {
      notifyApiError('You do not have permission for this action.')
    }
    return Promise.reject(error)
  }
)

// Auth APIs
export const authAPI = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const { data } = await api.post('/auth/login', { username, password })
    return data
  },
  register: async (userData: any): Promise<TokenResponse> => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },
}

// Crime APIs
export const crimeAPI = {
  listFIRs: async (params?: Record<string, any>): Promise<{ total: number; firs: FIR[] }> => {
    const { data } = await api.get('/crime/firs', { params })
    return data
  },
  getFIR: async (id: number): Promise<FIR> => {
    const { data } = await api.get(`/crime/firs/${id}`)
    return data
  },
  listAccused: async (params?: Record<string, any>): Promise<Accused[]> => {
    const { data } = await api.get('/crime/accused', { params })
    return data
  },
  getAccusedProfile: async (id: number) => {
    const { data } = await api.get(`/crime/accused/${id}/profile`)
    return data
  },
  getNetwork: async (accusedId: number, depth = 2): Promise<NetworkGraph> => {
    const { data } = await api.get(`/crime/network/${accusedId}`, { params: { depth } })
    return data
  },
  resolveEntity: async (name: string) => {
    const { data } = await api.get(`/crime/network/entity-resolution/${encodeURIComponent(name)}`)
    return data
  },
  getDashboard: async (params?: Record<string, any>): Promise<Dashboard> => {
    const { data } = await api.get('/crime/analytics/dashboard', { params })
    return data
  },
  getHotspots: async (params?: Record<string, any>): Promise<HotspotData[]> => {
    const { data } = await api.get('/crime/analytics/hotspots', { params })
    return data
  },
  getAuditLogs: async (params?: Record<string, any>) => {
    const { data } = await api.get('/crime/audit-logs', { params })
    return data
  },
  getCaseSummary: async (firId: number) => {
    const { data } = await api.get(`/crime/case-summary/${firId}`)
    return data
  },
}

// AI Chat APIs
export const aiAPI = {
  chat: async (message: string, sessionId?: string, language: string = 'en'): Promise<ChatResponse> => {
    const { data } = await api.post('/ai/chat', { message, session_id: sessionId, language })
    return data
  },
  getChatHistory: async (sessionId: string) => {
    const { data } = await api.get(`/ai/chat/history/${sessionId}`)
    return data
  },
  getStatus: async () => {
    const { data } = await api.get('/ai/status')
    return data
  },
}

// Analysis APIs (financial, sociological, similar cases, FIR validation, forensics, patrol)
export const analysisAPI = {
  getFinancial: async () => {
    const { data } = await api.get('/analysis/financial')
    return data
  },
  getSociological: async () => {
    const { data } = await api.get('/analysis/sociological')
    return data
  },
  getSimilarCases: async (firId: number) => {
    const { data } = await api.get(`/analysis/similar-cases/${firId}`)
    return data
  },
  getPatrol: async () => {
    const { data } = await api.get('/analysis/patrol')
    return data
  },
  validateFIR: async (payload: { complaint: string; crime_type?: string; location?: string; sections?: string }) => {
    const { data } = await api.post('/analysis/validate-fir', payload)
    return data
  },
  cyberForensics: async (payload: { complaint: string; attack_type?: string }) => {
    const { data } = await api.post('/analysis/cyber-forensics', payload)
    return data
  },
}

// Public Citizen APIs (no auth token needed - uses a separate client)
const publicClient = axios.create({
  baseURL: `${API_BASE}/api/v1/public`,
  headers: { 'Content-Type': 'application/json' },
})

// Graceful error notification for the public/citizen client too
publicClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      notifyApiError('Cannot reach the server. Please try again shortly.')
    } else if (error.response.status >= 500) {
      notifyApiError('Server error. Please try again in a moment.')
    }
    return Promise.reject(error)
  }
)

export const citizenAPI = {
  fileComplaint: async (payload: any) => {
    const { data } = await publicClient.post('/complaint', payload)
    return data
  },
  trackComplaint: async (trackingId: string) => {
    const { data } = await publicClient.get(`/complaint/${trackingId}`)
    return data
  },
  getTransparency: async () => {
    const { data } = await publicClient.get('/transparency')
    return data
  },
  getSafetyScores: async () => {
    const { data } = await publicClient.get('/safety-scores')
    return data
  },
  fileCommunityReport: async (payload: any) => {
    const { data } = await publicClient.post('/community-report', payload)
    return data
  },
  getCommunityReports: async () => {
    const { data } = await publicClient.get('/community-reports')
    return data
  },
  upvoteReport: async (id: number) => {
    const { data } = await publicClient.post(`/community-report/${id}/upvote`)
    return data
  },
  sendSOS: async (payload: any) => {
    const { data } = await publicClient.post('/sos', payload)
    return data
  },
}

export default api
