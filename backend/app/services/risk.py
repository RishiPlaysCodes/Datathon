"""Risk scoring engine for accused persons."""
from typing import Dict, Any, List
from datetime import datetime, timedelta


def calculate_risk_score(accused, firs) -> Dict[str, Any]:
    """
    Calculate risk score (0-100) with explainable breakdown.
    Weights: 40% history + 25% network centrality + 20% MO escalation + 15% recency
    """
    factors = []

    # 1. Criminal History Score (40% weight)
    history_score = 0
    case_count = accused.total_cases if hasattr(accused, 'total_cases') else len(firs)

    if case_count >= 5:
        history_score = 40
        reason = f"{case_count} prior cases - extensive criminal history"
    elif case_count >= 3:
        history_score = 30
        reason = f"{case_count} prior cases - significant history"
    elif case_count >= 2:
        history_score = 20
        reason = f"{case_count} prior cases - repeat pattern emerging"
    else:
        history_score = 8
        reason = "1 case on record"

    factors.append({
        "name": "Criminal History",
        "weight": 0.40,
        "score": history_score,
        "max_score": 40,
        "reason": reason,
    })

    # 2. Network Centrality Score (25% weight)
    network_score = 0
    gang_id = accused.gang_id if hasattr(accused, 'gang_id') else None

    if gang_id:
        network_score = 20
        reason = f"Affiliated with gang {gang_id}"
    elif case_count > 2:
        network_score = 12
        reason = "Multiple co-accused connections likely"
    else:
        network_score = 5
        reason = "Limited network connections"

    factors.append({
        "name": "Network Centrality",
        "weight": 0.25,
        "score": network_score,
        "max_score": 25,
        "reason": reason,
    })

    # 3. MO Escalation Score (20% weight)
    mo_score = 0
    if firs:
        crime_types = [f.crime_type if hasattr(f, 'crime_type') else f.get("crime_type", "") for f in firs]
        severity_map = {
            "murder": 10, "robbery": 8, "assault": 7, "kidnapping": 8,
            "sexual offense": 9, "drug offense": 6, "burglary": 5,
            "chain snatching": 5, "theft": 3, "fraud": 4, "cyber crime": 4,
            "vehicle theft": 3, "domestic violence": 6,
        }

        # Check for escalation pattern
        max_severity = max(
            (severity_map.get(ct.lower(), 3) for ct in crime_types),
            default=3,
        )

        if max_severity >= 8:
            mo_score = 18
            reason = "Involved in violent/serious offenses"
        elif max_severity >= 6:
            mo_score = 12
            reason = "Moderate severity offenses"
        elif len(set(crime_types)) > 2:
            mo_score = 10
            reason = "Diverse crime portfolio - versatile offender"
        else:
            mo_score = 5
            reason = "Consistent low-severity pattern"
    else:
        mo_score = 3
        reason = "Insufficient data for MO analysis"

    factors.append({
        "name": "MO Escalation",
        "weight": 0.20,
        "score": mo_score,
        "max_score": 20,
        "reason": reason,
    })

    # 4. Recency Score (15% weight)
    recency_score = 0
    if firs:
        dates = []
        for f in firs:
            if hasattr(f, 'date_of_occurrence') and f.date_of_occurrence:
                if isinstance(f.date_of_occurrence, datetime):
                    dates.append(f.date_of_occurrence)
                elif isinstance(f.date_of_occurrence, str):
                    try:
                        dates.append(datetime.fromisoformat(f.date_of_occurrence))
                    except:
                        pass

        if dates:
            most_recent = max(dates)
            days_since = (datetime.now() - most_recent.replace(tzinfo=None)).days

            if days_since <= 30:
                recency_score = 15
                reason = f"Active within last month ({days_since} days ago)"
            elif days_since <= 90:
                recency_score = 12
                reason = f"Active within last 3 months ({days_since} days ago)"
            elif days_since <= 180:
                recency_score = 8
                reason = f"Active within last 6 months"
            else:
                recency_score = 4
                reason = f"Last activity over 6 months ago"
        else:
            recency_score = 5
            reason = "Unable to determine recency"
    else:
        recency_score = 3
        reason = "No recent activity data"

    factors.append({
        "name": "Recency",
        "weight": 0.15,
        "score": recency_score,
        "max_score": 15,
        "reason": reason,
    })

    # Calculate total
    total_score = history_score + network_score + mo_score + recency_score

    # Generate explanation
    if total_score >= 80:
        explanation = (
            f"CRITICAL RISK - Immediate attention required. "
            f"{accused.name} shows extensive criminal history, strong network ties, "
            f"and recent activity suggesting high probability of re-offending."
        )
    elif total_score >= 60:
        explanation = (
            f"HIGH RISK - Enhanced monitoring recommended. "
            f"{accused.name} has significant criminal involvement and active patterns."
        )
    elif total_score >= 40:
        explanation = (
            f"MEDIUM RISK - Standard monitoring. "
            f"{accused.name} shows moderate criminal involvement with some concerning factors."
        )
    else:
        explanation = (
            f"LOW RISK - Routine tracking sufficient. "
            f"{accused.name} has limited criminal involvement and lower re-offending indicators."
        )

    return {
        "total_score": total_score,
        "history_score": history_score,
        "network_score": network_score,
        "mo_escalation_score": mo_score,
        "recency_score": recency_score,
        "explanation": explanation,
        "factors": factors,
        "risk_level": (
            "critical" if total_score >= 80
            else "high" if total_score >= 60
            else "medium" if total_score >= 40
            else "low"
        ),
    }
