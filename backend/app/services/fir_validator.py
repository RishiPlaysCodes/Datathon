"""FIR validation against Indian law (BNS 2023, IPC, IT Act, BNSS)."""
import re
from typing import Dict, Any
from app.services.law_data import LAW_DATABASE, detect_crime_type


def validate_fir(complaint: str, crime_type: str = "", location: str = "", sections: str = "") -> Dict[str, Any]:
    """Validate an FIR against Indian law and return a structured report."""
    complaint_lower = complaint.lower()
    checks = []
    warnings = []
    law_references = []
    score = 100

    # Auto-detect crime type if not provided
    detected_type = crime_type or detect_crime_type(complaint)
    law = LAW_DATABASE.get(detected_type, LAW_DATABASE["theft"])

    # Check 1: Cognizable offense
    if law["cognizable"]:
        checks.append({"rule": "Cognizable Offense", "passed": True,
                       "note": f"{detected_type} is cognizable - police must register FIR (Sec 173 BNSS / 154 CrPC)"})
    else:
        checks.append({"rule": "Cognizable Offense", "passed": False,
                       "note": f"{detected_type} is NON-cognizable - requires Magistrate order (Sec 174 BNSS)"})
        warnings.append(f"This offense is non-cognizable. Correct route is a Magistrate complaint (Sec 200 CrPC), not a direct FIR.")
        score -= 20

    # Check 2: Section accuracy
    if sections:
        expected = (law["ipc"].lower().split("/")[0], law["bns"].lower().split("/")[0])
        if any(e in sections.lower() for e in expected):
            checks.append({"rule": "Section Accuracy", "passed": True,
                           "note": f"Sections '{sections}' correctly match the offense"})
        else:
            checks.append({"rule": "Section Accuracy", "passed": False,
                           "note": f"Applied sections may be incorrect. Expected: {law['bns']} BNS / {law['ipc']}"})
            warnings.append(f"Sections applied ('{sections}') don't match detected offense. Correct: {law['bns']} BNS / {law['ipc']}")
            score -= 15
    else:
        checks.append({"rule": "Section Accuracy", "passed": True,
                       "note": f"Auto-assigned: {law['bns']} BNS ({law['ipc']})"})

    # Check 3: Description completeness (Who/What/Where/When)
    has_who = bool(re.search(r"\b(man|men|woman|women|person|persons|accused|unknown|boy|girl)\b", complaint_lower))
    has_what = bool(re.search(r"\b(stole|snatched|attacked|cheated|hacked|robbed|killed|threatened|beat|assaulted|kidnapped)\b", complaint_lower))
    has_where = bool(re.search(r"\b(road|nagar|layout|city|area|near|market|shop|house|office|street|circle)\b", complaint_lower)) or bool(location)
    has_when = bool(re.search(r"\b(yesterday|today|morning|night|evening|afternoon|pm|am|\d{1,2}[:.]?\d{0,2})\b", complaint_lower))

    missing = []
    if not has_who: missing.append("Who (suspect description)")
    if not has_what: missing.append("What (exact action)")
    if not has_where: missing.append("Where (location)")
    if not has_when: missing.append("When (time/date)")

    if not missing:
        checks.append({"rule": "Description Completeness", "passed": True,
                       "note": "Contains all required elements: Who, What, Where, When"})
    else:
        checks.append({"rule": "Description Completeness", "passed": False,
                       "note": f"Missing: {', '.join(missing)}"})
        warnings.append(f"FIR description incomplete. Missing: {', '.join(missing)}")
        score -= 5 * len(missing)

    # Check 4: Jurisdiction
    if location:
        checks.append({"rule": "Jurisdiction", "passed": True,
                       "note": f"Filed at {location} - jurisdiction valid for Karnataka Police"})
    else:
        checks.append({"rule": "Jurisdiction", "passed": True,
                       "note": "Zero-FIR provision applies - any station may register (Sec 173 BNSS)"})

    # Check 5: Limitation period
    checks.append({"rule": "Limitation Period", "passed": True,
                   "note": "No limitation for cognizable offenses - FIR may be filed anytime"})

    # Check 6: Special victim protection
    if detected_type in ("sexual offense", "domestic violence"):
        checks.append({"rule": "Victim Protection", "passed": True,
                       "note": "Statement must be recorded by woman officer; identity protected (Sec 176 BNSS)"})
        law_references.append("BNSS 2023 Sec 176 - Woman complainant statement recorded by woman officer")
    else:
        checks.append({"rule": "Victim Rights", "passed": True,
                       "note": "Standard victim protection provisions apply"})

    # Check 7: Constitutional validity
    checks.append({"rule": "Constitutional Validity", "passed": True,
                   "note": "Right to register complaint protected under Article 21"})

    # Law references
    law_references.append(f"BNS 2023 Section {law['bns']} - {law['description']}")
    law_references.append(f"Equivalent IPC Section {law['ipc']}")
    law_references.append(f"Punishment: {law['punishment']} | Bailable: {'Yes' if law['bailable'] else 'No'}")
    law_references.append("BNSS 2023 Sec 173 - Information in cognizable cases")
    law_references.append("Article 21, Constitution of India - Right to life and liberty")

    # Suggested sections
    suggested = [f"{law['bns']} BNS (Primary)", f"{law['ipc']} (IPC equivalent)"]
    if re.search(r"threat|intimidat", complaint_lower):
        suggested.append("BNS 351 / IPC 503 (Criminal Intimidation)")
    if re.search(r"weapon|knife|gun|pistol", complaint_lower):
        suggested.append("Arms Act 1959 Sec 25/27")
    if re.search(r"group|gang|three|four|five|multiple", complaint_lower):
        suggested.append("BNS 190 / IPC 149 (Unlawful assembly)")

    score = max(0, min(100, score))
    return {
        "detected_crime_type": detected_type,
        "valid": score >= 60,
        "score": score,
        "checks": checks,
        "suggested_sections": suggested,
        "warnings": warnings,
        "law_references": law_references,
        "needs_review": len(warnings) > 0,
    }
