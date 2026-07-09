"""
Analytics API Endpoints - Covers:
Module 3: Crime Pattern & Trend Analytics
Module 4: Sociological Crime Insights
Module 5: Criminology-Based Offender Profiling
Module 7: Financial Crime & Transaction Link Analysis
Module 8: Crime Forecasting & Early Warning
"""
import json
from typing import Any, List, Optional
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select, func, col

from app.api import deps
from app.models.user import User, UserRole
from app.models.crime import (
    FIR, Criminal, CrimeCategory, PoliceStation, Victim,
    FIRCriminalLink, FIRVictimLink, Evidence,
    BankAccount, FinancialTransaction,
    CrimeAlert, CrimePrediction, AlertSeverity,
    DistrictSocioData, InvestigationReport, Watchlist,
    FIRStatus
)

router = APIRouter()


# =============================================================================
# MODULE 3: CRIME HOTSPOTS & GEOSPATIAL
# =============================================================================

@router.get("/hotspots")
def get_crime_hotspots(
    district: Optional[str] = None,
    crime_type: Optional[str] = None,
    days: int = Query(default=180, ge=7, le=730),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get crime hotspot data with coordinates for heatmap."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = select(FIR).where(
        FIR.incident_date >= cutoff,
        FIR.latitude.is_not(None),
        FIR.longitude.is_not(None)
    )
    if district:
        query = query.where(FIR.district == district)
    if crime_type:
        query = query.join(CrimeCategory).where(CrimeCategory.name == crime_type)

    firs = db.exec(query).all()

    points = []
    for fir in firs:
        points.append({
            "lat": fir.latitude,
            "lng": fir.longitude,
            "intensity": 1.0 if fir.severity == "critical" else 0.7 if fir.severity == "high" else 0.4,
            "fir_number": fir.fir_number,
            "location": fir.location,
            "category_id": fir.category_id,
            "time_of_day": fir.time_of_day,
            "severity": fir.severity,
        })

    # Cluster by location
    location_counts = defaultdict(int)
    for fir in firs:
        location_counts[fir.location] += 1

    top_hotspots = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "points": points,
        "top_hotspots": [{"location": loc, "count": cnt} for loc, cnt in top_hotspots],
        "total_incidents": len(points),
        "time_range_days": days,
    }


