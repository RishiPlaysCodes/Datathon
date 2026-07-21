"""Tamper-evident audit-log writer."""
import asyncio
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import compute_audit_hash
from app.models.user import AuditLog, User

# Uvicorn runs one worker in AppSail. Serializing and committing each append
# prevents concurrent requests in that worker from creating a forked chain.
_audit_lock = asyncio.Lock()


async def record_audit_event(
    db: AsyncSession,
    user: User,
    action: str,
    *,
    details: Optional[str] = None,
    query_text: Optional[str] = None,
    risk_level: str = "low",
) -> AuditLog:
    """Atomically append an event whose hash covers its complete payload."""
    async with _audit_lock:
        result = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
        previous = result.scalar_one_or_none()
        previous_hash = previous.entry_hash if previous else "GENESIS"
        timestamp = datetime.utcnow()
        timestamp_text = timestamp.isoformat(timespec="microseconds")
        entry_hash = compute_audit_hash(
            previous_hash,
            action,
            str(user.id),
            timestamp_text,
            username=user.username,
            details=details,
            query_text=query_text,
            risk_level=risk_level,
        )

        event = AuditLog(
            user_id=user.id,
            username=user.username,
            action=action,
            details=details,
            query_text=query_text,
            risk_level=risk_level,
            timestamp=timestamp,
            previous_hash=previous_hash,
            entry_hash=entry_hash,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event
