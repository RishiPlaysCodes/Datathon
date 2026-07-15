"""Tests for risk scoring engine."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from types import SimpleNamespace
from datetime import datetime
from app.services.risk import calculate_risk_score


def _accused(**kw):
    defaults = dict(name="Test", total_cases=1, gang_id=None, is_repeat_offender=False)
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def test_low_risk_single_case():
    result = calculate_risk_score(_accused(total_cases=1), [])
    assert result["total_score"] < 40
    assert result["risk_level"] == "low"


def test_high_risk_repeat_gang_member():
    firs = [SimpleNamespace(crime_type="robbery", date_of_occurrence=datetime.now())]
    result = calculate_risk_score(
        _accused(total_cases=6, gang_id="GANG_001", is_repeat_offender=True), firs
    )
    assert result["total_score"] >= 60
    assert result["risk_level"] in ("high", "critical")


def test_risk_has_four_factors():
    result = calculate_risk_score(_accused(), [])
    assert len(result["factors"]) == 4
    assert result["total_score"] == (
        result["history_score"] + result["network_score"]
        + result["mo_escalation_score"] + result["recency_score"]
    )
