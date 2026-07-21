"""Crime data endpoints: FIRs, accused, analytics, network."""
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
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List FIRs with filters. Citizens only see their own FIRs."""
    query = select(FIR)
    count_query = select(func.count(FIR.id))

    conditions = []

    # CITIZEN ROLE: can only see FIRs they filed (linked by complainant_user_id)
    if current_user.role == "citizen":
        conditions.append(FIR.complainant_user_id == current_user.id)

    if crime_type:
        conditions.append(FIR.crime_type.ilike(f"%{crime_type}%"))
    if district:
        conditions.append(FIR.district.ilike(f"%{district}%"))
    if status:
        conditions.append(FIR.status == status)
    if location:
        conditions.append(FIR.location_name.ilike(f"%{location}%"))
    if date_from:
        conditions.append(FIR.date_of_occurrence >= datetime.fromisoformat(date_from))
    if date_to:
        conditions.append(FIR.date_of_occurrence <= datetime.fromisoformat(date_to))
    if search:
        conditions.append(
            (FIR.description.ilike(f"%{search}%"))
            | (FIR.fir_number.ilike(f"%{search}%"))
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
    return FIRResponse.model_validate(fir)


@router.get("/accused", response_model=List[AccusedResponse])
async def list_accused(
    search: Optional[str] = None,
    repeat_only: bool = False,
    min_risk: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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

    # Calculate risk score
    risk_breakdown = calculate_risk_score(accused, firs)

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
    current_user: User = Depends(get_current_user),
):
    """Get criminal network graph for an accused person."""
    return await build_network_graph(db, accused_id, depth)


@router.get("/network/entity-resolution/{name}")
async def resolve_entity(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve entity - find matching accused across name variants."""
    return await get_entity_resolution(db, name)


@router.get("/analytics/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    district: Optional[str] = None,
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics dashboard data."""
    date_from = datetime.now() - timedelta(days=days)

    # Base conditions
    conditions = [FIR.date_of_occurrence >= date_from]
    if district:
        conditions.append(FIR.district.ilike(f"%{district}%"))

    # Total FIRs
    total_result = await db.execute(
        select(func.count(FIR.id)).where(and_(*conditions))
    )
    total_firs = total_result.scalar() or 0

    # Active cases
    active_result = await db.execute(
        select(func.count(FIR.id)).where(
            and_(*conditions, FIR.status.in_(["open", "investigating"]))
        )
    )
    active_cases = active_result.scalar() or 0

    # Closed cases
    closed_result = await db.execute(
        select(func.count(FIR.id)).where(and_(*conditions, FIR.status == "closed"))
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
        .where(and_(*conditions))
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
        .where(and_(*conditions, FIR.latitude.isnot(None)))
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
        .where(and_(*conditions))
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
        .where(and_(*conditions))
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
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get crime hotspot data for heatmap."""
    date_from = datetime.now() - timedelta(days=days)
    conditions = [FIR.date_of_occurrence >= date_from, FIR.latitude.isnot(None)]

    if crime_type:
        conditions.append(FIR.crime_type.ilike(f"%{crime_type}%"))

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

    offset = (page - 1) * limit
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "username": log.username,
            "action": log.action,
            "details": log.details,
            "risk_level": log.risk_level,
            "timestamp": str(log.timestamp) if log.timestamp else None,
            "entry_hash": log.entry_hash,
        }
        for log in logs
    ]
