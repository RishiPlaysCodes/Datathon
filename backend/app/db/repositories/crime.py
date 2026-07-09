from app.db.repositories.base import CRUDBase
from app.models.crime import (
    PoliceStation, Officer, CrimeCategory, Criminal, Victim, 
    Witness, FIR, Evidence, InvestigationReport, AuditLog
)
from app.schemas.crime import (
    PoliceStationCreate, PoliceStationUpdate,
    OfficerCreate, OfficerUpdate,
    CrimeCategoryCreate, CrimeCategoryUpdate,
    CriminalCreate, CriminalUpdate,
    VictimCreate, VictimUpdate,
    WitnessCreate, WitnessUpdate,
    FIRCreate, FIRUpdate,
    EvidenceCreate, EvidenceUpdate,
    InvestigationReportCreate, InvestigationReportUpdate,
    AuditLogCreate
)

class PoliceStationRepository(CRUDBase[PoliceStation, PoliceStationCreate, PoliceStationUpdate]): pass
class OfficerRepository(CRUDBase[Officer, OfficerCreate, OfficerUpdate]): pass
class CrimeCategoryRepository(CRUDBase[CrimeCategory, CrimeCategoryCreate, CrimeCategoryUpdate]): pass
class CriminalRepository(CRUDBase[Criminal, CriminalCreate, CriminalUpdate]): pass
class VictimRepository(CRUDBase[Victim, VictimCreate, VictimUpdate]): pass
class WitnessRepository(CRUDBase[Witness, WitnessCreate, WitnessUpdate]): pass
class FIRRepository(CRUDBase[FIR, FIRCreate, FIRUpdate]): pass
class EvidenceRepository(CRUDBase[Evidence, EvidenceCreate, EvidenceUpdate]): pass
class InvestigationReportRepository(CRUDBase[InvestigationReport, InvestigationReportCreate, InvestigationReportUpdate]): pass
class AuditLogRepository(CRUDBase[AuditLog, AuditLogCreate, AuditLogCreate]): pass

police_station_repo = PoliceStationRepository(PoliceStation)
officer_repo = OfficerRepository(Officer)
crime_category_repo = CrimeCategoryRepository(CrimeCategory)
criminal_repo = CriminalRepository(Criminal)
victim_repo = VictimRepository(Victim)
witness_repo = WitnessRepository(Witness)
fir_repo = FIRRepository(FIR)
evidence_repo = EvidenceRepository(Evidence)
investigation_report_repo = InvestigationReportRepository(InvestigationReport)
audit_log_repo = AuditLogRepository(AuditLog)
