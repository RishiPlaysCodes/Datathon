from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, func, select
from app.api import deps
from app.services.crime import (
    police_station_service, officer_service, crime_category_service,
    criminal_service, victim_service, witness_service, fir_service,
    evidence_service, investigation_report_service, audit_log_service
)
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
from app.models.user import UserRole

router = APIRouter()

# Helper to define all CRUD endpoints for a given service/model/prefix
def define_crud_routes(router, service, model, create_schema, update_schema, prefix, tags, allowed_roles_read=None, allowed_roles_write=None):
    if allowed_roles_read is None:
        allowed_roles_read = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR, UserRole.CONSTABLE]
    if allowed_roles_write is None:
        allowed_roles_write = [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR]

    @router.get(f"/{prefix}", response_model=List[model], tags=tags)
    def read_multi(
        db: Session = Depends(deps.get_db), 
        skip: int = 0, 
        limit: int = 100,
        current_user = Depends(deps.RoleChecker(allowed_roles_read))
    ) -> Any:
        return service.get_multi(db, skip=skip, limit=limit)

    @router.get(f"/{prefix}/{{id}}", response_model=model, tags=tags)
    def read_by_id(
        id: int, 
        db: Session = Depends(deps.get_db),
        current_user = Depends(deps.RoleChecker(allowed_roles_read))
    ) -> Any:
        obj = service.get(db, id=id)
        if not obj:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        return obj

    @router.post(f"/{prefix}", response_model=model, tags=tags)
    def create_obj(
        obj_in: create_schema, 
        db: Session = Depends(deps.get_db),
        current_user = Depends(deps.RoleChecker(allowed_roles_write))
    ) -> Any:
        return service.create(db, obj_in=obj_in)

    @router.put(f"/{prefix}/{{id}}", response_model=model, tags=tags)
    def update_obj(
        id: int, 
        obj_in: update_schema, 
        db: Session = Depends(deps.get_db),
        current_user = Depends(deps.RoleChecker(allowed_roles_write))
    ) -> Any:
        obj = service.update(db, id=id, obj_in=obj_in)
        if not obj:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        return obj

    @router.delete(f"/{prefix}/{{id}}", response_model=model, tags=tags)
    def delete_obj(
        id: int, 
        db: Session = Depends(deps.get_db),
        current_user = Depends(deps.RoleChecker([UserRole.ADMIN]))
    ) -> Any:
        obj = service.remove(db, id=id)
        if not obj:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        return obj

# Register all routes
define_crud_routes(router, police_station_service, PoliceStation, PoliceStationCreate, PoliceStationUpdate, "police-stations", ["police-stations"])
define_crud_routes(router, officer_service, Officer, OfficerCreate, OfficerUpdate, "officers", ["officers"])
define_crud_routes(router, crime_category_service, CrimeCategory, CrimeCategoryCreate, CrimeCategoryUpdate, "categories", ["categories"])
define_crud_routes(router, criminal_service, Criminal, CriminalCreate, CriminalUpdate, "criminals", ["criminals"])
define_crud_routes(router, victim_service, Victim, VictimCreate, VictimUpdate, "victims", ["victims"])
define_crud_routes(router, witness_service, Witness, WitnessCreate, WitnessUpdate, "witnesses", ["witnesses"])
define_crud_routes(router, fir_service, FIR, FIRCreate, FIRUpdate, "firs", ["firs"])
define_crud_routes(router, evidence_service, Evidence, EvidenceCreate, EvidenceUpdate, "evidence", ["evidence"])
define_crud_routes(router, investigation_report_service, InvestigationReport, InvestigationReportCreate, InvestigationReportUpdate, "reports", ["reports"])

# Logs are read-only for Admin by default
@router.get("/logs", response_model=List[AuditLog], tags=["logs"])
def read_logs(
    db: Session = Depends(deps.get_db), 
    skip: int = 0, 
    limit: int = 100,
    current_user = Depends(deps.RoleChecker([UserRole.ADMIN]))
) -> Any:
    return audit_log_service.get_multi(db, skip=skip, limit=limit)

@router.get("/stats/districts")
def get_district_stats(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Get crime distribution by district from database.
    """
    # Join FIR with PoliceStation to get district info
    statement = (
        select(PoliceStation.district, func.count(FIR.id).label("value"))
        .join(Officer, FIR.officer_id == Officer.id)
        .join(PoliceStation, Officer.police_station_id == PoliceStation.id)
        .group_by(PoliceStation.district)
        .order_by(func.count(FIR.id).desc())
        .limit(5)
    )
    results = db.exec(statement).all()
    return [{"name": r[0], "value": r[1]} for r in results]

@router.get("/stats/categories")
def get_category_stats(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Get crime categories distribution from database.
    """
    statement = (
        select(CrimeCategory.name, func.count(FIR.id).label("value"))
        .join(FIR, FIR.category_id == CrimeCategory.id)
        .group_by(CrimeCategory.name)
        .order_by(func.count(FIR.id).desc())
    )
    results = db.exec(statement).all()
    return [{"name": r[0], "value": r[1]} for r in results]
