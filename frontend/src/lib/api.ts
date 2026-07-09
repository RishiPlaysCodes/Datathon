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

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
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

export default api
