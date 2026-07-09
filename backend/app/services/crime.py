from typing import List, Optional, Any, Union
from sqlmodel import Session
from app.db.repositories.crime import (
    police_station_repo, officer_repo, crime_category_repo,
    criminal_repo, victim_repo, witness_repo, fir_repo,
    evidence_repo, investigation_report_repo, audit_log_repo
)

class BaseService:
    def __init__(self, repo):
        self.repo = repo
    
    def get(self, db: Session, id: int):
        return self.repo.get(db, id)
    
    def get_multi(self, db: Session, skip: int = 0, limit: int = 100):
        return self.repo.get_multi(db, skip=skip, limit=limit)
    
    def create(self, db: Session, obj_in: Any):
        return self.repo.create(db, obj_in=obj_in)
    
    def update(self, db: Session, id: int, obj_in: Any):
        db_obj = self.repo.get(db, id)
        if not db_obj:
            return None
        return self.repo.update(db, db_obj=db_obj, obj_in=obj_in)
    
    def remove(self, db: Session, id: int):
        return self.repo.remove(db, id=id)

class PoliceStationService(BaseService): pass
class OfficerService(BaseService): pass
class CrimeCategoryService(BaseService): pass
class CriminalService(BaseService): pass
class VictimService(BaseService): pass
class WitnessService(BaseService): pass
class FIRService(BaseService): pass
class EvidenceService(BaseService): pass
class InvestigationReportService(BaseService): pass
class AuditLogService(BaseService): pass

police_station_service = PoliceStationService(police_station_repo)
officer_service = OfficerService(officer_repo)
crime_category_service = CrimeCategoryService(crime_category_repo)
criminal_service = CriminalService(criminal_repo)
victim_service = VictimService(victim_repo)
witness_service = WitnessService(witness_repo)
fir_service = FIRService(fir_repo)
evidence_service = EvidenceService(evidence_repo)
investigation_report_service = InvestigationReportService(investigation_report_repo)
audit_log_service = AuditLogService(audit_log_repo)
