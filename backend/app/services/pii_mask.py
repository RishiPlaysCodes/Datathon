"""PII masking utility — field-level access control based on user role.

Rules:
  - citizen: only sees their own FIRs (enforced elsewhere); full details for own FIRs
  - constable: sees FIR basics + masked PII (phone, email, address, aadhaar)
  - investigator: FULL access to cases assigned to their station
  - analyst: anonymized (names replaced with codes, no PII at all)
  - supervisor: FULL access to everything
  - policymaker: anonymized state-wide view only
"""
from typing import Any, Dict, Optional


def mask_phone(phone: Optional[str]) -> Optional[str]:
    if not phone or len(phone) < 4:
        return "***"
    return phone[:2] + "*" * (len(phone) - 4) + phone[-2:]


def mask_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return "***@***"
    local, domain = email.split("@", 1)
    return local[0] + "***@" + domain


def mask_name(name: Optional[str], index: int = 0) -> str:
    if not name:
        return f"PERSON-{index:04d}"
    return name[0] + "***" + (f" {name.split()[-1][0]}***" if " " in name else "")


def mask_address(address: Optional[str]) -> Optional[str]:
    if not address:
        return None
    words = address.split()
    if len(words) <= 2:
        return "***"
    return words[0] + " *** " + words[-1]


def apply_pii_mask(fir_dict: Dict[str, Any], user_role: str, user_station: Optional[str] = None, fir_station: Optional[str] = None) -> Dict[str, Any]:
    """Apply PII masking to a FIR dictionary based on the requesting user's role.
    
    Returns the dict with sensitive fields masked/removed as appropriate.
    """
    # Supervisor: full access always
    if user_role == "supervisor":
        return fir_dict

    # Investigator: full access to own station's cases
    if user_role == "investigator":
        if user_station and fir_station and user_station == fir_station:
            return fir_dict
        # Other stations: mask PII
        return _mask_pii_fields(fir_dict)

    # Analyst: anonymized everything
    if user_role == "analyst":
        masked = _mask_pii_fields(fir_dict)
        masked["complainant_name"] = mask_name(masked.get("complainant_name"), masked.get("id", 0))
        return masked

    # Constable: mask PII fields
    if user_role == "constable":
        return _mask_pii_fields(fir_dict)

    # Citizen: sees their own FIRs fully (enforced by query filter)
    if user_role == "citizen":
        return fir_dict

    # Default: mask
    return _mask_pii_fields(fir_dict)


def _mask_pii_fields(fir_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Mask phone, email, address, aadhaar fields."""
    masked = dict(fir_dict)
    if "complainant_phone" in masked and masked["complainant_phone"]:
        masked["complainant_phone"] = mask_phone(masked["complainant_phone"])
    if "complainant_email" in masked and masked["complainant_email"]:
        masked["complainant_email"] = mask_email(masked["complainant_email"])
    if "complainant_address" in masked and masked["complainant_address"]:
        masked["complainant_address"] = mask_address(masked["complainant_address"])
    if "complainant_aadhaar" in masked and masked["complainant_aadhaar"]:
        masked["complainant_aadhaar"] = "XXXX-XXXX-" + (masked["complainant_aadhaar"][-4:] if len(masked["complainant_aadhaar"]) >= 4 else "XXXX")
    # Suspect phone also sensitive
    if "suspect_phone" in masked and masked["suspect_phone"]:
        masked["suspect_phone"] = mask_phone(masked["suspect_phone"])
    # Mark that masking was applied
    masked["_pii_masked"] = True
    return masked
