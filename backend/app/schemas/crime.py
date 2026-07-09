from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.crime import FIRStatus, EvidenceType, AlertSeverity, TransactionType


# =============================================================================
# POLICE STATION
# =============================================================================

class PoliceStationBase(BaseModel):
    name: str
    location: str
    district: str
    contact_number: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    station_code: Optional[str] = None

class PoliceStationCreate(PoliceStationBase): pass
class PoliceStationUpdate(PoliceStationBase): pass


# =============================================================================
# OFFICER
# =============================================================================

class OfficerBase(BaseModel):
    name: str
    badge_number: str
    rank: str
    contact_number: str
    police_station_id: Optional[int] = None
    user_id: Optional[int] = None

class OfficerCreate(OfficerBase): pass
class OfficerUpdate(OfficerBase): pass


# =============================================================================
# CRIME CATEGORY
# =============================================================================

class CrimeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    ipc_section: Optional[str] = None
    severity: str = "medium"

class CrimeCategoryCreate(CrimeCategoryBase): pass
class CrimeCategoryUpdate(CrimeCategoryBase): pass


# =============================================================================
# CRIMINAL
# =============================================================================

class CriminalBase(BaseModel):
    name: str
    alias: Optional[str] = None
    address: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    criminal_record: Optional[str] = None
    modus_operandi: Optional[str] = None
    gang_affiliation: Optional[str] = None
    active_area: Optional[str] = None

class CriminalCreate(CriminalBase): pass
class CriminalUpdate(CriminalBase): pass


# =============================================================================
# VICTIM
# =============================================================================

class VictimBase(BaseModel):
    name: str
    address: str
    phone_number: str
    age: Optional[int] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None

class VictimCreate(VictimBase): pass
class VictimUpdate(VictimBase): pass


# =============================================================================
# WITNESS
# =============================================================================

class WitnessBase(BaseModel):
    name: str
    address: str
    phone_number: str
    statement_summary: Optional[str] = None

class WitnessCreate(WitnessBase): pass
class WitnessUpdate(WitnessBase): pass


# =============================================================================
# FIR
# =============================================================================

class FIRBase(BaseModel):
    fir_number: str
    incident_date: datetime
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    description: str
    status: FIRStatus = FIRStatus.OPEN
    severity: str = "medium"
    category_id: Optional[int] = None
    officer_id: Optional[int] = None
    station_id: Optional[int] = None

class FIRCreate(FIRBase): pass
class FIRUpdate(FIRBase): pass


# =============================================================================
# EVIDENCE
# =============================================================================

class EvidenceBase(BaseModel):
    fir_id: int
    type: EvidenceType
    description: str
    file_path: Optional[str] = None

class EvidenceCreate(EvidenceBase): pass
class EvidenceUpdate(EvidenceBase): pass


# =============================================================================
# INVESTIGATION REPORT
# =============================================================================

class InvestigationReportBase(BaseModel):
    fir_id: int
    report_content: str
    report_type: str = "progress"

class InvestigationReportCreate(InvestigationReportBase): pass
class InvestigationReportUpdate(InvestigationReportBase): pass


# =============================================================================
# AUDIT LOG
# =============================================================================

class AuditLogBase(BaseModel):
    user_id: int
    action: str
    entity_name: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    sensitivity_level: str = "low"

class AuditLogCreate(AuditLogBase): pass


# =============================================================================
# FINANCIAL
# =============================================================================

class BankAccountBase(BaseModel):
    account_number: str
    bank_name: str
    ifsc_code: Optional[str] = None
    account_holder_name: str
    criminal_id: Optional[int] = None

class BankAccountCreate(BankAccountBase): pass
class BankAccountUpdate(BankAccountBase): pass


class FinancialTransactionBase(BaseModel):
    transaction_id: str
    from_account: str
    to_account: str
    amount: float
    transaction_type: TransactionType
    timestamp: datetime
    description: Optional[str] = None
    fir_id: Optional[int] = None

class FinancialTransactionCreate(FinancialTransactionBase): pass


# =============================================================================
# ALERTS & PREDICTIONS
# =============================================================================

class CrimeAlertBase(BaseModel):
    title: str
    description: str
    severity: AlertSeverity = AlertSeverity.MEDIUM
    alert_type: str
    location: Optional[str] = None
    district: Optional[str] = None
    confidence_score: float = 0.5
    recommended_action: Optional[str] = None

class CrimeAlertCreate(CrimeAlertBase): pass


class CrimePredictionBase(BaseModel):
    prediction_type: str
    location: Optional[str] = None
    district: Optional[str] = None
    crime_type: Optional[str] = None
    probability: float = 0.5
    confidence: str = "medium"
    recommended_action: Optional[str] = None

class CrimePredictionCreate(CrimePredictionBase): pass


# =============================================================================
# WATCHLIST
# =============================================================================

class WatchlistBase(BaseModel):
    name: str
    description: Optional[str] = None
    entity_type: str
    entity_value: str
    entity_id: Optional[int] = None

class WatchlistCreate(WatchlistBase): pass
class WatchlistUpdate(WatchlistBase): pass


# =============================================================================
# CONVERSATION
# =============================================================================

class ConversationHistoryBase(BaseModel):
    session_id: str
    role: str
    content: str
    language: str = "en"

class ConversationHistoryCreate(ConversationHistoryBase): pass


# =============================================================================
# SOCIOLOGICAL DATA
# =============================================================================

class DistrictSocioDataBase(BaseModel):
    district: str
    population: Optional[int] = None
    literacy_rate: Optional[float] = None
    unemployment_rate: Optional[float] = None
    poverty_rate: Optional[float] = None
    urbanization_rate: Optional[float] = None
    population_density: Optional[float] = None

class DistrictSocioDataCreate(DistrictSocioDataBase): pass
class DistrictSocioDataUpdate(DistrictSocioDataBase): pass
