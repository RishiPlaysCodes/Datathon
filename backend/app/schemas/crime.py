from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.models.crime import FIRStatus, EvidenceType

# Base Schemas
class PoliceStationBase(BaseModel):
    name: str
    location: str
    district: str
    contact_number: str

class PoliceStationCreate(PoliceStationBase): pass
class PoliceStationUpdate(PoliceStationBase): pass

class OfficerBase(BaseModel):
    name: str
    badge_number: str
    rank: str
    contact_number: str
    police_station_id: Optional[int] = None
    user_id: Optional[int] = None

class OfficerCreate(OfficerBase): pass
class OfficerUpdate(OfficerBase): pass

class CrimeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CrimeCategoryCreate(CrimeCategoryBase): pass
class CrimeCategoryUpdate(CrimeCategoryBase): pass

class CriminalBase(BaseModel):
    name: str
    alias: Optional[str] = None
    address: str
    phone_number: Optional[str] = None
    criminal_record: Optional[str] = None

class CriminalCreate(CriminalBase): pass
class CriminalUpdate(CriminalBase): pass

class VictimBase(BaseModel):
    name: str
    address: str
    phone_number: str

class VictimCreate(VictimBase): pass
class VictimUpdate(VictimBase): pass

class WitnessBase(BaseModel):
    name: str
    address: str
    phone_number: str

class WitnessCreate(WitnessBase): pass
class WitnessUpdate(WitnessBase): pass

class FIRBase(BaseModel):
    fir_number: str
    incident_date: datetime
    location: str
    description: str
    status: FIRStatus = FIRStatus.OPEN
    category_id: Optional[int] = None
    officer_id: Optional[int] = None

class FIRCreate(FIRBase): pass
class FIRUpdate(FIRBase): pass

class EvidenceBase(BaseModel):
    fir_id: int
    type: EvidenceType
    description: str
    file_path: Optional[str] = None

class EvidenceCreate(EvidenceBase): pass
class EvidenceUpdate(EvidenceBase): pass

class InvestigationReportBase(BaseModel):
    fir_id: int
    report_content: str

class InvestigationReportCreate(InvestigationReportBase): pass
class InvestigationReportUpdate(InvestigationReportBase): pass

class AuditLogBase(BaseModel):
    user_id: int
    action: str
    entity_name: str
    entity_id: Optional[int] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase): pass
