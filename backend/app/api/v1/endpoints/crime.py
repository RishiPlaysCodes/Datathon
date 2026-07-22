"""Crime data endpoints: FIRs, accused, analytics, network."""
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.crime import FIR, Accused, Victim, FIRAccusedLink, CriminalNetwork, Transaction
from app.models.user import User
from app.schemas.crime import (
    FIRResponse,
    FIRListResponse,
    AccusedResponse,
    AccusedProfileResponse,
    NetworkGraphResponse,
    NetworkNode,
    NetworkEdge,
    HotspotData,
    AnalyticsDashboard,
    CrimeTrendData,
    RiskScoreBreakdown,
)
from app.api.deps import get_current_user, require_role
from app.services.network import build_network_graph, get_entity_resolution
from app.services.risk import calculate_risk_score

router = APIRouter(prefix="/crime", tags=["Crime Intelligence"])


@router.get("/firs", response_model=FIRListResponse)
async def list_firs(
    crime_type: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    station: Optional[str] = None,
    zone: Optional[str] = None,
    all_stations: bool = False,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List FIRs with filters. Zone-based default: officers see their station's FIRs.
    Pass all_stations=true to see all (audit-logged for non-supervisors).
    """
    query = select(FIR)
    count_query = select(func.count(FIR.id))

    conditions = []

    # CITIZEN ROLE: can only see FIRs they filed (linked by complainant_user_id)
    if current_user.role == "citizen":
        conditions.append(FIR.complainant_user_id == current_user.id)
    elif not all_stations:
        # ZONE-BASED DEFAULT: police see only their station/zone by default
        if station:
            conditions.append(FIR.police_station_code == station)
        elif zone:
            conditions.append(FIR.zone == zone)
        elif current_user.role == "supervisor":
            # Supervisors see their zone by default (all subordinate stations)
            if current_user.assigned_zone:
                conditions.append(FIR.zone == current_user.assigned_zone)
        else:
            # Constable/Investigator/Analyst: default to their assigned station
            if current_user.station_id:
                conditions.append(FIR.police_station_code == current_user.station_id)

    if crime_type:
        conditions.append(FIR.crime_type.ilike(f"%{crime_type}%"))
    if district:
        conditions.append(FIR.district.ilike(f"%{district}%"))
    if status:
        conditions.append(FIR.status == status)
    if location:
        conditions.append(FIR.location_name.ilike(f"%{location}%"))
    if date_from:
        try:
            conditions.append(FIR.date_of_occurrence >= datetime.fromisoformat(date_from))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_from must be a valid ISO-8601 date") from exc
    if date_to:
        try:
            conditions.append(FIR.date_of_occurrence <= datetime.fromisoformat(date_to))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_to must be a valid ISO-8601 date") from exc
    if search:
        conditions.append(
            (FIR.description.ilike(f"%{search}%"))
            | (FIR.fir_number.ilike(f"%{search}%"))
            | (FIR.complainant_name.ilike(f"%{search}%"))
            | (FIR.modus_operandi.ilike(f"%{search}%"))
        )

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    # Get total
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(FIR.date_of_occurrence.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    firs = result.scalars().all()

    return FIRListResponse(
        total=total,
        firs=[FIRResponse.model_validate(f) for f in firs],
    )


@router.get("/firs/{fir_id}", response_model=FIRResponse)
async def get_fir(
    fir_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single FIR details."""
    result = await db.execute(select(FIR).where(FIR.id == fir_id))
    fir = result.scalar_one_or_none()
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")
    if current_user.role == "citizen" and fir.complainant_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access FIRs filed by your account")
    return FIRResponse.model_validate(fir)


@router.get("/stations")
async def list_stations(
    current_user: User = Depends(get_current_user),
):
    """List available police stations for filtering."""
    from app.db.stations import KARNATAKA_STATIONS
    return [
        {"station_code": s["station_code"], "station_name": s["station_name"], "zone": s["zone"], "city": s["city"]}
        for s in KARNATAKA_STATIONS
    ]


@router.get("/firs/search-by-number")
async def search_fir_by_number(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Search FIRs by FIR number (partial match) or complainant name.
    Returns matching FIRs for Investigation Support.
    """
    # Normalize query
    search_term = q.strip().replace("/", "%").replace("-", "%")
    results = (
        await db.execute(
            select(FIR)
            .where(
                (FIR.fir_number.ilike(f"%{search_term}%"))
                | (FIR.complainant_name.ilike(f"%{q.strip()}%"))
            )
            .order_by(FIR.date_of_occurrence.desc())
            .limit(20)
        )
    ).scalars().all()

    return [
        {
            "id": f.id,
            "fir_number": f.fir_number,
            "crime_type": f.crime_type,
            "location_name": f.location_name,
            "station_name": f.station_name,
            "status": f.status,
            "date_of_occurrence": f.date_of_occurrence.isoformat() if f.date_of_occurrence else None,
            "complainant_name": f.complainant_name,
            "zone": f.zone,
        }
        for f in results
    ]


@router.get("/firs/{fir_id}/report")
async def get_fir_investigation_report(
    fir_id: int,
    regenerate: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get (or generate) the AI Investigation Report for a FIR.

    The report covers 9 sections: case summary, crime classification, similar
    cases, network analysis, hotspot analysis, recommended actions, prevention
    measures, financial trail, and cyber crime analysis. All findings are
    grounded in actual database records.
    """
    result = await db.execute(select(FIR).where(FIR.id == fir_id))
    fir = result.scalar_one_or_none()
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")

    # Return cached report if available and regeneration not requested
    if fir.ai_report_generated and fir.ai_report_content and not regenerate:
        try:
            return json.loads(fir.ai_report_content)
        except (json.JSONDecodeError, TypeError):
            pass  # Regenerate if cached content is corrupted

    # Generate fresh report
    from app.services.investigation_report import generate_investigation_report
    report = await generate_investigation_report(db, fir)

    # Cache the report in the FIR record
    fir.ai_report_generated = True
    fir.ai_report_content = json.dumps(report, default=str)
    await db.commit()

    return report


@router.get("/accused", response_model=List[AccusedResponse])
async def list_accused(
    search: Optional[str] = None,
    repeat_only: bool = False,
    min_risk: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """List accused persons."""
    query = select(Accused)
    conditions = []

    if search:
        conditions.append(
            (Accused.name.ilike(f"%{search}%")) | (Accused.alias.ilike(f"%{search}%"))
        )
    if repeat_only:
        conditions.append(Accused.is_repeat_offender == True)
    if min_risk:
        conditions.append(Accused.risk_score >= min_risk)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(Accused.risk_score.desc()).limit(50)
    result = await db.execute(query)
    accused_list = result.scalars().all()
    return [AccusedResponse.model_validate(a) for a in accused_list]


@router.get("/accused/{accused_id}/profile", response_model=AccusedProfileResponse)
async def get_accused_profile(
    accused_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get full accused profile with risk score breakdown."""
    result = await db.execute(select(Accused).where(Accused.id == accused_id))
    accused = result.scalar_one_or_none()
    if not accused:
        raise HTTPException(status_code=404, detail="Accused not found")

    # Get linked FIRs
    link_result = await db.execute(
        select(FIRAccusedLink).where(FIRAccusedLink.accused_id == accused_id)
    )
    links = link_result.scalars().all()
    fir_ids = [l.fir_id for l in links]

    firs = []
    if fir_ids:
        fir_result = await db.execute(select(FIR).where(FIR.id.in_(fir_ids)))
        firs = [FIRResponse.model_validate(f) for f in fir_result.scalars().all()]

    # Calculate risk score breakdown (for explanation) but use stored score for headline
    risk_breakdown = calculate_risk_score(accused, firs)
    # The headline risk_score in the accused record is the stored value (same as
    # seen in the accused list). The breakdown shows how it was computed.
    risk_breakdown["overall_score"] = accused.risk_score

    # Get network connections
    net_result = await db.execute(
        select(CriminalNetwork).where(
            (CriminalNetwork.source_accused_id == accused_id)
            | (CriminalNetwork.target_accused_id == accused_id)
        )
    )
    connections = net_result.scalars().all()
    network_connections = []
    for conn in connections:
        other_id = conn.target_accused_id if conn.source_accused_id == accused_id else conn.source_accused_id
        other_result = await db.execute(select(Accused).where(Accused.id == other_id))
        other = other_result.scalar_one_or_none()
        if other:
            network_connections.append({
                "id": other.id,
                "name": other.name,
                "relationship": conn.relationship_type,
                "strength": conn.strength,
            })

    # Generate behavioral profile
    crime_types = [f.crime_type for f in firs]
    locations = [f.location_name for f in firs if f.location_name]
    behavioral_profile = _generate_behavioral_profile(accused, firs, crime_types, locations)

    return AccusedProfileResponse(
        accused=AccusedResponse.model_validate(accused),
        firs=firs,
        risk_breakdown=risk_breakdown,
        behavioral_profile=behavioral_profile,
        network_connections=network_connections,
    )


def _generate_behavioral_profile(accused, firs, crime_types, locations) -> str:
    """Generate natural language behavioral profile."""
    profile_parts = []
    if accused.name:
        profile_parts.append(f"{accused.name}")
        if accused.alias:
            profile_parts.append(f" (alias: {accused.alias})")

    if accused.total_cases > 1:
        profile_parts.append(f" is a repeat offender with {accused.total_cases} known cases.")
    else:
        profile_parts.append(f" has 1 known case on record.")

    if crime_types:
        unique_types = list(set(crime_types))
        profile_parts.append(f" Primary crime types: {', '.join(unique_types)}.")

    if locations:
        unique_locations = list(set(locations))[:3]
        profile_parts.append(f" Active in: {', '.join(unique_locations)}.")

    if accused.gang_id:
        profile_parts.append(f" Associated with gang ID: {accused.gang_id}.")

    if accused.is_repeat_offender:
        profile_parts.append(" Flagged as repeat offender - requires enhanced monitoring.")

    return "".join(profile_parts)


@router.get("/network/{accused_id}", response_model=NetworkGraphResponse)
async def get_criminal_network(
    accused_id: int,
    depth: int = Query(2, ge=1, le=4),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get criminal network graph for an accused person."""
    return await build_network_graph(db, accused_id, depth)


@router.get("/network/entity-resolution/{name}")
async def resolve_entity(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Resolve entity - find matching accused across name variants."""
    return await get_entity_resolution(db, name)


@router.get("/analytics/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    district: Optional[str] = None,
    station: Optional[str] = None,
    zone: Optional[str] = None,
    all_stations: bool = False,
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get analytics dashboard data. Zone-filtered by default."""
    date_from = datetime.now() - timedelta(days=days)

    # Build base conditions with zone filtering
    base_conditions = [FIR.date_of_occurrence >= date_from]
    if district:
        base_conditions.append(FIR.district == district)
    if not all_stations and current_user.role != "citizen":
        if station:
            base_conditions.append(FIR.police_station_code == station)
        elif zone:
            base_conditions.append(FIR.zone == zone)
        elif current_user.role == "supervisor":
            if current_user.assigned_zone:
                base_conditions.append(FIR.zone == current_user.assigned_zone)
        else:
            if current_user.station_id:
                base_conditions.append(FIR.police_station_code == current_user.station_id)

    # Total FIRs
    total_result = await db.execute(
        select(func.count(FIR.id)).where(and_(*base_conditions))
    )
    total_firs = total_result.scalar() or 0

    # Active cases
    active_result = await db.execute(
        select(func.count(FIR.id)).where(
            and_(*base_conditions, FIR.status.in_(["open", "investigating"]))
        )
    )
    active_cases = active_result.scalar() or 0

    # Closed cases
    closed_result = await db.execute(
        select(func.count(FIR.id)).where(and_(*base_conditions, FIR.status == "closed"))
    )
    closed_cases = closed_result.scalar() or 0

    # Repeat offenders
    repeat_result = await db.execute(
        select(func.count(Accused.id)).where(Accused.is_repeat_offender == True)
    )
    repeat_offenders = repeat_result.scalar() or 0

    # Top crime types
    crime_type_result = await db.execute(
        select(FIR.crime_type, func.count(FIR.id).label("count"))
        .where(and_(*base_conditions))
        .group_by(FIR.crime_type)
        .order_by(func.count(FIR.id).desc())
        .limit(10)
    )
    top_crime_types = [
        {"crime_type": row[0], "count": row[1]} for row in crime_type_result.all()
    ]

    # Hotspots
    hotspot_result = await db.execute(
        select(
            FIR.latitude,
            FIR.longitude,
            FIR.crime_type,
            FIR.location_name,
            func.count(FIR.id).label("count"),
        )
        .where(and_(*base_conditions, FIR.latitude.isnot(None)))
        .group_by(FIR.latitude, FIR.longitude, FIR.crime_type, FIR.location_name)
        .order_by(func.count(FIR.id).desc())
        .limit(50)
    )
    hotspots = [
        HotspotData(
            latitude=row[0],
            longitude=row[1],
            crime_type=row[2],
            location_name=row[3],
            count=row[4],
            intensity=min(row[4] / 5.0, 1.0),
        )
        for row in hotspot_result.all()
    ]

    # Trends (daily counts for last N days)
    # Use func.date() for SQLite compatibility
    trend_result = await db.execute(
        select(
            func.date(FIR.date_of_occurrence).label("day"),
            FIR.crime_type,
            func.count(FIR.id).label("count"),
        )
        .where(and_(*base_conditions))
        .group_by("day", FIR.crime_type)
        .order_by("day")
    )
    trends = [
        CrimeTrendData(date=str(row[0]), crime_type=row[1], count=row[2])
        for row in trend_result.all()
    ]

    # District stats
    district_result = await db.execute(
        select(FIR.district, func.count(FIR.id).label("count"))
        .where(and_(*base_conditions))
        .group_by(FIR.district)
        .order_by(func.count(FIR.id).desc())
    )
    district_stats = [
        {"district": row[0], "count": row[1]} for row in district_result.all()
    ]

    return AnalyticsDashboard(
        total_firs=total_firs,
        active_cases=active_cases,
        closed_cases=closed_cases,
        repeat_offenders=repeat_offenders,
        top_crime_types=top_crime_types,
        hotspots=hotspots,
        trends=trends,
        district_stats=district_stats,
    )


@router.get("/analytics/hotspots", response_model=List[HotspotData])
async def get_hotspots(
    crime_type: Optional[str] = None,
    all_stations: bool = False,
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get crime hotspot data for heatmap. Zone-filtered by default."""
    date_from = datetime.now() - timedelta(days=days)
    conditions = [FIR.date_of_occurrence >= date_from, FIR.latitude.isnot(None)]

    if crime_type:
        conditions.append(FIR.crime_type.ilike(f"%{crime_type}%"))

    # Zone filtering
    if not all_stations:
        if current_user.role == "supervisor":
            if current_user.assigned_zone:
                conditions.append(FIR.zone == current_user.assigned_zone)
        elif current_user.station_id:
            conditions.append(FIR.police_station_code == current_user.station_id)

    result = await db.execute(
        select(
            FIR.latitude,
            FIR.longitude,
            FIR.crime_type,
            FIR.location_name,
            func.count(FIR.id).label("count"),
        )
        .where(and_(*conditions))
        .group_by(FIR.latitude, FIR.longitude, FIR.crime_type, FIR.location_name)
        .order_by(func.count(FIR.id).desc())
        .limit(100)
    )

    return [
        HotspotData(
            latitude=row[0],
            longitude=row[1],
            crime_type=row[2],
            location_name=row[3],
            count=row[4],
            intensity=min(row[4] / 5.0, 1.0),
        )
        for row in result.all()
    ]


@router.get("/audit-logs", response_model=List[dict])
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("supervisor")),
):
    """Get audit logs (supervisor only)."""
    from app.models.user import AuditLog

    # Order by id so the returned sequence always matches insertion order,
    # which is the order the tamper-evident hash chain was built in.
    offset = (page - 1) * limit
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.username,
            "action": log.action,
            "details": log.details,
            "query_text": log.query_text,
            "risk_level": log.risk_level,
            "timestamp": log.timestamp.isoformat(timespec="microseconds") if log.timestamp else None,
            "previous_hash": log.previous_hash,
            "entry_hash": log.entry_hash,
        }
        for log in logs
    ]
