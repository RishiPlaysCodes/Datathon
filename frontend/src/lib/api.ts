import axios from 'axios'
import type { TokenResponse, Dashboard, FIR, Accused, NetworkGraph, HotspotData, ChatResponse } from '@/types'

// Catalyst development and production are separate environments. Resolve the
// API from the browser hostname so one promoted bundle automatically talks to
// the matching backend. Build-time env values are honored only on localhost;
// a stale local .env can therefore never break a deployed login.
const DEV_BACKEND = 'https://prahari-final-50044229424.development.catalystappsail.in'
const PROD_BACKEND = 'https://prahari-final-50044229424.catalystappsail.in'
const LOCAL_BACKEND = 'http://localhost:8001'

function resolveApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
  if (typeof window === 'undefined') return envUrl || LOCAL_BACKEND

  const hostname = window.location.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return envUrl || LOCAL_BACKEND
  }
  if (hostname.endsWith('.development.catalystserverless.in')) {
    return DEV_BACKEND
  }
  if (hostname.endsWith('.catalystserverless.in')) {
    return PROD_BACKEND
  }
  return envUrl || PROD_BACKEND
}

export const API_BASE = resolveApiBase()

export function getApiErrorMessage(error: any, fallback = 'Request failed'): string {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (!error?.response) return `Cannot reach PRAHARI backend at ${API_BASE}`
  return `${fallback} (HTTP ${error.response.status})`
}

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
})

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function clearAuthAndRedirect(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  if (window.location.hash !== '#/login') window.location.hash = '#/login'
}

// Handle expired sessions without breaking HashRouter paths.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestPath = String(error.config?.url || '')
    const isLoginRequest = requestPath.includes('/auth/login')
    const isRefreshRequest = requestPath.includes('/auth/refresh')

    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config?._retry) {
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
          clearAuthAndRedirect()
        }
      } else {
        clearAuthAndRedirect()
      }
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
}

// AI Chat APIs
export const aiAPI = {
  chat: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const { data } = await api.post('/ai/chat', { message, session_id: sessionId })
    return data
  },
  getChatHistory: async (sessionId: string) => {
    const { data } = await api.get(`/ai/chat/history/${sessionId}`)
    return data
  },
}

// Deepfake Detection APIs
export const deepfakeAPI = {
  detect: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/deepfake/detect', formData)
    return data as {
      filename: string
      file_size: number
      is_deepfake: boolean
      confidence: number
      risk_level: string
      analysis_details: Record<string, any>
      recommendations: string[]
    }
  },
}

export default api
