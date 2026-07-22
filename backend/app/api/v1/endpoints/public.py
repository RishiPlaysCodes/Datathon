"""Public-facing endpoints: complaint registration, scam detection, case similarity, CCTV suspect match.

These endpoints do NOT require authentication — they are the citizen-facing portal.
"""
import hashlib
import json
import math
import os
import re
import struct
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.crime import FIR, Accused, PublicComplaint, FIRAccusedLink

router = APIRouter(prefix="/public", tags=["Public Portal"])


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PUBLIC COMPLAINT REGISTRATION (with AI classification)
# ═══════════════════════════════════════════════════════════════════════════════

# Indian law patterns for auto-detection
INDIAN_LAWS = {
    "fraud": {
        "ipc": "420 IPC (Cheating and dishonestly inducing delivery of property)",
        "bns": "318 BNS",
        "it_act": "Section 66D IT Act (Cheating by personation using computer resource)",
    },
    "cyber crime": {
        "ipc": "420/468/471 IPC",
        "bns": "318/336/338 BNS",
        "it_act": "Section 43/66/66C/66D IT Act",
    },
    "theft": {
        "ipc": "379/380 IPC (Theft / Theft in dwelling house)",
        "bns": "303/304 BNS",
    },
    "robbery": {
        "ipc": "392/394 IPC (Robbery / Voluntarily causing hurt in committing robbery)",
        "bns": "309/310 BNS",
    },
    "assault": {
        "ipc": "323/325 IPC (Voluntarily causing hurt / grievous hurt)",
        "bns": "115/117 BNS",
    },
    "murder": {
        "ipc": "302 IPC (Murder)",
        "bns": "101 BNS",
    },
    "domestic violence": {
        "ipc": "498A IPC (Cruelty by husband or relatives)",
        "bns": "84/85 BNS",
        "special": "Protection of Women from Domestic Violence Act, 2005",
    },
    "sexual offense": {
        "ipc": "354/376 IPC (Assault / Rape)",
        "bns": "74/63 BNS",
        "special": "POCSO Act (if minor involved)",
    },
    "kidnapping": {
        "ipc": "363/364 IPC (Kidnapping)",
        "bns": "137/138 BNS",
    },
    "drug offense": {
        "special": "NDPS Act, 1985 - Section 20/22/27",
    },
    "vehicle theft": {
        "ipc": "379 IPC (Theft)",
        "bns": "303 BNS",
        "mv_act": "Motor Vehicles Act Section 39",
    },
    "chain snatching": {
        "ipc": "356/379 IPC (Snatching)",
        "bns": "303 BNS",
    },
    "defamation": {
        "ipc": "499/500 IPC (Defamation)",
        "bns": "356 BNS",
        "it_act": "Section 66A IT Act (struck down but relevant context)",
    },
    "harassment": {
        "ipc": "354A/354D IPC (Sexual harassment / Stalking)",
        "bns": "75/78 BNS",
    },
    "data breach": {
        "it_act": "Section 43A/72A IT Act (Data protection failure / Breach of confidentiality)",
        "special": "DPDP Act, 2023",
    },
    "identity theft": {
        "ipc": "419/420 IPC",
        "bns": "317/318 BNS",
        "it_act": "Section 66C IT Act (Identity theft)",
    },
    "phishing": {
        "ipc": "420 IPC",
        "bns": "318 BNS",
        "it_act": "Section 66D IT Act (Cheating by personation)",
    },
}

CRIME_KEYWORDS = {
    "fraud": ["fraud", "scam", "cheat", "fake", "money lost", "investment", "paisa", "thagi", "dhokha", "vanchane"],
    "cyber crime": ["hack", "online", "website", "password", "account", "otp", "link", "phish", "malware"],
    "theft": ["stole", "stolen", "theft", "missing", "chori", "kallatana"],
    "robbery": ["robbed", "robbery", "gunpoint", "knife", "loot", "darode"],
    "assault": ["beat", "attack", "hit", "punch", "injury", "hurt", "maar", "halle"],
    "murder": ["kill", "murder", "dead", "death", "stab", "shot", "katal", "kole"],
    "domestic violence": ["husband", "dowry", "in-laws", "domestic", "wife", "dahej", "torture"],
    "sexual offense": ["rape", "molest", "sexual", "touch", "consent", "atyachara"],
    "kidnapping": ["kidnap", "abduct", "missing child", "ransom", "apahran"],
    "drug offense": ["drug", "ganja", "cocaine", "meth", "heroin", "nasha", "madaka"],
    "vehicle theft": ["car stolen", "bike stolen", "vehicle", "gaadi", "vahana"],
    "chain snatching": ["chain", "gold", "necklace", "snatch", "sarapali"],
    "defamation": ["defam", "reputation", "fake post", "viral", "social media"],
    "harassment": ["stalk", "follow", "harass", "threat", "call", "message"],
    "data breach": ["data leak", "breach", "personal info", "privacy"],
    "identity theft": ["imperson", "identity", "fake account", "my name"],
    "phishing": ["phishing", "fake link", "kyc", "bank link", "click"],
}


