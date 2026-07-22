"""AI Investigation Report Generator.

Produces a comprehensive 9-section investigation report for any FIR,
grounded entirely in real database records (similar cases, network links,
hotspot density, financial trails). Every finding is explainable back to
actual FIR numbers and accused records.
"""
import json
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crime import FIR, Accused, FIRAccusedLink, CriminalNetwork, Transaction, Victim
from app.db.stations import KARNATAKA_STATIONS


async def generate_investigation_report(db: AsyncSession, fir: FIR) -> Dict[str, Any]:
    """Generate a full AI investigation report for a given FIR."""

    report = {
        "fir_id": fir.id,
        "fir_number": fir.fir_number,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    # ═══ 1. CASE SUMMARY ═══
    report["case_summary"] = _generate_case_summary(fir)

    # ═══ 2. CRIME CLASSIFICATION ═══
    report["crime_classification"] = {
        "primary_type": fir.crime_type,
        "subtype": fir.crime_subtype,
        "ipc_section": fir.ipc_section,
        "bns_section": fir.bns_section,
        "severity": fir.severity,
        "ai_confidence": fir.ai_confidence or 0.75,
    }

    # ═══ 3. SIMILAR CASES ═══
    report["similar_cases"] = await _find_similar_cases(db, fir)

    # ═══ 4. CRIMINAL NETWORK ANALYSIS ═══
    report["network_analysis"] = await _analyze_network(db, fir)

    # ═══ 5. HOTSPOT ANALYSIS ═══
    report["hotspot_analysis"] = await _analyze_hotspot(db, fir)

    # ═══ 6. RECOMMENDED ACTIONS ═══
    report["recommended_actions"] = _generate_recommendations(fir, report)

    # ═══ 7. PREVENTION MEASURES ═══
    report["prevention_measures"] = _generate_prevention(fir, report)

    # ═══ 8. FINANCIAL TRAIL ═══
    report["financial_trail"] = await _analyze_financial(db, fir)

    # ═══ 9. CYBER CRIME ANALYSIS ═══
    report["cyber_analysis"] = _analyze_cyber(fir)

    report["ai_confidence"] = "High" if len(report["similar_cases"]) >= 2 else "Medium"

    return report


def _generate_case_summary(fir: FIR) -> Dict[str, Any]:
    """Auto-generate a structured case summary."""
    return {
        "incident_date": fir.date_of_occurrence.strftime("%d %B %Y, %I:%M %p") if fir.date_of_occurrence else "Unknown",
        "location": f"{fir.location_name or 'Unknown'}, {fir.district}",
        "zone": fir.zone or "Unknown",
        "crime_type": fir.crime_type,
        "status": fir.status,
        "severity": fir.severity,
        "summary": (
            f"On {fir.date_of_occurrence.strftime('%d %B %Y') if fir.date_of_occurrence else 'an unknown date'}, "
            f"a case of {fir.crime_type} was reported at {fir.location_name or 'an undisclosed location'}, "
            f"{fir.district}. {fir.description[:200]}{'...' if len(fir.description or '') > 200 else ''}"
        ),
        "modus_operandi": fir.modus_operandi or "Not specified",
        "complainant": fir.complainant_name or "Anonymous",
        "investigating_officer": fir.investigating_officer or "To be assigned",
    }


async def _find_similar_cases(db: AsyncSession, fir: FIR) -> List[Dict[str, Any]]:
    """Find similar cases by crime type + location overlap."""
    candidates = (
        await db.execute(
            select(FIR)
            .where(
                FIR.id != fir.id,
                FIR.crime_type == fir.crime_type,
            )
            .order_by(FIR.date_of_occurrence.desc())
            .limit(50)
        )
    ).scalars().all()

    similar = []
    fir_words = set(re.findall(r'\w+', (fir.description or "").lower()))

    for cand in candidates:
        score = 0
        reasons = []

        if cand.location_name == fir.location_name:
            score += 40
            reasons.append("Same location")
        elif cand.zone == fir.zone:
            score += 15
            reasons.append("Same zone")

        cand_words = set(re.findall(r'\w+', (cand.description or "").lower()))
        if fir_words and cand_words:
            overlap = len(fir_words & cand_words) / max(len(fir_words | cand_words), 1)
            if overlap > 0.15:
                score += int(overlap * 30)
                reasons.append(f"MO overlap {int(overlap*100)}%")

        if score >= 20:
            similar.append({
                "fir_number": cand.fir_number,
                "crime_type": cand.crime_type,
                "location": cand.location_name,
                "date": cand.date_of_occurrence.strftime("%d-%m-%Y") if cand.date_of_occurrence else None,
                "status": cand.status,
                "similarity_score": score,
                "reasons": reasons,
                "key_learning": (
                    f"Status: {cand.status.upper()}. "
                    + (f"Location: {cand.location_name}. " if cand.location_name else "")
                    + (f"MO: {cand.modus_operandi[:80]}" if cand.modus_operandi else "")
                ),
            })

    similar.sort(key=lambda x: x["similarity_score"], reverse=True)
    return similar[:5]


async def _analyze_network(db: AsyncSession, fir: FIR) -> Dict[str, Any]:
    """Find linked accused and their network connections."""
    links = (
        await db.execute(select(FIRAccusedLink).where(FIRAccusedLink.fir_id == fir.id))
    ).scalars().all()

    if not links:
        return {"linked_accused": [], "network_connections": [], "gang_involvement": None}

    accused_ids = [l.accused_id for l in links]
    accused_rows = (
        await db.execute(select(Accused).where(Accused.id.in_(accused_ids)))
    ).scalars().all()

    linked_accused = []
    for acc in accused_rows:
        linked_accused.append({
            "id": acc.id,
            "name": acc.name,
            "alias": acc.alias,
            "risk_score": acc.risk_score,
            "is_repeat_offender": acc.is_repeat_offender,
            "total_cases": acc.total_cases,
            "gang_id": acc.gang_id,
        })

    # Find network connections for these accused
    connections = []
    for acc_id in accused_ids:
        nets = (
            await db.execute(
                select(CriminalNetwork).where(
                    (CriminalNetwork.source_accused_id == acc_id) |
                    (CriminalNetwork.target_accused_id == acc_id)
                ).limit(10)
            )
        ).scalars().all()
        for net in nets:
            other_id = net.target_accused_id if net.source_accused_id == acc_id else net.source_accused_id
            if other_id not in accused_ids:
                other = (await db.execute(select(Accused).where(Accused.id == other_id))).scalar_one_or_none()
                if other:
                    connections.append({
                        "name": other.name,
                        "relationship": net.relationship_type,
                        "risk_score": other.risk_score,
                        "total_cases": other.total_cases,
                    })

    gang_ids = [a["gang_id"] for a in linked_accused if a["gang_id"]]

    return {
        "linked_accused": linked_accused,
        "network_connections": connections[:5],
        "gang_involvement": gang_ids[0] if gang_ids else None,
        "total_network_size": len(connections),
    }


async def _analyze_hotspot(db: AsyncSession, fir: FIR) -> Dict[str, Any]:
    """Analyze crime density around this FIR's location."""
    if not fir.location_name:
        return {"is_hotspot": False, "density": "unknown", "message": "Location not specified"}

    date_90 = datetime.now() - timedelta(days=90)
    nearby = (
        await db.execute(
            select(func.count(FIR.id))
            .where(
                FIR.location_name == fir.location_name,
                FIR.date_of_occurrence >= date_90,
            )
        )
    ).scalar() or 0

    # Time pattern
    hour_rows = (
        await db.execute(
            select(FIR.date_of_occurrence)
            .where(
                FIR.location_name == fir.location_name,
                FIR.date_of_occurrence >= date_90,
            )
        )
    ).scalars().all()

    peak_hours = {}
    for dt in hour_rows:
        if dt:
            bucket = f"{(dt.hour // 4) * 4}:00-{((dt.hour // 4) + 1) * 4}:00"
            peak_hours[bucket] = peak_hours.get(bucket, 0) + 1

    peak_window = max(peak_hours.items(), key=lambda x: x[1])[0] if peak_hours else "Unknown"
    density = "HIGH" if nearby >= 10 else "MEDIUM" if nearby >= 5 else "LOW"

    return {
        "is_hotspot": nearby >= 5,
        "density": density,
        "cases_in_90_days": nearby,
        "location": fir.location_name,
        "peak_time_window": peak_window,
        "crime_types_at_location": [],  # could be enriched
    }


def _generate_recommendations(fir: FIR, report: Dict) -> List[Dict[str, str]]:
    """Generate prioritized investigation recommendations."""
    actions = []
    priority = 1

    hotspot = report.get("hotspot_analysis", {})
    network = report.get("network_analysis", {})

    if hotspot.get("peak_time_window") and hotspot["peak_time_window"] != "Unknown":
        actions.append({
            "priority": priority,
            "action": f"Check CCTV footage at {fir.location_name or 'crime location'} during {hotspot['peak_time_window']} window",
            "category": "Evidence Collection",
        })
        priority += 1

    if fir.suspect_description:
        actions.append({
            "priority": priority,
            "action": f"Circulate suspect description to patrol units: {fir.suspect_description[:100]}",
            "category": "Suspect Identification",
        })
        priority += 1

    if network.get("linked_accused"):
        repeat = [a for a in network["linked_accused"] if a["is_repeat_offender"]]
        if repeat:
            actions.append({
                "priority": priority,
                "action": f"Interrogate repeat offender: {repeat[0]['name']} (Risk: {repeat[0]['risk_score']:.0f}/100, {repeat[0]['total_cases']} prior cases)",
                "category": "Suspect Investigation",
            })
            priority += 1

    if fir.financial_loss and fir.transaction_id:
        actions.append({
            "priority": priority,
            "action": f"Trace financial transaction: {fir.transaction_id}. Request bank records immediately.",
            "category": "Financial Investigation",
        })
        priority += 1

    if fir.crime_type in ("cyber crime", "fraud", "phishing"):
        actions.append({
            "priority": priority,
            "action": "Report to CERT-In and request domain/IP takedown if phishing site involved",
            "category": "Cyber Investigation",
        })
        priority += 1

    actions.append({
        "priority": priority,
        "action": "Record witness statements from complainant and any bystanders within 48 hours",
        "category": "Witness Management",
    })
    priority += 1

    if report.get("similar_cases"):
        solved = [c for c in report["similar_cases"] if c["status"] in ("closed", "chargesheeted")]
        if solved:
            actions.append({
                "priority": priority,
                "action": f"Review solved similar case {solved[0]['fir_number']} for investigative leads and MO patterns",
                "category": "Case Linking",
            })

    return actions


def _generate_prevention(fir: FIR, report: Dict) -> List[str]:
    """Generate concrete prevention measures."""
    measures = []
    hotspot = report.get("hotspot_analysis", {})

    if hotspot.get("is_hotspot"):
        measures.append(f"Increase patrol frequency at {fir.location_name} during {hotspot.get('peak_time_window', 'peak hours')}")
        measures.append(f"Install/audit CCTV coverage at {fir.location_name}")

    crime_measures = {
        "chain snatching": ["Deploy plainclothes units on two-wheelers in this area", "Public advisory: avoid displaying gold jewellery while walking alone"],
        "theft": ["Strengthen community watch programs", "Encourage CCTV installation in residential areas"],
        "robbery": ["Station night patrol vehicles near ATMs and isolated stretches", "Coordinate with banks for ATM guard deployment"],
        "cyber crime": ["Run cyber awareness drives targeting the affected demographic", "Coordinate with telecom providers on SIM-swap patterns"],
        "fraud": ["Local-language awareness campaigns on investment/job fraud", "Flag suspicious high-value transactions from this locality"],
        "domestic violence": ["Increase visibility of women's helpline (181)", "Partner with NGOs for early-intervention counselling"],
        "drug offense": ["Coordinate with narcotics cell for targeted surveillance", "School/college outreach in the affected radius"],
    }

    for measure in crime_measures.get(fir.crime_type, ["Increase general patrol visibility", "Community awareness program"]):
        measures.append(measure)

    return measures


async def _analyze_financial(db: AsyncSession, fir: FIR) -> Dict[str, Any]:
    """Analyze financial trail linked to this FIR."""
    if not fir.financial_loss:
        return {"applicable": False, "message": "No financial loss reported in this case"}

    # Check for suspicious transactions linked to accused in this FIR
    links = (await db.execute(select(FIRAccusedLink).where(FIRAccusedLink.fir_id == fir.id))).scalars().all()
    accused_ids = [l.accused_id for l in links]

    transactions = []
    if accused_ids:
        trans_result = (
            await db.execute(
                select(Transaction)
                .where(Transaction.accused_id.in_(accused_ids))
                .order_by(Transaction.timestamp.desc())
                .limit(10)
            )
        ).scalars().all()
        transactions = [
            {
                "from_account": t.from_account,
                "to_account": t.to_account,
                "amount": t.amount,
                "type": t.transaction_type,
                "is_suspicious": t.is_suspicious,
                "date": t.timestamp.strftime("%d-%m-%Y") if t.timestamp else None,
            }
            for t in trans_result
        ]

    return {
        "applicable": True,
        "loss_amount": fir.loss_amount,
        "loss_type": fir.loss_type,
        "transaction_id": fir.transaction_id,
        "suspicious_transactions": transactions,
        "risk_flag": f"Account flagged in {len([t for t in transactions if t['is_suspicious']])} suspicious transactions" if transactions else None,
    }


def _analyze_cyber(fir: FIR) -> Dict[str, Any]:
    """Cyber crime analysis (applicable only for cyber/fraud crimes)."""
    cyber_types = {"cyber crime", "fraud", "phishing", "identity theft"}
    if fir.crime_type not in cyber_types:
        return {"applicable": False, "message": "Not a cyber crime case"}

    # Extract potential indicators from description
    desc = (fir.description or "").lower()
    indicators = []

    if any(w in desc for w in ["link", "url", "website", "http", "bit.ly"]):
        indicators.append({"type": "Malicious URL", "recommendation": "Report domain to CERT-In for takedown"})
    if any(w in desc for w in ["otp", "password", "pin"]):
        indicators.append({"type": "Credential Theft", "recommendation": "Advise victim to change all passwords immediately"})
    if any(w in desc for w in ["whatsapp", "telegram", "call"]):
        indicators.append({"type": "Social Engineering", "recommendation": "Request CDR from telecom provider for suspect's number"})
    if any(w in desc for w in ["upi", "bank", "transfer", "account"]):
        indicators.append({"type": "Financial Fraud", "recommendation": "File freezing request with the receiving bank within golden hour"})
    if any(w in desc for w in ["fake", "impersonat", "pretend"]):
        indicators.append({"type": "Impersonation", "recommendation": "Verify identity through official channels; alert the impersonated entity"})

    if not indicators:
        indicators.append({"type": "General Cyber Offense", "recommendation": "Escalate to Cyber Crime Cell for technical analysis"})

    return {
        "applicable": True,
        "attack_vectors": indicators,
        "recommended_report_to": ["CERT-In", "cybercrime.gov.in", "National Cyber Crime Helpline (1930)"],
    }
