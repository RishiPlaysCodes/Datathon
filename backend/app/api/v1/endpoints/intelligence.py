"""CCTV/IoT Integration + Dark Web Monitoring endpoints."""
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from typing import Optional
import random

from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.get("/cctv-feeds")
async def get_cctv_feeds(user: User = Depends(get_current_user)):
    """Simulated CCTV feed status and detections from connected cameras."""
    cameras = [
        {"id": "CAM-001", "location": "Koramangala 4th Block Junction", "status": "online", "lat": 12.9352, "lng": 77.6245},
        {"id": "CAM-002", "location": "Jayanagar 4th Block Main Road", "status": "online", "lat": 12.9250, "lng": 77.5938},
        {"id": "CAM-003", "location": "MG Road Metro Exit", "status": "online", "lat": 12.9758, "lng": 77.6066},
        {"id": "CAM-004", "location": "Whitefield ITPL Gate", "status": "online", "lat": 12.9698, "lng": 77.7500},
        {"id": "CAM-005", "location": "Electronic City Toll", "status": "offline", "lat": 12.8399, "lng": 77.6770},
        {"id": "CAM-006", "location": "Marathahalli Bridge", "status": "online", "lat": 12.9591, "lng": 77.6974},
        {"id": "CAM-007", "location": "Hebbal Flyover", "status": "online", "lat": 13.0358, "lng": 77.5970},
        {"id": "CAM-008", "location": "Yelahanka Junction", "status": "maintenance", "lat": 13.1005, "lng": 77.5963},
    ]

    # Simulated AI detections from CCTV
    detections = [
        {"camera": "CAM-001", "type": "vehicle", "detail": "Stolen vehicle KA-01-AB-4521 detected (flagged in FIR #KSP/BEN/2026/0045)", "confidence": 87, "time": "2 min ago", "priority": "high"},
        {"camera": "CAM-003", "type": "person", "detail": "Known suspect Ravi Kumar (risk score 89) spotted near MG Road", "confidence": 72, "time": "15 min ago", "priority": "high"},
        {"camera": "CAM-006", "type": "crowd", "detail": "Unusual crowd gathering detected (>20 persons) at Marathahalli Bridge", "confidence": 91, "time": "8 min ago", "priority": "medium"},
        {"camera": "CAM-002", "type": "vehicle", "detail": "Bike without number plate - potential chain snatching risk", "confidence": 65, "time": "22 min ago", "priority": "medium"},
        {"camera": "CAM-007", "type": "anomaly", "detail": "Person loitering near ATM for >30 minutes after hours", "confidence": 78, "time": "5 min ago", "priority": "medium"},
    ]

    return {
        "cameras": cameras,
        "total_cameras": len(cameras),
        "online": sum(1 for c in cameras if c["status"] == "online"),
        "offline": sum(1 for c in cameras if c["status"] != "online"),
        "detections": detections,
        "ai_models": ["Vehicle Recognition (YOLO v8)", "Face Match (ArcFace)", "Crowd Detection", "Anomaly Behavior"],
    }


@router.get("/darkweb")
async def get_darkweb_intelligence(user: User = Depends(get_current_user)):
    """Simulated dark web monitoring intelligence feed."""
    threats = [
        {
            "id": "DW-001",
            "source": "Dark Forum (XSS Market)",
            "type": "data_leak",
            "title": "Karnataka police personnel data leaked",
            "description": "1,200 officer email + phone records posted on underground forum. Source traced to phishing campaign.",
            "severity": "critical",
            "discovered": (datetime.now() - timedelta(hours=6)).isoformat()[:16],
            "status": "investigating",
            "indicators": ["email_dump.txt", "karnataka_police_2026.csv"],
        },
        {
            "id": "DW-002",
            "source": "Telegram Channel",
            "type": "illegal_marketplace",
            "title": "Stolen vehicles for sale - Bangalore listings",
            "description": "Active Telegram group selling stolen two-wheelers with forged RC. 45+ listings this month.",
            "severity": "high",
            "discovered": (datetime.now() - timedelta(hours=18)).isoformat()[:16],
            "status": "monitoring",
            "indicators": ["t.me/blr_bikes_cheap", "UPI: stolen_deals@ybl"],
        },
        {
            "id": "DW-003",
            "source": "Dark Forum (BreachForums)",
            "type": "credential_leak",
            "title": "KSP officer credentials on sale",
            "description": "Login credentials for 3 internal KSP portals being sold for $200 each. Likely from credential stuffing.",
            "severity": "critical",
            "discovered": (datetime.now() - timedelta(hours=2)).isoformat()[:16],
            "status": "active",
            "indicators": ["ksp_portal_access", "ecrime.karnataka.gov.in"],
        },
        {
            "id": "DW-004",
            "source": "Ransomware Leak Site",
            "type": "ransomware",
            "title": "Bangalore hospital patient data threatened",
            "description": "RansomHub claims to have 50GB patient records from a Bangalore hospital. Deadline: 72 hours.",
            "severity": "high",
            "discovered": (datetime.now() - timedelta(hours=12)).isoformat()[:16],
            "status": "escalated",
            "indicators": ["ransomhub.onion", "hospital_data_BLR"],
        },
        {
            "id": "DW-005",
            "source": "Crypto Mixer Analysis",
            "type": "financial",
            "title": "Suspected drug money laundering via crypto",
            "description": "Wallet cluster linked to Bangalore drug ring moving ₹25L through Tornado Cash mixer. Traced via on-chain analysis.",
            "severity": "medium",
            "discovered": (datetime.now() - timedelta(days=1)).isoformat()[:16],
            "status": "monitoring",
            "indicators": ["0x3f8a...b2c1", "tornado_cash_v3"],
        },
    ]

    stats = {
        "total_threats": len(threats),
        "critical": sum(1 for t in threats if t["severity"] == "critical"),
        "high": sum(1 for t in threats if t["severity"] == "high"),
        "monitoring_sources": 12,
        "last_scan": datetime.now().isoformat()[:16],
    }

    return {"threats": threats, "stats": stats}