def _classify_complaint(description: str) -> Dict[str, Any]:
    """AI-classify a complaint: detect crime type, applicable laws, severity."""
    desc_lower = description.lower()
    scores = {}
    for crime_type, keywords in CRIME_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        if score > 0:
            scores[crime_type] = score

    if not scores:
        return {
            "crime_type": "general complaint",
            "law_sections": [],
            "severity": "low",
            "confidence": 0.3,
            "law_violated": False,
            "advisory": "No specific law violation detected by AI. Your complaint will still be reviewed by officers.",
        }

    best_type = max(scores, key=scores.get)
    confidence = min(0.5 + 0.15 * scores[best_type], 0.95)
    laws = INDIAN_LAWS.get(best_type, {})
    law_sections = [v for v in laws.values()]

    # Severity based on crime type
    critical_types = {"murder", "sexual offense", "kidnapping"}
    high_types = {"robbery", "assault", "domestic violence", "drug offense"}
    if best_type in critical_types:
        severity = "critical"
    elif best_type in high_types:
        severity = "high"
    elif scores[best_type] >= 3:
        severity = "high"
    else:
        severity = "medium"

    return {
        "crime_type": best_type,
        "law_sections": law_sections,
        "severity": severity,
        "confidence": confidence,
        "law_violated": True,
        "advisory": f"AI detected potential '{best_type}' — applicable sections: {', '.join(law_sections)}",
    }


class PublicComplaintRequest(BaseModel):
    complainant_name: str
    complainant_phone: Optional[str] = None
    complainant_email: Optional[str] = None
    description: str
    location_name: Optional[str] = None
    district: Optional[str] = None


class PublicComplaintResponse(BaseModel):
    complaint_number: str
    status: str
    ai_crime_type: Optional[str]
    ai_law_sections: List[str]
    ai_severity: str
    ai_confidence: float
    law_violated: bool
    advisory: str
    message: str


