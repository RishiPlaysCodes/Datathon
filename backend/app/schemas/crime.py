"""Crime-related Pydantic schemas."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- FIR Schemas ---
class FIRResponse(BaseModel):
    id: int
    fir_number: str
    station_name: str
    district: str
    crime_type: str
    crime_subtype: Optional[str] = None
    ipc_section: Optional[str] = None
    bns_section: Optional[str] = None
    description: str
    modus_operandi: Optional[str] = None
    date_of_occurrence: Optional[datetime] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    severity: str
    investigating_officer: Optional[str] = None

    class Config:
        from_attributes = True


class FIRListResponse(BaseModel):
    total: int
    firs: List[FIRResponse]


# --- Accused Schemas ---
class AccusedResponse(BaseModel):
    id: int
    name: str
    alias: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    risk_score: float
    is_repeat_offender: bool
    total_cases: int
    gang_id: Optional[str] = None

    class Config:
        from_attributes = True


class AccusedProfileResponse(BaseModel):
    accused: AccusedResponse
    firs: List[FIRResponse]
    risk_breakdown: Dict[str, Any]
    behavioral_profile: str
    network_connections: List[Dict[str, Any]]


# --- Network Schemas ---
class NetworkNode(BaseModel):
    id: str
    label: str
    type: str  # accused, victim, location, fir
    properties: Dict[str, Any] = {}


class NetworkEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: float = 1.0


class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    communities: List[Dict[str, Any]] = []
    key_players: List[Dict[str, Any]] = []


# --- Analytics Schemas ---
class HotspotData(BaseModel):
    latitude: float
    longitude: float
    intensity: float
    crime_type: str
    count: int
    location_name: Optional[str] = None


class CrimeTrendData(BaseModel):
    date: str
    count: int
    crime_type: str


class AnalyticsDashboard(BaseModel):
    total_firs: int
    active_cases: int
    closed_cases: int
    repeat_offenders: int
    top_crime_types: List[Dict[str, Any]]
    hotspots: List[HotspotData]
    trends: List[CrimeTrendData]
    district_stats: List[Dict[str, Any]]


# --- Chat Schemas ---
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "en"  # "en" or "kn" (Kannada)


class ChatResponse(BaseModel):
    response: str
    session_id: str
    intent: Optional[str] = None
    confidence: float = 0.0
    data: Optional[Dict[str, Any]] = None
    sources: List[str] = []
    suggestions: List[str] = []


# --- Risk Score Schema ---
class RiskScoreBreakdown(BaseModel):
    total_score: float
    history_score: float
    network_score: float
    mo_escalation_score: float
    recency_score: float
    explanation: str
    factors: List[Dict[str, Any]]


# --- Audit Schema ---
class AuditLogResponse(BaseModel):
    id: int
    username: str
    action: str
    details: Optional[str] = None
    risk_level: str
    timestamp: Optional[datetime] = None
    entry_hash: str

    class Config:
        from_attributes = True
