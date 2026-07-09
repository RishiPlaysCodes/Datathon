from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship


# =============================================================================
# ENUMS
# =============================================================================

class FIRStatus(str, Enum):
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    CLOSED = "closed"
    COLD_CASE = "cold_case"
    CHARGESHEETED = "chargesheeted"


class EvidenceType(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    PHYSICAL = "physical"
    DIGITAL = "digital"
    CCTV = "cctv"
    FORENSIC = "forensic"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TransactionType(str, Enum):
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CRYPTO = "crypto"
    WALLET = "wallet"


# =============================================================================
# MANY-TO-MANY LINK TABLES
# =============================================================================

class FIRCriminalLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    criminal_id: Optional[int] = Field(default=None, foreign_key="criminal.id", primary_key=True)


class FIRVictimLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    victim_id: Optional[int] = Field(default=None, foreign_key="victim.id", primary_key=True)


class FIRWitnessLink(SQLModel, table=True):
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id", primary_key=True)
    witness_id: Optional[int] = Field(default=None, foreign_key="witness.id", primary_key=True)


class CriminalAssociateLink(SQLModel, table=True):
    criminal_id: Optional[int] = Field(default=None, foreign_key="criminal.id", primary_key=True)
    associate_id: Optional[int] = Field(default=None, primary_key=True)
    relationship_type: str = Field(default="associate")  # associate, gang_member, family, accomplice


# =============================================================================
# CORE MODELS
# =============================================================================

class PoliceStation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    location: str
    district: str = Field(index=True)
    state: str = Field(default="Karnataka")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_number: str
    station_code: Optional[str] = Field(default=None, unique=True, index=True)

    officers: List["Officer"] = Relationship(back_populates="police_station")


class Officer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    badge_number: str = Field(unique=True, index=True)
    rank: str
    contact_number: str
    police_station_id: Optional[int] = Field(default=None, foreign_key="policestation.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

    police_station: Optional[PoliceStation] = Relationship(back_populates="officers")
    firs: List["FIR"] = Relationship(back_populates="investigating_officer")


class CrimeCategory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    ipc_section: Optional[str] = None  # IPC/BNS section
    severity: str = Field(default="medium")  # low, medium, high, critical

    firs: List["FIR"] = Relationship(back_populates="category")


class Criminal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    alias: Optional[str] = None
    address: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    criminal_record: Optional[str] = None
    modus_operandi: Optional[str] = None
    # Risk scoring fields
    risk_score: float = Field(default=0.0)  # 0-100
    risk_breakdown: Optional[str] = None  # JSON string of score components
    behavioral_profile: Optional[str] = None  # AI-generated narrative
    gang_affiliation: Optional[str] = None
    is_repeat_offender: bool = Field(default=False)
    total_cases: int = Field(default=0)
    # Network fields
    network_centrality: float = Field(default=0.0)
    community_id: Optional[int] = None
    # Financial
    known_bank_accounts: Optional[str] = None  # JSON array
    known_vehicles: Optional[str] = None  # JSON array
    # Geospatial
    last_known_latitude: Optional[float] = None
    last_known_longitude: Optional[float] = None
    active_area: Optional[str] = None  # Primary operating area

    firs: List["FIR"] = Relationship(back_populates="criminals", link_model=FIRCriminalLink)


class Victim(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    address: str
    phone_number: str
    age: Optional[int] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None

    firs: List["FIR"] = Relationship(back_populates="victims", link_model=FIRVictimLink)


class Witness(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    address: str
    phone_number: str
    statement_summary: Optional[str] = None
    reliability_score: float = Field(default=0.5)  # 0-1

    firs: List["FIR"] = Relationship(back_populates="witnesses", link_model=FIRWitnessLink)


class FIR(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_number: str = Field(unique=True, index=True)
    incident_date: datetime
    registration_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = Field(default=None, index=True)
    description: str
    status: FIRStatus = Field(default=FIRStatus.OPEN)
    severity: str = Field(default="medium")  # low, medium, high, critical
    # Investigation metadata
    case_difficulty: Optional[str] = None  # easy, medium, hard, cold
    ai_summary: Optional[str] = None
    investigation_leads: Optional[str] = None  # JSON array
    missing_evidence: Optional[str] = None  # JSON array
    similar_case_ids: Optional[str] = None  # JSON array of similar FIR IDs
    # Time/pattern fields
    time_of_day: Optional[str] = None  # morning, afternoon, evening, night
    day_of_week: Optional[str] = None
    # Relationships
    category_id: Optional[int] = Field(default=None, foreign_key="crimecategory.id")
    officer_id: Optional[int] = Field(default=None, foreign_key="officer.id")
    station_id: Optional[int] = Field(default=None, foreign_key="policestation.id")

    category: Optional[CrimeCategory] = Relationship(back_populates="firs")
    investigating_officer: Optional[Officer] = Relationship(back_populates="firs")
    criminals: List[Criminal] = Relationship(back_populates="firs", link_model=FIRCriminalLink)
    victims: List[Victim] = Relationship(back_populates="firs", link_model=FIRVictimLink)
    witnesses: List[Witness] = Relationship(back_populates="firs", link_model=FIRWitnessLink)
    evidence: List["Evidence"] = Relationship(back_populates="fir")
    reports: List["InvestigationReport"] = Relationship(back_populates="fir")


class Evidence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_id: int = Field(foreign_key="fir.id")
    type: EvidenceType
    description: str
    file_path: Optional[str] = None
    collected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    chain_of_custody: Optional[str] = None  # JSON tracking

    fir: Optional[FIR] = Relationship(back_populates="evidence")


class InvestigationReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fir_id: int = Field(foreign_key="fir.id")
    report_content: str
    report_type: str = Field(default="progress")  # progress, final, forensic, witness
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")

    fir: Optional[FIR] = Relationship(back_populates="reports")


# =============================================================================
# FINANCIAL CRIME MODELS
# =============================================================================

class BankAccount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    account_number: str = Field(unique=True, index=True)
    bank_name: str
    ifsc_code: Optional[str] = None
    account_holder_name: str
    criminal_id: Optional[int] = Field(default=None, foreign_key="criminal.id")
    is_suspicious: bool = Field(default=False)
    is_shell_account: bool = Field(default=False)
    total_suspicious_transactions: int = Field(default=0)


class FinancialTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    transaction_id: str = Field(unique=True, index=True)
    from_account: str = Field(index=True)
    to_account: str = Field(index=True)
    amount: float
    transaction_type: TransactionType
    timestamp: datetime
    description: Optional[str] = None
    is_suspicious: bool = Field(default=False)
    suspicion_reason: Optional[str] = None
    fir_id: Optional[int] = Field(default=None, foreign_key="fir.id")
    # Pattern detection
    is_circular: bool = Field(default=False)
    is_structured: bool = Field(default=False)  # Just below reporting threshold
    is_rapid_hop: bool = Field(default=False)


# =============================================================================
# CRIME FORECASTING & ALERTS
# =============================================================================

class CrimeAlert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    severity: AlertSeverity = Field(default=AlertSeverity.MEDIUM)
    alert_type: str  # prediction, pattern, network, financial, watchlist
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    confidence_score: float = Field(default=0.5)  # 0-1
    is_active: bool = Field(default=True)
    is_acknowledged: bool = Field(default=False)
    acknowledged_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    related_fir_ids: Optional[str] = None  # JSON array
    recommended_action: Optional[str] = None


class CrimePrediction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    prediction_type: str  # hotspot, trend, offender, pattern
    location: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    crime_type: Optional[str] = None
    predicted_date_start: Optional[datetime] = None
    predicted_date_end: Optional[datetime] = None
    probability: float = Field(default=0.5)
    confidence: str = Field(default="medium")  # low, medium, high
    basis: Optional[str] = None  # JSON: historical data, events, patterns
    recommended_action: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_validated: Optional[bool] = None  # After the fact: was prediction correct?


# =============================================================================
# WATCHLIST
# =============================================================================

class Watchlist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    entity_type: str  # criminal, vehicle, phone, location
    entity_value: str  # The actual value being watched
    entity_id: Optional[int] = None  # Link to criminal/fir if applicable
    created_by: int = Field(foreign_key="user.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_triggered: Optional[datetime] = None
    trigger_count: int = Field(default=0)


# =============================================================================
# AUDIT LOG WITH HASH CHAIN (Tamper-Evident)
# =============================================================================

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    action: str  # login, query, view, create, update, delete, export
    entity_name: str
    entity_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[str] = None
    ip_address: Optional[str] = None
    query_text: Optional[str] = None  # The actual query if applicable
    sensitivity_level: str = Field(default="low")  # low, medium, high
    # Hash chain for tamper-evidence
    previous_hash: Optional[str] = None
    current_hash: Optional[str] = None


# =============================================================================
# CONVERSATION HISTORY
# =============================================================================

class ConversationHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    session_id: str = Field(index=True)
    role: str  # user, assistant
    content: str
    sources: Optional[str] = None  # JSON array of source references
    confidence_score: Optional[float] = None
    intent: Optional[str] = None  # Classified intent
    language: str = Field(default="en")  # en, kn (Kannada)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_bookmarked: bool = Field(default=False)
    tags: Optional[str] = None  # JSON array of tags


# =============================================================================
# SOCIOLOGICAL DATA
# =============================================================================

class DistrictSocioData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    district: str = Field(unique=True, index=True)
    population: Optional[int] = None
    literacy_rate: Optional[float] = None
    unemployment_rate: Optional[float] = None
    poverty_rate: Optional[float] = None
    urbanization_rate: Optional[float] = None
    population_density: Optional[float] = None
    school_dropout_rate: Optional[float] = None
    migration_influx_rate: Optional[float] = None
    average_income: Optional[float] = None
    crime_rate_per_lakh: Optional[float] = None
    # Computed risk score
    social_risk_score: Optional[float] = None  # 0-100
    risk_factors: Optional[str] = None  # JSON breakdown