@router.post("/complaint", response_model=PublicComplaintResponse)
async def register_public_complaint(
    complaint: PublicComplaintRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a public complaint (no login required).
    AI auto-classifies crime type and applicable Indian laws.
    Becomes publicly visible after 7 days if unresolved.
    """
    if not complaint.description.strip() or len(complaint.description.strip()) < 20:
        raise HTTPException(status_code=400, detail="Description must be at least 20 characters")
    if not complaint.complainant_name.strip():
        raise HTTPException(status_code=400, detail="Complainant name is required")

    classification = _classify_complaint(complaint.description)
    complaint_number = f"PUB/{datetime.now().strftime('%Y%m%d')}/{uuid.uuid4().hex[:8].upper()}"

    record = PublicComplaint(
        complaint_number=complaint_number,
        complainant_name=complaint.complainant_name.strip(),
        complainant_phone=complaint.complainant_phone,
        complainant_email=complaint.complainant_email,
        description=complaint.description.strip(),
        ai_crime_type=classification["crime_type"],
        ai_law_sections=json.dumps(classification["law_sections"]),
        ai_severity=classification["severity"],
        ai_confidence=classification["confidence"],
        law_violated=classification["law_violated"],
        location_name=complaint.location_name,
        district=complaint.district or "Bengaluru Urban",
        status="pending",
    )
    db.add(record)
    await db.commit()

    return PublicComplaintResponse(
        complaint_number=complaint_number,
        status="pending",
        ai_crime_type=classification["crime_type"],
        ai_law_sections=classification["law_sections"],
        ai_severity=classification["severity"],
        ai_confidence=classification["confidence"],
        law_violated=classification["law_violated"],
        advisory=classification["advisory"],
        message="Your complaint has been registered. Police will review within 7 days. "
                "If unresolved, it will become publicly visible (without personal details).",
    )


@router.get("/complaints")
async def list_public_complaints(
    db: AsyncSession = Depends(get_db),
):
    """List complaints that are publicly visible (unresolved after 7 days)."""
    seven_days_ago = datetime.now() - timedelta(days=7)
    result = await db.execute(
        select(PublicComplaint)
        .where(
            and_(
                PublicComplaint.submitted_at <= seven_days_ago,
                PublicComplaint.status.in_(["pending", "under_review"]),
            )
        )
        .order_by(PublicComplaint.submitted_at.desc())
        .limit(50)
    )
    complaints = result.scalars().all()
    return [
        {
            "complaint_number": c.complaint_number,
            "description": c.description,
            "ai_crime_type": c.ai_crime_type,
            "ai_severity": c.ai_severity,
            "location_name": c.location_name,
            "district": c.district,
            "status": c.status,
            "submitted_at": c.submitted_at.isoformat() if c.submitted_at else None,
            # NO personal info (phone/email/name) in public view
        }
        for c in complaints
    ]


@router.get("/complaint/{complaint_number:path}")
async def track_complaint(
    complaint_number: str,
    db: AsyncSession = Depends(get_db),
):
    """Track a complaint by its number (shows status to the complainant)."""
    result = await db.execute(
        select(PublicComplaint).where(PublicComplaint.complaint_number == complaint_number)
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "complaint_number": complaint.complaint_number,
        "status": complaint.status,
        "ai_crime_type": complaint.ai_crime_type,
        "ai_severity": complaint.ai_severity,
        "submitted_at": complaint.submitted_at.isoformat() if complaint.submitted_at else None,
        "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. SCAM DETECTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

SCAM_PATTERNS = {
    "otp_fraud": {
        "keywords": ["otp", "one time password", "share otp", "verify otp", "send code", "verification code"],
        "description": "OTP/Verification Code Fraud",
        "advisory": "NEVER share OTP with anyone. Banks/companies will never ask for OTP over call/message.",
    },
    "phishing": {
        "keywords": ["click link", "kyc", "update kyc", "account blocked", "verify account", "suspended",
                     "click here", "https://bit.ly", "tinyurl", "short link"],
        "description": "Phishing Attack (Fake link/website)",
        "advisory": "Do NOT click unknown links. Verify directly from official app/website. Report to cybercrime.gov.in",
    },
    "job_scam": {
        "keywords": ["job offer", "work from home", "earn money", "part time", "data entry",
                     "registration fee", "joining fee", "deposit", "investment return"],
        "description": "Fake Job/Investment Scam",
        "advisory": "Legitimate companies never ask for money to give a job. Report at cybercrime.gov.in",
    },
    "impersonation": {
        "keywords": ["police", "cbi", "income tax", "arrest warrant", "digital arrest",
                     "courier seized", "narcotics found", "parcel", "customs"],
        "description": "Government/Authority Impersonation Scam",
        "advisory": "No govt agency arrests via video call or demands money. Hang up and call 1930 (Cyber helpline).",
    },
    "lottery_prize": {
        "keywords": ["lottery", "winner", "prize", "congratulations", "you won", "claim",
                     "lucky draw", "reward", "gift card"],
        "description": "Lottery/Prize Scam",
        "advisory": "You cannot win a lottery you never entered. This is 100% fraud. Do not pay any 'processing fee'.",
    },
    "loan_fraud": {
        "keywords": ["instant loan", "pre-approved", "low interest", "no documents",
                     "processing charge", "loan app", "emi"],
        "description": "Fake Loan/Lending App Fraud",
        "advisory": "Only take loans from RBI-registered NBFCs/banks. Fake loan apps steal data and extort.",
    },
    "romance_scam": {
        "keywords": ["love", "relationship", "foreign", "army", "soldier", "send money",
                     "western union", "gift", "meet you", "visa"],
        "description": "Romance/Dating Scam",
        "advisory": "Never send money to someone you haven't met in person. This is a common international fraud.",
    },
    "tech_support": {
        "keywords": ["tech support", "your computer", "virus detected", "microsoft",
                     "remote access", "anydesk", "teamviewer"],
        "description": "Tech Support Scam (Remote Access Fraud)",
        "advisory": "Microsoft/Apple will never call you unsolicited. Do NOT install remote access apps for strangers.",
    },
    "sextortion": {
        "keywords": ["video call", "screenshot", "nude", "viral", "pay money", "bitcoin",
                     "expose", "recording", "compromising"],
        "description": "Sextortion/Blackmail",
        "advisory": "Do NOT pay — it never stops. Block the person. Report to police and cybercrime.gov.in immediately.",
    },
    "upi_fraud": {
        "keywords": ["upi", "google pay", "phonepe", "paytm", "payment request",
                     "collect request", "scan qr", "refund", "cashback"],
        "description": "UPI/Digital Payment Fraud",
        "advisory": "You receive money by giving UPI ID, NOT by scanning QR or approving collect requests. Reject unknown requests.",
    },
}


class ScamDetectionRequest(BaseModel):
    content: str  # The message/email/transcript to analyze
    source: Optional[str] = "unknown"  # whatsapp, email, sms, call_transcript


class ScamDetectionResponse(BaseModel):
    is_scam: bool
    scam_type: Optional[str]
    scam_description: Optional[str]
    confidence: float
    risk_level: str
    matched_patterns: List[str]
    advisory: str
    recommended_actions: List[str]
    report_links: List[str]


@router.post("/scam-detect", response_model=ScamDetectionResponse)
async def detect_scam(request: ScamDetectionRequest):
    """Analyze a message/email/call transcript for scam indicators."""
    if not request.content.strip() or len(request.content.strip()) < 5:
        raise HTTPException(status_code=400, detail="Content must be at least 5 characters")

    content_lower = request.content.lower()
    matches = {}

    for scam_type, data in SCAM_PATTERNS.items():
        hits = [kw for kw in data["keywords"] if kw in content_lower]
        if hits:
            matches[scam_type] = {"hits": hits, "count": len(hits), **data}

    if not matches:
        return ScamDetectionResponse(
            is_scam=False,
            scam_type=None,
            scam_description=None,
            confidence=0.15,
            risk_level="low",
            matched_patterns=[],
            advisory="No known scam patterns detected. However, always stay cautious with unknown contacts.",
            recommended_actions=["Stay vigilant", "Never share OTP or personal details"],
            report_links=["https://cybercrime.gov.in", "Helpline: 1930"],
        )

    best_scam = max(matches, key=lambda k: matches[k]["count"])
    best_data = matches[best_scam]
    total_hits = sum(m["count"] for m in matches.values())
    confidence = min(0.5 + 0.12 * total_hits, 0.98)
    is_scam = confidence >= 0.55

    return ScamDetectionResponse(
        is_scam=is_scam,
        scam_type=best_scam,
        scam_description=best_data["description"],
        confidence=round(confidence, 3),
        risk_level="critical" if confidence >= 0.85 else "high" if confidence >= 0.65 else "medium",
        matched_patterns=best_data["hits"][:5],
        advisory=best_data["advisory"],
        recommended_actions=[
            "Do NOT respond or click any links",
            "Block the sender immediately",
            "Report to Cyber Crime helpline 1930",
            "File complaint at cybercrime.gov.in",
            f"Save evidence (screenshot the {request.source} message)",
        ],
        report_links=[
            "https://cybercrime.gov.in",
            "National Cyber Crime Helpline: 1930",
            "Karnataka Cyber Crime: 080-22942475",
        ],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 3. CASE SIMILARITY ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/case-similarity/{fir_id}")
async def find_similar_cases(
    fir_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Find cases similar to a given FIR based on crime type, location, MO, and time patterns."""
    result = await db.execute(select(FIR).where(FIR.id == fir_id))
    source_fir = result.scalar_one_or_none()
    if not source_fir:
        raise HTTPException(status_code=404, detail="FIR not found")

    # Fetch candidate FIRs (same crime type or district, excluding self)
    candidates_q = select(FIR).where(
        FIR.id != fir_id,
        (FIR.crime_type == source_fir.crime_type) | (FIR.district == source_fir.district),
    ).limit(200)
    candidates = (await db.execute(candidates_q)).scalars().all()

    similarities = []
    source_desc = (source_fir.description or "").lower()
    source_mo = (source_fir.modus_operandi or "").lower()
    source_words = set(re.findall(r'\w+', source_desc + " " + source_mo))

    for candidate in candidates:
        score = 0.0
        reasons = []

        # Crime type match (40%)
        if candidate.crime_type == source_fir.crime_type:
            score += 40
            reasons.append(f"Same crime type: {candidate.crime_type}")

        # Location proximity (25%)
        if candidate.location_name and source_fir.location_name:
            if candidate.location_name == source_fir.location_name:
                score += 25
                reasons.append(f"Same location: {candidate.location_name}")
            elif candidate.district == source_fir.district:
                score += 12
                reasons.append(f"Same district: {candidate.district}")

        # MO similarity by keyword overlap (25%)
        cand_desc = (candidate.description or "").lower()
        cand_mo = (candidate.modus_operandi or "").lower()
        cand_words = set(re.findall(r'\w+', cand_desc + " " + cand_mo))
        if source_words and cand_words:
            overlap = len(source_words & cand_words) / max(len(source_words | cand_words), 1)
            mo_score = overlap * 25
            score += mo_score
            if mo_score > 5:
                reasons.append(f"Modus operandi overlap: {int(overlap * 100)}%")

        # Time proximity (10%)
        if candidate.date_of_occurrence and source_fir.date_of_occurrence:
            days_diff = abs((candidate.date_of_occurrence - source_fir.date_of_occurrence).days)
            if days_diff <= 7:
                score += 10
                reasons.append("Within same week")
            elif days_diff <= 30:
                score += 6
                reasons.append("Within same month")
            elif days_diff <= 90:
                score += 3

        if score >= 20:
            similarities.append({
                "fir_id": candidate.id,
                "fir_number": candidate.fir_number,
                "crime_type": candidate.crime_type,
                "location_name": candidate.location_name,
                "district": candidate.district,
                "date_of_occurrence": candidate.date_of_occurrence.isoformat() if candidate.date_of_occurrence else None,
                "status": candidate.status,
                "description_preview": (candidate.description or "")[:150],
                "similarity_score": round(score, 1),
                "reasons": reasons,
            })

    similarities.sort(key=lambda x: x["similarity_score"], reverse=True)
    return {
        "source_fir": {
            "id": source_fir.id,
            "fir_number": source_fir.fir_number,
            "crime_type": source_fir.crime_type,
            "location_name": source_fir.location_name,
        },
        "similar_cases": similarities[:limit],
        "total_matches": len(similarities),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. CCTV SUSPECT FACE MATCHING
# ═══════════════════════════════════════════════════════════════════════════════

# Simulated face-feature extraction: in production this would use a face
# recognition model (e.g. InsightFace, dlib). Here we deterministically derive
# "features" from image bytes so that the same image always produces the same
# match, and different images produce different matches — making the feature
# demonstrable and auditable.

def _extract_face_features(image_bytes: bytes) -> List[float]:
    """Deterministic pseudo-feature vector from image content (128-dim)."""
    h = hashlib.sha256(image_bytes).digest()
    features = []
    for i in range(0, 128, 4):
        idx = i % len(h)
        val = (h[idx] + h[(idx + 1) % len(h)]) / 512.0  # normalize to 0-1
        features.append(round(val, 4))
    return features


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a)) or 1
    mag_b = math.sqrt(sum(x * x for x in b)) or 1
    return dot / (mag_a * mag_b)


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


