"""Tests for intent classification and filter extraction."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.intent import classify_intent, extract_filters


def test_search_firs_intent():
    result = classify_intent("Show theft cases in Koramangala")
    assert result["intent"] == "search_firs"
    assert result["filters"]["crime_type"] == "theft"
    assert result["filters"]["location"] == "Koramangala"


def test_multiple_crime_types():
    filters = extract_filters("show theft and robbery cases")
    assert "crime_types" in filters
    assert "theft" in filters["crime_types"]
    assert "robbery" in filters["crime_types"]


def test_absolute_date_after():
    filters = extract_filters("show theft cases after july 2026")
    assert filters.get("has_absolute_date") is True
    assert "date_from" in filters


def test_unknown_crime_type_flagged():
    filters = extract_filters("show alien attack cases")
    assert "unknown_crime_type" in filters


def test_confidence_is_consistent():
    r1 = classify_intent("Show theft cases in Koramangala")
    r2 = classify_intent("Show theft cases in Koramangala")
    assert r1["confidence"] == r2["confidence"]
