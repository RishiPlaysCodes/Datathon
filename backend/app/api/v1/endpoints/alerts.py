"""Real-time alerts endpoint - polling-based live crime intelligence alerts."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Optional

from app.db.session import get_db
from app.models.crime import FIR, Accused, PublicComplaint
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Real-time Alerts"])


@router.get("/live")
async def get_live_alerts(
    since_hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Real-time intelligence alerts based on crime patterns.
    Frontend polls this every 30s for live updates.
    """
    since = datetime.now() - timedelta(hours=since_hours)
    alerts = []

    # Alert Type 1: Recent FIRs (new crimes)
    recent_result = await db.execute(
        select(func.count(FIR.id)).where(FIR.date_of_occurrence >= since)
    )
    recent_count = recent_result.scalar() or 0
    if recent_count > 0:
        alerts.append({
            "id": "new_firs",
            "type": "info",
            "title": f"{recent_count} new FIRs in last {since_hours}h",
            "description": f"{recent_count} new crime reports filed recently.",
            "timestamp": datetime.now().isoformat(),
            "priority": "medium",
        })

    # Alert Type 2: Crime cluster detection (3+ same crime type in same location recently)
    cluster_result = await db.execute(
        select(FIR.crime_type, FIR.location_name, func.count(FIR.id).label("cnt"))
        .where(and_(FIR.date_of_occurrence >= since, FIR.location_name.isnot(None)))
        .group_by(FIR.crime_type, FIR.location_name)
        .having(func.count(FIR.id) >= 3)
        .order_by(func.count(FIR.id).desc())
        .limit(5)
    )
    clusters = cluster_result.all()
    for c in clusters:
        alerts.append({
            "id": f"cluster_{c[0]}_{c[1]}",
            "type": "warning",
            "title": f"Crime Cluster: {c[0].title()} in {c[1]}",
            "description": f"{c[2]} incidents of {c[0]} detected in {c[1]} within {since_hours}h. Possible organized activity.",
            "timestamp": datetime.now().isoformat(),
            "priority": "high" if c[2] >= 5 else "medium",
            "location": c[1],
            "crime_type": c[0],
            "count": c[2],
        })

    # Alert Type 3: Repeat offender activity
    repeat_result = await db.execute(
        select(func.count(Accused.id)).where(
            and_(Accused.is_repeat_offender == True, Accused.risk_score >= 70)
        )
    )
    high_risk_active = repeat_result.scalar() or 0
    if high_risk_active > 0:
        alerts.append({
            "id": "repeat_offenders",
            "type": "danger",
            "title": f"{high_risk_active} high-risk repeat offenders active",
            "description": "Multiple repeat offenders with risk score >70 are flagged. Enhanced surveillance recommended.",
            "timestamp": datetime.now().isoformat(),
            "priority": "high",
        })

    # Alert Type 4: Unresolved citizen complaints (escalation pending)
    try:
        esc_result = await db.execute(
            select(func.count(PublicComplaint.id)).where(
                and_(PublicComplaint.status == "submitted",
                     PublicComplaint.created_at <= datetime.now() - timedelta(days=5))
            )
        )
        pending = esc_result.scalar() or 0
        if pending > 0:
            alerts.append({
                "id": "pending_complaints",
                "type": "warning",
                "title": f"{pending} citizen complaints approaching escalation",
                "description": f"{pending} complaints pending >5 days. Auto-escalation in 2 days if unaddressed.",
                "timestamp": datetime.now().isoformat(),
                "priority": "medium",
            })
    except Exception:
        pass  # PublicComplaint table may not exist yet

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: priority_order.get(a.get("priority", "low"), 2))

    return {
        "alerts": alerts,
        "total": len(alerts),
        "since": since.isoformat(),
        "polled_at": datetime.now().isoformat(),
    }