@router.post("/cctv-match")
async def cctv_suspect_match(
    file: UploadFile = File(..., description="CCTV frame or suspect image"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CCTV frame/suspect image and match against the accused database.

    Uses deterministic feature extraction + cosine similarity for demo.
    In production, this would use InsightFace/ArcFace for real face recognition.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported image type. Allowed: {', '.join(IMAGE_EXTENSIONS)}")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    # Extract features from uploaded image
    upload_features = _extract_face_features(file_bytes)

    # Load accused and generate their "enrolled" features (deterministic from name+id)
    accused_result = await db.execute(select(Accused).limit(100))
    accused_list = accused_result.scalars().all()

    matches = []
    for accused in accused_list:
        # Each accused gets a deterministic feature vector based on their identity
        enrolled_bytes = f"accused_{accused.id}_{accused.name}".encode("utf-8")
        enrolled_features = _extract_face_features(enrolled_bytes)
        similarity = _cosine_similarity(upload_features, enrolled_features)

        # Add random-ish variation based on image content interaction with accused
        interaction = hashlib.md5(file_bytes[:1024] + enrolled_bytes).digest()
        bonus = (interaction[0] + interaction[1]) / 1024.0  # 0 to 0.5
        final_score = min(similarity + bonus, 1.0)

        if final_score >= 0.4:
            matches.append({
                "accused_id": accused.id,
                "name": accused.name,
                "alias": accused.alias,
                "confidence": round(final_score, 3),
                "risk_score": accused.risk_score,
                "is_repeat_offender": accused.is_repeat_offender,
                "total_cases": accused.total_cases,
                "gang_id": accused.gang_id,
                "match_level": "high" if final_score >= 0.75 else "medium" if final_score >= 0.55 else "low",
            })

    matches.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "filename": file.filename,
        "file_size": len(file_bytes),
        "total_suspects_scanned": len(accused_list),
        "matches_found": len(matches[:10]),
        "matches": matches[:10],
        "advisory": (
            "HIGH CONFIDENCE matches detected — cross-reference with investigating officer."
            if any(m["confidence"] >= 0.75 for m in matches)
            else "Potential matches found — manual verification required."
            if matches
            else "No matches above threshold in the accused database."
        ),
        "analysis_method": "Feature-based face similarity (demo mode — production uses InsightFace/ArcFace)",
    }
