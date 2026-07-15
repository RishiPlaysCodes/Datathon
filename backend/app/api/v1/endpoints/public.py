"""Public citizen endpoints - NO authentication required (publicly accessible)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.session import get_db
from app.models.crime import PublicComplaint, CommunityReport, SOSAlert
from app.services.public_safety import (
    generate_tracking_id, compute_area_safety_scores,
    get_transparency_stats, check_escalation, ESCALATION_DAYS,
)

router = APIRouter(prefix="/public", tags=["Citizen (Public)"])


# ---------- Request models ----------
class ComplaintCreate(BaseModel):
    complainant_name: str
    phone: Optional[str] = None
    crime_type: str
    description: str
    location_name: Optional[str] = None
    district: Optional[str] = None
    is_anonymous: bool = False


class CommunityReportCreate(BaseModel):
    report_type: str
    title: str
    description: str
    location_name: Optional[str] = None
    reporter_name: Optional[str] = None
    is_anonymous: bool = True
    severity: str = "medium"


class SOSCreate(BaseModel):
    citizen_name: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    alert_type: str = "general"


# ---------- Complaint filing + tracking ----------
@router.post("/complaint")
async def file_complaint(payload: ComplaintCreate, db: AsyncSession = Depends(get_db)):
    """Citizen files a complaint online and receives a public tracking ID."""
    tracking_id = generate_tracking_id()
    complaint = PublicComplaint(
        tracking_id=tracking_id,
        complainant_name="Anonymous" if payload.is_anonymous else payload.complainant_name,
        phone=payload.phone,
        crime_type=payload.crime_type,
        description=payload.description,
        location_name=payload.location_name,
        district=payload.district,
        station_assigned=f"{payload.location_name or payload.district or 'Central'} PS",
        status="submitted",
        is_anonymous=payload.is_anonymous,
        last_action_note="Complaint received and logged in the system.",
    )
    db.add(complaint)
    await db.flush()
    return {
        "tracking_id": tracking_id,
        "message": "Complaint filed successfully. Save this tracking ID to check status anytime.",
        "status": "submitted",
        "escalation_policy": f"If no action is taken within {ESCALATION_DAYS} days, your complaint is automatically escalated to higher authorities and made publicly visible.",
    }


@router.get("/complaint/{tracking_id}")
async def track_complaint(tracking_id: str, db: AsyncSession = Depends(get_db)):
    """Public status tracking for a complaint - full transparency."""
    result = await db.execute(select(PublicComplaint).where(PublicComplaint.tracking_id == tracking_id.upper()))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="No complaint found with this tracking ID")

    # Auto-escalate if overdue
    if check_escalation(c) and not c.is_escalated:
        c.is_escalated = True
        c.status = "escalated"
        c.escalation_reason = f"No action within {ESCALATION_DAYS} days - auto-escalated to DCP/SP office."
        c.last_action_note = "Escalated to higher authority due to inaction."
        await db.flush()

    days_pending = 0
    if c.created_at:
        created = c.created_at.replace(tzinfo=None) if hasattr(c.created_at, "replace") else c.created_at
        days_pending = (datetime.now() - created).days

    return {
        "tracking_id": c.tracking_id,
        "crime_type": c.crime_type,
        "status": c.status,
        "station_assigned": c.station_assigned,
        "fir_number": c.fir_number,
        "is_escalated": c.is_escalated,
        "escalation_reason": c.escalation_reason,
        "days_pending": days_pending,
        "last_action_note": c.last_action_note,
        "filed_on": str(c.created_at)[:10] if c.created_at else None,
        "location": c.location_name,
    }


@router.get("/transparency")
async def transparency(db: AsyncSession = Depends(get_db)):
    """Public accountability dashboard - complaint handling stats."""
    return await get_transparency_stats(db)


# ---------- Area safety scores ----------
@router.get("/safety-scores")
async def safety_scores(db: AsyncSession = Depends(get_db)):
    """Public area safety scores (anonymized) - check before you travel."""
    scores = await compute_area_safety_scores(db)
    return {"areas": scores, "total_areas": len(scores)}


# ---------- Community watch ----------
@router.post("/community-report")
async def create_community_report(payload: CommunityReportCreate, db: AsyncSession = Depends(get_db)):
    """Citizen reports suspicious activity / hazard / help request."""
    report = CommunityReport(
        report_type=payload.report_type,
        title=payload.title,
        description=payload.description,
        location_name=payload.location_name,
        reporter_name="Anonymous" if payload.is_anonymous else payload.reporter_name,
        is_anonymous=payload.is_anonymous,
        severity=payload.severity,
        status="pending",
    )
    db.add(report)
    await db.flush()
    return {"id": report.id, "message": "Report submitted. Thank you for helping keep the community safe."}


@router.get("/community-reports")
async def list_community_reports(db: AsyncSession = Depends(get_db)):
    """Public feed of community reports (verified + pending)."""
    result = await db.execute(
        select(CommunityReport).order_by(desc(CommunityReport.upvotes), desc(CommunityReport.created_at)).limit(50)
    )
    reports = result.scalars().all()
    return [
        {
            "id": r.id, "report_type": r.report_type, "title": r.title,
            "description": r.description, "location": r.location_name,
            "reporter": r.reporter_name, "status": r.status,
            "upvotes": r.upvotes, "severity": r.severity,
            "created_at": str(r.created_at)[:16] if r.created_at else None,
        }
        for r in reports
    ]


@router.post("/community-report/{report_id}/upvote")
async def upvote_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """Citizens upvote a report to raise its priority."""
    result = await db.execute(select(CommunityReport).where(CommunityReport.id == report_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    r.upvotes += 1
    # Auto-verify highly upvoted reports
    if r.upvotes >= 5 and r.status == "pending":
        r.status = "verified"
    await db.flush()
    return {"id": r.id, "upvotes": r.upvotes, "status": r.status}


# ---------- SOS / Panic button ----------
@router.post("/sos")
async def sos_alert(payload: SOSCreate, db: AsyncSession = Depends(get_db)):
    """Emergency SOS - logs alert and returns nearest help info."""
    alert = SOSAlert(
        citizen_name=payload.citizen_name,
        phone=payload.phone,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name,
        alert_type=payload.alert_type,
        status="active",
    )
    db.add(alert)
    await db.flush()
    return {
        "alert_id": alert.id,
        "message": "SOS ALERT SENT. Help is on the way. Stay calm and stay on the line.",
        "emergency_contacts": [
            {"name": "Police Control Room", "number": "100"},
            {"name": "Women Helpline", "number": "1091"},
            {"name": "Emergency Services", "number": "112"},
            {"name": "Ambulance", "number": "108"},
        ],
        "nearest_station": f"{payload.location_name or 'Central'} Police Station notified",
        "status": "active",
    }
