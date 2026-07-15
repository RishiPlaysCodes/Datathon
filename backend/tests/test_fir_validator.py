"""Tests for FIR validation and law detection."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.fir_validator import validate_fir
from app.services.law_data import detect_crime_type, detect_cyber_attack


def test_detect_crime_type_theft():
    assert detect_crime_type("My phone was stolen from my bag") == "theft"


def test_detect_crime_type_chain_snatching():
    assert detect_crime_type("Two men snatched my gold chain") == "chain snatching"


def test_detect_cyber_attack_phishing():
    assert detect_cyber_attack("I clicked a fake link in an email") == "phishing"


def test_detect_cyber_attack_sim_swap():
    assert detect_cyber_attack("My sim suddenly had no signal, sim swap") == "sim_swap"


def test_validate_fir_complete():
    result = validate_fir(
        complaint="Two men on a bike snatched my gold chain near MG Road at 9pm yesterday",
        location="MG Road PS",
    )
    assert result["detected_crime_type"] == "chain snatching"
    assert result["score"] >= 60
    assert result["valid"] is True
    assert len(result["law_references"]) > 0
    assert len(result["suggested_sections"]) > 0


def test_validate_fir_incomplete_flags_warning():
    result = validate_fir(complaint="something bad happened")
    # Vague complaint should lose points for missing elements
    assert result["score"] < 100
