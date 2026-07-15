"""Public citizen safety services - safety scores, complaint escalation logic."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Dict, Any, List
import random
import string

from app.models.crime import FIR, PublicComplaint

# Auto-escalation threshold (days without action)
ESCALATION_DAYS = 7


def generate_tracking_id() -> str:
    """Generate a public complaint tracking ID like KSP-A1B2C3."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"KSP-{suffix}"


async def compute_area_safety_scores(db: AsyncSession) -> List[Dict[str, Any]]:
    """Compute a 0-10 safety score per area from crime density (last 90 days)."""
    date_from = datetime.now() - timedelta(days=90)
    result = await db.execute(
        select(
            FIR.location_name,
            FIR.latitude,
            FIR.longitude,
            func.count(FIR.id).label("count"),
        )
        .where(and_(FIR.date_of_occurrence >= date_from, FIR.location_name.isnot(None)))
        .group_by(FIR.location_name, FIR.latitude, FIR.longitude)
    )
    rows = result.all()
    if not rows:
        return []

    max_count = max((r[3] for r in rows), default=1)
    scores = []
    for r in rows:
        # More crimes -> lower safety score (inverse)
        raw = 10 - (r[3] / max_count) * 8  # keeps between 2 and 10
        score = round(max(2.0, min(10.0, raw)), 1)
        label = "Safe" if score >= 7 else "Moderate" if score >= 4.5 else "High Alert"
        # Determine advisory
        advisory = (
            "Routine caution advised."
            if score >= 7 else
            "Stay alert, especially after dark."
            if score >= 4.5 else
            "Avoid isolated areas 8PM-12AM. Travel in groups."
        )
        scores.append({
            "area": r[0],
            "latitude": r[1],
            "longitude": r[2],
            "incidents_90d": r[3],
            "safety_score": score,
            "label": label,
            "advisory": advisory,
        })
    scores.sort(key=lambda x: x["safety_score"])
    return scores


async def get_transparency_stats(db: AsyncSession) -> Dict[str, Any]:
    """Public accountability metrics on complaint handling."""
    total_result = await db.execute(select(func.count(PublicComplaint.id)))
    total = total_result.scalar() or 0

    async def _count(status):
        r = await db.execute(select(func.count(PublicComplaint.id)).where(PublicComplaint.status == status))
        return r.scalar() or 0

    submitted = await _count("submitted")
    acknowledged = await _count("acknowledged")
    fir_registered = await _count("fir_registered")
    investigating = await _count("investigating")
    resolved = await _count("resolved")
    escalated = await _count("escalated")

    esc_result = await db.execute(
        select(func.count(PublicComplaint.id)).where(PublicComplaint.is_escalated == True)
    )
    escalated_total = esc_result.scalar() or 0

    fir_conversion = round((fir_registered + investigating + resolved) / total * 100, 1) if total else 0

    return {
        "total_complaints": total,
        "by_status": {
            "submitted": submitted,
            "acknowledged": acknowledged,
            "fir_registered": fir_registered,
            "investigating": investigating,
            "resolved": resolved,
            "escalated": escalated,
        },
        "escalated_total": escalated_total,
        "fir_conversion_rate": fir_conversion,
        "pending_action": submitted,
        "transparency_note": (
            "This is a public accountability dashboard. Complaints not acted upon within "
            f"{ESCALATION_DAYS} days are automatically escalated to higher authorities and shown here."
        ),
    }


def check_escalation(complaint: PublicComplaint) -> bool:
    """Determine if a complaint should be auto-escalated."""
    if complaint.status in ("submitted", "acknowledged") and complaint.created_at:
        created = complaint.created_at
        if hasattr(created, "replace"):
            created = created.replace(tzinfo=None)
        days_pending = (datetime.now() - created).days
        return days_pending >= ESCALATION_DAYS
    return False