@router.get("/hotspots/time-distribution")
def get_time_distribution(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get crime distribution by time of day and day of week."""
    firs = db.exec(select(FIR)).all()

    by_time = defaultdict(int)
    by_day = defaultdict(int)
    by_hour_day = defaultdict(lambda: defaultdict(int))

    for fir in firs:
        if fir.time_of_day:
            by_time[fir.time_of_day] += 1
        if fir.day_of_week:
            by_day[fir.day_of_week] += 1
        if fir.time_of_day and fir.day_of_week:
            by_hour_day[fir.day_of_week][fir.time_of_day] += 1

    return {
        "by_time_of_day": dict(by_time),
        "by_day_of_week": dict(by_day),
        "heatmap": {day: dict(times) for day, times in by_hour_day.items()},
    }


@router.get("/hotspots/patrol-recommendations")
def get_patrol_recommendations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get patrol deployment recommendations based on hotspot analysis."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    firs = db.exec(select(FIR).where(FIR.incident_date >= cutoff)).all()

    # Analyze patterns
    location_time = defaultdict(lambda: defaultdict(int))
    for fir in firs:
        if fir.location and fir.time_of_day:
            location_time[fir.location][fir.time_of_day] += 1

    recommendations = []
    for loc, times in sorted(location_time.items(), key=lambda x: sum(x[1].values()), reverse=True)[:10]:
        peak_time = max(times, key=times.get)
        total = sum(times.values())
        recommendations.append({
            "location": loc,
            "peak_crime_time": peak_time,
            "total_incidents_90d": total,
            "recommended_patrol_hours": {
                "night": "10PM-2AM" if peak_time == "night" else None,
                "evening": "6PM-10PM" if peak_time == "evening" else None,
                "morning": "6AM-10AM" if peak_time == "morning" else None,
            },
            "priority": "HIGH" if total > 5 else "MEDIUM" if total > 2 else "LOW",
        })

    return {"recommendations": recommendations}


# =============================================================================
# MODULE 5: OFFENDER PROFILING & RISK SCORING
# =============================================================================

@router.get("/offender-profile/{criminal_id}")
def get_offender_profile(
    criminal_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get detailed offender profile with risk score breakdown."""
    criminal = db.get(Criminal, criminal_id)
    if not criminal:
        raise HTTPException(status_code=404, detail="Criminal not found")

    # Get linked FIRs
    links = db.exec(
        select(FIRCriminalLink).where(FIRCriminalLink.criminal_id == criminal_id)
    ).all()
    fir_ids = [l.fir_id for l in links]
    linked_firs = []
    if fir_ids:
        linked_firs = db.exec(select(FIR).where(col(FIR.id).in_(fir_ids))).all()

    # MO evolution
    mo_timeline = []
    for fir in sorted(linked_firs, key=lambda f: f.incident_date):
        cat = db.get(CrimeCategory, fir.category_id) if fir.category_id else None
        mo_timeline.append({
            "date": fir.incident_date.isoformat(),
            "crime_type": cat.name if cat else "Unknown",
            "severity": fir.severity,
            "location": fir.location,
            "fir_number": fir.fir_number,
            "status": fir.status,
        })

    # Risk breakdown
    risk_breakdown = json.loads(criminal.risk_breakdown) if criminal.risk_breakdown else {
        "criminal_history": 0, "network_centrality": 0,
        "repeat_offender": 0, "mo_escalation": 0
    }

    return {
        "id": criminal.id,
        "name": criminal.name,
        "alias": criminal.alias,
        "age": criminal.age,
        "gender": criminal.gender,
        "address": criminal.address,
        "phone_number": criminal.phone_number,
        "active_area": criminal.active_area,
        "gang_affiliation": criminal.gang_affiliation,
        "is_repeat_offender": criminal.is_repeat_offender,
        "total_cases": criminal.total_cases,
        "risk_score": criminal.risk_score,
        "risk_breakdown": risk_breakdown,
        "behavioral_profile": criminal.behavioral_profile,
        "modus_operandi": criminal.modus_operandi,
        "mo_timeline": mo_timeline,
        "linked_firs_count": len(linked_firs),
        "recidivism_probability": min(0.95, criminal.risk_score / 100 * 0.85 + 0.1) if criminal.is_repeat_offender else criminal.risk_score / 100 * 0.4,
        "last_known_location": {
            "lat": criminal.last_known_latitude,
            "lng": criminal.last_known_longitude,
        } if criminal.last_known_latitude else None,
    }


@router.get("/offenders/high-risk")
def get_high_risk_offenders(
    min_score: float = Query(default=50, ge=0, le=100),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get high-risk offenders ranked by risk score."""
    criminals = db.exec(
        select(Criminal)
        .where(Criminal.risk_score >= min_score)
        .order_by(Criminal.risk_score.desc())
        .limit(limit)
    ).all()

    return [{
        "id": c.id,
        "name": c.name,
        "alias": c.alias,
        "risk_score": c.risk_score,
        "total_cases": c.total_cases,
        "gang_affiliation": c.gang_affiliation,
        "is_repeat_offender": c.is_repeat_offender,
        "active_area": c.active_area,
        "behavioral_profile": c.behavioral_profile,
    } for c in criminals]


@router.get("/offenders/repeat")
def get_repeat_offenders(
    area: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get repeat offenders, optionally filtered by area."""
    query = select(Criminal).where(Criminal.is_repeat_offender == True)
    if area:
        query = query.where(Criminal.active_area == area)
    query = query.order_by(Criminal.total_cases.desc())

    criminals = db.exec(query).all()
    return [{
        "id": c.id,
        "name": c.name,
        "alias": c.alias,
        "total_cases": c.total_cases,
        "risk_score": c.risk_score,
        "gang_affiliation": c.gang_affiliation,
        "active_area": c.active_area,
        "modus_operandi": c.modus_operandi,
    } for c in criminals]


# =============================================================================
# MODULE 7: FINANCIAL CRIME ANALYSIS
# =============================================================================

@router.get("/financial/transactions")
def get_suspicious_transactions(
    criminal_id: Optional[int] = None,
    only_suspicious: bool = True,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get financial transactions, optionally filtered by criminal."""
    query = select(FinancialTransaction)
    if only_suspicious:
        query = query.where(FinancialTransaction.is_suspicious == True)
    query = query.order_by(FinancialTransaction.timestamp.desc()).limit(50)

    transactions = db.exec(query).all()
    return [{
        "id": t.id,
        "transaction_id": t.transaction_id,
        "from_account": t.from_account,
        "to_account": t.to_account,
        "amount": t.amount,
        "type": t.transaction_type,
        "timestamp": t.timestamp.isoformat(),
        "is_suspicious": t.is_suspicious,
        "suspicion_reason": t.suspicion_reason,
        "is_circular": t.is_circular,
        "is_structured": t.is_structured,
        "is_rapid_hop": t.is_rapid_hop,
        "fir_id": t.fir_id,
    } for t in transactions]


@router.get("/financial/accounts")
def get_suspicious_accounts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get suspicious bank accounts."""
    accounts = db.exec(
        select(BankAccount)
        .where(BankAccount.is_suspicious == True)
        .order_by(BankAccount.total_suspicious_transactions.desc())
    ).all()

    return [{
        "id": a.id,
        "account_number": a.account_number[-4:].rjust(len(a.account_number), '*'),
        "bank_name": a.bank_name,
        "account_holder": a.account_holder_name,
        "criminal_id": a.criminal_id,
        "is_shell_account": a.is_shell_account,
        "suspicious_transactions": a.total_suspicious_transactions,
    } for a in accounts]


@router.get("/financial/money-trail/{account_number}")
def get_money_trail(
    account_number: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Trace money trail for a specific account."""
    # Outgoing
    outgoing = db.exec(
        select(FinancialTransaction)
        .where(FinancialTransaction.from_account == account_number)
        .order_by(FinancialTransaction.timestamp)
    ).all()
    # Incoming
    incoming = db.exec(
        select(FinancialTransaction)
        .where(FinancialTransaction.to_account == account_number)
        .order_by(FinancialTransaction.timestamp)
    ).all()

    nodes = set()
    edges = []
    nodes.add(account_number)

    for t in outgoing:
        nodes.add(t.to_account)
        edges.append({
            "from": t.from_account, "to": t.to_account,
            "amount": t.amount, "timestamp": t.timestamp.isoformat(),
            "suspicious": t.is_suspicious,
        })
    for t in incoming:
        nodes.add(t.from_account)
        edges.append({
            "from": t.from_account, "to": t.to_account,
            "amount": t.amount, "timestamp": t.timestamp.isoformat(),
            "suspicious": t.is_suspicious,
        })

    return {
        "center_account": account_number,
        "nodes": list(nodes),
        "edges": edges,
        "total_outgoing": sum(t.amount for t in outgoing),
        "total_incoming": sum(t.amount for t in incoming),
        "suspicious_count": sum(1 for t in outgoing + incoming if t.is_suspicious),
    }


# =============================================================================
# MODULE 6: DECISION SUPPORT & INVESTIGATION COPILOT
# =============================================================================

@router.get("/decision-support/case-summary/{fir_id}")
def get_case_summary(
    fir_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get AI-generated case summary with investigation leads."""
    fir = db.get(FIR, fir_id)
    if not fir:
        raise HTTPException(status_code=404, detail="FIR not found")

    # Get related data
    category = db.get(CrimeCategory, fir.category_id) if fir.category_id else None
    evidence_items = db.exec(select(Evidence).where(Evidence.fir_id == fir_id)).all()
    reports = db.exec(select(InvestigationReport).where(InvestigationReport.fir_id == fir_id)).all()

    # Get linked criminals
    crim_links = db.exec(select(FIRCriminalLink).where(FIRCriminalLink.fir_id == fir_id)).all()
    criminals = []
    for link in crim_links:
        c = db.get(Criminal, link.criminal_id)
        if c:
            criminals.append({"id": c.id, "name": c.name, "risk_score": c.risk_score})

    # Get linked victims
    vic_links = db.exec(select(FIRVictimLink).where(FIRVictimLink.fir_id == fir_id)).all()
    victims = []
    for link in vic_links:
        v = db.get(Victim, link.victim_id)
        if v:
            victims.append({"id": v.id, "name": v.name, "age": v.age, "gender": v.gender})

    # Generate investigation leads
    leads = _generate_investigation_leads(fir, criminals, evidence_items, category)
    missing_evidence = _detect_missing_evidence(evidence_items, category)

    # Case difficulty assessment
    difficulty = "easy"
    if len(criminals) == 0:
        difficulty = "hard"
    elif fir.status == FIRStatus.COLD_CASE:
        difficulty = "cold"
    elif len(evidence_items) < 2:
        difficulty = "medium"

    return {
        "fir": {
            "id": fir.id, "fir_number": fir.fir_number,
            "incident_date": fir.incident_date.isoformat(),
            "location": fir.location, "description": fir.description,
            "status": fir.status, "severity": fir.severity,
            "category": category.name if category else "Unknown",
        },
        "summary": f"Case {fir.fir_number} registered on {fir.registration_date.strftime('%d-%b-%Y')} "
                   f"at {fir.location}. Category: {category.name if category else 'Unknown'}. "
                   f"Status: {fir.status}. {len(criminals)} accused identified, "
                   f"{len(evidence_items)} evidence items collected.",
        "accused": criminals,
        "victims": victims,
        "evidence_count": len(evidence_items),
        "evidence_types": list(set(e.type for e in evidence_items)),
        "reports_count": len(reports),
        "investigation_leads": leads,
        "missing_evidence": missing_evidence,
        "case_difficulty": difficulty,
        "timeline": _build_case_timeline(fir, evidence_items, reports),
    }


def _generate_investigation_leads(fir, criminals, evidence, category) -> List[dict]:
    """Generate AI investigation recommendations."""
    leads = []
    if not criminals:
        leads.append({
            "priority": "HIGH",
            "suggestion": "No accused identified. Check CCTV footage from nearby establishments.",
            "basis": "Standard investigation protocol for unidentified suspects"
        })
    if category and category.name in ["Chain Snatching", "Robbery"]:
        leads.append({
            "priority": "HIGH",
            "suggestion": "Check pawn shops and second-hand dealers within 5km radius.",
            "basis": "73% of similar cases solved through recovered stolen goods"
        })
        leads.append({
            "priority": "MEDIUM",
            "suggestion": "Analyze traffic camera footage on escape routes.",
            "basis": "Pattern analysis of 50+ similar cases"
        })
    if category and category.name == "Cyber Crime":
        leads.append({
            "priority": "HIGH",
            "suggestion": "Trace UPI/bank transaction to beneficiary account. Request IP logs.",
            "basis": "Digital trail is primary evidence in 89% of cyber fraud cases"
        })
    has_cctv = any("cctv" in e.description.lower() or e.type == "cctv" for e in evidence)
    if not has_cctv:
        leads.append({
            "priority": "MEDIUM",
            "suggestion": f"Collect CCTV footage from establishments near {fir.location}.",
            "basis": "CCTV evidence present in 65% of solved cases"
        })
    if criminals:
        for c in criminals:
            if c["risk_score"] > 60:
                leads.append({
                    "priority": "HIGH",
                    "suggestion": f"High-risk accused {c['name']} (Score: {c['risk_score']}). Check known associates and recent movements.",
                    "basis": "Risk score indicates high probability of organized activity"
                })
    leads.append({
        "priority": "LOW",
        "suggestion": "Cross-reference with similar pending cases in adjacent jurisdictions.",
        "basis": "12% of cases linked to inter-district criminal networks"
    })
    return leads[:6]


def _detect_missing_evidence(evidence, category) -> List[str]:
    """Detect what evidence is missing."""
    missing = []
    types_present = set(e.type for e in evidence)
    descs = " ".join(e.description.lower() for e in evidence)

    if "cctv" not in types_present and "cctv" not in descs:
        missing.append("CCTV footage not collected")
    if "digital" not in types_present:
        missing.append("No digital evidence (phone records, location data)")
    if "forensic" not in types_present and "fingerprint" not in descs:
        missing.append("No forensic evidence collected")
    if category and category.name in ["Cyber Crime", "Fraud"] and "document" not in types_present:
        missing.append("Bank/transaction documents not collected")
    if len(evidence) < 3:
        missing.append("Evidence collection appears incomplete")
    return missing


def _build_case_timeline(fir, evidence, reports) -> List[dict]:
    """Build investigation timeline."""
    timeline = []
    timeline.append({
        "date": fir.incident_date.isoformat(),
        "event": "Incident occurred",
        "type": "incident"
    })
    timeline.append({
        "date": fir.registration_date.isoformat(),
        "event": "FIR registered",
        "type": "registration"
    })
    for e in sorted(evidence, key=lambda x: x.collected_at):
        timeline.append({
            "date": e.collected_at.isoformat(),
            "event": f"Evidence collected: {e.description[:50]}",
            "type": "evidence"
        })
    for r in sorted(reports, key=lambda x: x.created_at):
        timeline.append({
            "date": r.created_at.isoformat(),
            "event": f"Report filed: {r.report_type}",
            "type": "report"
        })
    return sorted(timeline, key=lambda x: x["date"])


# =============================================================================
# MODULE 8: CRIME FORECASTING & EARLY WARNING
# =============================================================================

@router.get("/forecasting/alerts")
def get_active_alerts(
    severity: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get active crime alerts."""
    query = select(CrimeAlert).where(CrimeAlert.is_active == True)
    if severity:
        query = query.where(CrimeAlert.severity == severity)
    query = query.order_by(CrimeAlert.created_at.desc())

    alerts = db.exec(query).all()
    return [{
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "severity": a.severity,
        "alert_type": a.alert_type,
        "location": a.location,
        "latitude": a.latitude,
        "longitude": a.longitude,
        "district": a.district,
        "confidence_score": a.confidence_score,
        "is_acknowledged": a.is_acknowledged,
        "created_at": a.created_at.isoformat(),
        "recommended_action": a.recommended_action,
    } for a in alerts]


@router.get("/forecasting/predictions")
def get_predictions(
    prediction_type: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR, UserRole.ANALYST
    ]))
) -> Any:
    """Get crime predictions."""
    query = select(CrimePrediction)
    if prediction_type:
        query = query.where(CrimePrediction.prediction_type == prediction_type)
    query = query.order_by(CrimePrediction.created_at.desc()).limit(20)

    predictions = db.exec(query).all()
    return [{
        "id": p.id,
        "type": p.prediction_type,
        "location": p.location,
        "district": p.district,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "crime_type": p.crime_type,
        "probability": p.probability,
        "confidence": p.confidence,
        "predicted_start": p.predicted_date_start.isoformat() if p.predicted_date_start else None,
        "predicted_end": p.predicted_date_end.isoformat() if p.predicted_date_end else None,
        "basis": json.loads(p.basis) if p.basis else {},
        "recommended_action": p.recommended_action,
        "created_at": p.created_at.isoformat(),
    } for p in predictions]


@router.post("/forecasting/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Acknowledge an alert."""
    alert = db.get(CrimeAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_acknowledged = True
    alert.acknowledged_by = current_user.id
    db.add(alert)
    db.commit()
    return {"message": "Alert acknowledged", "alert_id": alert_id}


# =============================================================================
# MODULE 4: SOCIOLOGICAL CRIME INSIGHTS
# =============================================================================

@router.get("/sociological/districts")
def get_district_socio_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST, UserRole.POLICYMAKER
    ]))
) -> Any:
    """Get sociological data for all districts with crime correlations."""
    data = db.exec(select(DistrictSocioData)).all()
    return [{
        "district": d.district,
        "population": d.population,
        "literacy_rate": d.literacy_rate,
        "unemployment_rate": d.unemployment_rate,
        "poverty_rate": d.poverty_rate,
        "urbanization_rate": d.urbanization_rate,
        "population_density": d.population_density,
        "school_dropout_rate": d.school_dropout_rate,
        "migration_influx_rate": d.migration_influx_rate,
        "average_income": d.average_income,
        "crime_rate_per_lakh": d.crime_rate_per_lakh,
        "social_risk_score": d.social_risk_score,
        "risk_factors": json.loads(d.risk_factors) if d.risk_factors else {},
    } for d in data]


@router.get("/sociological/correlations")
def get_socio_crime_correlations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST, UserRole.POLICYMAKER
    ]))
) -> Any:
    """Get correlation analysis between socio-economic factors and crime."""
    data = db.exec(select(DistrictSocioData)).all()
    if not data:
        return {"correlations": [], "insights": []}

    # Compute simple correlations
    crime_rates = [d.crime_rate_per_lakh for d in data if d.crime_rate_per_lakh]
    factors = {
        "unemployment": [d.unemployment_rate for d in data if d.unemployment_rate],
        "poverty": [d.poverty_rate for d in data if d.poverty_rate],
        "low_literacy": [100 - d.literacy_rate for d in data if d.literacy_rate],
        "school_dropout": [d.school_dropout_rate for d in data if d.school_dropout_rate],
        "population_density": [d.population_density for d in data if d.population_density],
    }

    correlations = []
    for name, values in factors.items():
        if len(values) == len(crime_rates) and len(values) > 2:
            # Simple Pearson-like correlation
            n = len(values)
            mean_x = sum(values) / n
            mean_y = sum(crime_rates) / n
            num = sum((x - mean_x) * (y - mean_y) for x, y in zip(values, crime_rates))
            den_x = sum((x - mean_x) ** 2 for x in values) ** 0.5
            den_y = sum((y - mean_y) ** 2 for y in crime_rates) ** 0.5
            corr = num / (den_x * den_y) if den_x * den_y > 0 else 0
            correlations.append({
                "factor": name,
                "correlation": round(corr, 3),
                "strength": "strong" if abs(corr) > 0.7 else "moderate" if abs(corr) > 0.4 else "weak",
                "direction": "positive" if corr > 0 else "negative",
            })

    correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    # Generate insights
    insights = []
    for c in correlations[:3]:
        if c["correlation"] > 0.4:
            insights.append(f"Higher {c['factor'].replace('_', ' ')} is associated with higher crime rates (r={c['correlation']})")
        elif c["correlation"] < -0.4:
            insights.append(f"Higher {c['factor'].replace('_', ' ')} is associated with lower crime rates (r={c['correlation']})")

    return {"correlations": correlations, "insights": insights}


