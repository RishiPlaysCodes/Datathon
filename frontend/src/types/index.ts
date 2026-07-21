// User & Auth Types
export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  station_id?: string
  badge_number?: string
  is_active: boolean
  created_at?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

// Crime Types
export interface FIR {
  id: number
  fir_number: string
  station_name: string
  district: string
  crime_type: string
  crime_subtype?: string
  ipc_section?: string
  bns_section?: string
  description: string
  modus_operandi?: string
  date_of_occurrence?: string
  location_name?: string
  latitude?: number
  longitude?: number
  status: string
  severity: string
  investigating_officer?: string
  complainant_name?: string
}

export interface Accused {
  id: number
  name: string
  alias?: string
  age?: number
  gender?: string
  risk_score: number
  is_repeat_offender: boolean
  total_cases: number
  gang_id?: string
  osint_verified?: boolean
  osint_sources?: string
}

// Network Types
export interface NetworkNode {
  id: string
  label: string
  type: string
  properties: Record<string, any>
}

export interface NetworkEdge {
  source: string
  target: string
  relationship: string
  weight: number
}

export interface NetworkGraph {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  communities: any[]
  key_players: any[]
}

// Analytics Types
export interface HotspotData {
  latitude: number
  longitude: number
  intensity: number
  crime_type: string
  count: number
  location_name?: string
}

export interface CrimeTrend {
  date: string
  count: number
  crime_type: string
}

export interface Dashboard {
  total_firs: number
  active_cases: number
  closed_cases: number
  repeat_offenders: number
  top_crime_types: { crime_type: string; count: number }[]
  hotspots: HotspotData[]
  trends: CrimeTrend[]
  district_stats: { district: string; count: number }[]
}

// Chat Types
export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  data?: any
  sources?: string[]
  suggestions?: string[]
  intent?: string
  confidence?: number
}

export interface ChatResponse {
  response: string
  session_id: string
  intent?: string
  confidence: number
  data?: any
  sources: string[]
  suggestions: string[]
}

// Risk Score
export interface RiskBreakdown {
  total_score: number
  history_score: number
  network_score: number
  mo_escalation_score: number
  recency_score: number
  explanation: string
  factors: {
    name: string
    weight: number
    score: number
    max_score: number
    reason: string
  }[]
  risk_level: string
}
