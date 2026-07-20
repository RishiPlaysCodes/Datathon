"""Tests for NL2SQL engine - validates generated SQL is correct and safe."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.nl2sql import generate_sql
from app.services.intent import classify_intent


def test_theft_query_generates_valid_sql():
    intent_result = classify_intent("Show theft cases in Koramangala last 3 months")
    result = generate_sql(intent_result["intent"], intent_result["filters"])
    assert result["is_valid"] is True
    assert "SELECT" in result["sql"]
    assert "firs" in result["sql"]
    assert ":crime_type" in result["sql"]
    assert result["parameters"]["crime_type"] == "%theft%"


def test_accused_search_sql():
    intent_result = classify_intent("Who is accused Ravi Kumar")
    result = generate_sql(intent_result["intent"], intent_result["filters"])
    assert result["is_valid"] is True
    assert "accused" in result["sql"]


def test_hotspot_query_generates_sql():
    intent_result = classify_intent("Show crime hotspots")
    result = generate_sql("hotspot_analysis", intent_result["filters"])
    assert "GROUP BY" in result["sql"]
    assert "COUNT" in result["sql"]


def test_no_raw_user_input_in_sql():
    """Security: user input must only appear as parameters, never in SQL string."""
    intent_result = classify_intent("Show theft'; DROP TABLE firs;-- cases")
    result = generate_sql(intent_result["intent"], intent_result["filters"])
    # The actual SQL should NOT contain the injection attempt
    assert "DROP TABLE" not in result["sql"]
    assert result["is_valid"] is True


def test_statistics_query():
    result = generate_sql("statistics", {"days": 90})
    assert "GROUP BY crime_type" in result["sql"]


def test_security_note_present():
    result = generate_sql("search_firs", {"days": 90})
    assert "security_note" in result
    assert "parameterized" in result["security_note"].lower()