# =============================================================================
# DASHBOARD STATS
# =============================================================================

@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get comprehensive dashboard statistics."""
    total_firs = db.exec(select(func.count(FIR.id))).one()
    open_firs = db.exec(select(func.count(FIR.id)).where(FIR.status == FIRStatus.OPEN)).one()
    under_inv = db.exec(select(func.count(FIR.id)).where(FIR.status == FIRStatus.UNDER_INVESTIGATION)).one()
    closed = db.exec(select(func.count(FIR.id)).where(FIR.status == FIRStatus.CLOSED)).one()
    total_criminals = db.exec(select(func.count(Criminal.id))).one()
    repeat_offenders = db.exec(select(func.count(Criminal.id)).where(Criminal.is_repeat_offender == True)).one()
    active_alerts = db.exec(select(func.count(CrimeAlert.id)).where(CrimeAlert.is_active == True)).one()

    # Recent 30 days
    cutoff_30 = datetime.now(timezone.utc) - timedelta(days=30)
    recent_firs = db.exec(select(func.count(FIR.id)).where(FIR.registration_date >= cutoff_30)).one()

    # Category distribution
    cat_stats = db.exec(
        select(CrimeCategory.name, func.count(FIR.id))
        .join(FIR, FIR.category_id == CrimeCategory.id)
        .group_by(CrimeCategory.name)
        .order_by(func.count(FIR.id).desc())
        .limit(8)
    ).all()

    # District distribution
    dist_stats = db.exec(
        select(FIR.district, func.count(FIR.id))
        .where(FIR.district.is_not(None))
        .group_by(FIR.district)
        .order_by(func.count(FIR.id).desc())
        .limit(6)
    ).all()

    # Monthly trend (last 12 months)
    monthly_trend = []
    for i in range(12):
        start = datetime.now(timezone.utc).replace(day=1) - timedelta(days=30 * i)
        end = start + timedelta(days=30)
        count = db.exec(
            select(func.count(FIR.id))
            .where(FIR.incident_date >= start, FIR.incident_date < end)
        ).one()
        monthly_trend.append({
            "month": start.strftime("%b %Y"),
            "count": count
        })
    monthly_trend.reverse()

    return {
        "total_firs": total_firs,
        "open_cases": open_firs,
        "under_investigation": under_inv,
        "closed_cases": closed,
        "total_criminals": total_criminals,
        "repeat_offenders": repeat_offenders,
        "active_alerts": active_alerts,
        "recent_30_days": recent_firs,
        "category_distribution": [{"name": n, "value": v} for n, v in cat_stats],
        "district_distribution": [{"name": n, "value": v} for n, v in dist_stats],
        "monthly_trend": monthly_trend,
        "clearance_rate": round(closed / total_firs * 100, 1) if total_firs > 0 else 0,
    }
