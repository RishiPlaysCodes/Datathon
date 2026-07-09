from typing import Any, Optional
from sqlmodel import Session
from app.db.repositories.crime import (
    police_station_repo, officer_repo, crime_category_repo,
    criminal_repo, victim_repo, witness_repo, fir_repo,
    evidence_repo, investigation_report_repo, audit_log_repo,
    bank_account_repo, financial_transaction_repo,
    crime_alert_repo, crime_prediction_repo, watchlist_repo,
    conversation_history_repo, district_socio_data_repo
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
class BankAccountService(BaseService): pass
class FinancialTransactionService(BaseService): pass
class CrimeAlertService(BaseService): pass
class CrimePredictionService(BaseService): pass
class WatchlistService(BaseService): pass
class ConversationHistoryService(BaseService): pass
class DistrictSocioDataService(BaseService): pass


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
bank_account_service = BankAccountService(bank_account_repo)
financial_transaction_service = FinancialTransactionService(financial_transaction_repo)
crime_alert_service = CrimeAlertService(crime_alert_repo)
crime_prediction_service = CrimePredictionService(crime_prediction_repo)
watchlist_service = WatchlistService(watchlist_repo)
conversation_history_service = ConversationHistoryService(conversation_history_repo)
district_socio_data_service = DistrictSocioDataService(district_socio_data_repo)
