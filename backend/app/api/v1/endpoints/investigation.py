"""Investigation tools: evidence upload, checklist, officer notes."""
import base64
import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.crime import FIR, Evidence, InvestigationChecklist, OfficerNote
from app.api.deps import require_role

router = APIRouter(prefix="/investigation", tags=["Investigation Tools"])

ALLOWED_EVIDENCE_TYPES = {".jpg", ".jpeg", ".png", ".gif", ".mp4", ".avi", ".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Default checklist items for a new FIR
DEFAULT_CHECKLIST = [
    "FIR copy served to complainant",
    "Crime scene visit and panchanama prepared",
    "Photographs/video of crime scene taken",
    "CCTV footage collected from nearby cameras",
    "Witness statements recorded (Section 161 CrPC)",
    "Medical examination of victim (if applicable)",
    "Evidence sent to Forensic Science Lab (FSL)",
    "Suspect identified and lookout notice issued",
    "Arrest made / Non-bailable warrant issued",
    "Charge sheet prepared and filed in court",
]


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE UPLOAD
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/firs/{fir_id}/evidence")
async def upload_evidence(
    fir_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = None,
    file_type: Optional[str] = "photo",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Upload evidence file to a FIR. Max 10MB, supported: JPG/PNG/MP4/PDF/DOC."""
    # Validate FIR exists
    fir = (await db.execute(select(FIR).where(FIR.id == fir_id))).scalar_one_or_none()
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EVIDENCE_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EVIDENCE_TYPES)}")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # Check max 5 evidence per FIR
    count = (await db.execute(select(func.count(Evidence.id)).where(Evidence.fir_id == fir_id))).scalar() or 0
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 evidence files per FIR reached")

    # Store as base64 (SQLite doesn't have blob-friendly large object storage)
    file_b64 = base64.b64encode(file_bytes).decode("ascii")

    evidence = Evidence(
        fir_id=fir_id,
        filename=file.filename,
        file_type=file_type or "photo",
        file_size=len(file_bytes),
        mime_type=file.content_type,
        description=description,
        uploaded_by=current_user.id,
        uploaded_by_name=current_user.full_name,
        file_data=file_b64,
        chain_of_custody=json.dumps([{
            "action": "uploaded",
            "by": current_user.full_name,
            "at": datetime.now().isoformat(),
        }]),
    )
    db.add(evidence)
    await db.commit()

    return {
        "id": evidence.id,
        "filename": evidence.filename,
        "file_type": evidence.file_type,
        "file_size": evidence.file_size,
        "uploaded_by": evidence.uploaded_by_name,
        "created_at": evidence.created_at.isoformat() if evidence.created_at else None,
    }


@router.get("/firs/{fir_id}/evidence")
async def list_evidence(
    fir_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """List all evidence for a FIR (without file data — use /evidence/{id} to download)."""
    results = (
        await db.execute(select(Evidence).where(Evidence.fir_id == fir_id).order_by(Evidence.created_at))
    ).scalars().all()

    return [
        {
            "id": e.id,
            "filename": e.filename,
            "file_type": e.file_type,
            "file_size": e.file_size,
            "mime_type": e.mime_type,
            "description": e.description,
            "uploaded_by": e.uploaded_by_name,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in results
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION CHECKLIST
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/firs/{fir_id}/checklist")
async def get_checklist(
    fir_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get investigation checklist for a FIR. Auto-creates default items if none exist."""
    items = (
        await db.execute(
            select(InvestigationChecklist)
            .where(InvestigationChecklist.fir_id == fir_id)
            .order_by(InvestigationChecklist.order_index)
        )
    ).scalars().all()

    # Auto-create default checklist if empty
    if not items:
        fir = (await db.execute(select(FIR).where(FIR.id == fir_id))).scalar_one_or_none()
        if not fir:
            raise HTTPException(status_code=404, detail="FIR not found")

        for i, text in enumerate(DEFAULT_CHECKLIST):
            item = InvestigationChecklist(fir_id=fir_id, item_text=text, order_index=i)
            db.add(item)
        await db.commit()

        items = (
            await db.execute(
                select(InvestigationChecklist)
                .where(InvestigationChecklist.fir_id == fir_id)
                .order_by(InvestigationChecklist.order_index)
            )
        ).scalars().all()

    completed = sum(1 for i in items if i.is_completed)
    total = len(items)

    return {
        "fir_id": fir_id,
        "total_items": total,
        "completed_items": completed,
        "progress_pct": round(completed / total * 100) if total else 0,
        "items": [
            {
                "id": item.id,
                "text": item.item_text,
                "is_completed": item.is_completed,
                "completed_by": item.completed_by,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                "notes": item.notes,
            }
            for item in items
        ],
    }


class ChecklistUpdateRequest(BaseModel):
    is_completed: bool
    notes: Optional[str] = None


@router.patch("/checklist/{item_id}")
async def update_checklist_item(
    item_id: int,
    update: ChecklistUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Mark a checklist item as completed/uncompleted."""
    item = (await db.execute(select(InvestigationChecklist).where(InvestigationChecklist.id == item_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    item.is_completed = update.is_completed
    item.completed_by = current_user.full_name if update.is_completed else None
    item.completed_at = datetime.now() if update.is_completed else None
    if update.notes:
        item.notes = update.notes
    await db.commit()

    return {"id": item.id, "is_completed": item.is_completed, "completed_by": item.completed_by}


# ═══════════════════════════════════════════════════════════════════════════════
# OFFICER NOTES
# ═══════════════════════════════════════════════════════════════════════════════

class NoteRequest(BaseModel):
    content: str
    note_type: Optional[str] = "general"


@router.post("/firs/{fir_id}/notes")
async def add_officer_note(
    fir_id: int,
    note: NoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Add an officer note to a FIR."""
    fir = (await db.execute(select(FIR).where(FIR.id == fir_id))).scalar_one_or_none()
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")

    if not note.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    officer_note = OfficerNote(
        fir_id=fir_id,
        user_id=current_user.id,
        officer_name=current_user.full_name,
        officer_role=current_user.role,
        content=note.content.strip(),
        note_type=note.note_type or "general",
    )
    db.add(officer_note)
    await db.commit()

    return {
        "id": officer_note.id,
        "officer_name": officer_note.officer_name,
        "content": officer_note.content,
        "note_type": officer_note.note_type,
        "created_at": officer_note.created_at.isoformat() if officer_note.created_at else None,
    }


@router.get("/firs/{fir_id}/notes")
async def get_officer_notes(
    fir_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
):
    """Get all officer notes for a FIR, newest first."""
    notes = (
        await db.execute(
            select(OfficerNote)
            .where(OfficerNote.fir_id == fir_id)
            .order_by(OfficerNote.created_at.desc())
        )
    ).scalars().all()

    return [
        {
            "id": n.id,
            "officer_name": n.officer_name,
            "officer_role": n.officer_role,
            "content": n.content,
            "note_type": n.note_type,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]
