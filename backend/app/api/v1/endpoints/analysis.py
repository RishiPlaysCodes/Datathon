"""Analysis endpoints: financial, sociological, similar cases, FIR validation, forensics, patrol."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.services.analysis import (
    get_financial_analysis, get_sociological_analysis,
    find_similar_cases, get_patrol_plan,
)
from app.services.fir_validator import validate_fir
from app.services.law_data import CYBER_ATTACKS, detect_cyber_attack, detect_cyber_attacks_multi

router = APIRouter(prefix="/analysis", tags=["Analysis"])


class FIRValidateRequest(BaseModel):
    complaint: str
    crime_type: Optional[str] = ""
    location: Optional[str] = ""
    sections: Optional[str] = ""


class CyberRequest(BaseModel):
    complaint: str
    attack_type: Optional[str] = ""


@router.get("/financial")
async def financial(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Financial crime analysis from real transaction data."""
    return await get_financial_analysis(db)


@router.get("/sociological")
async def sociological(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Sociological insights correlating crime with socio-economic data."""
    return await get_sociological_analysis(db)


@router.get("/similar-cases/{fir_id}")
async def similar_cases(fir_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Find similar past cases for a given FIR."""
    return await find_similar_cases(db, fir_id)


@router.get("/patrol")
async def patrol(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """AI patrol deployment plan from real hotspot data."""
    return await get_patrol_plan(db)


@router.post("/validate-fir")
async def validate_fir_endpoint(req: FIRValidateRequest, user: User = Depends(get_current_user)):
    """Validate an FIR against Indian law (BNS/IPC/IT Act/BNSS)."""
    return validate_fir(req.complaint, req.crime_type or "", req.location or "", req.sections or "")


@router.post("/cyber-forensics")
async def cyber_forensics(req: CyberRequest, user: User = Depends(get_current_user)):
    """Detect cyber attack method and return forensic guidance. Supports mixed attacks."""
    from app.services.law_data import detect_cyber_attacks_multi
    multi = detect_cyber_attacks_multi(req.complaint)

    # Use explicitly selected type, or detected primary
    attack_key = req.attack_type or multi["primary"]
    attack = CYBER_ATTACKS.get(attack_key)

    # If unknown attack type (no keywords matched)
    if not attack:
        return {
            "detected_attack": "unknown",
            "analysis": None,
            "multi_detection": multi,
            "all_types": list(CYBER_ATTACKS.keys()),
            "message": "Could not identify the attack method from the description. Please select manually or provide more details.",
        }

    # Build secondary attack info if mixed
    secondary_info = None
    if multi.get("is_mixed_attack") and multi.get("secondary"):
        sec_key = multi["secondary"]
        sec_attack = CYBER_ATTACKS.get(sec_key)
        if sec_attack:
            secondary_info = {"key": sec_key, "name": sec_attack["name"], "description": sec_attack["description"]}

    return {
        "detected_attack": attack_key,
        "analysis": attack,
        "multi_detection": multi,
        "secondary_attack": secondary_info,
        "all_types": list(CYBER_ATTACKS.keys()),
    }
